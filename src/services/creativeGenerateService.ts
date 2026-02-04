import { generateText } from "../infrastructure/gemini.js";
import type { CreativeGenerateRequest, CreativeGenerateResponse } from "../domain/creativeGenerate.js";

const SYSTEM_PROMPT = `Você é um agente de criação de conteúdo para Instagram. Sua tarefa é gerar um criativo completo a partir das instruções do usuário.

Regras obrigatórias:
- Se for informado um avatar (público-alvo), adapte linguagem e estilo ao perfil desse público.
- Se não houver avatar, use boas práticas de marketing digital para público geral.
- caption: entre 100 e 300 palavras, no máximo 2.200 caracteres.
- visual: descrição clara e detalhada para designers ou ferramentas gráficas criarem a arte.
- hashtags: exatamente entre 5 e 15 hashtags relevantes ao tema.
- cta: chamada para ação clara, direta e alinhada ao objetivo do conteúdo.

Responda APENAS com um JSON válido, sem markdown e sem texto antes ou depois, no formato:
{"caption":"...","visual":"...","hashtags":["#a","#b",...],"cta":"..."}`;

function buildUserPrompt(req: CreativeGenerateRequest): string {
  const parts: string[] = [`Tema: ${req.tema}`];
  if (req.objetivo) parts.push(`Objetivo: ${req.objetivo}`);
  if (req.avatar) parts.push(`Público-alvo (avatar): ${req.avatar}`);
  if (req.tom) parts.push(`Tom: ${req.tom}`);
  return parts.join("\n");
}

function parseResponse(text: string): CreativeGenerateResponse {
  const trimmed = text.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const parsed = JSON.parse(trimmed) as CreativeGenerateResponse;
  if (typeof parsed.caption !== "string" || typeof parsed.visual !== "string") {
    throw new Error("Resposta inválida: caption e visual são obrigatórios");
  }
  if (!Array.isArray(parsed.hashtags)) parsed.hashtags = [];
  if (typeof parsed.cta !== "string") parsed.cta = "";
  return {
    caption: parsed.caption.slice(0, 2200),
    visual: parsed.visual,
    hashtags: parsed.hashtags.filter((h): h is string => typeof h === "string").slice(0, 15),
    cta: parsed.cta,
  };
}

export async function generateCreative(
  request: CreativeGenerateRequest
): Promise<CreativeGenerateResponse> {
  const userPrompt = buildUserPrompt(request);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n---\nEntrada do usuário:\n${userPrompt}`;
  const raw = await generateText(fullPrompt);
  return parseResponse(raw);
}
