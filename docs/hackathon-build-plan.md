# Northlink: 3:30 PM build plan

Planning date: September 26, 2026 (Toronto time). This is a hackathon demo plan, not a production deployment specification.

## Demo goal

Show a dispatcher responding to a driver absence, a truck problem, and a household sewage request; a driver completes water or sewage service; the dispatcher can see when the request arrived, when it was completed, and the household's service history. One truck serving 500 homes is a **coverage assumption** supplied by the team, not a daily throughput estimate. The current 3–5 day sanitation response is a **reported baseline**, not a measured value in our sample data.

## Existing starting point

The prototype is now on `main` through merged [PR #11](https://github.com/ANISHG-26/northlink-hack-for-humanity/pull/11). It has a Vite/React/TypeScript front end, a FastAPI API, driver and dispatcher views, household reports, water and sewage route ranking, completion logging, a parts forecast, sample data, and a Vercel configuration. Keep these pieces. Mariella and Michael should each branch from current `main` and open one new focused PR for their remaining demo work.

Gaps for this demo: staffing numbers are constants; truck status is seeded; there is no breakdown/cause log; completions have no linked request or response-time metric; there is no source/drop-off water sample record. API state is in Python process memory and may reset between Vercel function invocations. The browser's offline queue is local to one device, and `flushQueue()` currently discards a queued POST even if the server returns an error status; fix that before relying on offline completion. The latest prototype build succeeds with Node 18 here, but `concurrently` in the lockfile declares Node 22+, so use Node 22 for local development and deployment. The hero references an absent `public/hero.jpg` but has a gradient fallback; confirm that this is the intended demo appearance. The latest build warns only about a JavaScript chunk above 500 kB, and its 40 Python tests pass.

## Proposed architecture

```text
Resident / driver / dispatcher React SPA (reuse existing views)
    -> typed src/api/client.ts (offline queue and cached reads)
    -> FastAPI /api (validation, service event logic, existing rule modules)
    -> demo: seeded in-memory state in one local API process
    -> durable deployment: hosted Postgres (Supabase) for operational events
```

Use the existing Vercel project configuration for a fast preview after creating a Vercel project. A public preview with in-memory API state is suitable for browsing the seeded scenario; use a single local API process for the live write-through demo until a database is connected. Provisioning Supabase is optional for 3:30, but it is required before claiming shared, persistent tracking across devices or serverless invocations. Keep database credentials only in server environment variables. No real household or health data in the demo.

The first durable tables should be `service_requests` (household code, service, reason, reported_at, source, status), `service_events` (request ID, truck ID, driver ID, performed_at, litres or pickup flag, idempotency key), `driver_shifts` (available/absent/standby), `truck_incidents` (truck, part, cause, status, opened_at, fixed_at), `part_stock` (part, quantity, reorder threshold), and `quality_checks` (source or drop point, truck/run, sampled_at, result, units, collector, review status). Preserve the existing rule-based routing/forecast modules as pure calculations over these records.

For the 3:30 demo, keep the API contract small:

- Reuse `POST /api/reports` for a household report; add `sewage_blocked` if needed and expose its `reported_at` as the request start.
- Reuse `POST /api/deliveries/{household_id}/complete` for water deliveries and sewage pickups. Add a stable event/request ID so offline replay cannot duplicate a service.
- Add one dispatcher read endpoint for open requests, completion history, and response time (`completed_at - reported_at`). Show household visit count and last visit per service; show median response only when there are completed requests.
- Add one demo operations endpoint for driver availability and truck readiness, then derive uncovered truck capacity and standby coverage. Do not treat the 500-household assumption as trips per day.

The UI can use fixed mock responses matching this contract while API work proceeds. Pydantic models in `api/models.py` and TypeScript types in `src/api/types.ts` must match before integration.

## Two developer split and checkpoints

| Time (Toronto) | Michael: API and data | Mariella: UI and demo | Shared gate |
| --- | --- | --- | --- |
| 2:20–2:35 | Branch from current `main`; send example operations JSON/types to Mariella. | Branch from current `main`; build against mock operations JSON. | Agree on one contract and one PR per developer. |
| 2:35–3:05 | Implement service event/history/response metrics plus simple availability/readiness in seeded demo state. | Add dispatcher request/history/coverage cards and driver completion feedback. | Pair on one sample water and one sewage flow. |
| 3:05–3:15 | Connect API to UI and open the backend PR. | Verify mobile and desktop flow; open the UI PR and prepare the seeded absence/breakdown scenario. | `npm run build`, `python -m pytest`, manual API/UI smoke test. |
| 3:15–3:30 | Freeze features, help triage. | Rehearse demo and screenshots. | Review both PRs; DevOps teammate imports Vercel project if available. Use local API for write-through demo until persistent storage exists. |

The times are targets; stop adding features at 3:15 to preserve a working demo. Michael owns the API in one new PR; Mariella owns the UI in one new PR. Each asks for teammate review before merge. A DevOps teammate may handle Vercel setup, but neither developer should wait for it to build the local demo.

## GitHub work items

| Priority | Issue | Owner |
| --- | --- | --- |
| P0 | [#2 Truck operations UI](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/2) | Mariella, one new PR |
| P0 | [#3 Service tracking and coverage API](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/3) | Michael, one PR |
| P0 | [#6 Deploy and smoke test](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/6) | DevOps teammate if available |
| P1 | [#7 Breakdowns and parts](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/7) | Michael API, Mariella UI |
| P1 | [#8 Water quality checkpoints](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/8) | Michael API, Mariella UI |
| P1 | [#9 Hosted persistence](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/9) | Michael and DevOps |

Issues [#4](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/4) and [#5](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/5) were bundled into #2 and #3 so the demo requires only one PR per developer.

## After the core flow

1. Record truck breakdown, affected part, likely cause, stock count, repair status, and partner contact. Tie a truck out of service to coverage. The existing Parts view and seed data are the starting point. Unknown causes stay `unknown`; do not present guesses as verified causes.
2. Record manual water quality checks at the **source** and **household drop point**, linked by run/truck and timestamp. Capture the measured parameter, units, method, collector, and review state. A missing or questionable reading asks staff to review; the app does not certify water safe or issue an advisory.
3. Add hosted persistence and proper staff authentication before operational use. The prototype's `1234` staff PIN is for demo only.

## Demo acceptance

- A reported sewage need appears in dispatcher attention with its reported time and service type; completing it shows the elapsed response time and updates the household's sewage visit history.
- Water delivery is tracked separately from sewage pickup; a repeated offline completion does not double-count a visit.
- Changing one driver to absent or one truck to out of service changes displayed coverage and identifies the need for a standby driver or repair.
- The same seeded scenario can be reset and replayed for a judge. All sample data and simulated sensors are labelled as such.
- The deployed preview loads its SPA and `/api/health`; the live demo's mutation flow runs against a single process unless persistent storage is ready.

## Open decisions

- Confirm how many sanitation trucks/drivers operate per shift and whether a 500-household truck coverage figure means per service cycle or route area.
- Confirm which water quality parameters, methods, and threshold authority apply at source and drop point. Do not invent a pass/fail threshold.
- Confirm real partner organizations and parts availability with the community before treating the sample directory as operational.
