import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";
import { createCreativesRouter } from "./controllers/creativesController.js";
import { config } from "./config/index.js";

const openApiPath = path.join(process.cwd(), "docs", "api", "openapi.yaml");
const openApiDoc = yaml.load(fs.readFileSync(openApiPath, "utf8")) as Record<string, unknown>;

const app = express();
app.use(express.json({ limit: "1mb" }));

// Log de cada requisição (método, path, IP)
app.use((req, _res, next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip ?? req.socket?.remoteAddress ?? "-";
  const bodyHint = method === "POST" && req.body && Object.keys(req.body).length > 0
    ? ` bodyKeys=${Object.keys(req.body).join(",")}`
    : "";
  console.log(`[${new Date().toISOString()}] ${method} ${path} ip=${ip}${bodyHint}`);
  next();
});

// Swagger UI – documentação interativa
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Creatives API (Nano Banana)",
}));

// Arquivos estáticos (evitar que /creatives/cr_xxx.png vire job_id)
const storagePath = path.resolve(config.storageLocalPath);
app.use("/creatives-static", express.static(storagePath));

app.use(createCreativesRouter());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", model: "gemini-2.5-flash-image" });
});

app.listen(config.port, () => {
  console.log(`Creatives API (Nano Banana) listening on port ${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api-docs`);
});
