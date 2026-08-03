"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { BoM } from "@/lib/contracts";
import type { VariantSourceUrls } from "@/lib/sizing/compose-from-market";
import { SourceUrlChip } from "@/components/installer/SourceUrlChip";
import catalog from "@/data/fixtures/german_market_catalog.json";

/** Engineer-added line item — a battery, heat pump, wiring/BoS line, etc.
 *  Local to the installer session; folds into the displayed BoM total. */
export interface CustomLineItem {
  id: string;
  label: string;
  eur?: number;
}

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
  /** Engineer-added lines (task: add a battery / heat pump / BoS line). When
   *  the add/remove handlers are provided the "+ Add item" affordance renders. */
  customItems?: CustomLineItem[];
  onAddCustomItem?: (item: { label: string; eur?: number }) => void;
  onRemoveCustomItem?: (id: string) => void;
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

export function BillOfMaterials({
  bom,
  sourceUrls,
  customItems = [],
  onAddCustomItem,
  onRemoveCustomItem,
}: Props) {
  const canEdit = typeof onAddCustomItem === "function";
  const [addOpen, setAddOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftEur, setDraftEur] = useState("");

  const submitDraft = () => {
    const label = draftLabel.trim();
    if (!label) return;
    const parsed = Number(draftEur);
    onAddCustomItem?.({
      label,
      eur: draftEur.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined,
    });
    setDraftLabel("");
    setDraftEur("");
    setAddOpen(false);
  };

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

  // Balance of system.
  //
  // Preferred path (commercial proposals): the BoM carries itemised
  // balanceOfSystem lines — mounting, DC string cabling, AC combiner /
  // protection, grid connection, installation labour — each with its own
  // catalog-derived `eur`. Render every line as-is; a missing `eur` shows
  // "Included" (never invented).
  //
  // Fallback path (residential BoMs with no balanceOfSystem): synthesise a
  // single line priced at totalEur minus derived hardware, and only when
  // every hardware line above was itself derivable so the arithmetic is honest.
  const bos = bom.balanceOfSystem;
  if (bos && bos.length > 0) {
    bos.forEach((line, idx) => {
      rows.push({
        key: `bos-${idx}`,
        item: line.item,
        spec: line.detail ?? "—",
        qty: "—",
        lineEur: typeof line.eur === "number" ? line.eur : null,
      });
    });
  } else {
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
  }

  // Engineer-added lines fold into the displayed total; the hardware + BoS
  // rows above still reconcile to the catalog total, so every line still sums.
  const extrasTotal = customItems.reduce(
    (sum, item) => sum + (typeof item.eur === "number" ? item.eur : 0),
    0,
  );
  const displayTotal = bom.totalEur + extrasTotal;

  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#F7F8FA]">Bill of materials</h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5B6470]">
            AI-recommended BoM · live market pricing
          </p>
        </div>
        <span className="text-lg font-semibold tabular-nums text-[#F7F8FA]">
          {euro(displayTotal)}
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
            {customItems.map((item) => (
              <tr key={item.id} className="border-b border-[#2A3038]">
                <td className="whitespace-nowrap px-3 py-2.5 align-top font-medium text-[#F7F8FA]">
                  {item.label}
                </td>
                <td className="px-3 py-2.5 align-top text-[#9BA3AF]">
                  <span className="rounded-md border border-[#62E6A7]/35 bg-[#62E6A7]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#62E6A7]">
                    Added by installer
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right align-top tabular-nums text-[#F7F8FA]">
                  —
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums text-[#F7F8FA]">
                  <span className="inline-flex items-center justify-end gap-2">
                    {typeof item.eur === "number" ? (
                      euro(item.eur)
                    ) : (
                      <span className="text-[#5B6470]">Included</span>
                    )}
                    {onRemoveCustomItem ? (
                      <button
                        type="button"
                        onClick={() => onRemoveCustomItem(item.id)}
                        className="flex h-5 w-5 items-center justify-center rounded-md border border-[#2A3038] bg-[#12161C] text-[#9BA3AF] transition-colors hover:border-[#F2B84B]/50 hover:text-[#F2B84B]"
                        aria-label={`Remove ${item.label}`}
                      >
                        <X size={11} />
                      </button>
                    ) : null}
                  </span>
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
                {euro(displayTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {canEdit ? (
        <div className="mt-3">
          {addOpen ? (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-[#2A3038] bg-[#0A0E1A] p-2.5">
              <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <label htmlFor="bom-add-label" className="text-[9px] uppercase tracking-wider text-[#5B6470]">
                  Item
                </label>
                <input
                  id="bom-add-label"
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDraft();
                  }}
                  placeholder="Battery, heat pump, extra wiring…"
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-xs text-[#F7F8FA] placeholder:text-[#5B6470] focus:border-[#3DAEFF] focus:outline-none"
                />
              </div>
              <div className="flex w-28 flex-col gap-1">
                <label htmlFor="bom-add-eur" className="text-[9px] uppercase tracking-wider text-[#5B6470]">
                  Price € (optional)
                </label>
                <input
                  id="bom-add-eur"
                  type="number"
                  min="0"
                  value={draftEur}
                  onChange={(e) => setDraftEur(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDraft();
                  }}
                  placeholder="0"
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-xs tabular-nums text-[#F7F8FA] placeholder:text-[#5B6470] focus:border-[#3DAEFF] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={submitDraft}
                disabled={draftLabel.trim() === ""}
                className="rounded-md bg-[#3DAEFF] px-3 py-1.5 text-xs font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  setDraftLabel("");
                  setDraftEur("");
                }}
                className="rounded-md border border-[#2A3038] px-2.5 py-1.5 text-xs font-medium text-[#9BA3AF] transition-colors hover:text-[#F7F8FA]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-[#2A3038] px-2.5 py-1.5 text-[11px] font-medium text-[#9BA3AF] transition-colors hover:border-[#3DAEFF]/50 hover:text-[#F7F8FA]"
            >
              <Plus size={12} />
              Add item
            </button>
          )}
        </div>
      ) : null}

      <p className="mt-2 text-[11px] leading-snug text-[#5B6470]">
        {bos && bos.length > 0
          ? "Line prices are catalog-derived (ex VAT); balance-of-system covers mounting, DC/AC wiring, grid connection and labour."
          : "Hardware list prices (ex VAT); the balance-of-system line covers the rest."}
      </p>
    </section>
  );
}
