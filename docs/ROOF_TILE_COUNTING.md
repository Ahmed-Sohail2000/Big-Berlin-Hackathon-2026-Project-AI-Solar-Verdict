# Roof Tile Counting — Development Guide

> Source of truth for this product. Requirements come from
> `docs/briefing/Developer Briefing AI Roof Tile Counting for PV Roof Planning.pdf`
> (Nov 4, 2026, kept out of git). Section numbers (§) refer to that briefing.
> Keep §4 current: it is the record that stops work going in circles.

**Status:** complete against the briefing's must-haves and all but one should-have on
synthetic roofs. **Accuracy on real photos is unmeasured** (§7). Not yet deployed.

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

### What it solves

- 30 to 60 minutes of counting per roof side becomes a review of a proposal (§3).
- Miscounts become visible: the grid sits on the photo and exports record corrections.
- Oblique phone photos, moss, shadow and blurred edges (§3, §5).
- Outer dimensions, and obstruction positions in tiles (§4).
- Transfer into CAD without rework, through a true-scale DXF (§6).
- Measuring without climbing the roof (§3).
- Personal data stays in the client's own space (§7).

### What it does not solve

- Flat roofs, 3D models, photogrammetry, roof pitch, shading, orientation (§2, §4).
- Module, substructure and string planning, which stay in CAD. Panel options here are
  a planning aid, and the briefing excludes automatic placement from the MVP (§4).
- Non-rectangular surfaces in one go, and tiles hidden from the camera.
- Saving to customer folders, retention periods, and roles. Nothing is stored (§7).
- Drone flight and a mobile app (§4).
- A proven accuracy figure. That needs the client's photos.

---

## 2. Architecture decisions

| # | Decision | Why |
|---|---|---|
| D1 | **All image processing runs in the browser.** The app has no API routes and no database. | §7 prefers local processing. With no server copy, there is nothing to retain, delete, back up or virus-scan. |
| D2 | **Deterministic computer vision, no external AI API.** | Reproducible counts (§3), no per-photo cost, works without keys. |
| D3 | **Count by periodicity on a rectified image**, not per-tile detection. | §8: more robust against moss, shadow and blurred edges, and no training data exists. |
| D4 | **Roof-corner detection is a heuristic first guess; human correction is the main path.** | Reliable segmentation needs a model. §4 accepts correction "as long as the final result is correct". `RoofDetector` is the seam for a model. |
| D5 | **Full photo resolution is kept** (up to 4096 px, rectified up to 3200 px). | Downscaling loses tile edges. A 12 MP synthetic photo counts in about 1 s on the dev machine. |
| D6 | **Panels are an optional post-step: counts only, automatic, or manual.** | They cannot affect the count. The briefing excludes automatic placement from the MVP, so this was added on request and labelled a proposal. Counts only is the briefing's exact scope. |
| D7 | **No persistence.** State lives in memory; Start over or closing the tab discards it. | Storage limitation and deletion by design (§7). |
| D8 | **Manual panels snap to the tile grid and are stored in tiles.** | The client rejected free drag-and-drop as "painting" (§1). Tile positions stay as exact as the count, and survive a change of tile size. |
| D9 | **Width is measured inside each tile course, located from the height axis.** | Height is the reliable axis. A band crossing two courses mixes half-tile-shifted patterns, which doubled or scrambled the width on harder roofs. |
| D10 | **DXF R12 ASCII for CAD.** | Every AutoCAD variant reads it, it needs no library, and it is true scale. |

### Data flow

```
Files or folder  (JPEG, PNG, HEIC, PDF)
 └─ upload.ts            type, size, pixel limit, truncation, duplicates
    └─ decode.ts         redraw to canvas, which drops EXIF/GPS
       └─ photo-quality.ts  resolution and exposure warnings
    └─ detect-roof.ts    proposes 4 corners
       └─ RoofOverlay    employee corrects corners          <── human review
          └─ count.ts    rectify, then periodicity per axis, confidence, warnings
             ├─ dimensions.ts     metres from the tile size
             ├─ obstructions.ts   anomalous cells to tile positions
             ├─ panels.ts, panel-plan.ts   automatic or manual layout
             └─ export.ts, dxf.ts  DXF, PDF, PNG, CSV, JSON   <── after confirmation
```

### Algorithm notes

