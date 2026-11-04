# Roof Tile Counting — Development Guide

> Source of truth for this product. Requirements come from
> `docs/briefing/Developer Briefing AI Roof Tile Counting for PV Roof Planning.pdf`
> (Nov 4, 2026, kept out of git). Section numbers (§) refer to that briefing.
> Keep §4 current: it is the record that stops work going in circles.

**Status:** complete against the briefing's must-haves on synthetic roofs.
**Accuracy on real photos is unmeasured** (§7). Not yet deployed.

---

## 1. What this is

A desktop web tool for a solar installer. An employee adds one photo of a tiled
roof surface and gets the tile count, outer dimensions in metres, obstruction
positions and a panel recommendation, all reviewed on an overlay before export to
the CAD drawing.

The result is always a **proposal**. An AI count with no way to review it is not
acceptable to the client (§5), and a poor photo must produce a warning, never a
seemingly certain number (§6). The client rejects imprecise 3D drag-and-drop
planning (§3), so this is precise 2D counting.

---

## 2. Architecture decisions

| # | Decision | Why |
|---|---|---|
| D1 | **All image processing runs in the browser.** The app has no API routes and no database. | §7 prefers local processing. With no server copy, there is nothing to retain, delete, back up or virus-scan. |
| D2 | **Deterministic computer vision, no external AI API.** | Reproducible counts (§3), no per-photo cost, works without keys. |
| D3 | **Count by periodicity on a rectified image**, not per-tile detection. | §8: more robust against moss, shadow and blurred edges, and no training data exists. |
| D4 | **Roof-corner detection is a heuristic first guess; human correction is the main path.** | Reliable segmentation needs a model. §4 accepts correction "as long as the final result is correct". `RoofDetector` is the seam for a model. |
| D5 | **Full photo resolution is kept** (up to 4096 px, rectified up to 3200 px). | Downscaling loses tile edges. A 12 MP synthetic photo counts in about 1 s on the dev machine. |
| D6 | **Panel recommendation is a post-step on confirmed numbers.** | It cannot affect the count. The briefing excludes automatic module placement from the MVP, so this was added on request and is labelled a planning proposal. |
| D7 | **No persistence.** State lives in memory; Start over or closing the tab discards it. | Storage limitation and deletion by design (§7). |

### Data flow

```
File  (JPEG, PNG, HEIC, PDF)
 └─ decode.ts            redraw to canvas, which drops EXIF/GPS
    └─ detect-roof.ts    proposes 4 corners
       └─ RoofOverlay    employee corrects corners          <── human review
          └─ count.ts    rectify, then periodicity per axis, confidence, warnings
             ├─ dimensions.ts     metres from the tile size
             ├─ obstructions.ts   anomalous cells to tile positions
             ├─ panels.ts         best-fitting panel rows
             └─ export.ts         JSON, CSV, PDF, annotated PNG   <── after confirmation
```

### Algorithm notes

- **Width axis:** tile joints are staggered and often blurry (§5), so one column
  profile cancels itself out. Autocorrelation is computed per half-course band and
  the curves are averaged. Autocorrelation ignores position, so stagger survives.
- **Period choice:** candidates are ranked by peak-minus-midpoint contrast, because
  a multiple of the true period has a real peak at its midpoint. The period is then
  refined from high harmonics, which is what keeps long roofs from drifting by a tile.
- **Confidence:** pattern contrast, harmonic support and agreement between the two
  halves of the roof. Low confidence leaves the count fields empty.
- **Dimensions (§8):** `heightM = rows × exposed height`, `widthM = columns × cover
  width`. Tile size is mandatory.
- **Panels:** straight rows upward from the eave, so rails can run through. Inside a
  row, a blocked position jumps past the obstruction. Both orientations are tried.

---

## 3. Structure

```
app/
  layout.tsx, globals.css      theme tokens, header
  page.tsx                     the workspace
  guide/page.tsx               step-by-step guide for users
components/
  AppHeader.tsx, ThemeToggle.tsx
  tile-count/
    TileCountWorkspace.tsx     stepper, photo area, running summary
    useWorkspace.ts            all state and actions
    steps/                     one panel per step
    RoofOverlay.tsx            photo, grid, panels, corner handles, magnifier
    ObstructionEditor.tsx, RulerCalibration.tsx, fields.tsx
    decode.ts, annotate.ts     browser-only image work
    sample.ts                  synthetic sample roof
lib/
  auth/basic-auth.ts           password gate logic
  tile-count/                  pure TS: no DOM, no I/O, no Math.random()
middleware.ts                  applies the password gate to every page
next.config.ts                 Content-Security-Policy and security headers
scripts/tile-accuracy-report.ts   deviation from manual counts, per quality level
e2e/tile_count.spec.ts         whole flow, also asserts nothing leaves the browser
```

