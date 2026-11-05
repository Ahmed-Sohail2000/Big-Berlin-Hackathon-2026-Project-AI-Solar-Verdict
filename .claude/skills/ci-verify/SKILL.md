---
name: ci-verify
description: run complete CI check (types, lint, unit tests, audit, build, e2e tests)
---

Runs the full verification suite before pushing.

## Command
```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm audit --prod && pnpm build
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm start
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm test:e2e
```

## Scope
- Types and lint: code quality.
- Unit tests: `lib/`, including the accuracy benchmark.
- Audit: known vulnerabilities in dependencies.
- E2E: the critical flows in a real browser, on a production build.
