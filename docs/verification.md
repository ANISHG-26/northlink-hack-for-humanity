# Verification record

Verified locally on 2026-09-26 for issues #3, #7, #8, and #9.

- **58 Python tests passed**, including the opt-in PostgreSQL integration test.
  The database was an isolated PostgreSQL 17 instance, listening on loopback,
  with sample data only. The test exercised a fresh store/second client,
  concurrent replay, persisted operational changes, and failed-write rollback.
- **4 JavaScript queue tests passed**: HTTP error retention, stable event ID/time
  replay, items appended during a request, and another tab removing an item.
- **Production build passed** (`tsc -b && vite build`). Existing build notices
  remain for optional `/hero.jpg` and a JavaScript chunk over 500 kB.
- **`git diff --check` passed.**
- The in-app browser was unavailable. Visual layout, keyboard interaction, and
  mobile screenshots still need a browser review.

Hosted deployment verification remains separate: no hosted database credentials
were provided or provisioned. Configure `DATABASE_URL`, migrate/seed, and repeat
the two-device/redeploy smoke test in [operations.md](operations.md). Production
staff authentication remains a launch gate; the public demo PIN is not auth.

Changes remain local on `feat/operations-tracking`. No PR was published or merged,
and no teammate review request was sent. Request review before merging.