Extension points (§7): drone photos use the same pipeline, `RoofDetector` swaps in
a model, and `export.ts` can gain a CAD format.

---

## 4. Requirements status

### Must have (§4)

- [x] Detect the roof surface: heuristic proposal, corrected by the employee (D4)
- [x] Count tiles in height and width
- [x] Numbers plus overlay of roof and grid
- [x] Tile size input to metres
- [x] Manual correction, then recount

### Should have (§4)

- [x] Obstruction areas as tile positions. Detection proposes areas; the employee names them
- [x] Export CSV, JSON, PDF and annotated PNG
- [ ] Tile size from a ruler photo: only semi-automatic, the employee clicks the marks

### Quality and operations (§5, §6, §7)

- [x] Confidence level and poor-photo warning
- [x] Human confirmation required before export; later edits require reconfirmation
- [x] EXIF removal, file type and size checks
- [x] No personal data on a server, deletion by design
- [x] Password login, failing closed in production
- [x] Security headers; the browser policy blocks sending data to another host
- [x] Automated tests and a tested accuracy report tool
- [ ] **Accuracy report on the client's photos** (needs photos and manual counts)
- [ ] **Agreed tolerance** (client decision)
- [ ] **2FA or SSO, roles, access logging** (only a single shared password today)
- [ ] **EU hosting and DPA with the host** (deployment decision)
- [ ] **Real HEIC test** (decoder is wired in, never run on a real file)

### Out of scope (§4)

3D models and photogrammetry, flat roofs, shading, compass orientation, drone
integration, roof pitch, mobile app.

---

## 5. What works, what doesn't, what's missing

**Verified working** on synthetic images in a production build: the whole flow from
upload to export, oblique perspective, moss, shadow and noise, poor-photo warning,
obstruction detection, panel recommendation, theme switch, login, PDF input, and no
outbound requests.

**Not working or unproven:**

- Real-photo accuracy is unknown.
- HEIC decoding is unproven, including under the Content-Security-Policy.
- Roof detection is colour-based. Neighbouring roofs of the same colour fool it, and
  black tiles against dark surroundings are likely to.
- Double-wave tiles may double the width count. The grid would show it. Untested.
- Hipped, L-shaped and dormer-split surfaces need measuring in sections.
- Tiles hidden behind the eave or ridge at low camera angles cannot be counted.
- Counting runs on the main thread, so the page pauses briefly on large photos.
- Login has no rate limit, so it should sit behind the host's protection.

**No system can promise zero error.** What protects accuracy here: full-resolution
processing, a mandatory visible grid check, blank counts at low confidence, required
confirmation, a record of manual corrections, and the accuracy report. The report
counts the one failure that must stay at zero: wrong by more than one tile while
claiming high confidence.

---

## 6. Compliance position (§7)

This is an engineering position, not legal advice. The client's data protection
officer has to review it.

| Requirement | Position |
|---|---|
| Hosting, third-country transfer | Photos stay on the employee's machine. The app itself still needs EU hosting |
| DPA | No processor sees photos. Hosting needs a decision |
| EXIF | Dropped on decode; exports are built from pixels only |
| Storage limitation, deletion | Nothing stored |
| Encryption in transit | HTTPS from the host, with HSTS set |
| Authentication | Shared password over HTTPS. No 2FA, roles or access log |
| Upload checks | Type from file contents, 30 MB limit, nothing reaches a server |
| Virus scan, backups | Not applicable with no server upload. Required if storage is added |
| Training on corrections | Not done; needs consent |

---

## 7. Testing

- `pnpm test`: unit tests for `lib/`.
- `pnpm build`, then `APP_USERNAME=x APP_PASSWORD=y pnpm start`, then the same
  variables with `pnpm exec playwright test --project=desktop`.
- `pnpm accuracy <manifest.json>`: the format is at the top of the script. Keep
  photos and manifests outside the repo, because they are personal data. Needs a
  one-time download of `tsx`.

Synthetic results say nothing about real-photo accuracy and must not be quoted to
the client as such.

---

## 8. Open questions for the client

1. Accepted tolerance in tiles?
2. Manually counted references for the sample photos?
3. Common tile types and sizes? Are double-wave tiles used?
4. How do results reach ApproachCAD? DXF would be an addition to `export.ts`.
5. Weekly photo volume?
6. Existing IT environment? This decides hosting, login and storage.
7. Obstructions in the first release, or outer dimensions only?
8. Data protection contact and DPA template?
9. Is browser-only processing acceptable, or must results be saved to customer folders?
10. Is the panel recommendation wanted, given that it goes beyond the briefing? Which
    panel models and setback rules should it use?
