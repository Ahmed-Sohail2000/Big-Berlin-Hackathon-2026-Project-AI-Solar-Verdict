
# Roof Tile Counting — Development Guide

> Source of truth for this feature. Requirements come from
> `docs/briefing/Developer Briefing AI Roof Tile Counting for PV Roof Planning.pdf`
> (Nov 4, 2026). Section numbers below (§) refer to that briefing.
>
> **Status:** MVP and should-haves implemented at `/installer/tile-count`, verified
> on synthetic roofs only. **Accuracy on real photos is unmeasured** (see §7).
> Keep the checkboxes in §4 current; this is the anti-cycling record.

---

## 1. What we are building

An installer-facing desktop tool: upload one photo of a tiled roof surface, enter
the tile size, and get back the tile count (height × width), the outer dimensions
in metres, and an annotated overlay. The employee corrects the roof corners if
needed, recounts, confirms, and exports for the CAD drawing.

The result is always a **proposal**. An AI count with no way to review it is not
acceptable to the client (§5). A low-confidence photo must produce a clear warning,
never a seemingly certain number (§6).

The client rejects imprecise 3D drag-and-drop planning (§3). This feature is
precise **2D** counting. It stays separate from the Cesium/3D views and does not
feed the sizing engine.

---

## 2. Architecture decisions

| # | Decision | Why |
|---|---|---|
| D1 | **All image processing runs in the employee's browser.** Photos are never uploaded to our server. | §7 prefers local inference so images stay in the client's data space. No server copy means nothing to retain, delete, back up or virus-scan on our side. |
| D2 | **Deterministic computer vision, no external AI API.** | Works offline, costs nothing per photo, gives reproducible counts (§3 "reproducible, traceable"). Also honours `AGENTS.md` hard rule 2: the LLM never outputs geometry, which rules out Gemini returning roof corners or counts. |
| D3 | **Count by periodicity on a rectified image, not per-tile detection.** | §8: more robust against moss, shadow and blurred edges. No training data exists yet, so a detector is not an option today. |
| D4 | **Roof-corner auto-detection is a heuristic first guess; human correction is the main path.** | Reliable segmentation needs a pretrained model. §4 accepts human correction "as long as the final result is correct". The `RoofDetector` interface (§3) lets a model replace it later. |
| D5 | **Self-contained module; `lib/contracts.ts` is not touched.** | Tile-count types live in `lib/tile-count/types.ts`. No frozen-contract change, no effect on the golden profiles. |
| D6 | **No persistence in the MVP.** State lives in the page; closing the tab discards it. A free-text case reference goes into exports. | Satisfies storage limitation and deletion by design. The customer-folder integration is an open client question (§9). |

### Data flow

```
File (JPEG/PNG; HEIC/PDF if approved, see section 5)
  └─ decode.ts      draw to canvas, cap long edge at 2400 px. Discards EXIF/GPS.
      └─ detect-roof.ts   proposes 4 corners (heuristic)
          └─ UI             employee drags corners            <── human review
              └─ homography.ts + rectify.ts   flatten roof to a rectangle
                  └─ periodicity.ts   course/tile pitch per axis (autocorrelation)
                      └─ count.ts     counts + confidence + warnings
                          ├─ dimensions.ts   metres from the tile size
                          ├─ obstructions.ts cell anomalies to tile positions
                          └─ export.ts       JSON / CSV / annotated PNG / PDF
```

### Key algorithm notes

- **Rectification:** a 4-point homography (DLT) maps the quad onto a rectangle.
  Counting works per axis, so the rectified aspect ratio does not affect the count.
- **Width axis:** tile joints are staggered between courses and often blurry (§5),
  so a single column profile cancels itself out. Instead, compute an autocorrelation
  for each course-height band and average those. Autocorrelation ignores shift, so
  stagger survives.
- **Period:** take the strongest peak, require support from its harmonics, and
  refine with parabolic sub-pixel interpolation. Rejecting a harmonic or
  sub-harmonic is the main defence against off-by-a-factor-of-2 counts.
- **Confidence** combines peak prominence, harmonic support, period agreement
  between image sections (drift means a bad corner or a non-planar roof), and how
  close `extent / period` is to a whole number.
- **Dimensions (§8):** `heightM = rows × (tileHeight − headLap)`,
  `widthM = tilesPerRow × (tileWidth − sideLap)`, using exposed dimensions. Tile
  size is mandatory; without it, counts are shown and metres are withheld.
