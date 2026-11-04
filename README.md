# HelioSense Roof Count

Count roof tiles from a photo and turn them into exact dimensions for the CAD
drawing. Built for solar installers who plan complex tiled roofs and currently count
tiles by hand.

Add a photo, correct the roof corners, enter the tile size, mark obstructions, review
the recommended panels, confirm, and export. Photos are processed in the browser and
never uploaded.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Try the built-in sample roof, or see `/guide` for the step-by-step guide.

## Production

Set `APP_USERNAME` and `APP_PASSWORD`. Without both, every request is refused.
Serve over HTTPS only, and host in the EU.

## Docs

- `docs/ROOF_TILE_COUNTING.md`: architecture, requirements status, known limitations
- `AGENTS.md`: rules for working in this repo

## Licence

Proprietary. See `LICENSE`.
