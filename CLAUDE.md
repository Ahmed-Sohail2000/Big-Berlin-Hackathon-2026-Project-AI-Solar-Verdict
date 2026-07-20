# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. **Read `AGENTS.md` first** — it's the canonical repo map, per-AI ownership table, and hard rules (frozen contracts, locked color tokens, package manager). This file only adds Claude-Code-specific tooling on top of that.

## Commands
- **Package manager is pnpm, not npm.** `node_modules` is pnpm-linked (see the `.pnpm` store); running `npm install` here corrupts npm's own dependency resolver. Use `pnpm <script>` for everything (`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`).
- **Data Pipeline**: `pnpm prebake` (CSV $\rightarrow$ JSON) then `pnpm prebake:heatmaps` (JSON $\rightarrow$ PNG) — must run in this order.

## Architecture Conventions
- Strict separation between UI, API, and business logic: route handlers in `app/api/` are thin wrappers around `lib/api`; the primary business value resides in `lib/` (panel sizing and rationale in `lib/sizing/`, solar radiation map analysis in `lib/heatmaps/`).
- `components/` is split by user persona: `components/homeowner/` (consumer-facing views) vs `components/installer/` (professional analysis tools).
- `data/schema.ts` holds the Zod definitions that ensure type safety across the API and UI; `data/fixtures/` caches JSON to avoid redundant external API calls during development.
- **Data Flow**: External API $\rightarrow$ `lib/api` $\rightarrow$ `app/api` $\rightarrow$ `TanStack Query` $\rightarrow$ `Components`.

## Skills
Project skills in `.claude/skills/` (invoke via `/skill-name`; read the SKILL.md for the full recipe):
- `run-verdict` — launch the dev server and smoke-test both pages via Playwright
- `bake-data` — regenerate `data/fixtures/` and heatmap PNGs from source CSVs
- `lint` / `test-unit` / `test-e2e` — scoped checks
- `ci-verify` — the full lint+unit+e2e gate before pushing

## Sub-agents
Two scoped sub-agents live in `.claude/agents/`, split along the frontend/backend seam:
- **frontend-agent** — `app/**/page.tsx`, `components/**`, `lib/cesium/**`. Cannot touch `app/api/**` or `lib/api/**`.
- **backend-agent** — `app/api/**`, `lib/api/**`, `lib/sizing/**`, `lib/reonic/**`, `lib/leads/**`, `data/schema.ts`. Owns input validation and endpoint security; always tests with `MOCK_MODE=true` (every wrapper in `lib/api/` already branches on this env var to serve a cached fixture instead of a live call).

Both agents are restricted to `Read, Edit, Grep, Glob, Bash` — no `WebFetch`/`WebSearch`/MCP tools, and neither can spawn further agents. Two project hooks in `.claude/settings.json` back this up mechanically: a `PreToolUse` guard blocks any Bash command referencing a live Verdict external API (Solar/Places/Gemini/Tavily) unless `MOCK_MODE=true` is part of the same command, and a `PostToolUse` hook auto-lints any file just edited under `app/api/` or `lib/api/` so backend regressions surface immediately instead of at the next full `pnpm lint` pass.
