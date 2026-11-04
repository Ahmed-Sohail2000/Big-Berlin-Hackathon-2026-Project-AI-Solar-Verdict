# AGENTS.md

Read this first if you are an AI coding agent opening this repo.

## What this repo is

HelioSense Roof Count: a browser-only tool that counts roof tiles from a photo for a
solar installer's CAD drawing. `docs/ROOF_TILE_COUNTING.md` holds the architecture,
requirements status and limitations. Start there, then `STATUS.md`.

The earlier HelioSense quoting app (homeowner flow, leads, Cesium 3D, Google, Gemini
and Tavily APIs, Reonic data) was removed. It remains in git history on `main` and
`feature/mock-mode-simulation`.

## Hard rules

1. **Photos never leave the browser.** No API routes that accept images, no external
   AI calls, no analytics. Do not loosen `connect-src` or `form-action` in
   `next.config.ts`.
2. **`lib/tile-count/` stays pure.** No DOM, no I/O, no `Math.random()`, no
   `Date.now()`. Browser work belongs in `components/tile-count/`.
3. **A count is a proposal.** Low confidence leaves the fields empty, and export stays
   locked until the employee confirms. Later edits require reconfirmation.
4. **Never quote synthetic results as real accuracy.**
5. **Colours come from the tokens in `app/globals.css`,** defined for both themes. No
   hard-coded page colours, gradients, purple or `rounded-full`; 8px radius at most.
   Overlay colours on the photo are fixed in both themes.
6. **All UI copy is English.**
7. **Never commit credentials, customer photos or the client briefing.**

## Commands

```bash
pnpm dev                 # localhost:3000
pnpm test                # unit tests
pnpm tsc --noEmit        # type check
pnpm lint
pnpm build
pnpm test:e2e            # needs a running server, see the guide doc section 7
pnpm accuracy <manifest> # deviation from manual counts
```

The package manager is pnpm, not npm.

## When you finish a session

Update `STATUS.md` and the requirement checkboxes in `docs/ROOF_TILE_COUNTING.md`.
