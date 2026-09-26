# Truck operations UI and the operations API

The truck operations UI (#2) reads `GET /api/operations`, the #3 backend in `api/operations_api.py`
(response model `Operations` in `api/models.py`). `fromApi()` in `src/api/operations.ts` adapts that
response to the shape the dispatcher cards use:

| UI field | From `/api/operations` |
| --- | --- |
| Open requests | `open_requests` (household, `service_type`, `source`, `reported_at`) |
| Recently completed + response time | `completions`, linked to `completed_requests` by `completion_event_id`; `response_seconds / 60` |
| Service history | `visits` with `visit_count > 0` (last visit, visit count) |
| Median response per service | computed in the UI from linked completions; shown only when there is at least one |
| Coverage card | `coverage` (drivers available/standby, trucks in service, `water.household_coverage` of covered + uncovered households, `shortfall`, `assumption`) |

If `/api/operations` is unreachable, the UI falls back to `sampleOperations()` (labelled on screen as
sample data) and merges real completions from `GET /api/route/today`.

Offline completions still in a device's queue are shown as **Pending sync**, never as completed.
Up to 500 households per water truck is a **coverage assumption**, not daily throughput; sanitation is separate.
