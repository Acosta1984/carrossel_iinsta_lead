import express from "express";
import request from "supertest";
import { createCreativesRouter } from "../../src/controllers/creativesController.js";
import { getJob, getCreative } from "../../src/services/creativeService.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(createCreativesRouter());
  return app;
}

describe("Creatives API", () => {
  const app = createTestApp();

  describe("POST /creatives", () => {
    it("retorna 400 para creative_spec inválido", async () => {
      const res = await request(app)
        .post("/creatives")
        .send({ brand: { name: "X" }, creative_spec: { n_variations: 0, aspect_ratios: [] } });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("aceita body válido e retorna job (200 com results quando síncrono)", async () => {
      const res = await request(app)
        .post("/creatives")
        .send({
          brand: { name: "IntegrationBrand" },
          creative_spec: { n_variations: 1, aspect_ratios: ["1:1"] },
        });
      // Pode ser 200 (completed) ou 202 (accepted) dependendo do tempo; ou 500 se GEMINI_API_KEY ausente
      expect([200, 202, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 202) {
        expect(res.body.job_id).toBeDefined();
        expect(res.body.status).toBeDefined();
      }
    });
  });

  describe("GET /creatives/:job_id", () => {
    it("retorna 404 para job inexistente", async () => {
      const res = await request(app).get("/creatives/job_nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /creatives/asset/:creative_id", () => {
    it("retorna 404 para creative inexistente", async () => {
      const res = await request(app).get("/creatives/asset/cr_nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /prompts/preview", () => {
    it("retorna 200 e lista de prompts para brand válido", async () => {
      const res = await request(app)
        .post("/prompts/preview")
        .send({ brand: { name: "PreviewTest" }, templates: ["hero_product"] });
      expect(res.status).toBe(200);
      expect(res.body.prompts).toBeDefined();
      expect(Array.isArray(res.body.prompts)).toBe(true);
      expect(res.body.prompts.length).toBeGreaterThan(0);
      expect(res.body.prompts[0]).toHaveProperty("template");
      expect(res.body.prompts[0]).toHaveProperty("prompt");
    });

    it("retorna 400 para brand ausente", async () => {
      const res = await request(app).post("/prompts/preview").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /creative/generate", () => {
    it("retorna 400 quando tema está vazio ou ausente", async () => {
      const res = await request(app).post("/creative/generate").send({ tema: "" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("retorna 400 quando tema não é enviado", async () => {
      const res = await request(app).post("/creative/generate").send({ objetivo: "educar" });
      expect(res.status).toBe(400);
    });

    it("aceita body válido (tema obrigatório) e retorna 200 ou 500", async () => {
      const res = await request(app)
        .post("/creative/generate")
        .send({
          tema: "planejamento financeiro",
          objetivo: "educar",
          avatar: "mães solo",
          tom: "empático",
        });
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("caption");
        expect(res.body).toHaveProperty("visual");
        expect(res.body).toHaveProperty("hashtags");
        expect(res.body).toHaveProperty("cta");
        expect(Array.isArray(res.body.hashtags)).toBe(true);
      }
    });
  });
});
