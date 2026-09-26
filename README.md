# NorthLink

**Linking water to every house in Inukjuak.** · WATER • DATA • COMMUNITY

Northlink is a water delivery, safety, and supply app for Inukjuak, Nunavik, an
Inuit community in northern Quebec. Built at Hack for Humanity.

> Designed to work alongside existing regional systems such as KIUJIK, not replace them.

---

## The problem

- Inukjuak has **over 2,000 residents, more than half under 20**.
- There is no piped water. Every home has **two tanks**: a clean water tank filled by
  truck, and a **wastewater (sewage) tank** emptied by truck. When the sewage tank is full,
  a red light turns on and the household **cannot use water**; it has nowhere to drain.
- The municipality runs **3 water trucks** and reports a **chronic shortage of qualified drivers**.
- There is **no mandatory water quality monitoring** in trucks or household tanks.
- Residents have **no reliable way to know how much water is left** in their tank.
- Most supplies, including water system parts, arrive by **sealift about once a year**.
- A **water pipeline is planned long-term**, but it is years away.

Northlink is the bridge until then, and its data supports the pipeline plan.

## Features by view

| View | What it does |
| --- | --- |
| **Home** (`/`) | Landing page with "Why now", entry points to every view, "Explore the Map". |
| **My home** (`/resident`) | Official advisory banner (source, date issued, last checked); clean water and wastewater tanks side by side ("About 3 days of water left", "Full in about 2 days", or "Wastewater pickup needed"); sensor or estimated badge; simulated tank sensor page; package-style delivery tracker; update tank level; report a problem with buttons or in your own words; household QR code. |
| **Driver** (`/driver`) | Today's route ranked by urgency, with water deliveries and wastewater pickups; "Why this order"; scan tank QR or enter house code; offline queue with "Simulate offline". |
| **Staff** (`/dispatcher`) | Summary cards; Leaflet/OpenStreetMap zone map; **signals for staff review** (illness clusters); **staff mode** (demo PIN) to issue or lift advisories; reports needing attention; sensor coverage and possible leaks; staffing today. |
| **Parts** (`/parts`) | Sealift order deadline, parts at risk, generated order list (air freight + sealift), parts table, sample partner directory with editable message drafts. |
| **Jobs** (`/jobs`) | Local roles, skills, training pathways, career ladder, "I'm interested" form (saved on the device only). |

## Design

The landing page and My home view follow the approved design reference: Noto Sans, Hudson Bay navy `#0B2A3F`,
sea-ice background `#F4F8FA`, white 20px-radius cards, CSS tank gauges, and a delivery stepper
(`src/styles/reference.css`). The hero uses `public/hero.jpg` when present, otherwise a calm Arctic-dawn gradient.

## Architecture

```
/                    Vite + React + TypeScript + Tailwind (SPA)
  src/api/           typed client (localStorage cache + offline POST queue), shared types
  src/store/         Zustand store (online flag, language, view/URL, staff mode)
  src/i18n/          en.ts, fr.ts, iu.ts (+ date/number formatting)
  src/components/    shell, resident/, driver/, dispatcher/
  src/views/         Home, Resident, Driver, Dispatcher, Parts, Jobs
/api                 Python FastAPI app (Vercel serverless function)
  index.py           routes
  models.py          Pydantic models (mirrored in src/api/types.ts)
  state.py           in-memory demo state + simulated tank sensors
  ai/                pure-function "AI" modules (no network, no paid APIs, no keys)
  data/seed.json     sample data
/tests               pytest suite for every AI module
vercel.json          /api/* -> Python function, everything else -> SPA
```

## The AI modules, in plain language

All AI in Northlink is **transparent, rule-based Python** with no paid APIs, no API keys, and no black boxes. Each module is a pure function, so it is easy to test and explain.

