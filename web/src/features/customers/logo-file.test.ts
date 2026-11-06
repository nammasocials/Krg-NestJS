import { describe, expect, it } from "vitest";
import {
  LOGO_EMPTY_MESSAGE,
  LOGO_SIZE_MESSAGE,
  LOGO_TYPE_MESSAGE,
  MAX_LOGO_BYTES,
  checkLogoFile,
  sniffImageType,
} from "./logo-file";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const blob = (bytes: ArrayLike<number> | string, type = "") => new Blob([typeof bytes === "string" ? bytes : Uint8Array.from(bytes)], { type });

describe("sniffImageType", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(Uint8Array.from([...PNG, 0]))).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("RIFF\u0001\u0002\u0003\u0004WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects text, SVG, GIF, a RIFF that is not WebP, and short input", () => {
    for (const text of ["hello", "<svg></svg>", "GIF89a....", "RIFF1234WAVEfmt "]) {
      expect(sniffImageType(new TextEncoder().encode(text))).toBeNull();
    }
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("checkLogoFile", () => {
  it("accepts a real image whatever the name or declared type says", async () => {
    expect(await checkLogoFile(blob([...PNG, 1, 2, 3], "text/plain"))).toBeNull();
    expect(await checkLogoFile(blob([0xff, 0xd8, 0xff, 0xe0, 0, 1], "image/jpeg"))).toBeNull();
  });

  it("refuses a text file that claims to be a PNG", async () => {
    expect(await checkLogoFile(blob("just text", "image/png"))).toBe(LOGO_TYPE_MESSAGE);
  });

  it("refuses an empty file", async () => {
    expect(await checkLogoFile(blob([]))).toBe(LOGO_EMPTY_MESSAGE);
  });

  it("refuses a file over 5 MB, and accepts one of exactly 5 MB", async () => {
    const atLimit = new Uint8Array(MAX_LOGO_BYTES);
    atLimit.set(PNG);
    expect(await checkLogoFile(new Blob([atLimit]))).toBeNull();
    const over = new Uint8Array(MAX_LOGO_BYTES + 1);
    over.set(PNG);
    expect(await checkLogoFile(new Blob([over]))).toBe(LOGO_SIZE_MESSAGE);
  });
});
