/** Aspect ratios suportados para criativos (Nano Banana). */
export type AspectRatio = "1:1" | "4:5" | "9:16";

/** Templates de prompt para geração. */
export type PromptTemplate =
  | "hero_product"
  | "lifestyle_context"
  | "ugc_style"
  | "graphic_poster";

/** Estilo de imagem. */
export type ImageStyle =
  | "ugc_cinematic"
  | "photorealistic"
  | "editorial"
  | "minimal";

/** Nível de qualidade. */
export type QualityLevel = "standard" | "high";

/** Status do job de geração. */
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image" as const;

/** Modelo de texto para agente de criativos (caption, visual, hashtags, CTA). */
export const GEMINI_TEXT_MODEL = "gemini-2.0-flash" as const;
