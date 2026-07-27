---
name: test-unit
description: run unit tests using vitest
---

Run the unit test suite to verify core logic in `lib/`.

## Command
```bash
pnpm test
```

## Scope
- Tests located in `lib/**/*.test.ts` and `components/**/__tests__/*.test.ts`.
- Use this to verify calculations, API wrappers, data parsing, and pure UI-model builders (e.g. the single-line-diagram model in `components/installer/sld.ts`).
- The suite is memory-heavy (reonic KNN fixture); `vitest.config.ts` caps forks and raises heap. Kill stray dev servers before running to avoid OOM ("worker exited unexpectedly").
