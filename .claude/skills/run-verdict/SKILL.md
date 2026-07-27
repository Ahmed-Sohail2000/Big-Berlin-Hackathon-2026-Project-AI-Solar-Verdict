---
name: run-verdict
description: run, start, build, test, screenshot the verdict web app
---

The `verdict` app is a Next.js web application. It is driven programmatically using Playwright via a smoke test script.

## Prerequisites

This repo's package manager is **pnpm** (see `AGENTS.md`'s hard rule) — `node_modules` is pnpm-linked, and `npm install` will crash npm's own resolver against the pnpm store instead of installing anything. Use pnpm for all dependency changes:

```bash
pnpm install
npx playwright install chromium
```

The smoke test script (`scripts/smoke-test.mjs`) imports `chromium` from the `@playwright/test` devDependency — no separate bare `playwright` package is needed. Just make sure the Chromium browser build is installed (`npx playwright install chromium`); if it's missing you'll get `browserType.launch: Executable doesn't exist`.

## Build

For local development, the app is run in dev mode. To build for production:

```bash
pnpm build
```

## Run (agent path)

1. **Start the development server** in the background:
   ```bash
   pnpm dev &
   ```
   Wait for the server to be ready at `http://localhost:3000` (poll, don't assume — Turbopack's first compile can take several seconds).

2. **Run the smoke test and capture screenshots**:
   The primary driver is the smoke test script located at `scripts/smoke-test.mjs`. It verifies the home page and the installer page and saves screenshots to the root directory.

   ```bash
   node scripts/smoke-test.mjs
   ```

   - Screenshots saved: `screenshot-home.png`, `screenshot-installer.png`.
   - The script verifies that the home page title exists and the installer page contains "Berlin Solar Pro".
   - **Warm the `/installer` route first** (`curl -s -o /dev/null http://localhost:3000/installer`) before running the smoke test. On a cold server, Turbopack takes ~15s to compile that route's Cesium/3D chunk on first request, which combined with asset loading exceeds Playwright's default 30s navigation timeout and fails the test with `page.goto: Timeout 30000ms exceeded` — not a real bug, just an uncompiled route.

## Run (human path)

To launch the app and view it in a browser:

```bash
pnpm dev
```
Then open `http://localhost:3000` in your browser.

## Gotchas

- **Browser Installation**: The app requires a specific version of Chromium for Playwright. If you see a "browser doesn't exist" error, run `npx playwright install chromium`.
- **Port Conflict**: Ensure port 3000 is free before running `pnpm dev`.
- **Testing external-API flows**: set `MOCK_MODE=true` (and `NEXT_PUBLIC_MOCK_MODE=true` for client-side checks) to serve cached fixtures instead of live Google Maps/Solar/Gemini/Tavily calls — faster, free, deterministic, and required for `backend-agent` per `CLAUDE.md`.

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`**: Run `npx playwright install chromium` — the `@playwright/test` package needs its Chromium browser build downloaded on a fresh clone.
- **`Cannot read properties of null (reading 'matches')` from `npm install`**: this is npm's arborist choking on the pnpm-linked `node_modules` tree — use `pnpm install` / `pnpm add` instead, never `npm install`.
- **Next.js Workspace Warning**: You may see a warning about multiple lockfiles; this typically does not affect functionality.
