# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. **Read `AGENTS.md` first** — it's the canonical repo map, per-AI ownership table, and hard rules (frozen contracts, locked color tokens, package manager). This file adds the Claude-Code-specific tooling (sub-agents, hooks, skills) and the product/architecture context that lives on top of it.

## What HelioSense AI is

HelioSense AI is an **AI-assisted solar system design tool**, packaged as a white-label SaaS a solar company can license. From a single address it produces an engineered proposal — roof analysis, panel layout, bill of materials, and financials — in seconds. It serves two personas from one codebase:

- **Homeowner / building owner** (`components/homeowner/`, `app/quote/`): guided intake → 3 quote variants → send to installer.
- **Installer / solar engineer** (`components/installer/`, `app/installer/`): a sell-ready proposal workspace — numbered stepper (Design & tools → Review → Financial proposal), editable BoM, engineering parameters (tilt/GCR/DC-AC ratio/string sizing), single-line diagram, and email-to-customer.

It covers **both residential and commercial** buildings (auto-detected from the address, with manual override) across multiple countries, with a UAE/DEWA-aware positioning (climate-corrected yield, DEWA equipment catalog).

## Commands
- **Package manager is pnpm, not npm.** `node_modules` is pnpm-linked (see the `.pnpm` store); running `npm install` here corrupts npm's own dependency resolver. Use `pnpm <script>` for everything (`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`).
- **Single test file**: `MOCK_MODE=true pnpm test lib/sizing/__tests__/commercial.test.ts` (vitest matches by path substring, so `pnpm test commercial` also works). Type-check only: `pnpm tsc --noEmit`.
- **Data Pipeline**: `pnpm prebake` (CSV → JSON) then `pnpm prebake:heatmaps` (JSON → PNG) — must run in this order.

## MOCK_MODE — the offline-first workflow

This machine has **no live API keys / no GCP billing**, so almost all work happens against cached fixtures. A global mock mode serves fixtures instead of calling Google Maps/Solar/Gemini/Tavily:

- `MOCK_MODE=true` (server-side) and `NEXT_PUBLIC_MOCK_MODE=true` (client-side).
- Always run tests and dev smoke checks with it: `MOCK_MODE=true pnpm test`. It's faster, free, deterministic, and prevents accidental live calls.
- The mock geocode/fixtures currently cover a limited set of curated demo locations (Berlin residential/commercial, Dubai residential/commercial). See `data/fixtures/demo-locations.ts` — a typed address snaps to the nearest curated location, so the mock can later be swapped for real Google APIs with a config flip.
- Secrets live only in gitignored `.env.local` (`GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`). `.env.example` holds placeholders only — **never commit a real key**.

## Architecture Conventions
- Strict separation between UI, API, and business logic: route handlers in `app/api/` are thin wrappers around `lib/api`; the primary business value resides in `lib/` (panel sizing and rationale in `lib/sizing/`, solar radiation map analysis in `lib/heatmaps/`).
- `components/` is split by user persona: `components/homeowner/` (consumer-facing views) vs `components/installer/` (professional analysis tools).
- `data/schema.ts` holds the Zod definitions that ensure type safety across the API and UI; `data/fixtures/` caches JSON to avoid redundant external API calls during development.
- **Data Flow**: External API → `lib/api` → `app/api` → `TanStack Query` → `Components`.
- **`lib/contracts.ts` is FROZEN.** Changes must be additive only (new *optional* fields) and need integration-captain sign-off; `data/schema.ts` Zod must mirror them. Never rename/remove existing fields.
- **Color tokens are locked** (see `AGENTS.md`): Background `#0A0E1A`, Surface `#12161C`, Border `#2A3038`, Foreground `#F7F8FA`, Muted `#9BA3AF`, Accent `#3DAEFF`, Success `#62E6A7`, Warning `#F2B84B`. Max 8px radius; no gradients, no `rounded-full`, no purple. All UI copy is English.

