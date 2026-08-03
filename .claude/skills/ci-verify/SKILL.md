---
name: ci-verify
description: run complete CI check (lint + unit tests + e2e tests)
---

Runs the full verification suite to ensure no regressions before pushing to main.

## Command
```bash
pnpm lint && pnpm test && pnpm test:e2e
```

## Scope
- Linter: checks code style and quality.
- Unit Tests: verifies core logic in `lib/`.
- E2E Tests: verifies critical user flows via Playwright.
