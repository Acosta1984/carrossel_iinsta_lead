import type { CreateCreativesRequest, PreviewPromptsRequest } from "../domain/briefing.js";
import type { AspectRatio, ImageStyle, PromptTemplate } from "../domain/types.js";

/** Identidade visual da personagem (usada apenas como suporte humano no final do prompt). */
const DEFAULT_CHARACTER_IDENTITY = `Young adult female, consistent recognizable appearance, light warm skin tone, oval face with soft jawline, slightly raised cheekbones, natural smile with aligned teeth, full well-defined eyebrows, dark brown almond-shaped eyes, medium straight nose, medium lips with natural outline. Long dark brown slightly wavy hair, center-parted, below shoulders, natural texture, soft shine. Healthy look, light natural makeup, clean premium style, confident friendly expression.`;

/** Instrução fixa: personagem como suporte — não encara a câmera, foco no produto, serve como escala. */
const HUMAN_SUPPORT_INSTRUCTION = `acting naturally and spontaneously, never looking at the lens; gaze or action directed at the product. The person serves only as scale and context for the product, never as the main subject.`;

/** Detalhamento realista obrigatório (simula fotografia humana real). */
const REALISTIC_DETAIL = `Natural depth of field with slight background blur. Real skin texture with visible pores and micro-variations. Imperfect reflections on objects. Soft irregular shadows. Discrete film grain. The image must look like a real photo taken by a person, not a 3D render or stock photo. Forbidden: overly smooth skin, uniform artificial lighting, extreme sharpness everywhere, 3D render aesthetic, or stock photo look.`;

/** Bloco de restrições: consistência da personagem + estilo realista UGC. */
const CONSISTENCY_RESTRICTIONS = `The character's visual identity is fixed and must not vary between generations. Do not alter: face shape, skin tone, apparent age, hair type color or length, facial structure or proportions.
The image style must remain realistic, with the appearance of a real photo captured by a person. Avoid any artificial, advertising, or overly perfect aesthetic.`;

const STYLE_PHRASES: Record<ImageStyle, string> = {
  ugc_cinematic:
    "Authentic UGC aesthetic, captured-moment feel, organic lighting, no studio setup",
  photorealistic:
    "Photographic realism, natural depth of field, soft shadows, no artificial uniformity",
  editorial:
    "Contemporary editorial feed look, clear visual narrative in one frame",
  minimal:
    "Clean composition, negative space for text and CTA, natural lighting, real environment",
};

/** Regra de espaço negativo (minimal) — sempre aplicada para área livre para textos/CTA. */
const NEGATIVE_SPACE_RULE = "Clear negative space for graphic design: area for title, text or CTA. Minimal composition with free zones so the creative works as a high-conversion ad.";

/** Valores genéricos de exemplo (Swagger/OpenAPI) que não devem ir no prompt. */
const PLACEHOLDER_VALUES = new Set([
  "string", "object", "number", "integer", "boolean", "array",
  "example", "Example", "Sample", "sample", "null", "undefined",
]);

function isPlaceholder(value: string | undefined): boolean {
  if (value == null || typeof value !== "string") return true;
  const trimmed = value.trim().toLowerCase();
  return !trimmed || PLACEHOLDER_VALUES.has(trimmed) || trimmed.length < 2;
}

function orFallback(value: string | undefined, fallback: string): string {
  return isPlaceholder(value) ? fallback : value!.trim();
}

function getCharacterIdentityBlock(briefing: CreateCreativesRequest): string {
  const custom = briefing.character_identity?.trim();
  if (custom && custom.length > 20) return custom;
  return DEFAULT_CHARACTER_IDENTITY;
}

/**
 * Gera prompts com produto como protagonista (Stopping Power).
 * Ordem: Produto + Conceito → Estética → Foco visual → Composição (espaço negativo) → Suporte humano (personagem no final) → Restrições.
 */
