---
name: run-app
description: run, start, build, test, screenshot the HelioSense Roof Count web app
---

Start the app and confirm it responds.

```bash
pnpm dev
```

Wait for `http://localhost:3000` to answer, and make sure port 3000 is free first.
Use the "Try a sample roof" button to exercise every step without a real photo.

To check a production build, run `pnpm build`, then start it with temporary
credentials and point Playwright at it:

```bash
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm start
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm test:e2e
```

Screenshots from the flow test land in `test-results/`.
