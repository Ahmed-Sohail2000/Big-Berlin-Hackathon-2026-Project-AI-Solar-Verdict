"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Eye, EyeOff, Loader2, MapPin, Plus, Trash2, X } from "lucide-react";
import type { BuildingType, GridType, RoofSegment } from "@/lib/contracts";
import type { LeadRecord, LeadStatus } from "@/lib/leads/store";
import { InstallerLeadDetail } from "@/components/installer/InstallerLeadDetail";

interface Props {
  initialLeads: LeadRecord[];
  mapsApiKey?: string;
}

const EXACT_VIEW_STORAGE_KEY = "heliosense.installer.exactView";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function statusLabel(status: LeadStatus): string {
  if (status === "accepted") return "Accepted by you";
  if (status === "offer_sent") return "Offer sent";
  if (status === "closed") return "Closed";
  return "New";
}

function statusClass(status: LeadStatus): string {
  if (status === "new") return "border-[#3DAEFF]/35 bg-[#3DAEFF]/10 text-[#3DAEFF]";
  if (status === "accepted") return "border-[#62E6A7]/35 bg-[#62E6A7]/10 text-[#62E6A7]";
  return "border-[#F2B84B]/35 bg-[#F2B84B]/10 text-[#F2B84B]";
}

function staticMapUrl(lead: LeadRecord, apiKey?: string, useExact = false): string | null {
  if (!apiKey) return null;
  const sourceLat = useExact ? lead.privateDetails.lat : lead.publicPreview.blurredLat;
  const sourceLng = useExact ? lead.privateDetails.lng : lead.publicPreview.blurredLng;
  const lat = sourceLat.toFixed(6);
  const lng = sourceLng.toFixed(6);
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "14",
    size: "320x132",
    scale: "2",
    maptype: "satellite",
    key: apiKey,
  });
  params.append("markers", `color:blue|${lat},${lng}`);
  params.append("style", "feature:all|element:labels|visibility:off");
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** German residential tariff used across the app to convert kWh ↔ € bill. */
const EUR_PER_KWH = 0.32;

const BUILDING_TYPE_OPTIONS: { value: BuildingType; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "industrial", label: "Industrial" },
  { value: "agricultural", label: "Agricultural" },
  { value: "residential", label: "Residential" },
];

const GRID_TYPE_OPTIONS: { value: GridType; label: string }[] = [
  { value: "on_grid", label: "On-grid" },
  { value: "hybrid", label: "Hybrid" },
  { value: "off_grid", label: "Off-grid" },
];

type BillBasis = "monthly" | "annual";

interface AddLeadForm {
  address: string;
  buildingType: BuildingType;
  gridType: GridType;
  billBasis: BillBasis;
  monthlyBillEur: string;
  annualKwh: string;
}

const EMPTY_ADD_FORM: AddLeadForm = {
  address: "",
  buildingType: "office",
  gridType: "on_grid",
  billBasis: "monthly",
  monthlyBillEur: "",
  annualKwh: "",
};

