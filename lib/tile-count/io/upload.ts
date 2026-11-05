// lib/tile-count/io/upload.ts
// Upload checks, for one photo or a whole customer folder. The format comes from the
// file's leading bytes, not its name or browser-reported type, both of which can be
// wrong or forged. Nothing here decodes a file: these checks run first, so a hostile
// or oversized file is refused before the browser spends memory on it.
// PURE, DETERMINISTIC, no I/O.

export type PhotoFormat = "jpeg" | "png" | "heic" | "pdf";

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
/** Twice a 48 MP iPhone or drone photo. A small file can still declare enormous dimensions. */
export const MAX_PIXELS = 100_000_000;
export const MAX_FOLDER_FILES = 50;
/** Reaches the JPEG size marker past EXIF data and embedded previews. */
export const HEAD_BYTES = 512 * 1024;
export const TAIL_BYTES = 64 * 1024;

/** ISO base media brands used by HEIC/HEIF stills. */
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
/** Files every operating system drops into folders. Skipped without comment. */
const SYSTEM_FILES = /^(\..*|thumbs\.db|desktop\.ini)$/i;

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

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let p = 2;
  while (p + 9 < bytes.length) {
    if (bytes[p] !== 0xff) return null;
    const marker = bytes[p + 1];
    if (marker === 0xff) {
      p++;
      continue;
    }
    // Start-of-frame markers, except the three in that range that mean something else.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[p + 5] << 8) | bytes[p + 6], width: (bytes[p + 7] << 8) | bytes[p + 8] };
    }
    p += 2 + ((bytes[p + 2] << 8) | bytes[p + 3]);
  }
  return null;
}

/** Pixel size declared in a JPEG or PNG header. Null when the header does not say. */
export function declaredSize(bytes: Uint8Array): { width: number; height: number } | null {
  const format = sniffPhotoFormat(bytes);
  if (format === "jpeg") return jpegSize(bytes);
  if (format === "png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  return null;
}

/** Returns a user-facing problem with the file, or null when it is safe to decode. */
export function checkUpload(sizeBytes: number, bytes: Uint8Array): string | null {
  if (sizeBytes === 0) return "This file is empty.";
  if (sizeBytes > MAX_UPLOAD_BYTES) return "This file is larger than 30 MB.";
  if (!sniffPhotoFormat(bytes)) return "Use a JPEG, PNG, HEIC or PDF file.";
  const size = declaredSize(bytes);
  if (size && size.width * size.height > MAX_PIXELS) {
    return `This image declares ${Math.round((size.width * size.height) / 1e6)} megapixels. The limit is ${MAX_PIXELS / 1e6}.`;
  }
  return null;
}

function includesBytes(haystack: Uint8Array, needle: number[]): boolean {
  for (let i = haystack.length - needle.length; i >= 0; i--) {
    if (needle.every((value, offset) => haystack[i + offset] === value)) return true;
  }
  return false;
}

/**
 * True when the end-of-image marker is missing. A browser still shows such a photo,
 * with a grey or missing lower part, which would be counted as if it were the roof.
 */
export function looksTruncated(format: PhotoFormat | null, tail: Uint8Array): boolean {
  if (format === "jpeg") return !includesBytes(tail, [0xff, 0xd9]);
  if (format === "png") return !includesBytes(tail, [0x49, 0x45, 0x4e, 0x44]);
  return false;
}

export interface FolderEntry {
  name: string;
  sizeBytes: number;
  head: Uint8Array;
  tail: Uint8Array;
}

export interface ScreenedEntry {
  /** Position in the screened list, so the caller can find the file again. */
  index: number;
  name: string;
  /** Why this file will not be opened. */
  problem: string | null;
  /** Worth seeing, but the file can still be opened. */
  notice: string | null;
}

/** Screens a folder's files: system files are dropped, everything else gets a verdict. */
export function screenFolder(entries: FolderEntry[]): ScreenedEntry[] {
  const seen = new Set<string>();
  const screened: ScreenedEntry[] = [];
  entries.forEach(({ name, sizeBytes, head, tail }, index) => {
    if (SYSTEM_FILES.test(name)) return;
    const overLimit = screened.length >= MAX_FOLDER_FILES;
    let problem = overLimit ? `Only the first ${MAX_FOLDER_FILES} files are checked.` : checkUpload(sizeBytes, head);
    const key = `${name}|${sizeBytes}`;
    if (!problem && seen.has(key)) problem = "Same name and size as another file here.";
    seen.add(key);
    const truncated = !problem && looksTruncated(sniffPhotoFormat(head), tail);
    const notice = truncated ? "This file may be incomplete. Check the whole roof is visible." : null;
    screened.push({ index, name, problem, notice });
  });
  return screened;
}