- **Width axis:** tile joints are staggered and often blurry (§5), so one column
  profile cancels itself out. The course seams are found from the height measurement,
  and autocorrelation runs on the middle of each course only (D9). The curves are then
  averaged. Autocorrelation ignores position, so stagger survives.
- **Period choice:** candidates are ranked by peak-minus-midpoint contrast, because
  a multiple of the true period has a real peak at its midpoint. The period is then
  refined from high harmonics, which is what keeps long roofs from drifting by a tile.
- **Confidence:** pattern contrast, harmonic support and agreement between the two
  halves of the roof. Low confidence leaves the count fields empty. A flattened tile
  more than twice as wide as a course is implausible and forces low confidence.
- **Dimensions (§8):** `heightM = rows × exposed height`, `widthM = columns × cover
  width`. Tile size is mandatory.
- **Panels:** straight rows upward from the eave, so rails can run through. Inside a
  row, a blocked position jumps past the obstruction. Both orientations are tried.

---

## 3. Structure

See `docs/PROJECT_STRUCTURE.md`. Extension points (§7): drone photos use the same
pipeline, `RoofDetector` swaps in a model, and `io/` takes new CAD formats.

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
- [x] Obstructions can also be drawn on the photo, snapped to whole tiles
- [x] True-scale DXF export (not yet opened in ApproachCAD)
- [ ] Tile size from a ruler photo: only semi-automatic, the employee clicks the marks

### Quality and operations (§5, §6, §7)

- [x] Confidence level and poor-photo warning
- [x] Human confirmation required before export; later edits require reconfirmation
- [x] EXIF removal, file type and size checks
- [x] No personal data on a server, deletion by design
- [x] Password login, failing closed in production
- [x] Security headers; the browser policy blocks sending data to another host
- [x] Automated tests, a synthetic accuracy benchmark and a tested accuracy report tool
- [x] Folder intake with per-file checks (§7 "reading from a folder")
- [x] Real HEIC file decoded in a production build (synthetic roof, real container)
- [x] Login lockout and minimum password length
- [x] German and English interface, home page explaining the product, tool at `/tool`
- [ ] **German copy reviewed by a native speaker or the client** (trade terms especially)
- [ ] **Accuracy report on the client's photos** (needs photos and manual counts)
- [ ] **Agreed tolerance** (client decision)
- [ ] **2FA or SSO, roles, access logging** (only a single shared password today)
- [ ] **EU hosting and DPA with the host** (deployment decision)
- [ ] **HEIC from a real iPhone** (HDR and tiled iPhone files may differ from the test file)
- [ ] **DXF opened in ApproachCAD**

### Out of scope (§4)

3D models and photogrammetry, flat roofs, shading, compass orientation, drone
integration, roof pitch, mobile app.

---

## 5. What works, what doesn't, what's missing

**Verified working** on synthetic images in a production build: the whole flow from
upload to export, oblique perspective, moss, shadow and noise, poor-photo warning,
obstruction detection and drawing, automatic and manual panels, folder intake, HEIC and
PDF input, EXIF removal, DXF output, theme switch, login and lockout, and no outbound
requests.

**Not working or unproven:**

- Real-photo accuracy is unknown.
- Roof detection is colour-based. Neighbouring roofs of the same colour fool it, and
  black tiles against dark surroundings are likely to.
- Double-wave tiles may double the width count. The grid would show it. Untested.
- With blurred side joints on steep synthetic roofs the width is usually left blank
  rather than read. That is safe, but it means a count by hand on such photos.
- Hipped, L-shaped and dormer-split surfaces need measuring in sections.
- Tiles hidden behind the eave or ridge at low camera angles cannot be counted.
- Counting runs on the main thread, so the page pauses briefly on large photos.
- A truncated JPEG usually cannot be decoded at all; it is then refused with a message.

**No system can promise zero error.** What protects accuracy here: full-resolution
processing, a mandatory visible grid check, blank counts at low confidence, required
confirmation, a record of manual corrections, and the accuracy report. The report
counts the one failure that must stay at zero: wrong by more than one tile while
claiming high confidence.

---

## 6. Compliance position (§7)

See `docs/SECURITY.md`. The client's data protection officer has to review it.

---

## 7. Testing

- `pnpm test`: unit tests for `lib/`.
- `pnpm test:accuracy`: the known-answer benchmark across three quality levels.
- `pnpm test:security`: login, upload and export checks.
- `pnpm test:e2e` against a production build. See the `test-e2e` skill.
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
