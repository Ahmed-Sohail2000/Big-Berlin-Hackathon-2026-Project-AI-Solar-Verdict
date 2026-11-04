// components/installer/tile-count/decode.ts
// Browser-only: turns an uploaded file into pixels. Redrawing to a canvas drops all
// EXIF/GPS metadata, and nothing here leaves the employee's machine.

import { checkUpload, sniffPhotoFormat } from "@/lib/tile-count/upload";
import type { RgbaImage } from "@/lib/tile-count/types";

/** Above iPhone native resolution, so a phone photo is never scaled down. Guards memory only. */
const MAX_EDGE_PX = 4096;
/** PDF scans are rendered at this zoom before the size limit applies. */
const PDF_RENDER_SCALE = 3;

export interface DecodedPhoto {
  canvas: HTMLCanvasElement;
  pixels: RgbaImage;
}

async function heicToBlob(file: File): Promise<Blob> {
  // Imported on demand: the library is large and touches `window` at load time.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
  return Array.isArray(converted) ? converted[0] : converted;
}

async function pdfPageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  // Served from our own bundle. It must never come from a CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const page = await (await loading.promise).getPage(1);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas;
  } finally {
    await loading.destroy();
  }
}

/** Decodes a file to a size-capped canvas. Throws an Error with a user-facing message. */
export async function decodePhoto(file: File): Promise<DecodedPhoto> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const problem = checkUpload(file.size, head);
  if (problem) throw new Error(problem);

  const format = sniffPhotoFormat(head);
  let source: CanvasImageSource & { width: number; height: number };
  try {
    if (format === "pdf") source = await pdfPageToCanvas(file);
    else if (format === "heic") source = await createImageBitmap(await heicToBlob(file));
    else source = await createImageBitmap(file);
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
  return { canvas, pixels: { data, width, height } };
}
