export type ImageKind = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const startsWith = (buf: Uint8Array, bytes: number[], at = 0) => bytes.every((b, i) => buf[at + i] === b);

/**
 * Decides the image type from the file's first bytes. The file name and the Content-Type sent by the
 * client are never consulted, so a text file called `logo.png` is not an image. SVG is not accepted
 * (it can carry scripts).
 */
export function sniffImage(buf: Uint8Array): ImageKind | null {
  if (buf.length >= 3 && startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && startsWith(buf, PNG)) return { mime: "image/png", ext: "png" };
  // "RIFF" <4 size bytes> "WEBP"
  if (buf.length >= 12 && startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