### Key modules to know
- `lib/sizing/calculate.ts` — deterministic sizing engine; `VARIANT_CONFIGS` size factors (margin 0.75 / closeRate 0.88 / ltv 1.0) make the three quotes genuinely different. Pure post-steps: grid-policy, commercial-policy, climate.
- `lib/sizing/climate.ts` — `climateProfileFor(country)` returns per-country net specific yield (DE 950 unchanged/golden-safe, AE 1530 after soiling+temperature losses, etc.). Absent country → DE.
- `lib/sizing/compose-from-market.ts` — BoM composition; for `country === "AE"` adds a DEWA-compliant DC isolator (IEC 60947-3) and renames the grid line for DEWA interconnection.
- `lib/sizing/roi-optimizer.ts` — 25-year NPV panel-count optimizer + marginal-payback battery sizing; used by `compose-from-market.ts`, not by the legacy `calculate.ts` path.
- `lib/sizing/electrical.ts` — standalone SurgePV-style calculators (temperature-corrected residential string sizing, voltage-drop/wire-gauge sizing). Deliberately **not** wired into `sizeQuote()`'s pipeline — kept as pure functions the UI calls on demand so the 5 golden-profile tests stay byte-identical. Only `commercial-policy.ts`'s string sizing runs inside the pipeline itself (commercial/flat roofs only).
- `lib/currency.ts` — `CurrencyCode = "EUR"|"USD"|"AED"`, `currencyForCountry`, `formatMoney`.
- `lib/leads/store.ts` — in-memory lead store (`Map` on `globalThis`, dev-server-lifetime only). `buildLead()` snapshots `sizing`/`roofFacts` into `publicPreview` once at creation; that snapshot is the single source of truth the dashboard list (`InstallerMarketplace.tsx`) always reads. Any installer-side recompute/edit (Recalculate, manual roof-structure edit) must call `updateLeadPreview()` — via `PATCH /api/leads/[id]` with `action: "sync-preview"` — and then the caller's `onLeadChange` prop, or the list and the detail view will silently diverge again.
- `data/fixtures/demo-locations.ts` — curated Berlin/Dubai residential+commercial demo set with `resolveDemoLocation`, `nearestDemoByCoords`, `mockRoofFacts`.
- `components/homeowner/SyntheticRoof3D*.tsx` — offline procedural 3D (pitched house vs flat-roof array), react-three-fiber. Shown in MOCK_MODE on the homeowner side; live Cesium photoreal when keys exist. Reused by `components/installer/RoofStructureEditor.tsx` for a live preview since Cesium's photoreal tiles have no per-segment mesh to drive from an edit form.
- `components/installer/RoofStructureEditor.tsx` — parameter-form roof-structure editor (pitch/azimuth/area per segment, not freeform geometry — `lib/contracts.ts`'s `RoofSegment` has no polygon geometry to drag). Recomputes via `composeFromMarket`/`sizeQuote` on every edit and persists through the `sync-preview` pattern above.
- `components/installer/sld.ts` + `SingleLineDiagram.tsx` — pure `buildSldModel(bom, engineering)` + inline-SVG permit-style single-line diagram.

## Claude Code tooling in this repo (`.claude/`)

### Sub-agents (`.claude/agents/`)
Split along the frontend/backend seam from `AGENTS.md`'s ownership table. Both are restricted to **Read, Edit, Grep, Glob, Bash** — no WebFetch/WebSearch/MCP, and they cannot spawn further agents. Only spawn one when the user explicitly asks to distribute work to an agent.
- **frontend-agent** — `app/**/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/**`, `lib/cesium/**`, Zustand/TanStack wiring. Must obey locked tokens and never touch `app/api/**`, `lib/api/**`, `data/schema.ts`, or `lib/sizing/**`.
- **backend-agent** — `app/api/**`, `lib/api/**`, `lib/sizing/**`, `lib/reonic/**`, `lib/leads/**`, `lib/osm/**`, `data/schema.ts`. Carries a standing input-validation / endpoint-security / `ApiStatus` honesty checklist; must test with `MOCK_MODE=true`; never touches UI.

### Hooks (`.claude/hooks/`, wired in `.claude/settings.json`)
- **`block-live-api-calls.mjs`** (PreToolUse · Bash): blocks any Bash command referencing a live external endpoint (solar/maps/generativelanguage.googleapis.com, api.tavily.com) unless `MOCK_MODE=true` is in the same command. Don't route around it — prefix commands with `MOCK_MODE=true`.
- **`lint-backend-file.mjs`** (PostToolUse · Edit|Write): auto-runs eslint on any edited file under `app/api/` or `lib/api/` so contract/security regressions surface immediately.

### Skills (`.claude/skills/`)
Project skills, invokable by name:
- **run-verdict** — start/build/screenshot the app via `scripts/smoke-test.mjs` (warm `/installer` first; Turbopack cold-compile gotcha).
- **open-pr** — the correct test-then-PR flow for this repo: run lint/tsc/unit, handle the e2e `baseURL`-points-at-deployed-Vercel gotcha, commit (why-not-what messages), push to **origin** (never `upstream`), then `gh pr create` or fall back to a pre-filled compare URL.
- **ci-verify** — `pnpm lint && pnpm test && pnpm test:e2e`.
- **test-unit** — `pnpm test` (vitest, `lib/**/*.test.ts`).
- **test-e2e** — `pnpm test:e2e` (Playwright, `e2e/*.spec.ts`).
- **lint** — `pnpm lint`.
- **bake-data** — `pnpm prebake` then `pnpm prebake:heatmaps`.

## Testing notes
- Unit: vitest. `vitest.config.ts` caps forks (`maxForks: 2`) and raises heap (`--max-old-space-size=2048`) — the reonic KNN fixture (1,277 projects + 19,257 line items) is memory-heavy and over-parallel workers OOM ("worker exited unexpectedly"). Also kill stray dev servers before running the suite.
- E2E: `playwright.config.ts`'s default `baseURL` is the **deployed Vercel URL**, not localhost. To test local changes, run a `MOCK_MODE=true` dev server and point `BASE_URL=http://localhost:3000 pnpm test:e2e` at it (see the `open-pr` skill).
- The offline mock flow lives in `e2e/mock_flow.spec.ts`.
