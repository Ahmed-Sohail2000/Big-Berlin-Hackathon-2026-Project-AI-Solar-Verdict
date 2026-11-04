// lib/tile-count/periodicity.ts
// Finds the repeat distance of the tile pattern with autocorrelation, which holds
// up better than per-tile detection against moss, shadows and blurred edges.
// PURE, DETERMINISTIC, no I/O.

import type { GrayImage } from "./types";

/** Below this a tile covers too few pixels to measure. */
export const MIN_PERIOD_PX = 6;
/** A roof shows at least this many tiles along an axis. */
const MIN_REPEATS = 4;
const MAX_HARMONICS = 6;
/** Below this the pattern cannot be told apart from noise. */
const MIN_CONTRAST = 0.12;

export type Axis = "rows" | "columns";

export interface PeriodEstimate {
  periodPx: number;
  /** Autocorrelation peaks minus the troughs between them, roughly 0..1.5. */
  contrast: number;
  /** Share of expected harmonics that are really present, 0..1. */
  harmonicSupport: number;
}

/** Removes shading and large moss patches, which change far more slowly than the tiles. */
export function detrend(signal: Float32Array): Float32Array {
  const n = signal.length;
  const radius = Math.max(8, Math.floor(n / 6));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + signal[i];

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - radius);
    const end = Math.min(n, i + radius + 1);
    out[i] = signal[i] - (prefix[end] - prefix[start]) / (end - start);
  }
  return out;
}

/**
 * Normalised autocorrelation up to maxLag. Each lag is divided by its overlap
 * length so distant harmonics are not artificially damped. Returns null for a
 * flat signal.
 */
export function autocorrelate(signal: Float32Array, maxLag: number): Float32Array | null {
  const n = signal.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += signal[i] * signal[i];
  energy /= n;
  if (energy < 1e-9) return null;

  const result = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < n; i++) sum += signal[i] * signal[i + lag];
    result[lag] = sum / (n - lag) / energy;
  }
  return result;
}

/** Sub-pixel peak position from a parabola through the three samples around lag. */
function refinePeak(ac: Float32Array, lag: number): number {
  if (lag <= 0 || lag >= ac.length - 1) return lag;
  const denominator = ac[lag - 1] - 2 * ac[lag] + ac[lag + 1];
  if (Math.abs(denominator) < 1e-9) return lag;
  const offset = (ac[lag - 1] - ac[lag + 1]) / (2 * denominator);
  return Math.abs(offset) <= 1 ? lag + offset : lag;
}

function maxNear(ac: Float32Array, center: number, radius: number): { lag: number; value: number } {
  const start = Math.max(1, Math.round(center - radius));
  const end = Math.min(ac.length - 1, Math.round(center + radius));
  let lag = start;
  for (let i = start; i <= end; i++) if (ac[i] > ac[lag]) lag = i;
  return { lag, value: ac[lag] };
}

/**
 * Peak height minus the height halfway between peaks, across the harmonics of
 * `period`. The midpoints are what separate the true period from its multiples:
 * for a candidate of twice the real period, the midpoint lands on a real peak and
 * the contrast collapses to about zero.
 */
function scoreCandidate(ac: Float32Array, period: number): PeriodEstimate {
  const harmonics = Math.min(MAX_HARMONICS, Math.floor((ac.length - 1) / period));
  let peakSum = 0;
  let troughSum = 0;
  let supported = 0;
  const first = maxNear(ac, period, Math.max(1, period * 0.03)).value;

  for (let k = 1; k <= harmonics; k++) {
    const peak = maxNear(ac, k * period, Math.max(1, k * period * 0.03)).value;
    peakSum += peak;
    troughSum += ac[Math.round((k - 0.5) * period)];
    if (peak > 0.5 * first) supported++;
  }
  return {
    periodPx: period,
    contrast: (peakSum - troughSum) / harmonics,
    harmonicSupport: supported / harmonics,
  };
}

/**
 * Sharpens the period by reading it from ever higher harmonics. A one pixel error
 * at the 8th harmonic is 1/8 px on the period, and over 60 tiles that accuracy is
 * the difference between a right and a wrong count.
 */
function refinePeriod(ac: Float32Array, coarse: number): number {
  let period = refinePeak(ac, Math.round(coarse));
  const reference = ac[Math.round(period)];
  for (let k = 2; k * period < ac.length - 1; k *= 2) {
    const peak = maxNear(ac, k * period, Math.max(1, period * 0.15));
    if (peak.value < 0.3 * reference) break;
    period = refinePeak(ac, peak.lag) / k;
  }
  return period;
}

/** Picks the fundamental period from an autocorrelation curve. Null if nothing repeats. */
export function findPeriod(
  ac: Float32Array,
  extent: number,
  minPeriod: number = MIN_PERIOD_PX,
): PeriodEstimate | null {
  const maxPeriod = Math.min(ac.length - 2, Math.floor(extent / MIN_REPEATS));
  const candidates: PeriodEstimate[] = [];
  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > 0) {
      candidates.push(scoreCandidate(ac, lag));
    }
  }
  if (candidates.length === 0) return null;

  const best = Math.max(...candidates.map((c) => c.contrast));
  if (best < MIN_CONTRAST) return null;
  // Prefer the shortest candidate close to the best score: multiples of the true
  // period can tie it, and a count that is half the truth is the worst failure.
  const chosen = candidates.find((c) => c.contrast >= 0.8 * best) ?? candidates[0];
  return { ...chosen, periodPx: refinePeriod(ac, chosen.periodPx) };
}

/** Mean of each row (axis "rows") or column (axis "columns") over a pixel range of the other axis. */
function profile(
  image: GrayImage,
  axis: Axis,
  crossStart: number,
  crossEnd: number,
  alongStart: number,
  alongEnd: number,
): Float32Array {
  const { width, data } = image;
  const out = new Float32Array(alongEnd - alongStart);
  const span = crossEnd - crossStart;
  for (let i = alongStart; i < alongEnd; i++) {
    let sum = 0;
    for (let c = crossStart; c < crossEnd; c++) {
      sum += axis === "rows" ? data[i * width + c] : data[c * width + i];
    }
    out[i - alongStart] = sum / span;
  }
  return out;
}

/**
 * Averages the autocorrelation of parallel bands across the image. Averaging the
 * curves, not the pixels, matters: autocorrelation ignores position, so the
 * half-tile stagger between courses reinforces the width signal instead of
 * cancelling it, and a slight leftover tilt in the rectification does no harm.
 */
export function bandedAutocorrelation(
  image: GrayImage,
  axis: Axis,
  bands: number,
  alongStart = 0,
  alongEnd?: number,
): Float32Array | null {
  const along = axis === "rows" ? image.height : image.width;
  const across = axis === "rows" ? image.width : image.height;
  const end = alongEnd ?? along;
  const maxLag = Math.floor((end - alongStart) / 2);
  const count = Math.max(1, Math.min(bands, across));

  const total = new Float32Array(maxLag + 1);
  let used = 0;
  for (let b = 0; b < count; b++) {
    const start = Math.floor((b * across) / count);
    const stop = Math.floor(((b + 1) * across) / count);
    const ac = autocorrelate(detrend(profile(image, axis, start, stop, alongStart, end)), maxLag);
    if (!ac) continue;
    for (let i = 0; i <= maxLag; i++) total[i] += ac[i];
    used++;
  }
  if (used === 0) return null;
  for (let i = 0; i <= maxLag; i++) total[i] /= used;
  return total;
}
