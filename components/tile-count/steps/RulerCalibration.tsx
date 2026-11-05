"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { measureWithRuler } from "@/lib/tile-count/planning/dimensions";
import type { Point } from "@/lib/tile-count/types";
import { decodePhoto } from "../browser/decode";
import { NumberField } from "../ui/fields";

const STEPS = [
  "Click the start of the ruler section",
  "Click the end of the ruler section",
  "Click the top edge of the tile",
  "Click the bottom edge of the tile",
  "Click the left edge of the tile",
  "Click the right edge of the tile",
];

interface Props {
  onMeasured: (heightMm: number, widthMm: number) => void;
}

/**
 * Tile size from a reference photo with a folding ruler. The employee clicks the
 * marks; the app does the scaling. It does not read the ruler by itself.
 */
export function RulerCalibration({ onMeasured }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [rulerMm, setRulerMm] = useState("100");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(photo, 0, 0);
    context.fillStyle = "#3DAEFF";
    const size = Math.max(photo.width, photo.height) / 120;
    for (const p of points) context.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }, [photo, points]);

  async function load(file: File) {
    setError(null);
    setPoints([]);
    try {
      setPhoto((await decodePhoto(file)).canvas);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This file could not be read.");
    }
  }

  function addPoint(event: MouseEvent<HTMLCanvasElement>) {
    if (!photo || points.length >= STEPS.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = [
      ...points,
      {
        x: ((event.clientX - rect.left) / rect.width) * photo.width,
        y: ((event.clientY - rect.top) / rect.height) * photo.height,
      },
    ];
    setPoints(next);
    if (next.length < STEPS.length) return;

    const [rulerStart, rulerEnd, top, bottom, left, right] = next;
    const length = Number(rulerMm);
    const height = measureWithRuler(rulerStart, rulerEnd, length, top, bottom);
    const width = measureWithRuler(rulerStart, rulerEnd, length, left, right);
    if (height === null || width === null) setError("Check the ruler section length, then start again.");
    else onMeasured(height, width);
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
        aria-label="Reference photo with folding ruler"
        className="block w-full text-xs text-muted"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void load(file);
        }}
      />
      {error && <p className="text-xs text-warning">{error}</p>}
      {photo && (
        <>
          <NumberField label="Ruler section length (mm)" value={rulerMm} onChange={setRulerMm} />
          <p className="text-xs text-accent">
            {points.length < STEPS.length ? STEPS[points.length] : "Done. The tile size has been filled in."}
          </p>
          <canvas
            ref={canvasRef}
            onClick={addPoint}
            className="h-auto w-full cursor-crosshair rounded-md border border-border"
            aria-label="Reference photo. Click the points described above."
          />
          <button
            type="button"
            className="text-xs text-muted underline"
            onClick={() => {
              setPoints([]);
              setError(null);
            }}
          >
            Start again
          </button>
        </>
      )}
    </div>
  );
}
