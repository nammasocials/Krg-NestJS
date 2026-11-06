/** What the logo picker holds: leave the saved logo alone, remove it, or replace it with a new file. */
export type LogoChange = { action: "keep" } | { action: "remove" } | { action: "replace"; file: File };

export const MAX_LOGO_MB = 5;
export const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;
export const LOGO_ACCEPT = "image/jpeg,image/png,image/webp";

export const LOGO_TYPE_MESSAGE = "Choose a JPEG, PNG or WebP image.";
export const LOGO_SIZE_MESSAGE = `The image is larger than ${MAX_LOGO_MB} MB.`;
export const LOGO_EMPTY_MESSAGE = "That file is empty.";

const startsWith = (buf: Uint8Array, bytes: number[], at = 0) => bytes.every((b, i) => buf[at + i] === b);

/** Same idea as the API: the type comes from the file's first bytes, not from its name. */
export function sniffImageType(buf: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (buf.length >= 8 && startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (buf.length >= 12 && startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

/** Checks a chosen file before anything is uploaded. Returns a message, or null when it is fine. */
export async function checkLogoFile(file: Blob): Promise<string | null> {
  if (file.size === 0) return LOGO_EMPTY_MESSAGE;
  if (file.size > MAX_LOGO_BYTES) return LOGO_SIZE_MESSAGE;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return sniffImageType(head) ? null : LOGO_TYPE_MESSAGE;
}
