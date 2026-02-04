import { v4 as uuidv4 } from "uuid";
import type { CreateCreativesRequest } from "../domain/briefing.js";
import type { Creative, CreativeResult } from "../domain/creative.js";
import type { Job } from "../domain/job.js";
import type { JobStatus } from "../domain/types.js";
import { GEMINI_IMAGE_MODEL } from "../domain/types.js";
import { config } from "../config/index.js";
import type { CreativeStorage } from "../infrastructure/storage.js";
import { extractImageFromResponse, generateImage } from "../infrastructure/gemini.js";
import { buildPromptsForBriefing } from "./promptEngine.js";
import type { PromptTemplate } from "../domain/types.js";

const DEFAULT_TEMPLATES: PromptTemplate[] = ["hero_product", "lifestyle_context", "ugc_style"];

/** Repositório em memória de jobs e criativos (MVP). Substituível por DB. */
const jobs = new Map<string, Job>();
const creatives = new Map<string, Creative>();

export interface CreativeServiceDeps {
  storage: CreativeStorage;
}

/**
 * Gera um lote de criativos via Nano Banana (gemini-2.5-flash-image).
 * Para cada (template × aspect_ratio) até n_variations: gera prompt → chama Gemini → extrai imagem → salva → persiste meta.
 */
export async function generateCreatives(
  deps: CreativeServiceDeps,
  body: CreateCreativesRequest
): Promise<{ job_id: string; status: JobStatus; results?: CreativeResult[]; error?: string }> {
  const jobId = `job_${uuidv4().slice(0, 8)}`;
  const nVariations = Math.min(Math.max(1, body.creative_spec.n_variations), 20);
  const templates = DEFAULT_TEMPLATES;
  const prompts = buildPromptsForBriefing(body, templates);

  const tasks = prompts.slice(0, nVariations);
  if (tasks.length === 0) {
    const job: Job = {
      job_id: jobId,
      status: "failed",
      error: "No prompts generated",
      created_at: new Date().toISOString(),
    };
    jobs.set(jobId, job);
    return { job_id: jobId, status: "failed", error: job.error };
  }

  jobs.set(jobId, {
    job_id: jobId,
    status: "processing",
    created_at: new Date().toISOString(),
  });

  const results: CreativeResult[] = [];
  const seed = Math.floor(Math.random() * 1_000_000);
  let quotaExceededCount = 0;

  function isQuotaError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    const code = (err as { error?: { code?: number } })?.error?.code;
    const msg = err instanceof Error ? err.message : String(err);
    return status === 429 || code === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
  }

  function parseRetryDelaySeconds(err: unknown): number {
    const msg = err instanceof Error ? err.message : String(err);
    const match = msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
    if (match) return Math.min(60, Math.ceil(Number(match[1])));
    return 40;
  }

  async function generateWithRetry(prompt: string): Promise<Awaited<ReturnType<typeof generateImage>>> {
    try {
      return await generateImage(prompt);
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      const delaySec = parseRetryDelaySeconds(err);
      console.warn(`[creatives] Quota exceeded (429). Aguardando ${delaySec}s antes de retry...`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
      return await generateImage(prompt);
    }
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const creativeId = `cr_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
    try {
      const response = await generateWithRetry(task.prompt);
      const extracted = extractImageFromResponse(response);
      if (!extracted) {
        const hasCandidates = !!response?.candidates?.length;
        const firstParts = response?.candidates?.[0]?.content?.parts;
        if (config.logLevel === "debug" || !hasCandidates) {
          console.warn(`[creatives] No image in response for creative ${creativeId}`, {
            hasCandidates,
            partsCount: Array.isArray(firstParts) ? firstParts.length : 0,
          });
        }
        results.push({
          creative_id: creativeId,
          aspect_ratio: task.aspect_ratio,
          prompt_final: task.prompt,
          image_url: "",
          meta: {
            model: GEMINI_IMAGE_MODEL,
            mimeType: "image/png",
            bytes: 0,
            seed: seed + i,
            generated_at: new Date().toISOString(),
          },
        });
        continue;
      }
      const imageUrl = await deps.storage.save(creativeId, extracted.buffer, extracted.mimeType);
      const bytes = extracted.buffer.length;
      const meta = {
        model: GEMINI_IMAGE_MODEL,
        mimeType: extracted.mimeType,
        bytes,
        seed: seed + i,
        generated_at: new Date().toISOString(),
      };
      const creative: Creative = {
        creative_id: creativeId,
        job_id: jobId,
        aspect_ratio: task.aspect_ratio,
        prompt_final: task.prompt,
        image_url: imageUrl,
        meta,
      };
      creatives.set(creativeId, creative);
      results.push({
        creative_id: creativeId,
        aspect_ratio: task.aspect_ratio,
        prompt_final: task.prompt,
        image_url: imageUrl,
        meta,
      });
    } catch (err) {
      if (isQuotaError(err)) {
        quotaExceededCount += 1;
        console.warn(`[creatives] Quota exceeded (429) for ${creativeId}. Verifique https://ai.google.dev/gemini-api/docs/rate-limits`);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[creatives] Generation failed for ${creativeId}:`, message);
      }
      results.push({
        creative_id: creativeId,
        aspect_ratio: task.aspect_ratio,
        prompt_final: task.prompt,
        image_url: "",
        meta: {
          model: GEMINI_IMAGE_MODEL,
          mimeType: "image/png",
          bytes: 0,
          seed: seed + i,
          generated_at: new Date().toISOString(),
        },
      });
    }
  }

  const hasFailures = results.some((r) => !r.image_url);
  const allFailed = hasFailures && results.every((r) => !r.image_url);
  const errorMessage = allFailed
    ? quotaExceededCount > 0
      ? "Quota da API Gemini excedida. Verifique seu plano em https://ai.google.dev/gemini-api/docs/rate-limits ou tente novamente mais tarde."
      : "All generations failed"
    : undefined;

  const job: Job = {
    job_id: jobId,
    status: allFailed ? "failed" : "completed",
    results,
    error: errorMessage,
    completed_at: new Date().toISOString(),
    created_at: jobs.get(jobId)!.created_at,
  };
  jobs.set(jobId, job);

  return {
    job_id: jobId,
    status: job.status,
    results: job.results,
    error: job.error,
  };
}

export function getJob(jobId: string): Job | null {
  return jobs.get(jobId) ?? null;
}

export function getCreative(creativeId: string): Creative | null {
  return creatives.get(creativeId) ?? null;
}
