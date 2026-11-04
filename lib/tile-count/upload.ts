// lib/tile-count/upload.ts
// Upload checks. The format comes from the file's leading bytes, not its name or
// browser-reported type, both of which can be wrong or forged.
// PURE, DETERMINISTIC, no I/O.

export type PhotoFormat = "jpeg" | "png" | "heic" | "pdf";

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/** ISO base media brands used by HEIC/HEIF stills. */
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Identifies the format from at least the first 12 bytes of a file. */
export function sniffPhotoFormat(bytes: Uint8Array): PhotoFormat | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(bytes, 0, 4) === "\x89PNG") return "png";
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  if (ascii(bytes, 4, 4) === "ftyp" && HEIC_BRANDS.includes(ascii(bytes, 8, 4))) return "heic";
  return null;
}

/** Returns a user-facing problem with the file, or null when it can be decoded. */
export function checkUpload(sizeBytes: number, bytes: Uint8Array): string | null {
  if (sizeBytes === 0) return "This file is empty.";
  if (sizeBytes > MAX_UPLOAD_BYTES) return "This file is larger than 30 MB.";
  if (!sniffPhotoFormat(bytes)) return "Use a JPEG, PNG, HEIC or PDF file.";
  return null;
}
