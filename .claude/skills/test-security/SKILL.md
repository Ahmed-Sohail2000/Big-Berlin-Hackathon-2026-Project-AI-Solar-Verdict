---
name: test-security
description: check login, upload safety, security headers, dependencies and committed secrets
---

Run this before a release and after any change to `middleware.ts`, `lib/auth/`,
`next.config.ts`, `lib/tile-count/io/` or `components/tile-count/browser/`.

## 1. Unit checks

```bash
pnpm test:security
```

Login gate, lockout, file and folder screening, export escaping.

## 2. Dependencies

```bash
pnpm audit --prod   # what ships to the browser or server; must be clean
pnpm audit          # also dev tools; review, these do not ship
```

## 3. Browser checks against a production build

```bash
pnpm build
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm start
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm exec playwright test e2e/security.spec.ts
APP_USERNAME=e2e APP_PASSWORD=temporary-e2e-pass pnpm exec playwright test -g "HEIC|location data|enormous|disguised"
```

The lockout test only runs with credentials set, so a dev server skips it.

## 4. Nothing that should stay out of git

```bash
git ls-files | grep -iE "\.(jpe?g|heic|env|pem|key)$|briefing"
```

The only expected match is `e2e/fixtures/roof.heic`, which is synthetic. `.env.example`
is fine.

## Report

State what passed, what failed, and what was skipped. `docs/SECURITY.md` lists the
known weaknesses; a new one goes there.
