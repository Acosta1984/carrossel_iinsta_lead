import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createLocalStorage } from "../../src/infrastructure/storage.js";

describe("createLocalStorage", () => {
  let dir: string;
  let storage: ReturnType<typeof createLocalStorage>;

  beforeAll(async () => {
    dir = path.join(os.tmpdir(), `creatives-test-${Date.now()}`);
    await fs.mkdir(dir, { recursive: true });
    storage = createLocalStorage(dir, "http://localhost:3000/creatives-static");
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("salva buffer e retorna URL com baseUrl + filename", async () => {
    const key = "test_cr_1";
    const buffer = Buffer.from("fake-png-content");
    const url = await storage.save(key, buffer, "image/png");
    expect(url).toContain("creatives-static");
    expect(url).toContain("test_cr_1.png");
    const fullPath = path.join(dir, "test_cr_1.png");
    const read = await fs.readFile(fullPath);
    expect(read.equals(buffer)).toBe(true);
  });
});