- **Obstructions:** compare each grid cell's edge structure against the median
  tile. Using structure rather than brightness keeps moss and shadow out. Connected
  anomalous cells become a proposed rectangle, reported as e.g. "10 from bottom,
  20 from left, 4 wide, 5 high". The employee can add, edit or delete any of them.

---

## 3. File structure

```
lib/tile-count/                 pure TS, no DOM, no I/O, no Math.random()/Date.now()
  types.ts                      GrayImage, Quad, TileSize, CountResult, Obstruction
  homography.ts                 DLT solve, point mapping
  rectify.ts                    bilinear warp
  periodicity.ts                autocorrelation, harmonic check, sub-pixel peak
  count.ts                      orchestrates the count, confidence and warnings
  dimensions.ts                 tile size validation and metre calculation
  detect-roof.ts                RoofDetector interface + heuristic implementation
  obstructions.ts               cell anomaly detection, tile-position conversion
  grid.ts                       projects grid and obstructions back onto the photo
  upload.ts                     file type (from leading bytes) and size checks
  export.ts                     JSON, CSV, minimal PDF writer
  __tests__/                    unit tests + synthetic-roof.ts generator
components/installer/tile-count/
  TileCountWorkspace.tsx        upload, tile size, run, results (installer-side UI)
  RoofOverlay.tsx               photo + SVG overlay with draggable corner handles
  ObstructionEditor.tsx
  RulerCalibration.tsx          tile size from clicks on a reference photo
  fields.tsx                    shared form controls
  decode.ts                     browser-only File to pixels
  annotate.ts                   browser-only annotated image and downloads
app/installer/tile-count/page.tsx
e2e/tile_count.spec.ts          browser flow, also asserts nothing leaves the browser
scripts/tile-accuracy-report.ts reference-set runner (§7 measurable accuracy)
```

`lib/tile-count/` follows the same rule as `lib/sizing/`: pure, deterministic and
testable under Vitest without a browser. Extension points required by §7: drone
photos need no code path (they are the same pipeline with an easier quad),
`RoofDetector` swaps in a model, and `export.ts` can gain a CAD format.

---

## 4. Requirements traceability

### Must have (§4)

- [x] Detect and delimit the roof surface: `detect-roof.ts` (heuristic, see D4)
- [x] Count tiles in height and width: `rectify.ts`, `periodicity.ts`, `count.ts`
- [x] Numbers plus overlay image with roof and grid: `RoofOverlay.tsx`
- [x] Tile size input (height, width, overlap) to metres: `dimensions.ts`
- [x] Manual correction, then recount: draggable corners, live recount

### Should have (§4)

- [x] Obstruction areas as tile positions: `obstructions.ts`, `ObstructionEditor.tsx`
- [x] Export CSV / JSON / PDF with annotated image: `export.ts`
- [x] Tile size from a ruler reference photo: **semi-automatic** in this release.
      The employee clicks two ruler marks and the tile edges. Fully automatic
      ruler reading is not attempted.

### Output and quality (§5, §6, §7)

- [x] Confidence level and poor-photo warning: `count.ts`
- [x] Only real tiles counted: limited to the confirmed quad; periodicity ignores
      non-repeating moss and shadow
- [ ] Automated tests with measurable accuracy: synthetic suite done;
      `tile-accuracy-report.ts` is written but has **not been run**, it needs the
      client photos and manual reference counts
- [x] Documentation: this file

### Explicitly out of scope (§4)

3D models and photogrammetry, flat roofs, automatic module placement, shading,
compass orientation, drone integration, roof pitch, mobile app.

---

## 5. External tools and approvals

Nothing external runs at runtime by default. Each item below needs explicit
approval before it is added.

| Item | Purpose | Status |
|---|---|---|
| `heic2any` (npm) | Decode iPhone HEIC in Chrome/Edge. Bundles libheif (LGPL), runs locally, lazy-loaded | Approved, installed. **Not yet tested with a real HEIC file.** Check the LGPL terms before a proprietary release |
| `pdfjs-dist` (npm) | Decode PDF input. Worker must be bundled locally, never loaded from a CDN | Approved, installed. Worker confirmed in the local build output |
| External AI API | None planned (D2) | Not used |
| Google Drive sample photos | Real accuracy measurement | Needs the client link; contains personal data, handle per §7 |

