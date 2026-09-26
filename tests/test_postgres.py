"""Opt-in integration against a disposable Postgres DB, never the app database.

Set TEST_DATABASE_URL; this creates only the northlink schema, then rolls it back
by dropping it after the tests. Refuses a DB where that schema already exists.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.index import app
from api.state import State, now
from api.storage import Store, snapshot


@pytest.fixture
def database(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is not configured")
    import psycopg
    from psycopg.types.json import Jsonb
    with psycopg.connect(url) as conn:
        if conn.execute("SELECT 1 FROM pg_namespace WHERE nspname = 'northlink'").fetchone():
            pytest.fail("Integration tests require an empty disposable database (northlink schema already exists)")
        conn.execute(Path("migrations/001_operational_state.sql").read_text())
        conn.execute("INSERT INTO northlink.operational_state(id, payload) VALUES (1, %s)", (Jsonb(snapshot(State())),))
    monkeypatch.setenv("APP_ENV", "demo")
    original = app.state.store
    app.state.store = Store(url=url)
    try:
        yield url
    finally:
        app.state.store = original
        with psycopg.connect(url) as conn:
            conn.execute("DROP SCHEMA northlink CASCADE")


def test_cold_start_other_device_concurrent_replay_and_rollback(database):
    headers = {"X-Staff-Pin": "1234"}
    payload = {"event_id": "persistent-visit", "truck_id": "T2", "timestamp": now().isoformat()}
    with TestClient(app) as first:
        assert first.post("/api/deliveries/C-12/complete", json=payload).status_code == 200
        assert first.post("/api/operations/readiness", headers=headers, json={"drivers": {"D1": "absent"}}).status_code == 200
        assert first.post("/api/breakdowns", headers=headers, json={"event_id": "db-breakdown", "truck_id": "T1", "part_id": "P1",
            "symptom": "Sample failure", "opened_at": (now() - timedelta(hours=2)).isoformat()}).status_code == 201
        assert first.post("/api/water-checks/sample-source/review", headers=headers,
            json={"review_status": "reviewed", "reviewed_by": "Sample reviewer"}).status_code == 200
        assert first.post("/api/reports", json={"event_id": "db-request", "household_id": "C-12", "type": "sewage_full"}).status_code == 201
    # Fresh store has no process memory and must read the committed DB document.
    app.state.store = Store(url=database)
    with TestClient(app) as second:
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: second.post("/api/deliveries/C-12/complete", json=payload), range(4)))
        assert all(r.status_code == 200 for r in results)
        ops = second.get("/api/operations").json()
        assert ops["storage"] == "postgres" and len(ops["completions"]) == 1
        assert next(d for d in ops["drivers"] if d["id"] == "D1")["status"] == "absent"
        assert any(r["id"] == "db-request" for r in ops["open_requests"])
        assert any(b["event_id"] == "db-breakdown" for b in second.get("/api/breakdowns").json())
        assert second.get("/api/water-checks").json()[0]["review_status"] == "reviewed"
        assert second.post("/api/breakdowns/db-breakdown/repair", headers=headers, json={"status": "fixed", "parts_used": 999}).status_code == 409
        assert next(p for p in second.get("/api/parts").json() if p["id"] == "P1")["on_hand"] == 1
        assert second.post("/api/demo/reset").status_code == 403
