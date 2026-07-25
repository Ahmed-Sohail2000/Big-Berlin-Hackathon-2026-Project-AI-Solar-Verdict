# GOAL — Verdict: a presentable, ready-to-use commercial solar AI app

**Definition of done:** a business owner enters their building address, sees their
real roof in photoreal 3D with the AI's recommended panel layout placed on it,
and gets a complete engineered system (panel count, inverters, wiring/BoM,
financials). An installer opens the lead, views the same 3D, can manually
adjust panel placement, switches between the 3 strategy options, and the
financial figures + bill of materials update together — a proposal they can sell
without any further code changes.

---

## Requirements → current status

| # | Requirement | Status |
|---|---|---|
| 1 | API keys wired correctly (right names, right file, not committed) | ✅ Done — `.env.local`, correct `GOOGLE_MAPS_API_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` names, scrubbed `.env.example` |
| 2 | Keys usable for the Google Solar API + 3D | ⛔ **Blocked on you: Google Cloud billing must be enabled** (see below) — code is correct, Google returns HTTP 403 until billing is on |
| 3 | Installer dashboard shows the 3D of the entered address | ✅ Built (Cesium + PanelOverlayCesium) — renders live once #2 is unblocked; honest "Simulation Mode" badge offline |
| 4 | Deal flow on the right | ✅ Built (Review → Accept → Send offer stepper) |
| 5 | Financial figures **and** BoM change together across the 3 options | ✅ Built — selecting Best Margin / Best Close Rate / Best LTV updates total €, savings, payback, ROI **and** the itemized BoM from one `selectedVariant` source |
| 6 | Technical parameters panel | ✅ Built (`EngineeringPanel`: tilt, GCR, row spacing, DC/AC, string config) |
| 7 | Installer can manually place/remove panels on the 3D | ✅ Built (click-to-add / click-to-remove on the photoreal roof); live once #2 is unblocked |
| 8 | AI scrapes the web / catalog and designs the layout | ✅ Built — deterministic sizing + market catalog (Tavily-refreshable), LLM writes rationale only (no hallucinated geometry/prices) |
| 9 | Updated financial sheet reflects the chosen design | ✅ Built — edits to panels/variant recompute the financial block |

## The ONE external blocker: Google Cloud billing

The keys are configured correctly, but the live server returns:

> Solar API HTTP 403: "This API method requires billing to be enabled. Please
> enable billing on project #835233396359."

Google Maps Platform (Solar API, Photorealistic 3D Tiles, Geocoding, Places)
**requires a billing account attached to the project — even to use the free
tier.** There is no way to code around this; it is a Google account setting.

- **To use it at $0:** enable billing on project `835233396359`
  (attach a card), then rely on Google's monthly free tier. Within the free
  quota you pay nothing, but billing must be *enabled*. Set a **budget alert +
  cap** (Billing → Budgets & alerts) so you can never be surprised by a charge,
  and **restrict the key** to only the needed APIs + your domain.
- **To stay $0 with zero billing setup:** run in `MOCK_MODE` (fully offline on
  fixtures). Everything except live worldwide 3D works.

## Free-tier reality per service

- **Google Maps Platform** — free monthly tier, but billing account mandatory. Solar API + 3D Tiles are billable beyond the free quota.
- **Gemini (AI Studio)** — separate free tier, independent of GCP billing.
- **Tavily** — dev tier free within limits; app falls back to the cached catalog if absent.

## Presentable without any code changes

In `MOCK_MODE` the full flow is demoable today at $0. The moment billing is
enabled, the same build serves live worldwide 3D + real roof data with no code
change — just restart with the keys and `MOCK_MODE` unset.