Existing rule stays in force: `MOCK_MODE=true` for tests, no live API calls.

---

## 6. Compliance position (§7)

| Requirement | MVP position |
|---|---|
| EU hosting, third-country transfer | Photos stay on the employee's machine. The app shell can be hosted anywhere, but **EU hosting is still a deployment decision to confirm**, because the current Vercel project is not verified as EU-only |
| DPA for processors | No processor sees photos. Hosting still needs a client decision |
| EXIF removal | Canvas decode drops all metadata; exports are generated from pixels only |
| Storage limitation, deletion | Nothing stored (D6) |
| Encryption in transit | HTTPS from the host |
| Upload checks | Type and size checked in the browser before decoding |
| Virus scan, backups | **Not applicable while there is no server upload.** Required if storage is added later |
| Authentication, roles, 2FA, access logs | **Not implemented. This app has no auth layer at all today.** The page holds no customer data, but §7 lists auth as a requirement, so it is a blocker for production use if server storage or the lead data is involved |
| Training on user corrections | Not done; needs consent |

This is an engineering position, not legal advice. The client's data protection
officer has to review it (§7).

---

## 7. Testing and accuracy

- **Unit tests** (`MOCK_MODE=true pnpm test tile-count`): homography round trips,
  rectification, period recovery, dimensions, tile-size validation, CSV/JSON/PDF
  output, obstruction conversion.
- **Synthetic roofs:** `synthetic-roof.ts` renders a known count with staggering,
  perspective, moss, shadows and noise. Assertions check the exact count on clean
  images, and a warning (not a wrong confident number) on featureless ones.
- **Browser:** `BASE_URL=http://localhost:3000 pnpm exec playwright test
  e2e/tile_count.spec.ts --project=desktop` against a `MOCK_MODE=true` dev server.
- **Regression:** golden-profile tests must stay green.
- **Real accuracy is unknown until the client photos arrive.** Synthetic results
  say nothing about real-photo accuracy and must not be quoted to the client as
  such. The report script reads a manifest of photo, quality level, corners and
  reference count, and prints the deviation per quality level.

---

## 8. Open questions for the client call (Fri Nov 6, 2026, 9:00)

From §9, plus the implementation consequence of each answer:

1. Accepted tolerance in tiles? Sets the pass/fail line for the accuracy report.
2. Manually counted references for the sample photos? Without them, accuracy
   cannot be measured.
3. Common tile types and sizes? Would allow presets instead of free input.
4. How do results get into ApproachCAD? If it needs DXF, that is an addition to
   `export.ts`. Not built until confirmed.
5. Weekly photo volume? Low relevance while processing is local.
6. Existing IT environment? Decides hosting, and whether auth and storage are needed.
7. Obstructions in the first release, or outer dimensions only?
8. Data protection contact and DPA template?

Additional question from this design:

9. Are per-browser, no-server processing and a typed case reference acceptable, or
   must results be saved into the customer folder?

---

## 9. Known limitations

- Roof auto-detection is a heuristic and will often need corner correction,
  especially with neighbouring roofs in frame.
- The four-corner model assumes a single planar quadrilateral. Hipped, L-shaped and
  dormer-split surfaces need measuring in sections, or a polygon extension.
- Tiles hidden behind an eave or ridge at low camera angles cannot be counted.
- Non-repeating surfaces (patched roofs, mixed tiles) produce a warning.
- Tiles with two waves per tile (e.g. double-Roman profiles) may repeat at half the
  tile width and double the width count. The overlay grid shows this, but it has
  not been tested. Ask which tile types occur (§8, question 3).
- Obstruction detection does not name the obstruction; the employee picks the type.
  Its threshold was tuned on synthetic images only.
- The ruler step is semi-automatic and assumes the ruler and tile share a plane.
- Processing runs on the main thread; move to a Web Worker if it causes UI lag.

---

## 10. Build order

Finish each step with tests before starting the next. Do not revisit a closed step
unless a test forces it.

1. `types`, `homography`, `rectify`, `dimensions`, plus tests
2. `synthetic-roof` generator, `periodicity`, `count`, plus tests
3. `detect-roof`, `obstructions`, plus tests
4. `export`, plus tests
5. UI workspace and page, installer navigation link
6. Accuracy report script
7. `tsc`, lint, full unit suite, browser smoke test, update §4 and `STATUS.md`
