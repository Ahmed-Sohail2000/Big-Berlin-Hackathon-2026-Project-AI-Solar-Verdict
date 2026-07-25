"use client";

import { useState } from "react";
import type { BuildingType, GridType, Preference, RoofType } from "@/lib/contracts";
import { tryParseCoords } from "@/lib/parse-coords";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { VoiceMemoRecorder, type VoiceMemo } from "./VoiceMemoRecorder";

const VOICE_MEMO_STORAGE_KEY = "verdict.pendingVoiceMemo";

type BillPeriod = "month" | "year";

const PREF_OPTIONS: { value: Preference; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "idk", label: "Not sure" },
];

const BUILDING_OPTIONS: { value: BuildingType; label: string; hint: string }[] = [
  { value: "office", label: "Office", hint: "Workplaces and mixed commercial floors." },
  { value: "retail", label: "Retail", hint: "Shops, showrooms, and supermarkets." },
  { value: "warehouse", label: "Warehouse", hint: "Logistics and distribution roofs." },
  { value: "industrial", label: "Industrial", hint: "Manufacturing and processing plants." },
  { value: "agricultural", label: "Agricultural", hint: "Barns, sheds, and farm buildings." },
  { value: "residential", label: "Residential", hint: "Homes and small multi-unit roofs." },
];

// ISO-3166 alpha-2 for the tariff/market context. "other" ships as free text so
// the sizer's country-aware market lookup can fall back to a sane default.
const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "PL", label: "Poland" },
  { value: "US", label: "United States" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "AU", label: "Australia" },
  { value: "other", label: "Other / not listed" },
];

const ROOF_OPTIONS: { value: RoofType; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "pitched", label: "Pitched" },
];

const GRID_OPTIONS: { value: GridType; title: string; description: string }[] = [
  {
    value: "on_grid",
    title: "Grid-tied (recommended)",
    description:
      "Connected to the public grid — export surplus and draw when needed. The standard commercial setup.",
  },
  {
    value: "hybrid",
    title: "Hybrid",
    description:
      "Grid-tied with battery storage — peak shaving on demand charges and backup during outages.",
  },
  {
    value: "off_grid",
    title: "Off-grid",
    description: "Fully islanded — needs large storage. For remote sites without a grid connection.",
  },
];

interface Props {
  onLocate?: (coords: { lat: number; lng: number }, address: string) => void;
}

