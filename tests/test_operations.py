from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from api.index import app
from api.state import now
from api.storage import Store, restore, snapshot

STAFF = {"X-Staff-Pin": "1234"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("APP_ENV", "demo")
    app.state.store = Store(url="")
    with TestClient(app) as c:
        yield c


def complete(client, event="visit", service="water", **extra):
    return client.post("/api/deliveries/C-12/complete", json={
        "event_id": event, "truck_id": "T2" if service == "water" else "T4", "service": service, **extra})


@pytest.mark.parametrize("service,service_type", [("water", "water"), ("sewage", "sewage_full"), ("sewage", "sewage_blocked")])
def test_request_completion_and_response_time(client, service, service_type):
    at = now() - timedelta(hours=1)
    report = client.post("/api/reports", json={"event_id": "request", "type": "clean_water_low" if service == "water" else "sewage_full",
        "household_id": "C-12", "service_type": service_type, "source": "driver", "timestamp": at.isoformat()})
    assert report.status_code == 201
    assert report.json()["reported_at"] == at.isoformat()
    ops = client.get("/api/operations").json()
    request = next(r for r in ops["open_requests"] if r["id"] == "request")
    assert request["response_seconds"] is None and request["completed_at"] is None
    done = complete(client, timestamp=(at + timedelta(minutes=30)).isoformat(), service=service, service_type=service_type)
    assert done.status_code == 200, done.text
    assert done.json()["completed_at"] == done.json()["at"]
    ops = client.get("/api/operations").json()
    request = next(r for r in ops["completed_requests"] if r["id"] == "request")
    assert request["response_seconds"] == 1800
    visit = next(v for v in ops["visits"] if v["household_id"] == "C-12" and v["service_type"] == service_type)
    assert visit["visit_count"] == 1
    assert request["completion_event_id"] == "visit"
    if service == "sewage":
        assert client.get("/api/households/C-12/status").json()["sewage"]["litres"] < 20


def test_duplicate_replay_and_second_visit_same_day(client):
    timestamp = (now() - timedelta(minutes=1)).isoformat()
    first = complete(client, timestamp=timestamp)
    replay = complete(client, timestamp=timestamp)
    assert first.json() == replay.json()
    assert complete(client, event="second", timestamp=timestamp).status_code == 200
    ops = client.get("/api/operations").json()
    assert len(ops["completions"]) == 2
    assert next(v for v in ops["visits"] if v["household_id"] == "C-12" and v["service_type"] == "water")["visit_count"] == 2
    assert complete(client, service="sewage", timestamp=timestamp).status_code == 409
    assert len(client.get("/api/operations").json()["completions"]) == 2


def test_concurrent_duplicate_completion(client):
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: complete(client), range(4)))
    assert all(r.status_code == 200 for r in responses)
    assert len(client.get("/api/operations").json()["completions"]) == 1


def test_report_replay_and_future_request_remains_open(client):
    complete(client, timestamp=(now() - timedelta(hours=1)).isoformat())
    body = {"event_id": "request-new", "type": "clean_water_low", "household_id": "C-12"}
    assert client.post("/api/reports", json=body).json() == client.post("/api/reports", json=body).json()
    assert client.post("/api/reports", json={**body, "note": "different"}).status_code == 409
    assert any(r["id"] == "request-new" for r in client.get("/api/operations").json()["open_requests"])


def test_coverage_absence_standby_and_unavailable_truck(client):
    before = client.get("/api/operations").json()["coverage"]
    response = client.post("/api/operations/readiness", headers=STAFF,
        json={"drivers": {"D1": "absent"}, "trucks": {"T1": "out_of_service"}})
    assert response.status_code == 200
    after = response.json()["coverage"]
    assert after["shortfall"]
    assert after["drivers_available"] == before["drivers_available"] - 1
    assert after["trucks_in_service"] == before["trucks_in_service"] - 1
    assert after["drivers_standby"] == 1
    assert after["water"]["households_per_truck"] == 500
    assert after["water"]["uncovered_households"] > before["water"]["uncovered_households"]
    assert after["sanitation"] == before["sanitation"]
    assert after["sanitation"]["households_per_truck"] is None
    assert client.get("/api/dashboard").json()["staffing"]["drivers_available"] == after["drivers_available"]
    assert client.get("/api/route/today?truck=T1").json()["stops"] == []


