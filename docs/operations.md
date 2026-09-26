# Operations API and demo handoff

Implements issues #3, #7, #8, and the database integration for #9. All initial
households, drivers, incidents, and water readings are fictitious sample data.

> **Scope of this PR:** this change ships the API, data model, and optional
> Postgres persistence only. The Dispatcher/Driver/Parts screens described
> below in "Try the workflows" are the intended frontend integration and are
> tracked as follow-up work against the current frontend component structure;
> they are not part of this PR's diff.

## Try the workflows

1. Open **Dispatcher**. Service operations shows open requests, completed request
   response times, recorded visits, and separate water/sanitation coverage.
2. Unlock staff mode with demo PIN `1234`. Under readiness, simulate D1 absent
   and T1 out of service. Counts update in both operations and the dashboard.
   Restore each status with its selector. An open repair must be closed in Parts.
3. Open **Driver**, choose T2, and complete C-12 water service. Repeat with
   **Simulate offline**, then reconnect. The queued event keeps its original ID
   and time. HTTP errors retain the item for retry. Two distinct IDs represent
   two distinct visits, including on the same day.
4. Choose T4 for sanitation. Select sewage full or sewage blocked when completing
   a pickup. Residents can choose the same categories in the sewage report form.
   T1–T3 routes are water; T4 is a separate sample sanitation truck. Older clients
   may still submit either service through the existing completion endpoint.
5. Open **Parts**. T3 starts under repair with a sample pump incident opened three
   hours earlier. Record parts used and restore it to service. Its incident-to-
   restoration duration appears, stock decreases once, and coverage improves.
   The sealift plan recalculates from the remaining stock. Record another incident
   to test a new breakdown. Causes entered in the UI stay unconfirmed.
6. In **Driver → T2 → Water checkpoints**, select C-12. The source and drop-point
   readings appear together. Both start unreviewed. Enter a sample reviewer to
   mark them reviewed or request follow-up. Other homes show missing drop-point
   checks. Use “Record a sample check” for another manual sample record.

Water checks never create, lift, or change advisories. No thresholds or default
testing method are specified; local authorities must confirm those before use.
All partner cards remain labelled unverified. Visit history counts recorded
completion events, not dates from the original household seed.

## API contract

