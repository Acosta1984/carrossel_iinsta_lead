import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { config } from "../config/index.js";
import { createLocalStorage } from "../infrastructure/storage.js";
import {
  generateCreatives,
  getJob,
  getCreative,
} from "../services/creativeService.js";
import { previewPrompts } from "../services/promptEngine.js";
import { generateCreative } from "../services/creativeGenerateService.js";
import type { CreateCreativesRequest, PreviewPromptsRequest } from "../domain/briefing.js";

const createBodySchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    tone: z.string().optional(),
    colors: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  }),
  campaign: z
    .object({
      name: z.string().optional(),
      objective: z.string().optional(),
      cta: z.string().optional(),
    })
    .optional(),
  creative_spec: z.object({
    n_variations: z.number().min(1).max(20),
    aspect_ratios: z.array(z.enum(["1:1", "4:5", "9:16"])).min(1),
    image_style: z.enum(["ugc_cinematic", "photorealistic", "editorial", "minimal"]).optional(),
    quality: z.enum(["standard", "high"]).optional(),
    safety_level: z.enum(["default", "low", "high"]).optional(),
  }),
  product: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
  constraints: z
    .object({
      avoid: z.array(z.string()).optional(),
      must_include: z.array(z.string()).optional(),
    })
    .optional(),
  character_identity: z.string().optional(),
  user_id: z.string().optional(),
});

const creativeGenerateSchema = z.object({
  tema: z.string().min(1, "tema é obrigatório"),
  objetivo: z.string().optional(),
  avatar: z.string().optional(),
  tom: z.string().optional(),
});

const previewBodySchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    tone: z.string().optional(),
    colors: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  }),
  campaign: z.object({ name: z.string().optional(), objective: z.string().optional(), cta: z.string().optional() }).optional(),
  product: z.object({ name: z.string().optional(), description: z.string().optional(), category: z.string().optional() }).optional(),
  creative_spec: z.object({ image_style: z.string().optional(), aspect_ratios: z.array(z.string()).optional() }).optional(),
  templates: z.array(z.string()).optional(),
  character_identity: z.string().optional(),
});

function errorResponse(res: Response, code: number, codeStr: string, message: string, details?: object) {
  return res.status(code).json({
    code: codeStr,
    message,
    details: details ?? {},
    timestamp: new Date().toISOString(),
  });
}

export function createCreativesRouter(): Router {
  const router = Router();
  const storage = createLocalStorage(config.storageLocalPath, config.creativesBaseUrl);

  router.post("/creatives", async (req: Request, res: Response) => {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, 400, "VALIDATION_ERROR", "Dados inválidos", parsed.error.flatten());
    }
    const body = parsed.data as CreateCreativesRequest;
    try {
      const result = await generateCreatives({ storage }, body);
      if (result.status === "completed" || result.status === "failed") {
        return res.status(200).json({
          job_id: result.job_id,
          status: result.status,
          results: result.results,
          ...(result.error && { error: result.error }),
        });
      }
      return res.status(202).json({ job_id: result.job_id, status: "accepted" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(res, 500, "INTERNAL_ERROR", message);
    }
  });

  router.get("/creatives/:job_id", (req: Request, res: Response) => {
    const job = getJob(req.params.job_id);
    if (!job) return errorResponse(res, 404, "NOT_FOUND", "Job não encontrado");
    return res.json({
      job_id: job.job_id,
      status: job.status,
      results: job.results,
      error: job.error,
      created_at: job.created_at,
      completed_at: job.completed_at,
    });
  });

  router.get("/creatives/asset/:creative_id", (req: Request, res: Response) => {
    const creative = getCreative(req.params.creative_id);
    if (!creative) return errorResponse(res, 404, "NOT_FOUND", "Criativo não encontrado");
    return res.json({
      creative_id: creative.creative_id,
      job_id: creative.job_id,
      aspect_ratio: creative.aspect_ratio,
      prompt_final: creative.prompt_final,
      image_url: creative.image_url,
      meta: creative.meta,
    });
  });

  router.post("/creative/generate", async (req: Request, res: Response) => {
  const parsed = creativeGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, "VALIDATION_ERROR", "Dados inválidos", parsed.error.flatten());
  }
  try {
    const result = await generateCreative(parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(res, 500, "INTERNAL_ERROR", message);
  }
});

router.post("/prompts/preview", (req: Request, res: Response) => {
    const parsed = previewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res, 400, "VALIDATION_ERROR", "Dados inválidos", parsed.error.flatten());
    }
    const prompts = previewPrompts(parsed.data as PreviewPromptsRequest);
    return res.json({ prompts });
  });

  return router;
}
