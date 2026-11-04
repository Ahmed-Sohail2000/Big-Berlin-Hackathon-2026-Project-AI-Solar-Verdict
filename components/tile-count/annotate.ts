// components/installer/tile-count/annotate.ts
// Browser-only: renders the annotated photo for export and downloads files. Uses
// the same geometry as the live overlay, so the export matches what was reviewed.

import { gridLines, obstructionOutline } from "@/lib/tile-count/grid";
import type { Obstruction, Point, Quad } from "@/lib/tile-count/types";

/** Keeps the exported image, and so the PDF, at a sensible file size. */
const MAX_EXPORT_EDGE_PX = 1800;

function polygon(context: CanvasRenderingContext2D, points: Point[]) {
  context.beginPath();
  points.forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
  context.closePath();
  context.stroke();
}

export function annotatedCanvas(
  photo: HTMLCanvasElement,
  quad: Quad,
  rows: number,
  columns: number,
  obstructions: Obstruction[],
  panelOutlines: Quad[] = [],
): HTMLCanvasElement {
  const scale = Math.min(1, MAX_EXPORT_EDGE_PX / Math.max(photo.width, photo.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(photo.width * scale);
  canvas.height = Math.round(photo.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot process images.");

  context.drawImage(photo, 0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  const unit = Math.max(photo.width, photo.height) / 1000;

  context.strokeStyle = "rgba(61, 174, 255, 0.75)";
  context.lineWidth = unit * 0.8;
  for (const { from, to } of gridLines(quad, rows, columns)) {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  context.strokeStyle = "#3DAEFF";
  context.lineWidth = unit * 2.5;
  polygon(context, quad);

  context.strokeStyle = "#62E6A7";
  context.lineWidth = unit * 1.5;
  for (const outline of panelOutlines) polygon(context, outline);

  context.strokeStyle = "#F2B84B";
  context.lineWidth = unit * 2.5;
  for (const obstruction of obstructions) {
    const outline = obstructionOutline(obstruction, quad, rows, columns);
    if (outline) polygon(context, outline);
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image export failed."))),
      type,
      0.9,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
