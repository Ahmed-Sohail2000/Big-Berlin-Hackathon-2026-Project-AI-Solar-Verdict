---
name: test-e2e
description: run end-to-end tests using playwright
---

Run the browser tests against a production build. They cover the whole flow, HEIC,
EXIF removal, folders, manual panels, DXF, headers and the login lockout.

## Command
```bash
pnpm build
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm start
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm test:e2e
```

## Scope
- Tests live in `e2e/*.spec.ts`. The app is desktop only, so there is one browser project.
- Use a production build. The dev server's looser policy can hide browser policy
  failures, which is how the HEIC failure stayed unnoticed.
- Stop the server afterwards.
- Screenshots land in `test-results/`.
