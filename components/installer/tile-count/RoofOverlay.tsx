"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { gridLines, obstructionOutline } from "@/lib/tile-count/grid";
import type { Obstruction, Point, Quad } from "@/lib/tile-count/types";

const CORNER_LABELS = ["Top left", "Top right", "Bottom right", "Bottom left"];

interface Props {
  photo: HTMLCanvasElement;
  quad: Quad;
  rows: number | null;
  columns: number | null;
  obstructions: Obstruction[];
  /** Fires continuously while a corner moves. */
  onQuadChange: (quad: Quad) => void;
  /** Fires when a move ends; this is when the recount runs. */
  onQuadCommit: (quad: Quad) => void;
}

/** Photo with the roof outline, counting grid and movable corner points. */
export function RoofOverlay({
  photo,
  quad,
  rows,
  columns,
  obstructions,
  onQuadChange,
  onQuadCommit,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  const latestQuad = useRef(quad);
  const { width, height } = photo;
  latestQuad.current = quad;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    canvas.getContext("2d")?.drawImage(photo, 0, 0);
  }, [photo]);

  const handleSize = Math.max(width, height) / 70;
  const hasGrid = rows !== null && columns !== null && rows > 0 && columns > 0;

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
    onQuadCommit(latestQuad.current);
  }

  /** Arrow keys move a corner one pixel, or ten with Shift, for exact placement. */
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
    <div className="relative w-full overflow-hidden rounded-lg border border-[#2A3038]">
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
        {hasGrid &&
          gridLines(quad, rows, columns).map(({ from, to }, i) => (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#3DAEFF"
              strokeOpacity={0.6}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        <polygon
          points={quad.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#3DAEFF"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {hasGrid &&
          obstructions.map((obstruction) => {
            const outline = obstructionOutline(obstruction, quad, rows, columns);
            if (!outline) return null;
            return (
              <polygon
                key={obstruction.id}
                points={outline.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="#F2B84B"
                fillOpacity={0.15}
                stroke="#F2B84B"
                strokeWidth={2}
                strokeDasharray={obstruction.proposed ? "6 4" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
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
            stroke="#3DAEFF"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="cursor-move outline-none focus:stroke-[#F7F8FA]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              dragging.current = index;
            }}
            onKeyDown={(event) => nudge(event, index)}
          />
        ))}
      </svg>
    </div>
  );
}
