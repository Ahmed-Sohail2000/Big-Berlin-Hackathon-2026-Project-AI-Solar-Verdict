---
name: test-e2e
description: run end-to-end tests using playwright
---

Run the E2E test suite to verify the user flow and UI stability.

## Command
```bash
npm run test:e2e
```

## Scope
- Tests located in `e2e/*.spec.ts`.
- Verifies integration between the frontend and API.
- Requires the dev server to be running if the tests don't start it themselves.
