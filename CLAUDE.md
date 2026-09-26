# Northlink

"Linking water to every house." Water delivery, safety, and supply app for
Inukjuak, Nunavik (northern Quebec). Homes get water trucked into household
tanks; most supplies arrive by sealift about once a year.

## Architecture (one repo, deployed to Vercel free tier)

- **Frontend** — Vite + React + TypeScript + Tailwind (v3) in `src/`
  - `src/api/` — typed client (`client.ts`) + shared types (`types.ts`, must match `api/models.py`).
    Every successful GET is cached in localStorage (`northlink:cache:<path>`); on network
    failure the cached copy is returned with `fromCache: true`.
  - `src/store/` — Zustand store: `isOnline`, `lang`, `view`.
  - `src/i18n/` — `en.ts`, `fr.ts`, `iu.ts`. `en.ts` defines the `Strings` type.
  - `src/components/` — shell + shared UI (`StatusBadge` for Safe / Boil / Do not drink).
  - `src/views/` — Resident, Driver, Dispatcher, Parts.
- **Backend** — Python FastAPI, `api/index.py` (Vercel Python serverless function, exports `app`).
  - `api/models.py` — Pydantic models.
  - `api/ai/` — pure functions only (`forecast.py`, `routing.py`, `outbreak.py`, `supply.py`). No I/O, no network.
  - `api/data/seed.json` — sample data: 40 households (zones A–F), 3 trucks, 8 illness reports
    (cluster in Zone C tied to Truck 2 / `T2`), 6 parts.
  - AI modules: forecast, routing, outbreak, supply, sensing, classify, triage (see README).
  - Endpoints: see `api/index.py` (status, sensor, reports + classify, route, deliveries, dashboard,
    outbreaks, attention, advisories, parts, partners, demo reset).
- `tests/` — pytest for every AI module (`python -m pytest`).
- `vercel.json` uses explicit `builds` (only `api/index.py` becomes a function; static build from `dist`)
  and routes `/api/*` to it, everything else to the SPA (path-based routing: /, /resident, /driver, ...).

## Local dev

```
npm install
pip install -r requirements.txt uvicorn
npm run dev:all        # Vite on :5173 + uvicorn on :8000 (Vite proxies /api)
```
Or separately: `npm run dev` and `python -m uvicorn api.index:app --reload --port 8000`.

## Rules

- **No paid APIs. No API keys.** All "AI" is local, deterministic Python in `api/ai/`.
- **No invented Inuktitut syllabics.** New `iu.ts` strings are the English text with
  `// TODO: community translation review`. Only exception: the language name "ᐃᓄᒃᑎᑐᑦ".
- **Status colours must always be paired with an icon + text** (never colour alone).
- **Northlink never tests water or decides water is safe.** Advisories are issued only by staff
  (staff mode, demo PIN 1234) for the municipal water office or regional health board. AI output is a
  "signal for staff review", never an automatic advisory. No-advisory state reads "No water advisory".
- Every home has a clean water tank AND a wastewater tank; keep both in forecasts, routing, and UI.
- Sensor readings are simulated; label them as such.
- No mountain imagery (Inukjuak is flat tundra on Hudson Bay). No specific wages on Jobs.
- Designed to work alongside regional systems such as KIUJIK, not replace them.
- Run `python -m pytest` and `npm run build` before committing.
- When adding a Pydantic model, add the matching TypeScript type in `src/api/types.ts`.
- Keep the app runnable after every change. Work on the `dev` branch; never commit to `main`.

## Design system (tokens in `tailwind.config.js`)

navy `#0F2A44`, glacier `#2B6CB0`, teal `#0E9AA7`, bg `#F7F9FB`, card white, ink `#1A202C`,
status-safe `#15803D`, status-boil `#B45309`, status-nodrink `#B91C1C`.
Noto Sans, 18px body minimum, 48px minimum tap targets (`.tap`), visible focus rings,
WCAG AA contrast, mobile-first, lucide-react icons. No igloos, cartoon inuksuit, or imitation Inuit art.
Footer always says "Sample data for demonstration".
