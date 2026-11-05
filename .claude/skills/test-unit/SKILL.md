---
name: test-unit
description: run unit tests using vitest
---

Run the unit tests for `lib/`.

## Command
```bash
pnpm test
```

## Scope
- Tests live in `lib/**/__tests__/`.
- They cover the counting pipeline, dimensions, panel planning, uploads, exports,
  login and the accuracy benchmark.
- For a single area, pass a path: `pnpm exec vitest run lib/tile-count/__tests__/panel-plan.test.ts`.
