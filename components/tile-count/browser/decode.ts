// components/tile-count/browser/decode.ts
// Browser-only: turns an uploaded file into pixels. Redrawing to a canvas keeps the
// pixels and nothing else, so EXIF/GPS data, PDF scripts and anything hidden in the
// file are left behind. Nothing here leaves the employee's machine.

import {
  checkUpload,
  HEAD_BYTES,
  looksTruncated,
  sniffPhotoFormat,
  TAIL_BYTES,
} from "@/lib/tile-count/io/upload";
import type { RgbaImage } from "@/lib/tile-count/types";

/** Above iPhone native resolution, so a phone photo is never scaled down. Guards memory only. */
const MAX_EDGE_PX = 4096;
/** PDF scans are rendered at this zoom unless that would pass the size limit. */
const PDF_RENDER_SCALE = 3;
const HEIC_TIMEOUT_MS = 60_000;

export interface DecodedPhoto {
  canvas: HTMLCanvasElement;
  pixels: RgbaImage;
  /** Things the employee should know about this file. */
  notices: string[];
}

async function heicToBlob(file: File): Promise<Blob> {
  // Imported on demand: the library is large and touches `window` at load time.
  const { default: heic2any } = await import("heic2any");
  // The library never settles if its worker fails, so a time limit keeps the app from hanging.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("HEIC decoding timed out")), HEIC_TIMEOUT_MS);
  });
  try {
    const converted = await Promise.race([heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 }), expired]);
    return Array.isArray(converted) ? converted[0] : converted;
  } finally {
    clearTimeout(timer);
  }
}

async function pdfPageToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  // Served from our own bundle. It must never come from a CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const document_ = await loading.promise;
    const page = await document_.getPage(1);
    // A PDF can declare a huge page. The zoom is capped before any canvas is allocated.
    const natural = page.getViewport({ scale: 1 });
    const zoom = Math.min(PDF_RENDER_SCALE, MAX_EDGE_PX / Math.max(natural.width, natural.height));
    const viewport = page.getViewport({ scale: zoom });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return { canvas, pages: document_.numPages };
  } finally {
    await loading.destroy();
  }
}

/** Decodes a file to a size-capped canvas. Throws an Error with a user-facing message. */
export async function decodePhoto(file: File): Promise<DecodedPhoto> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  const problem = checkUpload(file.size, head);
  if (problem) throw new Error(problem);

  const format = sniffPhotoFormat(head);
  const notices: string[] = [];
  const tail = new Uint8Array(await file.slice(-TAIL_BYTES).arrayBuffer());
  if (looksTruncated(format, tail)) notices.push("This file may be incomplete. Check the whole roof is visible.");

  let source: CanvasImageSource & { width: number; height: number };
  try {
    if (format === "pdf") {
      const { canvas, pages } = await pdfPageToCanvas(file);
      source = canvas;
      if (pages > 1) notices.push(`This PDF has ${pages} pages. Only the first page is used.`);
    } else if (format === "heic") {
      source = await createImageBitmap(await heicToBlob(file));
    } else {
      source = await createImageBitmap(file);
    }
  } catch {
    throw new Error("This file could not be read. It may be damaged.");
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot process images.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { canvas, pixels: { data, width, height }, notices };
}
