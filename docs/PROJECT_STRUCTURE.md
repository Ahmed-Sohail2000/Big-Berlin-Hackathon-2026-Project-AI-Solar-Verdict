# Project Structure

Where everything lives, and where new code goes. If a change does not fit this map,
update the map in the same commit.

```
app/                         Next.js routes only. No logic.
  layout.tsx, globals.css    fonts, theme tokens, text scale, header
  page.tsx                   the workspace
  guide/page.tsx             user guide, including what the tool does and does not solve

components/
  layout/                    AppHeader, ThemeToggle
  tile-count/
    TileCountWorkspace.tsx   stepper, drop area, photo view, running summary
    state/                   React hooks: the only place that holds client state
      useWorkspace.ts        the roof: photo, corners, counts, obstructions, folder, export
      usePanelPlan.ts        the panels: counts only, automatic or manual
    overlay/RoofOverlay.tsx  photo, grid, panels, corner handles, magnifier, mouse tools
    steps/                   one panel per step, plus the editors they use
    ui/fields.tsx            shared inputs, buttons and the step panel
    browser/                 work that needs a browser
      decode.ts              file to pixels (HEIC, PDF, image)
      folder.ts              reads and screens a chosen or dropped folder
      annotate.ts            annotated export image and downloads
      sample.ts              the synthetic sample roof

lib/                         pure TypeScript. No DOM, no I/O, no Math.random(), no Date.now()
  auth/                      password gate and login throttle (the server clock is passed in)
  tile-count/
    types.ts                 shared types
    vision/                  photo to measurements
      homography.ts          4-point perspective maths
      rectify.ts             flattens the roof
      periodicity.ts         autocorrelation, period finder, course-aligned bands
      count.ts               counts, confidence, warnings
      photo-quality.ts       resolution and exposure checks
      detect-roof.ts         first guess at the corners; the seam for a model
      obstructions.ts        anomalous cells to tile positions
      grid.ts                roof coordinates to photo pixels and back
    planning/                measurements to a plan
      dimensions.ts          tile size to metres, plausibility warnings
      panels.ts              automatic layout
      panel-plan.ts          manual layout on the tile grid
    io/                      data in and out
      upload.ts              file and folder checks
      export.ts              JSON, CSV, PDF
      dxf.ts                 true-scale CAD drawing
    testing/synthetic-roof.ts  known-answer roofs for tests and the sample
    __tests__/               unit tests and the accuracy benchmark

middleware.ts                applies the password gate and the login throttle to every page
next.config.ts               Content-Security-Policy and security headers
scripts/tile-accuracy-report.ts  deviation from manual counts on the client's photos

e2e/
  tile_count.spec.ts         the whole flow in a real browser
  security.spec.ts           headers, no upload route, login lockout
  fixtures/roof.heic         a synthetic roof in a real HEIC container

docs/
  ROOF_TILE_COUNTING.md      source of truth: decisions, requirements status, limitations
  SECURITY.md                security position and upload measures
  PROJECT_STRUCTURE.md       this file
  briefing/                  the client briefing. Not in git.

.claude/skills/              how to run and test this repo
```

## Where new code goes

| Adding | Goes in |
|---|---|
| A new measurement from pixels | `lib/tile-count/vision/` |
| A new calculation on confirmed numbers | `lib/tile-count/planning/` |
| A new export format | `lib/tile-count/io/`, then a button in `steps/ExportStep.tsx` |
| A roof segmentation model | a new `RoofDetector` beside `detect-roof.ts` |
| Client state | a hook in `components/tile-count/state/` |
| A new step | `steps/`, then `STEPS` in `useWorkspace.ts` |
| Anything using `document` or `window` | `components/tile-count/browser/` |

## Dependency direction

`app` → `components` → `lib`. Inside `lib/tile-count`: `io` and `planning` may use
`vision`, never the other way round, except that `vision/grid.ts` projects planned
panels onto the photo. Nothing in `lib` imports from `components`.
