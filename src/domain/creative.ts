import type { AspectRatio } from "./types.js";

/** Metadados do criativo (modelo gemini-2.5-flash-image + bytes). */
export interface CreativeMeta {
  model: string;
  mimeType: string;
  bytes: number;
  seed?: number;
  generated_at: string;
}

/** Entidade criativo persistido. */
export interface Creative {
  creative_id: string;
  job_id: string;
  aspect_ratio: AspectRatio;
  prompt_final: string;
  image_url: string;
  meta: CreativeMeta;
}

/** Resultado de um criativo na resposta do job. */
export interface CreativeResult {
  creative_id: string;
  aspect_ratio: AspectRatio;
  prompt_final: string;
  image_url: string;
  meta: CreativeMeta;
}
