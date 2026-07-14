# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands
- **Development**: `npm run dev` (starts Next.js dev server)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Unit Tests**: `npm run test`
  - Run a single test: `npm run test <path/to/file.test.ts>`
- **E2E Tests**: `npm run test:e2e`
- **Data Pipeline**: `npm run prebake` (CSV $\rightarrow$ JSON) then `npm run prebake:heatmaps` (JSON $\rightarrow$ PNG)

## Architecture & Structure
Verdict is a Next.js 15 application designed for solar energy analysis. The architecture follows a strict separation between UI, API, and Business Logic:

- **`app/` (The Interface Layer)**:
  - **Pages**: Next.js App Router pages.
  - **API Routes**: Route handlers in `app/api/` that act as thin wrappers around `lib/api`.
- **`components/` (The Presentation Layer)**:
  - Split by user persona: `components/homeowner/` (consumer-facing views) and `components/installer/` (professional analysis tools).
  - Heavy use of 3D components (Cesium/Three.js) for roof visualization.
- **`lib/` (The Core Logic Layer)**:
  - This is where the primary business value resides.
  - `lib/api/`: Client-side wrappers for external solar and mapping services.
  - `lib/sizing/`: Core calculations for solar panel sizing and rationale.
  - `lib/heatmaps/`: Logic for analyzing and generating solar radiation maps.
  - `lib/cesium/`: Configuration and utilities for the 3D globe.
- **`data/` (The Persistence/Schema Layer)**:
  - `data/schema.ts`: Zod definitions that ensure type safety across the API and UI.
  - `data/fixtures/`: Cached JSON data used to avoid redundant API calls during development.

## Key Technical Details
- **State Management**: Zustand for global UI state; TanStack Query for server-state synchronization.
- **Visualization**: Uses CesiumJS for high-precision 3D mapping of rooftops.
- **Data Flow**: External API $\rightarrow$ `lib/api` $\rightarrow$ `app/api` $\rightarrow$ `TanStack Query` $\rightarrow$ `Components`.
