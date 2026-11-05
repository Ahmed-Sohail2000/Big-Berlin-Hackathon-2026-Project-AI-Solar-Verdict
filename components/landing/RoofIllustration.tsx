import { gridLines, tileRectOutline } from "@/lib/tile-count/vision/grid";
import type { Point, Quad } from "@/lib/tile-count/types";

const WIDTH = 640;
const HEIGHT = 400;
const ROWS = 14;
const COLUMNS = 22;
const ROOF: Quad = [
  { x: 150, y: 40 },
  { x: 510, y: 50 },
  { x: 610, y: 350 },
  { x: 30, y: 340 },
];
const OBSTRUCTION = { fromLeft: 16, fromBottom: 8, wide: 3, high: 3 };
const PANEL = { wide: 3, high: 4 };
const PANEL_COLUMNS = [3, 6, 9, 12];
const PANEL_ROWS = [2, 6];

function pointList(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function tileOutline(fromLeft: number, fromBottom: number, wide: number, high: number): Quad | null {
  return tileRectOutline(fromLeft, fromBottom, wide, high, ROOF, ROWS, COLUMNS);
}

/** What the tool draws on a photo: drawn with the same perspective maths as the real overlay. */
export function RoofIllustration({ caption }: { caption: string }) {
  const panels = PANEL_ROWS.flatMap((fromBottom) =>
    PANEL_COLUMNS.map((fromLeft) => tileOutline(fromLeft, fromBottom, PANEL.wide, PANEL.high)),
  );
  const obstruction = tileOutline(OBSTRUCTION.fromLeft, OBSTRUCTION.fromBottom, OBSTRUCTION.wide, OBSTRUCTION.high);

  return (
    <figure className="rounded-lg border border-border bg-surface p-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={caption}>
        <polygon points={pointList(ROOF)} className="fill-surface-raised" />
        {gridLines(ROOF, ROWS, COLUMNS).map(({ from, to }, index) => (
          <line
            key={index}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeWidth={0.75}
            className="stroke-accent opacity-40"
          />
        ))}
        {panels.map(
          (outline, index) =>
            outline && (
              <polygon key={index} points={pointList(outline)} strokeWidth={1.5} className="fill-success/25 stroke-success" />
            ),
        )}
        {obstruction && (
          <polygon points={pointList(obstruction)} strokeWidth={2} className="fill-warning/25 stroke-warning" />
        )}
        <polygon points={pointList(ROOF)} fill="none" strokeWidth={2.5} className="stroke-accent" />
        {ROOF.map((corner) => (
          <rect
            key={corner.x}
            x={corner.x - 6}
            y={corner.y - 6}
            width={12}
            height={12}
            strokeWidth={2}
            className="fill-background stroke-accent"
          />
        ))}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
