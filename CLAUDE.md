# CLAUDE.md

**Read `AGENTS.md` first.** It holds the hard rules and commands.
`docs/ROOF_TILE_COUNTING.md` is the source of truth for decisions and status.
`docs/PROJECT_STRUCTURE.md` says where code lives, and `docs/SECURITY.md` holds the
security position.

## What the application does

A solar installer's employee counts roof tiles by hand to get exact outer dimensions
for a 2D CAD drawing, at 30 to 60 minutes per roof side. This app does that from one
photo, in the browser. `/` explains the product in German or English and leads to the tool at
`/tool`; `/guide` is the user guide.

1. **Intake.** A photo or customer folder is screened (`io/upload.ts`), decoded to
   plain pixels (`browser/decode.ts`) and checked for quality.
2. **Roof.** A colour heuristic proposes four corners. The employee corrects them.
3. **Count.** The roof is flattened with a homography. Courses come from
   autocorrelation; width is then measured inside each course, so the half-tile
   stagger cannot double it. Confidence and warnings follow.
4. **Dimensions.** Tile size turns counts into metres.
5. **Obstructions.** Detected, drawn or typed, in whole tile positions.
6. **Panels.** The employee's choice of counts only, automatic, or manual on the grid.
7. **Export.** After confirmation: DXF, PDF, PNG, CSV, JSON.

The client values exact 2D numbers and explicitly rejected imprecise 3D planning and
free drag-and-drop. Manual panels therefore snap to the tile grid.

## Reviewing code here

Check these on every change:

- **Accuracy:** does `pnpm test:accuracy` still pass? A change to `vision/` needs it.
  Never relax a benchmark assertion to make it pass; find out why it failed.
- **False confidence:** a wrong number with high confidence is the worst failure.
  A low-confidence count must stay blank.
- **Human review:** any edit after confirmation must clear `confirmed`.
- **Privacy:** no new route that accepts data, outbound request or storage. Nothing from the file
  except pixels reaches an export, and file names stay out of exports.
- **Blank is not zero:** `Number("")` is 0. A required field must fail when blank.
- **Purity:** `lib/tile-count/` has no DOM, I/O, `Math.random()` or `Date.now()`.
- **Honesty:** synthetic results are never presented as real-photo accuracy, in
  either language.
- **Language:** new copy goes in `lib/i18n/` in both languages. Switching language
  changes no value and never clears `confirmed`. JSON, CSV and DXF stay in one stable
  format; only the PDF follows the language.

## Key modules

- `lib/tile-count/vision/count.ts`: photo plus corners to counts, confidence, warnings.
- `lib/tile-count/vision/periodicity.ts`: period finder and course-aligned bands.
- `lib/tile-count/planning/panel-plan.ts`: manual layout rules.
- `lib/tile-count/io/dxf.ts`: true-scale CAD drawing.
- `lib/tile-count/testing/synthetic-roof.ts`: known-answer roofs.
- `components/tile-count/state/`: all client state and actions.
- `components/layout/LanguageProvider.tsx` + `lib/i18n/`: language choice and all copy.
- `middleware.ts` + `lib/auth/`: password gate, login throttle and the `PUBLIC_DEMO` switch.

## Testing

- Unit tests run under Vitest with `happy-dom`. A file that needs `sharp` sets
  `// @vitest-environment node`.
- `lib/i18n/__tests__/i18n.test.ts` scans the source for sentences without German.
- Playwright defaults to `http://localhost:3000`. With a production server, pass
  `APP_USERNAME` and `APP_PASSWORD`, which also configure its HTTP credentials. In
  production the password must be at least 12 characters.
- Tests start from a dark system theme, because an unset theme follows the OS.
- The tool is at `/tool`. Playwright's `en-US` browser gets English by default.
- `e2e/fixtures/roof.heic` is synthetic and is the only photo allowed in git.

## Claude Code tooling

Skills in `.claude/skills/`: `run-app`, `open-pr`, `ci-verify`, `test-unit`,
`test-e2e`, `test-accuracy`, `test-security`, `lint`.
