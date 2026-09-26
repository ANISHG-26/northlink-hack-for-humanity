# Northlink: 3:30 PM build plan

Planning date: September 26, 2026 (Toronto time). This is a hackathon demo plan, not a production deployment specification.

## Demo goal

Show a dispatcher responding to a driver absence, a truck problem, and a household sewage request; a driver completes water or sewage service; the dispatcher can see when the request arrived, when it was completed, and the household's service history. One truck serving 500 homes is a **coverage assumption** supplied by the team, not a daily throughput estimate. The current 3–5 day sanitation response is a **reported baseline**, not a measured value in our sample data.

## Existing starting point

The `app-prototype` branch already has a Vite/React/TypeScript front end, a FastAPI API, driver and dispatcher views, household reports, water and sewage route ranking, completion logging, a parts forecast, sample data, and a Vercel configuration. Keep these pieces. The prototype branch and `main` have unrelated Git histories, so the first integration PR must deliberately bring the prototype onto a branch from `main` and resolve overlapping README/LICENSE files.

Gaps for this demo: staffing numbers are constants; truck status is seeded; there is no breakdown/cause log; completions have no linked request or response-time metric; there is no source/drop-off water sample record. API state is in Python process memory and may reset between Vercel function invocations. The browser's offline queue is local to one device. The existing build succeeds with Node 18 here, but `concurrently` in the lockfile declares Node 22+, so use Node 22 for local development and deployment. The build also warns about an unresolved `/hero.jpg` reference; verify the actual hero asset path.

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

| Time (Toronto) | Developer A: API and data | Developer B: UI and demo | Shared gate |
| --- | --- | --- | --- |
| 2:05–2:20 | Bring prototype into a branch based on `main`; agree on response JSON/types. | Review existing driver/dispatcher surfaces; prepare mock overview. | Prototype integration PR opens; choose one contract. |
| 2:20–2:55 | Implement request/completion link, idempotent completion, history/response metrics, availability and readiness in seeded demo state. | Add dispatcher request/history/coverage cards and driver completion feedback against mock contract. | Pair on one sample water and one sewage flow. |
| 2:55–3:15 | Connect API to UI, fix integration and build errors. | Verify mobile and desktop flow; prepare seeded absence/breakdown scenario. | `npm run build`, `python -m pytest`, manual API/UI smoke test. |
| 3:15–3:30 | Freeze features, help triage. | Rehearse demo and screenshots. | Reviewer approves PRs; DevOps teammate imports Vercel project if available. Use local API for write-through demo until persistent storage exists. |

The times are targets; stop adding features at 3:15 to preserve a working demo. Developer A owns the API; Developer B owns front-end changes. Each opens a small PR from a named branch and asks for teammate review before merge. A DevOps teammate may handle Vercel setup, but neither developer should wait for it to build the local demo.

## GitHub work items

| Priority | Issue | Owner |
| --- | --- | --- |
| P0 | [#2 Integrate prototype](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/2) | Developer A |
| P0 | [#3 Service events and response metrics](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/3) | Developer A |
| P0 | [#4 Dispatch and driver flow](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/4) | Developer B |
| P0 | [#5 Driver and truck coverage](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/5) | A API, B UI |
| P0 | [#6 Deploy and smoke test](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/6) | DevOps teammate if available |
| P1 | [#7 Breakdowns and parts](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/7) | A API, B UI |
| P1 | [#8 Water quality checkpoints](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/8) | A API, B UI |
| P1 | [#9 Hosted persistence](https://github.com/ANISHG-26/northlink-hack-for-humanity/issues/9) | Developer A and DevOps |

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
