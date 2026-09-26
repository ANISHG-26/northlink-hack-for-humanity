# Operations response contract (proposed for #3)

The truck operations UI (#2) reads `GET /api/operations`. Until that endpoint exists, the UI uses the
sample response in `src/api/operations.ts` (`sampleOperations()`), labelled on screen as sample data,
and merges in real completions from `GET /api/route/today?truck=T1|T2|T3`. As soon as
`/api/operations` returns 200, the UI uses it instead. No UI change needed.

TypeScript types live in `src/api/operations.ts`. The Pydantic models for #3 should match them.

```json
{
  "generated_at": "2026-09-26T14:50:00-04:00",
  "open_requests": [
    {
      "id": "SR-101",
      "household_id": "C-12",
      "zone": "C",
      "service": "sewage_full",
      "source": "resident",
      "reported_at": "2026-09-26T13:55:00-04:00",
      "status": "open"
    }
  ],
  "completed": [
    {
      "id": "EV-201",
      "request_id": "SR-090",
      "household_id": "A-07",
      "service": "water",
      "truck_id": "T1",
      "reported_at": "2026-09-25T12:50:00-04:00",
      "completed_at": "2026-09-25T17:50:00-04:00",
      "response_minutes": 300
    }
  ],
  "history": [
    { "household_id": "C-12", "service": "sewage", "last_visit": "2026-09-21T10:00:00-04:00", "visit_count": 2 }
  ],
  "coverage": {
    "drivers_available": 2,
    "drivers_standby": 1,
    "drivers_absent": 1,
    "drivers_needed": 3,
    "trucks_in_service": 2,
    "trucks_total": 3,
    "households_per_truck": 500,
    "water_households_total": 1500,
    "shortfall": true
  }
}
```

Field notes:

- `service` on requests: `water`, `sewage_full`, or `sewage_blocked`. On completions and history: `water` or `sewage`.
- `response_minutes` is `completed_at − reported_at`, and only for completions linked to a request (`request_id` set). Otherwise `null`.
- `id` on completions is the stable event ID. Replaying the same offline completion must not add a second visit.
- `households_per_truck` is the team's **coverage assumption**, not daily throughput. Sanitation coverage is separate.
- `shortfall` is true when available drivers or in-service trucks fall below what is needed.

The UI computes the median response per service from `completed` and shows it only when there is at least one linked completion.
Offline completions still in a device's queue are shown as **Pending sync**, never as completed.