export function InstallerMarketplace({ initialLeads, mapsApiKey }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedId, setSelectedId] = useState(initialLeads[0]?.id ?? null);
  // Default to exact view: testing needs the real building visible at all times.
  // The privacy-blurred mode is still selectable via the toggle for the demo pitch.
  const [exactView, setExactView] = useState(true);
  useEffect(() => {
    const stored = window.localStorage.getItem(EXACT_VIEW_STORAGE_KEY);
    if (stored === "0") setExactView(false);
  }, []);
  // -----------------------------------------------------------------------
  // Refetch on mount + on tab focus.
  //
  // Why: the lead store is in-memory on `globalThis` (lib/leads/store.ts).
  // On Vercel each serverless function invocation has its OWN Map, so a
  // POST to /api/leads (which created the lead in lambda instance A) and
  // an SSR for /installer (which ran on instance B) end up looking at
  // different stores. Instance B SSRs `initialLeads: []` and the
  // marketplace appears empty even though the lead exists.
  //
  // Refetching on mount works because the API GET *also* hits whatever
  // instance has the data — and Vercel's load balancer keeps warm
  // instances stable enough that we usually hit the same one twice in a
  // row. Focus-refetch covers the homeowner-just-submitted case where
  // the installer tab was already open.
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const refetch = async () => {
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { leads?: LeadRecord[] };
        if (cancelled) return;
        const fetched = Array.isArray(data.leads) ? data.leads : [];
        setLeads(fetched);
        // Only auto-select if nothing is selected yet — don't yank the
        // installer off the lead they were already inspecting.
        setSelectedId((prev) => prev ?? fetched[0]?.id ?? null);
      } catch {
        // Network blip — keep the existing list. Next focus event retries.
      }
    };
    refetch();
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  const toggleExactView = () => {
    setExactView((prev) => {
      const next = !prev;
      window.localStorage.setItem(EXACT_VIEW_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };
  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? null,
    [leads, selectedId],
  );
  const newCount = leads.filter((lead) => lead.status === "new").length;

  const updateLead = (updated: LeadRecord) => {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedId(updated.id);
  };

  // ---- Remove lead (inline confirm — no window.confirm) ------------------
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeLead = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      // 200 = deleted, 404 = already gone. Both mean "drop it from the list".
      // Anything else (e.g. the DELETE route not deployed yet) leaves the lead
      // in place and resets the confirm affordance so nothing silently vanishes.
      if (res.ok || res.status === 404) {
        const remaining = leads.filter((lead) => lead.id !== id);
        setLeads(remaining);
        setSelectedId((cur) => (cur === id ? remaining[0]?.id ?? null : cur));
      }
    } catch {
      // Network blip — keep the lead; the installer can retry.
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // ---- Add lead (manual installer entry) ---------------------------------
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddLeadForm>(EMPTY_ADD_FORM);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const resetAddForm = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddError(null);
  };

  const submitAddLead = async () => {
    const address = addForm.address.trim();
    if (!address) {
      setAddError("Enter a business address.");
      return;
    }
    const monthlyBillEur =
      addForm.billBasis === "monthly"
        ? Number(addForm.monthlyBillEur)
        : Math.round((Number(addForm.annualKwh) * EUR_PER_KWH) / 12);
    if (!Number.isFinite(monthlyBillEur) || monthlyBillEur <= 0) {
      setAddError(
        addForm.billBasis === "monthly"
          ? "Enter a monthly bill greater than 0."
          : "Enter an annual consumption greater than 0.",
      );
      return;
    }

    setAddBusy(true);
    setAddError(null);
    try {
      // Resolve the typed address to coordinates. In MOCK_MODE this always
      // returns the Reichstag fixture, which is exactly what the fixture
      // roof-facts chain expects.
      const geoRes = await fetch(`/api/forward-geocode?q=${encodeURIComponent(address)}`, {
        cache: "no-store",
      });
      const geo = (await geoRes.json().catch(() => null)) as
        | { lat?: number; lng?: number; address?: string; error?: string }
        | null;
      if (!geoRes.ok || !geo || typeof geo.lat !== "number" || typeof geo.lng !== "number") {
        setAddError(geo?.error ?? "Could not locate that address.");
        return;
      }

      // Measure the real roof before creating the lead — the same Solar-API
      // chain the homeowner flow uses. Without this the server falls back to a
      // small default roof, so the demand-priced BoM (driven by the bill) ends
      // up describing a far larger system than the placeholder roof can hold,
      // and the financials decouple (nonsensical payback). Passing the measured
      // segments keeps panel count, price, and payback describing one system.
      let roofSegments: RoofSegment[] | undefined;
      try {
        const rfRes = await fetch(`/api/roof-facts?lat=${geo.lat}&lng=${geo.lng}`, {
          cache: "no-store",
        });
        const rf = (await rfRes.json().catch(() => null)) as
          | { segments?: RoofSegment[] }
          | null;
        if (rfRes.ok && rf && Array.isArray(rf.segments) && rf.segments.length > 0) {
          roofSegments = rf.segments;
        }
      } catch {
        // Roof facts unavailable — let the server apply its default segments.
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `manual-${Date.now()}`,
          address: geo.address ?? address,
          district: address,
          lat: geo.lat,
          lng: geo.lng,
          monthlyBillEur,
          gridType: addForm.gridType,
          buildingType: addForm.buildingType,
          heating: "gas",
          goal: "lower_bill",
          ev: false,
          ...(roofSegments ? { roofSegments } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { lead?: LeadRecord; error?: string }
        | null;
      if (!res.ok || !data?.lead) {
        setAddError(data?.error ?? "Could not create the lead.");
        return;
      }

      setLeads((prev) => [data.lead as LeadRecord, ...prev]);
      setSelectedId(data.lead.id);
      setAddOpen(false);
      resetAddForm();
    } catch {
      setAddError("Network error — try again.");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#0A0E1A] text-[#F7F8FA]">
      <header className="flex items-center justify-between border-b border-[#2A3038] px-5 py-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-semibold tracking-tight">Berlin Solar Pro</span>
          <span className="text-xs text-[#9BA3AF]">Lead marketplace</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleExactView}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
              exactView
                ? "border-[#F2B84B]/45 bg-[#F2B84B]/10 text-[#F2B84B]"
                : "border-[#2A3038] bg-[#12161C] text-[#9BA3AF] hover:text-[#F7F8FA]"
            }`}
            title={exactView ? "Showing exact coords (debug)" : "Showing blurred coords (privacy view)"}
          >
            {exactView ? <EyeOff size={12} /> : <Eye size={12} />}
            {exactView ? "Exact (debug)" : "Privacy view"}
          </button>
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-[#62E6A7]" />
            <span className="text-xs text-[#9BA3AF]">{newCount} new</span>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[348px_1fr]">
        <aside className="min-h-0 border-b border-[#2A3038] bg-[#12161C] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-[#2A3038] px-4 py-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-sm font-semibold">Qualified leads</h1>
              <span className="text-xs tabular-nums text-[#9BA3AF]">{leads.length}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddOpen((v) => !v);
                setAddError(null);
              }}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                addOpen
                  ? "border-[#3DAEFF] bg-[#3DAEFF]/10 text-[#3DAEFF]"
                  : "border-[#2A3038] bg-[#0A0E1A] text-[#9BA3AF] hover:border-[#3DAEFF]/45 hover:text-[#F7F8FA]"
              }`}
              aria-expanded={addOpen}
            >
              {addOpen ? <X size={12} /> : <Plus size={12} />}
              {addOpen ? "Close" : "Add lead"}
            </button>
          </div>

          {addOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitAddLead();
              }}
              className="flex flex-col gap-3 border-b border-[#2A3038] bg-[#0A0E1A] p-4"
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="add-address" className="text-[10px] uppercase tracking-wider text-[#5B6470]">
                  Business address
                </label>
                <input
                  id="add-address"
                  type="text"
                  value={addForm.address}
                  onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Str. 1, 10115 Berlin"
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-sm text-[#F7F8FA] placeholder:text-[#5B6470] focus:border-[#3DAEFF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="add-building" className="text-[10px] uppercase tracking-wider text-[#5B6470]">
                    Building type
                  </label>
                  <select
                    id="add-building"
                    value={addForm.buildingType}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, buildingType: e.target.value as BuildingType }))
                    }
                    className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-sm text-[#F7F8FA] focus:border-[#3DAEFF] focus:outline-none"
                  >
                    {BUILDING_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="add-grid" className="text-[10px] uppercase tracking-wider text-[#5B6470]">
                    Grid type
                  </label>
                  <select
                    id="add-grid"
                    value={addForm.gridType}
                    onChange={(e) => setAddForm((f) => ({ ...f, gridType: e.target.value as GridType }))}
                    className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-sm text-[#F7F8FA] focus:border-[#3DAEFF] focus:outline-none"
                  >
                    {GRID_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 rounded-md border border-[#2A3038] bg-[#12161C] p-0.5 text-[11px]">
                  {(["monthly", "annual"] as BillBasis[]).map((basis) => (
                    <button
                      key={basis}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, billBasis: basis }))}
                      className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${
                        addForm.billBasis === basis
                          ? "bg-[#3DAEFF]/15 text-[#3DAEFF]"
                          : "text-[#9BA3AF] hover:text-[#F7F8FA]"
                      }`}
                      aria-pressed={addForm.billBasis === basis}
                    >
                      {basis === "monthly" ? "Monthly bill (€)" : "Annual use (kWh)"}
                    </button>
                  ))}
                </div>
                {addForm.billBasis === "monthly" ? (
                  <input
                    type="number"
                    min="1"
                    value={addForm.monthlyBillEur}
                    onChange={(e) => setAddForm((f) => ({ ...f, monthlyBillEur: e.target.value }))}
                    placeholder="Monthly electricity bill in €"
                    className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-sm tabular-nums text-[#F7F8FA] placeholder:text-[#5B6470] focus:border-[#3DAEFF] focus:outline-none"
                    aria-label="Monthly bill in euros"
                  />
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={addForm.annualKwh}
                    onChange={(e) => setAddForm((f) => ({ ...f, annualKwh: e.target.value }))}
                    placeholder="Annual consumption in kWh"
                    className="rounded-md border border-[#2A3038] bg-[#12161C] px-2.5 py-1.5 text-sm tabular-nums text-[#F7F8FA] placeholder:text-[#5B6470] focus:border-[#3DAEFF] focus:outline-none"
                    aria-label="Annual consumption in kWh"
                  />
                )}
              </div>

              {addError ? (
                <p className="text-[11px] text-[#F2B84B]">{addError}</p>
              ) : null}

              <button
                type="submit"
                disabled={addBusy}
                className="flex items-center justify-center gap-2 rounded-md bg-[#3DAEFF] px-3 py-2 text-sm font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0] disabled:cursor-wait disabled:opacity-60"
              >
                {addBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create lead
              </button>
            </form>
          ) : null}

          <div className="flex max-h-[42vh] flex-col gap-3 overflow-y-auto p-3 lg:max-h-[calc(100dvh-105px)]">
            {leads.map((lead) => {
              const mapUrl = staticMapUrl(lead, mapsApiKey, exactView);
              const selected = lead.id === selectedId;
              const confirming = confirmDeleteId === lead.id;
              const deleting = deletingId === lead.id;
              return (
                <div
                  key={lead.id}
                  className={`relative overflow-hidden rounded-lg border transition-colors ${
                    selected
                      ? "border-[#3DAEFF] bg-[#0A0E1A]"
                      : "border-[#2A3038] bg-[#0A0E1A]/70 hover:border-[#3DAEFF]/45"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    className="block w-full text-left"
                  >
                  <div className="relative h-28 bg-[#0A0E1A]">
                    {mapUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mapUrl} alt="" className="h-full w-full object-cover opacity-80" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#5B6470]">
                        <MapPin size={20} />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-md border border-[#2A3038] bg-[#0A0E1A]/85 px-2 py-1 text-[11px] text-[#9BA3AF] backdrop-blur">
                      {exactView ? "Exact location · debug" : `Approx. ${lead.publicPreview.blurRadiusMeters}m radius`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#F7F8FA]">
                          {lead.publicPreview.district}
                        </div>
                        <div className="mt-0.5 text-xs text-[#9BA3AF]">{relativeTime(lead.createdAt)}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(
                          lead.status,
                        )}`}
                      >
                        {statusLabel(lead.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-[#5B6470]">Area</div>
                        <div className="mt-0.5 tabular-nums text-[#F7F8FA]">
                          {lead.publicPreview.roofFacts.totalAreaM2 ?? "—"} m²
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5B6470]">Pitch</div>
                        <div className="mt-0.5 tabular-nums text-[#F7F8FA]">
                          {lead.publicPreview.roofFacts.pitchDeg ?? "—"}°
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5B6470]">Panels</div>
                        <div className="mt-0.5 tabular-nums text-[#F7F8FA]">
                          {lead.publicPreview.sizing.panelCount}
                        </div>
                      </div>
                    </div>
                  </div>
                  </button>

                  {/* Remove control — inline confirm so it can't be misclicked.
                      Sibling of the selection button (not nested) to keep valid
                      interactive markup. */}
                  <div className="absolute right-2 top-2 z-10">
                    {confirming ? (
                      <div className="flex items-center gap-1 rounded-md border border-[#F2B84B]/50 bg-[#0A0E1A]/95 px-1.5 py-1 backdrop-blur">
                        <span className="text-[10px] font-medium text-[#F7F8FA]">Remove?</span>
                        <button
                          type="button"
                          onClick={() => removeLead(lead.id)}
                          disabled={deleting}
                          className="flex h-5 w-5 items-center justify-center rounded border border-[#F2B84B]/50 bg-[#F2B84B]/15 text-[#F2B84B] transition-colors hover:bg-[#F2B84B]/25 disabled:opacity-60"
                          aria-label="Confirm remove lead"
                        >
                          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deleting}
                          className="flex h-5 w-5 items-center justify-center rounded border border-[#2A3038] bg-[#12161C] text-[#9BA3AF] transition-colors hover:text-[#F7F8FA] disabled:opacity-60"
                          aria-label="Cancel remove lead"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(lead.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[#2A3038] bg-[#0A0E1A]/85 text-[#9BA3AF] backdrop-blur transition-colors hover:border-[#F2B84B]/50 hover:text-[#F2B84B]"
                        aria-label="Remove lead"
                        title="Remove lead"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {selectedLead ? (
          <InstallerLeadDetail lead={selectedLead} onLeadChange={updateLead} />
        ) : (
          <section className="flex items-center justify-center p-8 text-center text-sm text-[#9BA3AF]">
            Select a lead to review roof facts, BoM, and customer unlock status.
          </section>
        )}
      </div>
    </main>
  );
}
