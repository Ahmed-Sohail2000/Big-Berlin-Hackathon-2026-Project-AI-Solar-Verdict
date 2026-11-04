"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { LineSegment } from "@/lib/tile-count/grid";
import type { Point, Quad } from "@/lib/tile-count/types";

const CORNER_LABELS = ["Top left", "Top right", "Bottom right", "Bottom left"];
/** Magnifier size on screen, and the photo pixels it shows. */
const LOUPE_SIZE_PX = 176;
const LOUPE_SOURCE_PX = 44;

/** Overlay colours stay fixed in both themes: they sit on the photo, not on the page. */
const ROOF_COLOUR = "#3DAEFF";
const OBSTRUCTION_COLOUR = "#F2B84B";
const PANEL_COLOUR = "#62E6A7";

export interface OverlayShape {
  key: string;
  outline: Quad;
  dashed?: boolean;
}

interface Props {
  photo: HTMLCanvasElement;
  quad: Quad;
  grid: LineSegment[];
  obstructions: OverlayShape[];
  panels: OverlayShape[];
  /** Fires continuously while a corner moves. */
  onQuadChange: (quad: Quad) => void;
  /** Fires when a move ends; this is when the recount runs. */
  onQuadCommit: (quad: Quad) => void;
}

function pointList(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Photo with the roof outline, grid, panels and movable corners, plus a magnifier for exact placement. */
export function RoofOverlay({ photo, quad, grid, obstructions, panels, onQuadChange, onQuadCommit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  const latestQuad = useRef(quad);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const { width, height } = photo;

  useEffect(() => {
    latestQuad.current = quad;
  }, [quad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    canvas.getContext("2d")?.drawImage(photo, 0, 0);
  }, [photo]);

  useEffect(() => {
    const context = loupeRef.current?.getContext("2d");
    if (!context || activeCorner === null) return;
    const { x, y } = quad[activeCorner];
    const half = LOUPE_SOURCE_PX / 2;
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#000";
    context.fillRect(0, 0, LOUPE_SIZE_PX, LOUPE_SIZE_PX);
    context.drawImage(photo, x - half, y - half, LOUPE_SOURCE_PX, LOUPE_SOURCE_PX, 0, 0, LOUPE_SIZE_PX, LOUPE_SIZE_PX);
  }, [activeCorner, photo, quad]);

  const handleSize = Math.max(width, height) / 70;

  function moveCorner(index: number, point: Point): Quad {
    const next = [...latestQuad.current] as Quad;
    next[index] = {
      x: Math.min(width, Math.max(0, point.x)),
      y: Math.min(height, Math.max(0, point.y)),
    };
    latestQuad.current = next;
    onQuadChange(next);
    return next;
  }

  function pointerPosition(event: PointerEvent<SVGElement>): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function endDrag() {
    if (dragging.current === null) return;
    dragging.current = null;
    setActiveCorner(null);
    onQuadCommit(latestQuad.current);
  }

  /** Arrow keys move a corner one pixel, or ten with Shift. */
  function nudge(event: KeyboardEvent<SVGRectElement>, index: number) {
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const corner = latestQuad.current[index];
    onQuadCommit(moveCorner(index, { x: corner.x + move.x, y: corner.y + move.y }));
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border">
      <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Roof photo" />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerMove={(event) => {
          if (dragging.current !== null) moveCorner(dragging.current, pointerPosition(event));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {grid.map(({ from, to }, i) => (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={ROOF_COLOUR}
            strokeOpacity={0.55}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon
          points={pointList(quad)}
          fill="none"
          stroke={ROOF_COLOUR}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {panels.map(({ key, outline }) => (
          <polygon
            key={key}
            points={pointList(outline)}
            fill="#0A0E1A"
            fillOpacity={0.55}
            stroke={PANEL_COLOUR}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {obstructions.map(({ key, outline, dashed }) => (
          <polygon
            key={key}
            points={pointList(outline)}
            fill={OBSTRUCTION_COLOUR}
            fillOpacity={0.18}
            stroke={OBSTRUCTION_COLOUR}
            strokeWidth={2}
            strokeDasharray={dashed ? "6 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {quad.map((corner, index) => (
          <rect
            key={CORNER_LABELS[index]}
            role="slider"
            tabIndex={0}
            aria-label={`${CORNER_LABELS[index]} roof corner. Arrow keys move it.`}
            aria-valuenow={Math.round(corner.x)}
            x={corner.x - handleSize / 2}
            y={corner.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="#0A0E1A"
            stroke={ROOF_COLOUR}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="cursor-move outline-none focus:stroke-[#F7F8FA]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              dragging.current = index;
              setActiveCorner(index);
            }}
            onFocus={() => setActiveCorner(index)}
            onBlur={() => setActiveCorner(null)}
            onKeyDown={(event) => nudge(event, index)}
          />
        ))}
      </svg>
      {activeCorner !== null && (
        // Sits in the corner away from the handle being moved, so it never hides it.
        <div
          className={`pointer-events-none absolute top-3 overflow-hidden rounded-md border-2 border-[#3DAEFF] ${
            activeCorner === 0 || activeCorner === 3 ? "right-3" : "left-3"
          }`}
          style={{ width: LOUPE_SIZE_PX, height: LOUPE_SIZE_PX }}
        >
          <canvas ref={loupeRef} width={LOUPE_SIZE_PX} height={LOUPE_SIZE_PX} aria-hidden />
          <span className="absolute inset-x-0 top-1/2 h-px bg-[#3DAEFF]" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-[#3DAEFF]" />
        </div>
      )}
    </div>
  );
}
