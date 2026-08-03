"use client";

import type { BoM, SizingResult } from "@/lib/contracts";
import { buildSldModel } from "@/components/installer/sld";

/**
 * Permit-ready single-line diagram (SLD).
 *
 * Renders a deterministic inline-SVG electrical single-line for the selected
 * variant: PV array → DC strings → DC isolator/combiner → inverter → AC
 * protection → meter/grid, with an optional DC-coupled battery branch. Every
 * rating comes from the BoM + the sizer's engineering block via buildSldModel
 * — nothing here is invented. Locked tokens, ≤8px radius, no gradients.
 */

type Engineering = NonNullable<SizingResult["engineering"]>;

interface Props {
  bom: BoM;
  engineering?: Engineering | null;
}

type Tone = "pv" | "neutral" | "grid";

interface Block {
  title: string;
  lines: string[];
  tone: Tone;
}

// Geometry (SVG user units — the viewBox scales to container width).
const PAD = 16;
const BLOCK_W = 132;
const BLOCK_H = 66;
const GAP = 26;
const ROW_Y = 30;
const TONE_STROKE: Record<Tone, string> = {
  pv: "#3DAEFF",
  neutral: "#2A3038",
  grid: "#62E6A7",
};

export function SingleLineDiagram({ bom, engineering }: Props) {
  const model = buildSldModel(bom, engineering);

  const blocks: Block[] = [
    {
      title: "PV Array",
      lines: [`${model.modules} modules`, `${model.arrayKwp} kWp`],
      tone: "pv",
    },
    {
      title: "DC Strings",
      lines: [`${model.strings} × ${model.modulesPerString}`, "modules/string"],
      tone: "pv",
    },
    {
      title: "DC Isolator",
      lines: ["combiner /", "disconnect"],
      tone: "neutral",
    },
    {
      title: "Inverter",
      lines: [
        model.inverter.brand,
        `${model.inverterKw} kW${model.dcAcRatio ? ` · ${model.dcAcRatio}:1` : ""}`,
      ],
      tone: "neutral",
    },
    {
      title: "AC Protection",
      lines: ["RCD / MCB", "AC isolator"],
      tone: "neutral",
    },
    {
      title: "Meter / Grid",
      lines: ["utility", "import / export"],
      tone: "grid",
    },
  ];

  const rowCount = blocks.length;
  const width = PAD * 2 + rowCount * BLOCK_W + (rowCount - 1) * GAP;
  // Battery branch adds a second row below the inverter.
  const batteryY = ROW_Y + BLOCK_H + 40;
  const height = model.battery ? batteryY + BLOCK_H + PAD : ROW_Y + BLOCK_H + PAD;

  const blockX = (i: number) => PAD + i * (BLOCK_W + GAP);
  const inverterIndex = 3;

  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AF]">
          Single-line diagram · permit-ready
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-[#5B6470]">
          {model.stringConfigDerived ? "Derived layout" : "Sized strings"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#2A3038] bg-[#0A0E1A] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Electrical single-line diagram from PV array to grid"
        >
          <defs>
            <marker
              id="sld-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#3DAEFF" />
            </marker>
          </defs>

          {/* Horizontal connectors between the primary blocks. */}
          {blocks.slice(0, -1).map((_, i) => {
            const x1 = blockX(i) + BLOCK_W;
            const x2 = blockX(i + 1);
            const y = ROW_Y + BLOCK_H / 2;
            return (
              <line
                key={`conn-${i}`}
                x1={x1}
                y1={y}
                x2={x2 - 1}
                y2={y}
                stroke="#3DAEFF"
                strokeWidth={1.5}
                markerEnd="url(#sld-arrow)"
              />
            );
          })}

          {/* Optional DC-coupled battery branch off the inverter. */}
          {model.battery ? (
            <>
              <line
                x1={blockX(inverterIndex) + BLOCK_W / 2}
                y1={ROW_Y + BLOCK_H}
                x2={blockX(inverterIndex) + BLOCK_W / 2}
                y2={batteryY}
                stroke="#3DAEFF"
                strokeWidth={1.5}
                markerEnd="url(#sld-arrow)"
              />
              <BlockRect
                x={blockX(inverterIndex)}
                y={batteryY}
                title="Battery"
                lines={[model.battery.brand, `${model.battery.kwh} kWh`]}
                tone="pv"
              />
            </>
          ) : null}

          {/* Primary blocks. */}
          {blocks.map((b, i) => (
            <BlockRect
              key={b.title}
              x={blockX(i)}
              y={ROW_Y}
              title={b.title}
              lines={b.lines}
              tone={b.tone}
            />
          ))}
        </svg>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[#5B6470]">
        Deterministic single-line from the selected BoM — array size, string
        configuration, inverter rating{model.battery ? " and storage" : ""} read
        straight from the engineering block. Schematic overview, not a stamped
        construction drawing.
      </p>
    </section>
  );
}

function BlockRect({
  x,
  y,
  title,
  lines,
  tone,
}: {
  x: number;
  y: number;
  title: string;
  lines: string[];
  tone: Tone;
}) {
  const cx = x + BLOCK_W / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BLOCK_W}
        height={BLOCK_H}
        rx={6}
        ry={6}
        fill="#12161C"
        stroke={TONE_STROKE[tone]}
        strokeWidth={1.25}
      />
      <text
        x={cx}
        y={y + 20}
        textAnchor="middle"
        fill="#F7F8FA"
        fontSize={12}
        fontWeight={600}
      >
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={line + i}
          x={cx}
          y={y + 38 + i * 15}
          textAnchor="middle"
          fill="#9BA3AF"
          fontSize={10}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
