# HelioSense AI

_AI-assisted solar system design, from address to engineered proposal in seconds._

## What it is

HelioSense AI (formerly Verdict) is a white-label solar proposal tool a solar company can license. From a single address it produces an engineered proposal — roof analysis, panel layout, bill of materials, and financials — for two personas from one codebase:

- **Homeowner / building owner** (`/`, `/quote`) — guided intake → 3 quote variants → send to installer.
- **Installer / solar engineer** (`/installer`) — a sell-ready proposal workspace: editable BoM, engineering parameters (tilt, GCR, DC/AC ratio, string sizing), a permit-ready single-line diagram, and email-to-customer.

It covers both **residential and commercial** buildings (auto-detected from the address, with manual override) across multiple countries, with UAE/DEWA-aware positioning (climate-corrected yield, DEWA equipment catalog).

## Calculators

The sizing engine (`lib/sizing/`) is deterministic — no LLM in the numeric path. It includes SurgePV-style engineering calculators: temperature-corrected Voc/Vmp string sizing with MPPT-window checks (commercial + residential), DC voltage-drop / wire-gauge sizing, 25-year NPV payback optimization, and per-country climate-adjusted specific yield. Rationale text (the "why" behind a variant) is the only LLM-generated part.

## Run locally (MOCK_MODE — no API keys needed)

This app ships with a global mock mode that serves cached fixtures instead of calling Google Maps/Solar/Gemini/Tavily, so it runs fully offline:

```bash
pnpm install
MOCK_MODE=true pnpm dev
```

Open http://localhost:3000. The mock fixtures cover a curated set of demo locations (Berlin residential/commercial, Dubai residential/commercial) — see `data/fixtures/demo-locations.ts`.

To run against live Google/Gemini/Tavily APIs instead, copy `.env.example` to `.env.local`, fill in real keys, and omit `MOCK_MODE`.

## Commands

```bash
pnpm dev              # dev server (MOCK_MODE=true pnpm dev for offline)
pnpm build            # production build
pnpm lint             # eslint
pnpm test             # vitest unit tests
pnpm test:e2e         # Playwright e2e (point BASE_URL at a local MOCK_MODE server)
pnpm prebake          # CSV -> JSON data cache (run before prebake:heatmaps)
pnpm prebake:heatmaps # JSON -> PNG solar heatmaps
```

## Tech stack

- **Next.js 15 App Router**, React 19, TypeScript strict — shared quote/BoM/sizing/lead contracts (`lib/contracts.ts`).
- **Tailwind CSS 4** with locked CSS-token color system (`AGENTS.md`).
- **Google Maps / Places / Solar API** for geocoding, roof segments, and annual flux heatmaps (mocked by default; see above).
- **CesiumJS** for installer-side photoreal 3D roof view (offline: a procedural synthetic 3D fallback).
- **Gemini** for quote rationale text generation only — never the numeric sizing path.
- **Tavily** for cached market/tariff research input.
- **Zod** — schema validation mirroring the frozen `lib/contracts.ts` types.
- **Zustand + TanStack Query** — client state and data fetching.

## Documentation

- `AGENTS.md` — canonical repo map, ownership table, and hard rules (frozen contracts, locked color tokens).
- `CLAUDE.md` — Claude Code tooling (sub-agents, hooks, skills) and product/architecture context.
- `AUDIT_REPORT.md` — bug analysis with file:line references, root causes, and fix status.

## Authors

- Ahmed Sohail — ahmedsohail02000@gmail.com
- Robin Kryszak — r.kryszak@icloud.com
- George Nikabadze — george.nikabadze@code.berlin

## License

Proprietary — All Rights Reserved. See [`LICENSE`](./LICENSE). "HelioSense AI" and its logo are trademarks of the authors; no license to use the name or branding is granted by this repository.
