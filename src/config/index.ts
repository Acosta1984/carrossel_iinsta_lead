export const config = {
  port: Number(process.env.PORT) || 3000,
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  storageProvider: process.env.STORAGE_PROVIDER || "local",
  storageLocalPath: process.env.STORAGE_LOCAL_PATH || "./storage/creatives",
  creativesBaseUrl: process.env.CREATIVES_BASE_URL || "http://localhost:3000/creatives-static",
  logLevel: process.env.LOG_LEVEL || "info",
} as const;
