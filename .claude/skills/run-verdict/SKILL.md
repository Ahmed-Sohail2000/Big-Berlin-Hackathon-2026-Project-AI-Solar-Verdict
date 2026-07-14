---
name: run-verdict
description: run, start, build, test, screenshot the verdict web app
---

The `verdict` app is a Next.js web application. It is driven programmatically using Playwright via a smoke test script.

## Prerequisites

Ensure you have the necessary Node.js dependencies and the Playwright Chromium browser installed:

```bash
npm install
npx playwright install chromium
```

## Build

For local development, the app is run in dev mode. To build for production:

```bash
npm run build
```

## Run (agent path)

1. **Start the development server** in the background:
   ```bash
   npm run dev &
   ```
   Wait for the server to be ready at `http://localhost:3000`.

2. **Run the smoke test and capture screenshots**:
   The primary driver is the smoke test script located at `scripts/smoke-test.mjs`. It verifies the home page and the installer page and saves screenshots to the root directory.

   ```bash
   node scripts/smoke-test.mjs
   ```

   - Screenshots saved: `screenshot-home.png`, `screenshot-installer.png`.
   - The script verifies that the home page title exists and the installer page contains "Berlin Solar Pro".

## Run (human path)

To launch the app and view it in a browser:

```bash
npm run dev
```
Then open `http://localhost:3000` in your browser.

## Gotchas

- **Browser Installation**: The app requires a specific version of Chromium for Playwright. If you see a "browser doesn't exist" error, run `npx playwright install chromium`.
- **Port Conflict**: Ensure port 3000 is free before running `npm run dev`.

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`**: Run `npx playwright install chromium`.
- **`pnpm` not found**: Use `npm` instead of `pnpm` for scripts in this environment.
- **Next.js Workspace Warning**: You may see a warning about multiple lockfiles; this typically does not affect functionality.