export function IntakePanel({ onLocate }: Props = {}) {
  const [address, setAddress] = useState("");
  const [buildingType, setBuildingType] = useState<BuildingType>("office");
  const [country, setCountry] = useState<string>("DE");
  const [roofType, setRoofType] = useState<RoofType>("flat");
  const [billPeriod, setBillPeriod] = useState<BillPeriod>("month");
  const [billValue, setBillValue] = useState<string>("");
  const [annualKwh, setAnnualKwh] = useState<string>("");
  const [peakDemandKw, setPeakDemandKw] = useState<string>("");
  const [gridType, setGridType] = useState<GridType>("on_grid");
  const [wantsBattery, setWantsBattery] = useState<Preference>("idk");
  const [wantsHeatPump, setWantsHeatPump] = useState<Preference>("idk");
  const [evPref, setEvPref] = useState<Preference>("idk");
  const [voiceMemo, setVoiceMemo] = useState<VoiceMemo | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const useMyLocation = () => {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("Your browser doesn't support geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          );
          const data = await res.json();
          if (data.address) {
            setAddress(data.address);
            onLocate?.({ lat: data.lat, lng: data.lng }, data.address);
          } else {
            setLocationError(data.error ?? "Couldn't find an address near you.");
          }
        } catch {
          setLocationError("Couldn't reach the geocoding service.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — type your address instead."
            : "Couldn't get your location. Try typing your address.",
        );
      },
      { enableHighAccuracy: true, timeout: 7_000, maximumAge: 60_000 },
    );
  };

  const forwardGeocode = async (q: string) => {
    if (q.trim().length < 4) return;

    // Direct coords path (decimal + DMS + many formats) — skip geocoding entirely
    const parsed = tryParseCoords(q);
    if (parsed) {
      onLocate?.({ lat: parsed.lat, lng: parsed.lng }, parsed.formatted);
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/forward-geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        onLocate?.({ lat: data.lat, lng: data.lng }, data.address);
      }
    } catch {
      // silent fail — input still works for the user
    } finally {
      setResolving(false);
    }
  };

  const onAddressBlur = () => {
    if (address.trim().length >= 5) forwardGeocode(address);
  };

  /**
   * Called on every keystroke. Coord-bypass MUST run here so pasting
   * "52.5, 13.4" snaps to the map without waiting for Places to suggest
   * (Places can't autocomplete numeric coords anyway).
   */
  const onAddressChange = (next: string) => {
    setAddress(next);
    const parsed = tryParseCoords(next);
    if (parsed) {
      onLocate?.({ lat: parsed.lat, lng: parsed.lng }, parsed.formatted);
    }
  };

  // Validation: address + at least one consumption value (bill, or the optional annual kWh)
  const billNum = Number(billValue);
  const kwhNum = Number(annualKwh);
  const peakNum = Number(peakDemandKw);
  const isCommercial = buildingType !== "residential";
  const canSubmit = address.trim().length > 0 && (billNum > 0 || kwhNum > 0);

  const submit = () => {
    if (!canSubmit) return;
    // Internally still set heating + goal (defaults) — lib/contracts.ts requires them.
    // The contract field is monthlyBillEur, so the bill input is normalized to a
    // monthly figure: "per month" passes through as-is, "per year" divides by 12.
    // If only the optional annual kWh was filled, derive a synthetic monthly bill
    // from annualKwh × 0.32 €/kWh ÷ 12 so the legacy field stays populated; the
    // explicit annualKwh is passed through too and takes precedence in sizing.
    const derivedMonthlyBill =
      billNum > 0
        ? billPeriod === "year"
          ? Math.round(billNum / 12)
          : Math.round(billNum)
        : Math.round((kwhNum * 0.32) / 12);
    const params = new URLSearchParams({
      address,
      bill: String(derivedMonthlyBill || 120),
      ev: String(evPref === "yes"),
      heating: "gas",
      goal: "lower_bill",
      evPref,
      wantsBattery,
      // Heat pump is residential-only in this UI. For commercial building types
      // we hide the control but keep the contract field populated with a sane
      // default ("no") so downstream sizing stays deterministic.
      wantsHeatPump: isCommercial ? "no" : wantsHeatPump,
      gridType,
      buildingType,
      country,
      roofType,
    });
    if (kwhNum > 0) {
      params.set("annualKwh", String(kwhNum));
    }
    if (peakNum > 0) {
      params.set("peakDemandKw", String(peakNum));
    }
    // Voice memo (when present) is too big for URL params; stash it in
    // sessionStorage so the /quote page's SendToInstaller picks it up
    // when it POSTs to /api/leads.
    if (voiceMemo) {
      try {
        sessionStorage.setItem(VOICE_MEMO_STORAGE_KEY, JSON.stringify(voiceMemo));
      } catch {
        // Quota exceeded or sessionStorage disabled — ship without the memo.
      }
    } else {
      try {
        sessionStorage.removeItem(VOICE_MEMO_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    window.location.href = `/quote?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hero copy — compact */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl sm:text-2xl lg:text-[26px] font-semibold leading-tight tracking-tight">
          Design a solar system for your building in seconds.
        </h2>
        <p className="text-xs sm:text-sm text-[#9BA3AF]">
          Engineered from real satellite roof data &mdash; benchmarked on real installer projects.
        </p>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
          Enter your building address
        </label>
        <AddressAutocomplete
          id="address"
          value={address}
          onChange={onAddressChange}
          onPlaceSelected={(coords, formatted) => {
            setAddress(formatted);
            onLocate?.(coords, formatted);
          }}
          onBlur={onAddressBlur}
          placeholder="Enter address or lat,lng..."
          autoComplete="off"
          className="w-full rounded-lg border border-[#2A3038] bg-[#12161C] px-4 py-2.5 text-sm text-[#F7F8FA] placeholder:text-[#5B6470] focus:outline-none focus:border-[#3DAEFF] focus:ring-2 focus:ring-[#3DAEFF]/30 transition-all"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="text-xs text-[#9BA3AF] hover:text-[#3DAEFF] transition-colors disabled:cursor-wait disabled:text-[#5B6470]"
          >
            {locating ? "⌖ Locating..." : "⌖ Use my location"}
          </button>
          {resolving && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#9BA3AF]">
              <span className="inline-block h-2.5 w-2.5 rounded-md border-2 border-[#3DAEFF]/30 border-t-[#3DAEFF] animate-spin" />
              Resolving address…
            </span>
          )}
        </div>
        {locationError && (
          <p className="text-[11px] text-[#F2B84B]">{locationError}</p>
        )}
      </div>

      {/* Building type — drives commercial-vs-residential sizing defaults */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
          Building type
        </span>
        <div
          role="radiogroup"
          aria-label="Building type"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {BUILDING_OPTIONS.map((opt) => {
            const active = buildingType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBuildingType(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#3DAEFF]/40 ${
                  active
                    ? "border-[#3DAEFF] bg-[#3DAEFF]/10 text-[#F7F8FA]"
                    : "border-[#2A3038] bg-[#12161C] text-[#9BA3AF] hover:border-[#3DAEFF]/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#5B6470]">
          {BUILDING_OPTIONS.find((o) => o.value === buildingType)?.hint}
        </p>
      </div>

      {/* Roof type + country — market and geometry context */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
            Roof type
          </span>
          <div
            role="radiogroup"
            aria-label="Roof type"
            className="flex rounded-lg border border-[#2A3038] overflow-hidden"
          >
            {ROOF_OPTIONS.map((opt) => {
              const active = roofType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRoofType(opt.value)}
                  className={`flex-1 px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#3DAEFF]/40 focus:relative ${
                    active
                      ? "bg-[#3DAEFF] text-[#0A0E1A]"
                      : "text-[#9BA3AF] hover:text-[#F7F8FA]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-[#2A3038] bg-[#12161C] px-3 py-2.5 text-sm text-[#F7F8FA] focus:outline-none focus:border-[#3DAEFF] focus:ring-2 focus:ring-[#3DAEFF]/30 transition-all"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Electricity bill (€) — guided, with a per month / per year toggle */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="bill" className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
            Business electricity bill
          </label>
          <div
            role="radiogroup"
            aria-label="Bill period"
            className="flex rounded-lg border border-[#2A3038] overflow-hidden"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billPeriod === "month"}
              onClick={() => setBillPeriod("month")}
              className={`px-3 py-1 text-[11px] transition-colors ${
                billPeriod === "month"
                  ? "bg-[#3DAEFF] text-[#0A0E1A]"
                  : "text-[#9BA3AF] hover:text-[#F7F8FA]"
              }`}
            >
              per month
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billPeriod === "year"}
              onClick={() => setBillPeriod("year")}
              className={`px-3 py-1 text-[11px] transition-colors ${
                billPeriod === "year"
                  ? "bg-[#3DAEFF] text-[#0A0E1A]"
                  : "text-[#9BA3AF] hover:text-[#F7F8FA]"
              }`}
            >
              per year
            </button>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5B6470]">
            €
          </span>
          <input
            id="bill"
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={billValue}
            onChange={(e) => setBillValue(e.target.value)}
            placeholder={billPeriod === "month" ? "2500" : "30000"}
            className="w-full rounded-lg border border-[#2A3038] bg-[#12161C] pl-7 pr-20 py-2.5 text-sm text-[#F7F8FA] placeholder:text-[#5B6470] focus:outline-none focus:border-[#3DAEFF] focus:ring-2 focus:ring-[#3DAEFF]/30 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#5B6470]">
            / {billPeriod}
          </span>
        </div>
        <p className="text-[11px] text-[#5B6470]">
          The total amount your business pays for electricity &mdash; from your utility invoice.
        </p>
      </div>

      {/* Optional annual kWh — improves sizing accuracy */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kwh" className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
          Annual consumption <span className="normal-case text-[#5B6470]">(optional)</span>
        </label>
        <div className="relative">
          <input
            id="kwh"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={annualKwh}
            onChange={(e) => setAnnualKwh(e.target.value)}
            placeholder="120000"
            className="w-full rounded-lg border border-[#2A3038] bg-[#12161C] px-3 pr-20 py-2.5 text-sm text-[#F7F8FA] placeholder:text-[#5B6470] focus:outline-none focus:border-[#3DAEFF] focus:ring-2 focus:ring-[#3DAEFF]/30 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#5B6470]">
            kWh / yr
          </span>
        </div>
        <p className="text-[11px] text-[#5B6470]">
          Annual kWh from your utility bill &mdash; sharpens system sizing accuracy.
        </p>
      </div>

      {/* Optional peak demand — demand-charge-aware sizing */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="peak" className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
          Peak demand <span className="normal-case text-[#5B6470]">(optional, advanced)</span>
        </label>
        <div className="relative">
          <input
            id="peak"
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={peakDemandKw}
            onChange={(e) => setPeakDemandKw(e.target.value)}
            placeholder="150"
            className="w-full rounded-lg border border-[#2A3038] bg-[#12161C] px-3 pr-16 py-2.5 text-sm text-[#F7F8FA] placeholder:text-[#5B6470] focus:outline-none focus:border-[#3DAEFF] focus:ring-2 focus:ring-[#3DAEFF]/30 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#5B6470]">
            kW
          </span>
        </div>
        <p className="text-[11px] text-[#5B6470]">
          The demand-charge (kW) figure on your bill &mdash; lets the AI size for peak-demand reduction.
        </p>
      </div>

      {/* Grid connection type */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
          Grid connection
        </span>
        <div role="radiogroup" aria-label="Grid connection" className="flex flex-col gap-2">
          {GRID_OPTIONS.map((opt) => {
            const active = gridType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setGridType(opt.value)}
                className={`flex flex-col gap-0.5 rounded-lg border px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#3DAEFF]/40 ${
                  active
                    ? "border-[#3DAEFF] bg-[#3DAEFF]/10"
                    : "border-[#2A3038] bg-[#12161C] hover:border-[#3DAEFF]/40"
                }`}
              >
                <span className={`text-sm font-medium ${active ? "text-[#F7F8FA]" : "text-[#9BA3AF]"}`}>
                  {opt.title}
                </span>
                <span className="text-[11px] leading-relaxed text-[#5B6470]">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preference fields. Battery + EV reframe to commercial (backup / peak
          shaving and fleet charging). Heat pump is residential-only — hidden
          for commercial building types; the contract field is defaulted to
          "no" at submit so sizing stays deterministic. */}
      <ThreeStateRow
        label={isCommercial ? "Battery / backup?" : "Battery?"}
        value={wantsBattery}
        onChange={setWantsBattery}
        groupName="battery"
      />
      {!isCommercial && (
        <ThreeStateRow
          label="Heat pump?"
          value={wantsHeatPump}
          onChange={setWantsHeatPump}
          groupName="heatpump"
        />
      )}
      <ThreeStateRow
        label={isCommercial ? "Fleet EV charging?" : "EV charger?"}
        value={evPref}
        onChange={setEvPref}
        groupName="ev"
      />

      {/* Voice memo (Gradium AI) — optional. Lets the homeowner record any
          context the form fields can't capture (shading from a tree, future
          heat-pump plans, accessibility constraints) so the installer hears
          it directly when they pick up the lead. */}
      <VoiceMemoRecorder value={voiceMemo} onChange={setVoiceMemo} />

      {/* CTA */}
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="mt-2 w-full rounded-lg bg-[#3DAEFF] px-5 py-4 text-base font-semibold text-[#0A0E1A] transition-all hover:bg-[#2EA1F0] disabled:bg-[#1F3A52] disabled:text-[#5B6470] disabled:cursor-not-allowed"
      >
        Get my proposal →
      </button>

      <p className="text-[11px] text-[#5B6470] text-center">
        non-binding · a certified installer reviews the engineered design before you commit
      </p>
    </div>
  );
}

interface ThreeStateRowProps {
  label: string;
  value: Preference;
  onChange: (v: Preference) => void;
  groupName: string;
}

function ThreeStateRow({ label, value, onChange, groupName }: ThreeStateRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-[#9BA3AF]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-lg border border-[#2A3038] overflow-hidden"
      >
        {PREF_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              name={groupName}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#3DAEFF]/40 focus:relative ${
                active
                  ? "bg-[#3DAEFF] text-[#0A0E1A]"
                  : "text-[#9BA3AF] hover:text-[#F7F8FA]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
