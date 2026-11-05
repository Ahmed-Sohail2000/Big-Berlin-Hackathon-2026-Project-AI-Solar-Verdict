# HelioSense Roof Count

Count roof tiles from a photo and turn them into exact dimensions for the CAD
drawing. Built for solar installers who plan complex tiled roofs and currently count
tiles by hand.

Add a photo or a customer folder, correct the roof corners, enter the tile size, mark
obstructions, choose how far to plan panels, confirm, and export to DXF, PDF, PNG, CSV
or JSON. Photos are processed in the browser and never uploaded.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Try the built-in sample roof, or see `/guide` for the full user guide.

## Production

Set `APP_USERNAME` and an `APP_PASSWORD` of at least 12 characters. Without both,
every request is refused. Serve over HTTPS only, host in the EU, and follow the
checklist in `docs/SECURITY.md`.

## Docs

- `docs/ROOF_TILE_COUNTING.md`: architecture, requirements status, known limitations
- `docs/PROJECT_STRUCTURE.md`: where everything lives
- `docs/SECURITY.md`: security position and upload measures
- `AGENTS.md` and `CLAUDE.md`: rules and review checklist for working in this repo

## Licence

Proprietary. See `LICENSE`.
