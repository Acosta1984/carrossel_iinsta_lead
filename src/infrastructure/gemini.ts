import { GoogleGenAI } from "@google/genai";
import { config } from "../config/index.js";
import { GEMINI_IMAGE_MODEL, GEMINI_TEXT_MODEL } from "../domain/types.js";

/** Tipo simplificado da resposta generateContent (partes com inlineData). */
interface PartWithInlineData {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
  text?: string;
}

interface GenerateContentResponseLike {
  candidates?: Array<{ content?: { parts?: PartWithInlineData[] } }>;
  /** Getter do SDK: concatenação dos inline data parts (base64). */
  data?: string;
}

export interface ExtractedImage {
  mimeType: string;
  buffer: Buffer;
}

/**
 * Extrai a primeira imagem da resposta do Gemini (candidates[0].content.parts).
 * Aceita inlineData (camelCase) e inline_data (snake_case). Fallback no getter .data do SDK.
 */
export function extractImageFromResponse(response: GenerateContentResponseLike): ExtractedImage | null {
  const parts = response.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const blob = part.inlineData ?? (part as PartWithInlineData).inline_data;
      const data = blob?.data;
      const mimeStr =
        (blob && "mimeType" in blob && blob.mimeType) ||
        (blob && "mime_type" in blob ? (blob as { mime_type?: string }).mime_type : undefined);
      if (data && typeof mimeStr === "string" && mimeStr.startsWith("image/")) {
        return { mimeType: mimeStr, buffer: Buffer.from(data, "base64") };
      }
    }
  }
  // Fallback: SDK getter .data (base64) quando a resposta é instância da classe
  const data = typeof (response as { data?: string }).data === "string" ? (response as { data: string }).data : null;
  if (data) {
    return { mimeType: "image/png", buffer: Buffer.from(data, "base64") };
  }
  return null;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = config.geminiApiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Gera uma imagem via gemini-2.5-flash-image.
 * contents: string (prompt).
 * Retorna a resposta bruta para extração via extractImageFromResponse.
 */
export async function generateImage(prompt: string): Promise<GenerateContentResponseLike> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
  });
  return response as unknown as GenerateContentResponseLike;
}

/** Resposta de generateContent quando o modelo retorna texto. */
interface TextResponseLike {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  text?: string;
}

/**
 * Gera texto via modelo Gemini (ex.: agente de criativos Instagram).
 * Retorna o texto concatenado da primeira candidate.
 */
export async function generateText(prompt: string): Promise<string> {
  const ai = getClient();
  const response = (await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
  })) as unknown as TextResponseLike;
  const parts = response.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts.map((p) => p.text ?? "").join("");
    if (text) return text;
  }
  if (typeof response.text === "string") return response.text;
  throw new Error("Gemini returned no text");
}