def test_readiness_validation_is_atomic(client):
    response = client.post("/api/operations/readiness", headers=STAFF,
        json={"drivers": {"D1": "absent", "missing": "absent"}})
    assert response.status_code == 404
    assert next(d for d in client.get("/api/operations").json()["drivers"] if d["id"] == "D1")["status"] == "available"


def test_restored_fleet_then_driver_absence_causes_shortfall(client):
    assert client.post("/api/breakdowns/sample-repair/repair", headers=STAFF, json={"status": "fixed"}).status_code == 200
    ready = client.get("/api/operations").json()["coverage"]
    assert not ready["shortfall"]
    assert ready["water"]["uncovered_households"] == 0
    after = client.post("/api/operations/readiness", headers=STAFF, json={"drivers": {"D1": "absent"}}).json()["coverage"]
    assert after["shortfall"] and after["water"]["shortfall"] == 1
    assert after["trucks_in_service"] == ready["trucks_in_service"]
    assert after["drivers_standby"] == 1


def test_late_sewage_pickup_does_not_replace_newer_pickup(client):
    newer = (now() - timedelta(minutes=20)).isoformat()
    older = (now() - timedelta(hours=5)).isoformat()
    assert complete(client, event="newer", service="sewage", timestamp=newer).status_code == 200
    before = client.get("/api/households/C-12/status").json()["sewage"]["litres"]
    assert complete(client, event="older", service="sewage", timestamp=older).status_code == 200
    assert client.get("/api/households/C-12/status").json()["sewage"]["litres"] == before


def test_repair_restores_coverage_and_consumes_stock_once(client):
    before = client.get("/api/operations").json()["coverage"]
    opened = now() - timedelta(hours=3)
    incident = {"event_id": "broken-pump", "truck_id": "T2", "part_id": "P1",
        "symptom": "Pump will not start", "opened_at": opened.isoformat(), "cause_category": "unknown"}
    assert client.post("/api/breakdowns", headers=STAFF, json=incident).status_code == 201
    assert client.get("/api/operations").json()["coverage"]["water"]["trucks_in_service"] == before["water"]["trucks_in_service"] - 1
    assert client.post("/api/operations/readiness", headers=STAFF, json={"trucks": {"T2": "in_service"}}).status_code == 409
    repair = {"status": "fixed", "fixed_at": (opened + timedelta(hours=2)).isoformat(), "parts_used": 1}
    first = client.post("/api/breakdowns/broken-pump/repair", headers=STAFF, json=repair)
    assert first.status_code == 200
    assert first.json()["restoration_seconds"] == 7200
    assert first.json()["stock_quantity"] == 0
    assert not first.json()["cause_confirmed"]
    assert client.post("/api/breakdowns/broken-pump/repair", headers=STAFF, json=repair).json() == first.json()
    assert client.get("/api/operations").json()["coverage"] == before
    plan = next(p for p in client.get("/api/parts/sealift-plan").json()["parts"] if p["id"] == "P1")
    assert plan["on_hand"] == 0 and plan["status"] != "ok"
    assert all(p["verification_status"] == "unverified" for p in client.get("/api/partners").json())


def test_multiple_repairs_and_insufficient_stock(client):
    for i in range(2):
        assert client.post("/api/breakdowns", headers=STAFF, json={"event_id": f"fault-{i}", "truck_id": "T1", "part_id": "P1",
            "symptom": "Sample fault", "opened_at": (now() - timedelta(hours=1)).isoformat()}).status_code == 201
    assert client.post("/api/breakdowns/fault-0/repair", headers=STAFF, json={"status": "fixed", "parts_used": 2}).status_code == 409
    assert client.post("/api/breakdowns/fault-0/repair", headers=STAFF, json={"status": "fixed", "parts_used": 1}).status_code == 200
    assert next(t for t in client.get("/api/operations").json()["trucks"] if t["id"] == "T1")["status"] == "maintenance"
    assert client.post("/api/breakdowns/fault-1/repair", headers=STAFF, json={"status": "fixed"}).status_code == 200
    assert next(t for t in client.get("/api/operations").json()["trucks"] if t["id"] == "T1")["status"] == "in_service"


