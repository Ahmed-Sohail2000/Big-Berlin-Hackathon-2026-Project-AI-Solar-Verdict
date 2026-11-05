# AGENTS.md

Read this first if you are an AI coding agent opening this repo.

## What this repo is

HelioSense Roof Count: a browser-only tool that counts roof tiles from a photo for a
solar installer's CAD drawing. `docs/ROOF_TILE_COUNTING.md` holds the architecture,
requirements status and limitations. Start there, then `STATUS.md`.
`docs/PROJECT_STRUCTURE.md` says where code lives. `docs/SECURITY.md` holds the
security position.

An earlier quoting app was removed from this branch. It remains in git history on
`main` and `feature/mock-mode-simulation`.

## Hard rules

1. **Photos never leave the browser.** No API routes that accept images, no external
   AI calls, no analytics. Do not loosen `connect-src` or `form-action` in
   `next.config.ts`.
2. **`lib/tile-count/` stays pure.** No DOM, no I/O, no `Math.random()`, no
   `Date.now()`. Browser work belongs in `components/tile-count/`.
3. **A count is a proposal.** Low confidence leaves the fields empty, and export stays
   locked until the employee confirms. Later edits require reconfirmation.
4. **Never quote synthetic results as real accuracy.**
5. **Do not relax an accuracy benchmark to make it pass.** Find the cause.
6. **Colours come from the tokens in `app/globals.css`,** defined for both themes. No
   hard-coded page colours, gradients, purple or `rounded-full`; 8px radius at most.
   Overlay colours on the photo are fixed in both themes.
7. **All UI copy is English.**
8. **Never commit credentials, customer photos or the client briefing.**

## Commands

```bash
pnpm dev                 # localhost:3000
pnpm test                # unit tests
pnpm test:accuracy       # known-answer accuracy benchmark
pnpm test:security       # login, upload and export checks
pnpm tsc --noEmit        # type check
pnpm lint
pnpm build
pnpm test:e2e            # needs a running production server, see the test-e2e skill
pnpm accuracy <manifest> # deviation from manual counts
```

The package manager is pnpm, not npm.

## When you finish a session

Update `STATUS.md` and the requirement checkboxes in `docs/ROOF_TILE_COUNTING.md`.