OpenAPI is served at `/openapi.json` and interactive docs at `/docs` during local
development. Python models are in `api/models.py`; matching browser interfaces
are in `src/api/types.ts` and calls in `src/api/client.ts`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/reports` | Household request with `source`, stable `event_id`, `timestamp`, and `service_type` |
| `POST /api/deliveries/{household_id}/complete` | Idempotent completion; retains `at` and adds `completed_at`, `event_id`, `service_type`, `run_id` |
| `GET /api/operations` | Requests, completion history, visit summaries, driver/truck status, coverage, storage mode |
| `POST /api/operations/readiness` | Update any driver/truck readiness values |
| `GET/POST /api/breakdowns` | List or record incidents |
| `POST /api/breakdowns/{event_id}/repair` | Start or close a repair; consume stock and restore coverage |
| `POST /api/parts/{part_id}/stock` | Set received/on-hand stock quantity |
| `GET/POST /api/water-checks` | List or record sample readings; GET accepts `truck_id` and `run_id` filters |
| `POST /api/water-checks/{event_id}/review` | Record staff review or follow-up |
| `GET /api/route/today?truck=T2` | Route plus `run_id` and paired `water_checks`, with missing/review flags |

New staff write endpoints require `X-Staff-Pin: 1234` in demo mode. They must reach
the server; they are not queued offline. Reports/completions use the existing
offline queue. An error at its head stops replay and keeps subsequent items.

Example report (timestamps must include a time zone and cannot be in the future):

```json
{
  "event_id": "device-generated-uuid-request",
  "household_id": "C-12",
  "type": "sewage_full",
  "service_type": "sewage_blocked",
  "source": "resident",
  "timestamp": "2026-09-26T10:00:00-04:00"
}
```

`type` preserves the existing report categories; `service_type` distinguishes
water, sewage full, and sewage blocked. `reported_at` mirrors the report's event
time. A completion closes earlier requests for the same household and exact
service type. Response time is elapsed seconds, and is `null` on open requests.

```json
{
  "event_id": "device-generated-uuid-completion",
  "truck_id": "T4",
  "service": "sewage",
  "service_type": "sewage_blocked",
  "timestamp": "2026-09-26T11:30:00-04:00",
  "run_id": "T4:2026-09-26"
}
```

Send this body to `/api/deliveries/C-12/complete`. Reuse the entire body for
retries. Reusing an ID with different event details returns 409. Legacy callers
without an ID get a generated one; updated clients assign IDs before networking.
Legacy queued completions are assigned and saved an ID before their first replay.

The operations response shape is:

```text
{
  storage: "sample" | "postgres",
  open_requests: ServiceRequest[],
  completed_requests: ServiceRequest[],
  visits: { household_id, service_type, last_visit, visit_count }[],
  completions: Completion[],
  drivers: Driver[],
  trucks: Truck[],
  coverage: {
    drivers_available, drivers_standby, trucks_in_service, shortfall,
    water: ServiceCoverage,
    sanitation: ServiceCoverage,
    assumption
  }
}
```

The water assumption is **up to 500 households per truck**, with the sample zone
assignments preserved. It is not a deliveries-per-day estimate. Available crews
are limited by both available drivers and in-service trucks. Standby drivers
do not become active automatically. Sanitation has its own drivers and truck;
its household ratio is unspecified (`null`). The three sample water zone groups
need three crews even though only 40 fictitious homes are shown.

## Shared Postgres storage

No hosted database is provisioned by this change. A local demo needs no database.
For a shared preview, provision Postgres (Supabase is one option), then configure
the **server-only** `DATABASE_URL` from `.env.example`. Never use a `VITE_` prefix,
embed a connection string in browser code, or commit actual credentials. Local
commands read environment variables; `.env.example` is documentation, not loaded
automatically.

```sh
python -m pip install -r requirements.txt
# Set DATABASE_URL in this shell or your server's environment, then:
python -m api.db migrate
python -m api.db seed
```

Use the connection URL supplied by your provider with TLS (`sslmode=require`).
For a serverless deployment, use its supported pooled connection endpoint. The
client disables prepared statements for transaction-pooler compatibility. Run
the migration/seed once from a trusted environment with the owning server role;
the API never runs migrations or reseeds an existing database.

Deploy with `DATABASE_URL` in the Vercel function environment. All clients must
reach that same deployment/database. Without it, `/api/health` and operations
report `storage: "sample"`; writes last only for that server process. With it,
every request reads committed database state and reports `storage: "postgres"`.
A missing migration or unavailable configured database returns 503; it never
silently switches to sample mode. Demo reset is disabled for database mode.

### Storage design and limits

The minimal migration creates a private `northlink.operational_state` table with
one versioned JSONB document. It contains service requests/completions,
driver/truck status, repairs, inventory, water checks, advisories, and tank state.
It is intentionally sized for this sample community/demo, not high-volume use.

Each mutation locks the row, reloads state, validates/applies the operation, and
commits before returning success. ID checks, stock consumption, and truck status
changes therefore share a transaction across processes. Failed HTTP writes do
not commit. Reads obtain the last committed snapshot. This avoids both replay
double-counts and one server instance overwriting another instance's update.
There is no automatic pruning; larger deployments should move events into
indexed tables and add retention/audit policies before scaling.

The schema is outside `public`, public grants are revoked, and row-level security
has no public policy. Connect through FastAPI using the owning server role;
do not expose the schema in Supabase's browser Data API.

### Production launch gate

`1234` is a public demo switch, not authentication. Setting `APP_ENV=production`
disables every API write until proper auth is implemented. Before real use, add
verified staff sessions, role authorization on reads/writes, a household access
policy, audit records, secret rotation, backups, and locally approved methods and
review responsibilities. A provisioned database alone does not satisfy this gate.

## Verification

```sh
python -m pip install -r requirements-dev.txt
python -m pytest
npm test
npm run build
```

`tests/test_postgres.py` is opt-in: point `TEST_DATABASE_URL` at an **empty,
disposable** Postgres database, then run `python -m pytest tests/test_postgres.py`.
It refuses a pre-existing `northlink` schema, creates one for the test, and drops
only that test schema on completion. It checks a fresh store/second client,
concurrent duplicate replay, persisted status/requests/repairs/checks, rollback,
and disabled reset. The normal suite skips it when no test URL is configured.

For a hosted preview smoke test, complete a service on device A, restart/redeploy
the function, then refresh operations on device B. Confirm the event ID appears
once. Retry the exact event body and confirm its visit count is unchanged.

Before merging, request a teammate review per CONTRIBUTING.md. This change does
not provision a hosted service, publish a preview, or merge a PR.
