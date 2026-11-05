// lib/tile-count/io/dxf.ts
// The confirmed roof as a true-scale 2D drawing for the CAD step (briefing §1, §6).
// DXF R12 ASCII is the oldest common denominator: every AutoCAD variant reads it.
// One drawing unit is one millimetre, with the origin at the bottom-left roof corner.
// No free text goes in, so a case reference can never alter the file's structure.
// PURE, DETERMINISTIC, no I/O.

import { computeDimensions } from "../planning/dimensions";
import { describeObstruction } from "../vision/obstructions";
import type { TileReport } from "./export";

const LAYERS = [
  { name: "ROOF", colour: 5 },
  { name: "TILE_GRID", colour: 8 },
  { name: "OBSTRUCTIONS", colour: 2 },
  { name: "PANELS", colour: 3 },
  { name: "LABELS", colour: 7 },
];
const LABEL_HEIGHT_MM = 100;

type Pair = [code: number, value: string | number];

function tables(): Pair[] {
  return [
    [0, "TABLE"], [2, "LTYPE"], [70, 1],
    [0, "LTYPE"], [2, "CONTINUOUS"], [70, 0], [3, "Solid line"], [72, 65], [73, 0], [40, 0],
    [0, "ENDTAB"],
    [0, "TABLE"], [2, "LAYER"], [70, LAYERS.length],
    ...LAYERS.flatMap(({ name, colour }): Pair[] => [[0, "LAYER"], [2, name], [70, 0], [62, colour], [6, "CONTINUOUS"]]),
    [0, "ENDTAB"],
  ];
}

function line(layer: string, x0: number, y0: number, x1: number, y1: number): Pair[] {
  return [[0, "LINE"], [8, layer], [10, x0], [20, y0], [30, 0], [11, x1], [21, y1], [31, 0]];
}

function rectangle(layer: string, x: number, y: number, width: number, height: number): Pair[] {
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  return [
    [0, "POLYLINE"], [8, layer], [66, 1], [10, 0], [20, 0], [30, 0], [70, 1],
    ...corners.flatMap(([cx, cy]): Pair[] => [[0, "VERTEX"], [8, layer], [10, cx], [20, cy], [30, 0]]),
    [0, "SEQEND"], [8, layer],
  ];
}

function label(x: number, y: number, text: string): Pair[] {
  return [[0, "TEXT"], [8, "LABELS"], [10, x], [20, y], [30, 0], [40, LABEL_HEIGHT_MM], [1, text]];
}

function formatPair([code, value]: Pair): string {
  const text = typeof value === "number" && !Number.isInteger(value) ? value.toFixed(3) : String(value);
  return `${String(code).padStart(3)}\r\n${text}\r\n`;
}

export function toDxf(report: TileReport): string {
  const { rows, columns, tileSize, obstructions, panels } = report;
  const { exposedHeightMm: exposed, coverWidthMm: cover, heightM, widthM } = computeDimensions(rows, columns, tileSize);
  const roofWidth = columns * cover;
  const roofHeight = rows * exposed;

  const entities: Pair[] = [
    ...rectangle("ROOF", 0, 0, roofWidth, roofHeight),
    ...Array.from({ length: rows - 1 }, (_, i) => line("TILE_GRID", 0, (i + 1) * exposed, roofWidth, (i + 1) * exposed)).flat(),
    ...Array.from({ length: columns - 1 }, (_, i) => line("TILE_GRID", (i + 1) * cover, 0, (i + 1) * cover, roofHeight)).flat(),
    ...label(0, roofHeight + LABEL_HEIGHT_MM, `${rows} tiles high, ${columns} wide, ${heightM.toFixed(2)} x ${widthM.toFixed(2)} m`),
  ];
  for (const o of obstructions) {
    const [x, y] = [o.fromLeft * cover, o.fromBottom * exposed];
    entities.push(...rectangle("OBSTRUCTIONS", x, y, o.widthTiles * cover, o.heightTiles * exposed));
    entities.push(...label(x, y + o.heightTiles * exposed + LABEL_HEIGHT_MM / 2, `${o.kind.replace(/_/g, " ")}: ${describeObstruction(o)}`));
  }
  for (const p of panels?.plan.panels ?? []) {
    entities.push(...rectangle("PANELS", p.xMm, p.yMm, p.widthMm, p.heightMm));
  }

  const pairs: Pair[] = [
    [0, "SECTION"], [2, "HEADER"], [9, "$ACADVER"], [1, "AC1009"], [0, "ENDSEC"],
    [0, "SECTION"], [2, "TABLES"], ...tables(), [0, "ENDSEC"],
    [0, "SECTION"], [2, "ENTITIES"], ...entities, [0, "ENDSEC"],
    [0, "EOF"],
  ];
  return pairs.map(formatPair).join("");
}
