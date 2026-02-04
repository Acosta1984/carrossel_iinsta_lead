import fs from "node:fs/promises";
import path from "node:path";

/** Contrato de storage para salvamento de imagens de criativos. */
export interface CreativeStorage {
  /**
   * Salva buffer de imagem e retorna URL pública do recurso.
   * key: identificador único (ex: creative_id).
   */
  save(key: string, buffer: Buffer, mimeType: string): Promise<string>;
}

function getExtension(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

/**
 * Storage local: salva em pasta no disco e retorna URL base + path.
 * Requer que o app sirva arquivos estáticos em CREATIVES_BASE_URL ou use um proxy.
 */
export function createLocalStorage(
  basePath: string,
  baseUrl: string
): CreativeStorage {
  return {
    async save(key: string, buffer: Buffer, mimeType: string): Promise<string> {
      const ext = getExtension(mimeType);
      const filename = `${key}.${ext}`;
      const dir = path.resolve(basePath);
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      await fs.writeFile(filePath, buffer);
      const normalizedBase = baseUrl.replace(/\/$/, "");
      return `${normalizedBase}/${filename}`;
    },
  };
}