def test_water_checks_pair_review_and_no_advisory(client):
    before = client.get("/api/advisories").json()
    route = client.get("/api/route/today?truck=T2").json()
    pair = next(p for p in route["water_checks"] if p["household_id"] == "C-12")
    assert pair["source"] and pair["drop_point"] and "unreviewed" in pair["flags"]
    missing = next(p for p in route["water_checks"] if p["household_id"] != "C-12")
    assert "missing_drop_point" in missing["flags"]
    for check in pair["source"] + pair["drop_point"]:
        assert check["method"] is None and check["sample_data"]
        assert client.post(f"/api/water-checks/{check['event_id']}/review", headers=STAFF,
            json={"review_status": "reviewed", "reviewed_by": "Sample reviewer"}).status_code == 200
    route = client.get("/api/route/today?truck=T2").json()
    assert next(p for p in route["water_checks"] if p["household_id"] == "C-12")["flags"] == []
    body = {"event_id": "check", "checkpoint": "drop_point", "truck_id": "T2", "run_id": route["run_id"],
        "household_id": "C-12", "sampled_at": now().isoformat(), "collector": "Sample collector", "parameter": "Sample parameter",
        "value": 999, "units": "mg/L"}
    assert client.post("/api/water-checks", headers=STAFF, json=body).status_code == 201
    assert client.post("/api/water-checks", headers=STAFF, json=body).status_code == 201
    assert len([c for c in client.get("/api/water-checks").json() if c["event_id"] == "check"]) == 1
    assert client.post("/api/water-checks", headers=STAFF, json={**body, "value": 1}).status_code == 409
    assert client.get("/api/advisories").json() == before
    assert client.post("/api/water-checks", headers=STAFF, json={**body, "household_id": None}).status_code == 422
    assert client.post("/api/water-checks", headers=STAFF, json={**body, "checkpoint": "source"}).status_code == 422


def test_routes_and_validation(client):
    assert all(s["service"] == "sewage" for s in client.get("/api/route/today?truck=T4").json()["stops"])
    assert all(s["service"] == "water" for s in client.get("/api/route/today?truck=T2").json()["stops"])
    assert complete(client, timestamp="2026-01-01T10:00:00").status_code == 422
    assert complete(client, timestamp=(now() + timedelta(hours=1)).isoformat()).status_code == 422
    assert complete(client, service_type="sewage_full").status_code == 422
    assert complete(client, run_id="T1:wrong").status_code == 422
    assert client.post("/api/operations/readiness", json={"drivers": {"D1": "absent"}}).status_code == 403


def test_state_roundtrip_preserves_operations_and_levels(client):
    complete(client)
    client.post("/api/breakdowns/sample-repair/repair", headers=STAFF, json={"status": "fixed", "parts_used": 1})
    client.post("/api/water-checks/sample-source/review", headers=STAFF, json={"review_status": "reviewed", "reviewed_by": "Sample reviewer"})
    before = client.get("/api/operations").json()
    data = snapshot(app.state.store.sample)
    app.state.store = Store(url="")
    app.state.store.sample = restore(data)
    assert client.get("/api/operations").json() == before
    assert client.get("/api/breakdowns").json()[0]["status"] == "fixed"
    assert client.get("/api/water-checks").json()[0]["review_status"] == "reviewed"
    assert client.get("/api/households/C-12/status").status_code == 200


def test_configured_database_failure_never_falls_back(client, monkeypatch):
    app.state.store = Store(url="configured")
    def unavailable(*_):
        raise RuntimeError("private connection details")
    monkeypatch.setattr(app.state.store, "open_database", unavailable)
    response = client.get("/api/operations")
    assert response.status_code == 503 and "private" not in response.text


def test_production_pin_is_not_authentication(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    assert complete(client).status_code == 403
    assert client.post("/api/operations/readiness", headers=STAFF, json={}).status_code == 403
    assert client.post("/api/demo/reset").status_code == 403