- **`forecast.py`: how long will the water last?** Starts from 25 litres per person per day, then adjusts using the household's own recent level readings since the last refill. It returns litres left, days left, when the tank will be empty, and how confident it is. It also predicts when the **wastewater tank** will be full: almost all water used goes down the drain.
- **`routing.py`: who should the truck visit first?** Ranks homes by hours until the clean tank is empty or the sewage tank is full. Homes with elders, infants, or medical needs, and zones under an advisory, move up. Every stop gets a one-line reason, for example "Empty in about 6 hours; elder in home".
- **`outbreak.py`: is there an unusual illness pattern?** Counts stomach illness reports per zone over 7 days and compares them with that zone's usual rate. It flags a cluster at 3 or more reports and more than twice the normal rate. It then looks for shared factors: the same truck, the same delivery day, and water quality complaints. The output is a **signal for staff review**, never a diagnosis and never an automatic advisory.
- **`supply.py`: what do we order before the sealift?** Works out months of stock left per part. Parts that will run out before the next sealift are marked **Critical: needs air freight**. Parts that won't last until the following one are marked **Add to sealift order**. Quantities cover 12 months plus a 25% safety buffer.
- **`sensing.py`: what does the tank sensor mean?** Converts load-cell weight to litres. It smooths noise with a median filter followed by a moving average, and flags possible leaks: a sudden drop, or a steady loss overnight when people are asleep.
- **`classify.py`: what is this report about?** A keyword and phrase matcher in English and French. For example, "the red light is on and we cannot flush" maps to *Sewage tank full*. It shows the words it matched, and the resident confirms or changes the category before anything is saved.
- **`triage.py`: what needs attention first?** Orders reports and household states for staff (wastewater full, out of water, illness, water quality, leaks, and so on), with a one-line "why" for each.

## Advisories are official and human-controlled

Northlink **never tests water and never decides that water is safe**. Advisories are
decided by the municipal water office or the regional health board and entered by staff
in **staff mode** (demo PIN `1234`; this is clearly a demo, and a real deployment needs proper staff
accounts). The resident banner shows who issued the advisory, when, and when the app last checked.
With no advisory in place, residents see "No water advisory", not "Safe to drink".

## Tank sensing design

- **Tank sensor** (proposed for new and retrofitted homes): load cells under the tank measure its
  weight. Water weighs about 1 kg per litre, so `litres = current weight − empty tank weight`.
  Readings are smoothed, and sudden or overnight drops are flagged as possible leaks.
- **Estimated** (existing homes): `litres = last delivery logged by the driver − forecast use since then`,
  shown with a lower-confidence note. Residents can improve it by tapping their tank level.
- In this prototype, **sensor readings are simulated**.

## Jobs model

Northlink creates local work, not just an app: Water Delivery Driver, Tank Sensor Technician,
Community Water Monitor, Dispatch & Data Coordinator, and Youth Water Ambassador (part-time,
after school). Each role has a training pathway and fits a career ladder: Youth Ambassador, then
Monitor or Technician, then Driver or Coordinator. Pay and positions are set by the municipality.

## Offline design

- Every successful API response is cached in `localStorage`. With no connection, the app shows the
  last saved data under an "Offline, showing last saved info" banner.
- Deliveries, reports, and level updates made offline go into a queue and replay automatically when
  the connection returns. Timestamps record when the action happened, not when it synced.
- "Simulate offline" on the Driver view demonstrates this live.
- QR codes are generated on the device and work offline.

## Accessibility

- 18px minimum body text, 48px minimum tap targets, and visible focus rings.
- WCAG AA contrast. A dark overlay sits behind text on the hero.
- **Every status pairs colour with an icon and text.**
- Keyboard navigation throughout, skip link, labelled icon buttons, and native `<dialog>` modals.
- Mobile-first: works at 375px, with a hamburger menu and a 2-column card grid on phones.
- Respects `prefers-reduced-motion`.

## Run locally

Requirements: Node 18+ and Python 3.10+.

```bash
npm install
pip install -r requirements.txt uvicorn
npm run dev:all          # Vite on http://localhost:5173 + FastAPI on :8000 (Vite proxies /api)
```

Or run them separately: `npm run dev` and `python -m uvicorn api.index:app --reload --port 8000`.

Tests:

```bash
pip install -r requirements-dev.txt
python -m pytest
```

## Deploy (Vercel, free tier)

Import the repo in Vercel and deploy. `vercel.json` builds the Vite app from `dist/` and serves
`api/index.py` as a Python function at `/api/*`. No environment variables or keys are needed.

## Important notes

- **Inuktitut strings await community translation review.** `src/i18n/iu.ts` currently shows English
  placeholders marked `// TODO: community translation review`. We do not invent syllabics.
- **All data is sample data** for demonstration. Zone locations on the map are approximate.
- **Sensor readings are simulated.**
- Partner cards are a sample directory, to be confirmed with the municipality. No phone numbers,
  emails, or named people are invented.
- Designed to work alongside existing regional systems such as **KIUJIK**, not replace them.

## License

[MIT](LICENSE)
