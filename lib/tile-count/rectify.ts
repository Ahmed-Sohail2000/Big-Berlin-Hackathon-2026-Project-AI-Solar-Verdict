// lib/tile-count/rectify.ts
// Flattens the roof quad into a rectangle so tile spacing no longer changes
// across the image. PURE, DETERMINISTIC, no I/O.

import { applyHomography, computeHomography } from "./homography";
import type { GrayImage, Point, Quad, RgbaImage } from "./types";

const MAX_RECTIFIED_EDGE = 3200;

export function toGray(image: RgbaImage): GrayImage {
  const { width, height, data } = image;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    gray[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
  }
  return { width, height, data: gray };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Output size for the flattened roof. The longer of each pair of opposite edges
 * keeps the far, foreshortened tiles from losing detail. Counting runs per axis,
 * so the aspect ratio does not have to match the real roof.
 */
export function rectifiedSize(quad: Quad): { width: number; height: number } {
  const [tl, tr, br, bl] = quad;
  const width = Math.max(distance(tl, tr), distance(bl, br));
  const height = Math.max(distance(tl, bl), distance(tr, br));
  const scale = Math.min(1, MAX_RECTIFIED_EDGE / Math.max(width, height));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export function rectangleQuad(width: number, height: number): Quad {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
}

function sampleBilinear(image: GrayImage, x: number, y: number): number {
  const { width, height, data } = image;
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const top = data[y0 * width + x0] * (1 - fx) + data[y0 * width + x1] * fx;
  const bottom = data[y1 * width + x0] * (1 - fx) + data[y1 * width + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Warps the quad area of the photo into a width x height rectangle. Null if the quad is degenerate. */
export function rectify(
  image: GrayImage,
  quad: Quad,
  width: number,
  height: number,
): GrayImage | null {
  // Inverse mapping: each output pixel looks up its source position, which leaves no holes.
  const toPhoto = computeHomography(rectangleQuad(width, height), quad);
  if (!toPhoto) return null;

  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = applyHomography(toPhoto, { x: x + 0.5, y: y + 0.5 });
      data[y * width + x] = sampleBilinear(image, p.x - 0.5, p.y - 0.5);
    }
  }
  return { width, height, data };
}
