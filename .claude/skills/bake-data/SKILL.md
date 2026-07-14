---
name: bake-data
description: generate cached data and heatmaps
---

Process raw data into the required JSON formats and generate heatmap images.

## Commands
1. **Convert CSV to JSON**:
   ```bash
   npm run prebake
   ```
2. **Bake Heatmaps**:
   ```bash
   npm run prebake:heatmaps
   ```

## Scope
- `scripts/csv_to_json.ts`: Processes source CSVs into `data/fixtures/`.
- `scripts/bake-heatmaps.ts`: Generates PNG heatmaps using the `sharp` library.
- Use this whenever source data is updated or when new heatmaps are needed for specific coordinates.
