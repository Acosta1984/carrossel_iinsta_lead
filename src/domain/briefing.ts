import type { AspectRatio, ImageStyle, PromptTemplate, QualityLevel } from "./types.js";

/** DTO de briefing para geração de criativos (contrato do PRD). */
export interface CreateCreativesRequest {
  brand: {
    name: string;
    tone?: string;
    colors?: string[];
    values?: string[];
  };
  campaign?: {
    name?: string;
    objective?: string;
    cta?: string;
  };
  creative_spec: {
    n_variations: number;
    aspect_ratios: AspectRatio[];
    image_style?: ImageStyle;
    quality?: QualityLevel;
    safety_level?: "default" | "low" | "high";
  };
  product?: {
    name?: string;
    description?: string;
    category?: string;
  };
  constraints?: {
    avoid?: string[];
    must_include?: string[];
  };
  /** Bloco de identidade visual fixa da personagem (repetido literalmente em todas as gerações). Se omitido, usa o bloco padrão. */
  character_identity?: string;
  user_id?: string;
}

/** Entrada para preview de prompts (POST /prompts/preview). */
export interface PreviewPromptsRequest {
  brand: CreateCreativesRequest["brand"];
  campaign?: CreateCreativesRequest["campaign"];
  product?: CreateCreativesRequest["product"];
  creative_spec?: {
    image_style?: ImageStyle;
    aspect_ratios?: AspectRatio[];
  };
  templates?: PromptTemplate[];
  /** Bloco de identidade visual fixa da personagem (opcional). */
  character_identity?: string;
}
