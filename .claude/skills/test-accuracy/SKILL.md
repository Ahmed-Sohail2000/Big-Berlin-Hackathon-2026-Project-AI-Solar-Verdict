---
name: test-accuracy
description: measure tile counting accuracy, on the synthetic benchmark and on the client's reference photos
---

Run this after any change to `lib/tile-count/vision/`, and whenever accuracy is
discussed.

## Synthetic benchmark

```bash
pnpm test:accuracy
```

Known-answer roofs across the briefing's three quality levels, plus misplaced corners,
a tilted grid and blurred side joints.

- Every roof must come out exact, except blurred joints, where the count may be left
  blank but must never be far off.
- If an assertion fails, find the cause in `vision/`. Do not relax the assertion.
- These results prove the algorithm has not regressed. They say nothing about real
  photos and must not be quoted to the client as accuracy.

## Client reference photos

```bash
pnpm accuracy <manifest.json>
```

The manifest format is at the top of `scripts/tile-accuracy-report.ts`. Keep photos and
manifests outside the repo, because they are personal data. Leave out `corners` to
measure roof detection as well. The script needs a one-time download of `tsx`, so ask
the user first.

Report per quality level: exact, within one tile, mean deviation, no count returned,
and "wrong but high". That last figure is the failure that must stay at zero.
