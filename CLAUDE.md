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