export function buildPrompt(
  template: PromptTemplate,
  briefing: CreateCreativesRequest,
  aspectRatio: AspectRatio
): string {
  const brand = briefing.brand;
  const campaign = briefing.campaign;
  const product = briefing.product;
  const style = briefing.creative_spec?.image_style ?? "ugc_cinematic";
  const stylePhrase = STYLE_PHRASES[style];

  const brandName = orFallback(brand.name, "brand");
  const productName = orFallback(product?.name, "product");
  const productDesc = orFallback(product?.description, "");
  const campaignObj = orFallback(campaign?.objective, "");
  const colors = (brand.colors ?? []).filter((c) => !isPlaceholder(c));
  const colorHint = colors.length ? `Brand and product color contrast (Stopping Power): ${colors.join(", ")}.` : "Strong color contrast for Stopping Power.";

  const identityBlock = getCharacterIdentityBlock(briefing);

  // 1) Abertura: Produto e conceito criativo (protagonista) — marca para contexto
  const productConcept = productDesc
    ? `Generate a creative focused on ${productName} for ${brandName} (${productDesc}). The product must be the first thing the viewer sees — stopping power, scroll-stopper.`
    : `Generate a creative focused on ${productName} for ${brandName}. The product must be the first thing the viewer sees — stopping power, scroll-stopper.`;

  // 2) Estética: ImageStyle + ênfase em espaço negativo para design gráfico
  const aesthetic = `${stylePhrase}. Emphasis on negative space for graphic design (area for title, text, CTA). ${NEGATIVE_SPACE_RULE}`;

  // 3) Foco visual: Produto em destaque absoluto no primeiro plano, iluminação em texturas
  const visualFocus = `Visual focus: ${productName} in absolute prominence in the foreground. Lighting highlighting product textures and brand colors. Product clearly in focus; background and any human element secondary.`;

  // 4) Composição: STYLE_PHRASES.minimal + fundo urbano + REALISTIC_DETAIL
  const compositionMinimal = STYLE_PHRASES.minimal;
  const urbanBackground = "Urban or real environment background with natural depth of field (slight blur).";
  const composition = `Composition: ${compositionMinimal}. ${urbanBackground}. ${REALISTIC_DETAIL}`;

  // 5) Suporte humano: personagem no final — natural, sem olhar para a lente, foco no produto, apenas escala
  const humanSupport = `Human support (secondary, never main subject): ${identityBlock} ${HUMAN_SUPPORT_INSTRUCTION}`;

  const sections = [
    "## Product & Creative Concept",
    productConcept,
    "## Aesthetic",
    aesthetic,
    "## Visual Focus",
    visualFocus,
    "## Composition",
    composition,
    "## Human Support",
    humanSupport,
    "## Restrictions",
    CONSISTENCY_RESTRICTIONS,
    "",
    `Aspect ratio ${aspectRatio}, format suitable for high-conversion social advertising. ${colorHint}`.trim(),
    "Gemini 2.5 Flash Image, hyperrealistic UGC editorial style, product-first ad look.",
  ];

  return sections.filter(Boolean).join("\n\n");
}

/**
 * Gera conjunto de prompts para todas as combinações template × aspect_ratio solicitadas.
 */
export function buildPromptsForBriefing(
  briefing: CreateCreativesRequest,
  templates: PromptTemplate[] = ["hero_product", "lifestyle_context", "ugc_style"]
): Array<{ template: PromptTemplate; aspect_ratio: AspectRatio; prompt: string }> {
  const ratios = briefing.creative_spec.aspect_ratios;
  const out: Array<{ template: PromptTemplate; aspect_ratio: AspectRatio; prompt: string }> = [];
  for (const template of templates) {
    for (const ar of ratios) {
      out.push({
        template,
        aspect_ratio: ar,
        prompt: buildPrompt(template, briefing, ar),
      });
    }
  }
  return out;
}

/**
 * Preview de prompts (POST /prompts/preview). Retorna prompts por template.
 */
export function previewPrompts(req: PreviewPromptsRequest): Array<{ template: string; prompt: string }> {
  const fullBriefing: CreateCreativesRequest = {
    brand: req.brand,
    campaign: req.campaign,
    product: req.product,
    creative_spec: {
      n_variations: 1,
      aspect_ratios: req.creative_spec?.aspect_ratios ?? ["1:1"],
      image_style: req.creative_spec?.image_style,
    },
    character_identity: req.character_identity,
  };
  const templates = (req.templates ?? ["hero_product", "lifestyle_context"]) as PromptTemplate[];
  const prompts = buildPromptsForBriefing(fullBriefing, templates);
  return prompts.map((p) => ({ template: p.template, prompt: p.prompt }));
}
