import { extractImageFromResponse } from "../../src/infrastructure/gemini.js";

describe("extractImageFromResponse", () => {
  it("retorna null quando não há candidates", () => {
    expect(extractImageFromResponse({})).toBeNull();
    expect(extractImageFromResponse({ candidates: [] })).toBeNull();
  });

  it("retorna null quando parts não tem inlineData de imagem", () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [{ text: "caption here" }],
          },
        },
      ],
    };
    expect(extractImageFromResponse(response)).toBeNull();
  });

  it("extrai mimeType e buffer do primeiro part com inlineData image/*", () => {
    const base64 = Buffer.from("fake-image-bytes").toString("base64");
    const response = {
      candidates: [
        {
          content: {
            parts: [
              { text: "caption" },
              { inlineData: { mimeType: "image/png", data: base64 } },
            ],
          },
        },
      ],
    };
    const result = extractImageFromResponse(response);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe("image/png");
    expect(result!.buffer).toBeInstanceOf(Buffer);
    expect(result!.buffer.toString("base64")).toBe(base64);
  });
});
