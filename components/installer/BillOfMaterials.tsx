"use client";

import type { BoM } from "@/lib/contracts";
import type { VariantSourceUrls } from "@/lib/sizing/compose-from-market";
import { SourceUrlChip } from "@/components/installer/SourceUrlChip";
import catalog from "@/data/fixtures/german_market_catalog.json";

/**
 * Sell-ready Bill of Materials table for the installer proposal.
 *
 * Per-line prices are DERIVED, never invented: each BoM component is looked
 * up in the cached German market catalog (the same catalog that
 * lib/sizing/compose-from-market.ts priced the variant from) by brand+model
 * (mount: by source URL). Lines without a catalog match show "Included".
 * The balance-of-system line only shows a euro figure when every hardware
 * line matched, so it is exactly totalEur minus derived hardware (the same
 * labour/BOS uplift the composer applied). Otherwise it too says "Included".
 */

interface Props {
  bom: BoM;
  sourceUrls?: VariantSourceUrls;
}

interface CatalogEntry {
  brand?: string;
  model?: string;
  eurEx?: number;
  sourceUrl?: string;
}

const CATALOG = catalog as unknown as Record<string, unknown>;

function listOf(key: string): CatalogEntry[] {
  const value = CATALOG[key];
  return Array.isArray(value) ? (value as CatalogEntry[]) : [];
}

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Unit price (EUR ex VAT) for a brand+model, or null when not in the catalog. */
function unitPrice(listKey: string, brand: string, model: string): number | null {
  const hit = listOf(listKey).find(
    (e) => norm(e.brand) === norm(brand) && norm(e.model) === norm(model),
  );
  return typeof hit?.eurEx === "number" && hit.eurEx > 0 ? hit.eurEx : null;
}

/** Mount has no brand/model on the BoM; match by the variant source URL. */
function mountUnitPrice(sourceUrl: string | undefined): number | null {
  if (!sourceUrl) return null;
  const hit = listOf("mounts").find((e) => e.sourceUrl === sourceUrl);
  return typeof hit?.eurEx === "number" && hit.eurEx > 0 ? hit.eurEx : null;
}

interface BomRow {
  key: string;
  item: string;
  spec: string;
  qty: string;
  /** Derived line total in EUR, or null (rendered as "Included"). */
  lineEur: number | null;
  sourceUrl?: string;
}

function euro(n: number): string {
  // Match the app-wide idiom (€18,368) — plain toLocaleString like every
  // other euro figure in the installer views.
  return `€${Math.round(n).toLocaleString()}`;
}

export function BillOfMaterials({ bom, sourceUrls }: Props) {
  const rows: BomRow[] = [];

  const panelUnit = unitPrice("panels", bom.panels.brand, bom.panels.model);
  rows.push({
    key: "panels",
    item: "Solar panels",
    spec: `${bom.panels.brand} ${bom.panels.model} · ${bom.panels.wp} Wp · ${(
      (bom.panels.count * bom.panels.wp) / 1000
    ).toFixed(1)} kWp DC`,
    qty: `${bom.panels.count}×`,
    lineEur: panelUnit !== null ? panelUnit * bom.panels.count : null,
    sourceUrl: sourceUrls?.panel,
  });

  rows.push({
    key: "inverter",
    item: "Inverter",
    spec: `${bom.inverter.brand} ${bom.inverter.model} · ${bom.inverter.kw} kW AC`,
    qty: "1×",
    lineEur: unitPrice("inverters", bom.inverter.brand, bom.inverter.model),
    sourceUrl: sourceUrls?.inverter,
  });

  if (bom.battery) {
    rows.push({
      key: "battery",
      item: "Battery storage",
      spec: `${bom.battery.brand} ${bom.battery.model} · ${bom.battery.kwh} kWh`,
      qty: "1×",
      lineEur: unitPrice("batteries", bom.battery.brand, bom.battery.model),
      sourceUrl: sourceUrls?.battery,
    });
  }

  if (bom.wallbox) {
    rows.push({
      key: "wallbox",
      item: "Wallbox (EV charger)",
      spec: `${bom.wallbox.brand} ${bom.wallbox.model} · ${bom.wallbox.kw} kW`,
      qty: "1×",
      lineEur: unitPrice("wallboxes", bom.wallbox.brand, bom.wallbox.model),
      sourceUrl: sourceUrls?.wallbox,
    });
  }

  if (bom.heatPump) {
    rows.push({
      key: "heatPump",
      item: "Heat pump",
      spec: `${bom.heatPump.brand} ${bom.heatPump.model} · ${bom.heatPump.kw} kW`,
      qty: "1×",
      lineEur: unitPrice("heatPumps", bom.heatPump.brand, bom.heatPump.model),
      sourceUrl: sourceUrls?.heatPump,
    });
  }

  const mountUnit = mountUnitPrice(sourceUrls?.mount);
  if (sourceUrls?.mount) {
    rows.push({
      key: "mount",
      item: "Mounting system",
      spec: "Per-panel rails, roof hooks, module clamps",
      qty: `${bom.panels.count}×`,
      lineEur: mountUnit !== null ? mountUnit * bom.panels.count : null,
      sourceUrl: sourceUrls.mount,
    });
  }

  // Balance of system: only price it when EVERY hardware line above was
  // derivable, so it is exactly totalEur minus hardware. Never invent.
  const allPriced = rows.every((r) => r.lineEur !== null);
  const hardwareSum = rows.reduce((sum, r) => sum + (r.lineEur ?? 0), 0);
  const bosEur =
    allPriced && bom.totalEur - hardwareSum >= 0 ? bom.totalEur - hardwareSum : null;
  rows.push({
    key: "bos",
    item: "Balance of system & installation",
    spec: "DC cabling, AC protection, grid connection, installation labor",
    qty: "—",
    lineEur: bosEur,
  });

  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#F7F8FA]">Bill of materials</h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5B6470]">
            AI-recommended BoM · priced from the scraped German market catalog
          </p>
        </div>
        <span className="text-lg font-semibold tabular-nums text-[#F7F8FA]">
          {euro(bom.totalEur)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#2A3038] bg-[#0A0E1A]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2A3038] text-left text-[10px] uppercase tracking-wider text-[#5B6470]">
              <th scope="col" className="px-3 py-2 font-medium">Component</th>
              <th scope="col" className="px-3 py-2 font-medium">Specification</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-[#2A3038]">
                <td className="whitespace-nowrap px-3 py-2.5 align-top font-medium text-[#F7F8FA]">
                  {row.item}
                </td>
                <td className="px-3 py-2.5 align-top text-[#9BA3AF]">
                  <span>{row.spec}</span>
                  {row.sourceUrl ? (
                    <span className="mt-1 block">
                      <SourceUrlChip url={row.sourceUrl} />
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right align-top tabular-nums text-[#F7F8FA]">
                  {row.qty}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums text-[#F7F8FA]">
                  {row.lineEur !== null ? (
                    euro(row.lineEur)
                  ) : (
                    <span className="text-[#5B6470]">Included</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={3}
                className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider text-[#9BA3AF]"
              >
                Total installed price
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[#62E6A7]">
                {euro(bom.totalEur)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-[#5B6470]">
        Line prices are hardware list prices (ex VAT) from the market catalog; the
        balance-of-system line carries everything else so the lines always sum to the total.
      </p>
    </section>
  );
}
