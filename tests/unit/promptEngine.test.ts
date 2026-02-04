import { buildPrompt, buildPromptsForBriefing, previewPrompts } from "../../src/services/promptEngine.js";
import type { CreateCreativesRequest, PreviewPromptsRequest } from "../../src/domain/briefing.js";

const minimalBriefing: CreateCreativesRequest = {
  brand: { name: "TestBrand" },
  creative_spec: {
    n_variations: 3,
    aspect_ratios: ["1:1", "4:5"],
    image_style: "ugc_cinematic",
  },
};

describe("promptEngine", () => {
  describe("buildPrompt", () => {
    it("retorna prompt com produto como protagonista (Product & Creative Concept primeiro, Human Support no final)", () => {
      const prompt = buildPrompt("hero_product", minimalBriefing, "1:1");
      expect(prompt).toContain("## Product & Creative Concept");
      expect(prompt).toContain("## Aesthetic");
      expect(prompt).toContain("## Visual Focus");
      expect(prompt).toContain("## Composition");
      expect(prompt).toContain("## Human Support");
      expect(prompt).toContain("## Restrictions");
      expect(prompt).toContain("TestBrand");
      expect(prompt).toContain("1:1");
      expect(prompt).toContain("Gemini 2.5 Flash Image");
      expect(prompt).toContain("stopping power");
      expect(prompt).toContain("negative space");
      expect(prompt).toContain("never looking at the lens");
      expect(prompt).toContain("visual identity is fixed");
      expect(prompt).toContain("Real skin texture");
      expect(prompt).toContain("film grain");
    });

    it("inclui product quando informado", () => {
      const withProduct: CreateCreativesRequest = {
        ...minimalBriefing,
        product: { name: "ProdX", description: "Desc" },
      };
      const prompt = buildPrompt("lifestyle_context", withProduct, "4:5");
      expect(prompt).toContain("ProdX");
      expect(prompt).toContain("4:5");
    });

    it("usa character_identity customizado quando informado (em Human Support)", () => {
      const custom: CreateCreativesRequest = {
        ...minimalBriefing,
        character_identity: "Personagem customizada, cabelo ruivo, olhos verdes.",
      };
      const prompt = buildPrompt("hero_product", custom, "1:1");
      expect(prompt).toContain("Personagem customizada, cabelo ruivo, olhos verdes.");
      expect(prompt).toContain("never looking at the lens");
      expect(prompt).not.toContain("Young adult female"); // default identity só quando não há custom
    });
  });

  describe("buildPromptsForBriefing", () => {
    it("gera prompts para cada template × aspect_ratio", () => {
      const prompts = buildPromptsForBriefing(minimalBriefing, ["hero_product", "ugc_style"]);
      expect(prompts.length).toBe(2 * 2); // 2 templates × 2 ratios
      const templates = [...new Set(prompts.map((p) => p.template))];
      const ratios = [...new Set(prompts.map((p) => p.aspect_ratio))];
      expect(templates).toContain("hero_product");
      expect(templates).toContain("ugc_style");
      expect(ratios).toEqual(["1:1", "4:5"]);
    });
  });

  describe("previewPrompts", () => {
    it("retorna lista de { template, prompt }", () => {
      const req: PreviewPromptsRequest = {
        brand: { name: "PreviewBrand" },
        creative_spec: { aspect_ratios: ["1:1"] },
        templates: ["hero_product"],
      };
      const result = previewPrompts(req);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("template", "hero_product");
      expect(result[0].prompt).toContain("PreviewBrand");
    });
  });

  describe("placeholders", () => {
    it("não inclui literal 'string' no prompt quando product.name é placeholder", () => {
      const briefing: CreateCreativesRequest = {
        brand: { name: "Deia" },
        creative_spec: { n_variations: 1, aspect_ratios: ["1:1"] },
        product: { name: "string", description: "string" },
      };
      const prompt = buildPrompt("hero_product", briefing, "1:1");
      expect(prompt).not.toMatch(/\bstring\b/);
      expect(prompt).toContain("Deia");
    });
  });
});
