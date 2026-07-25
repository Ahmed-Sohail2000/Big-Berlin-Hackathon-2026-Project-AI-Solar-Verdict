# Deploying Verdict to Vercel

This app is a standard Next.js 15 project. It runs in two modes:

- **Live mode** — real Google Solar 3D, geocoding, and AI rationale. Needs the API keys below.
- **Mock mode** — fully offline demo on bundled fixtures (no keys, no cost). Set `MOCK_MODE=true` and `NEXT_PUBLIC_MOCK_MODE=true`.

> This machine has no API keys and the Vercel CLI is not installed here, so the final deploy is run by you. Everything below is the exact command + env list.

## 1. One-time setup

```bash
npm i -g vercel        # install the Vercel CLI (once)
vercel login           # authenticate with your own Vercel account
cd <this repo>
vercel link            # link this folder to a Vercel project (creates .vercel/)
```

## 2. Environment variables

Set these in the Vercel dashboard (Project → Settings → Environment Variables), or via `vercel env add <NAME> production`.

### Required for full live functionality
| Variable | Scope | Used for |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | server | Google Solar API, Geocoding, Static Maps, Aerial View, heatmap baking |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client | Maps JS API, Places autocomplete, Cesium photoreal 3D |
| `GEMINI_API_KEY` | server | AI rationale strings only (never geometry or prices — hard rule #2) |

Both Google keys can be the same key from one Google Cloud project with these APIs enabled: **Solar API, Maps JavaScript API, Places API, Geocoding API, Maps Static API, Aerial View API**. The `NEXT_PUBLIC_` one is exposed to the browser, so restrict it by HTTP referrer to your Vercel domain.

### Optional (each has a safe fallback)
| Variable | If unset |
|---|---|
| `TAVILY_API_KEY` | Market/tariff web-scrape falls back to the cached component catalog (still works, just not live-refreshed) |
| `GRADIUM_API_KEY` | Voice-memo transcription is disabled; the rest of the app is unaffected |
| `NEXT_PUBLIC_CESIUM_BASE_URL` | Defaults to the bundled Cesium asset path |

### Mode toggles
| Variable | Value | Effect |
|---|---|---|
| `MOCK_MODE` + `NEXT_PUBLIC_MOCK_MODE` | `true` | Offline demo on fixtures — no keys, no API cost. Good for a first deploy / sales demo. |
| (both unset or `false`) | — | Live mode — reads the keys above. |

## 3. Deploy

```bash
# Preview deploy (a throwaway URL to check first)
vercel deploy

# Production deploy
vercel deploy --prod
```

If your account uses a team scope, append it: `vercel deploy --prod --scope <your-team-slug>`.

## 4. Verify after deploy

1. Open the production URL — the commercial landing page should render.
2. Enter a building address with Google Solar coverage (major EU/US cities) — the photoreal 3D roof with the AI panel layout should appear. If it stays blank, the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, referrer-restricted incorrectly, or the address is outside Solar API coverage.
3. Complete the intake → you should get three engineered proposals.
4. Open `/installer` → the lead appears; you can add/remove leads and review the BoM + engineering parameters.

> Note on coverage: Google Solar API only has building data in supported regions. Outside coverage the app degrades honestly to a "no Solar data at these coordinates" state rather than inventing a roof.
