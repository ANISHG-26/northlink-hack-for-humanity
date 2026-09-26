"""Northlink API — FastAPI app, served by Vercel as a Python serverless function."""
import sys
from pathlib import Path

# Make `api.*` importable both under uvicorn (run from repo root) and on Vercel.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException  # noqa: E402

from api.ai.forecast import Reading, forecast  # noqa: E402
from api.ai.routing import StopInput, rank_stops  # noqa: E402
from api.models import (  # noqa: E402
    DELIVERY_STAGES,
    CompleteIn,
    Completion,
    RouteStop,
    RouteToday,
    Delivery,
    Forecast,
    Health,
    Household,
    HouseholdStatus,
    LevelUpdate,
    Report,
    ReportIn,
    Safety,
)
from api.state import now, state  # noqa: E402

LEVEL_FRACTIONS = {"full": 1.0, "three_quarters": 0.75, "half": 0.5, "quarter": 0.25, "empty": 0.0}

app = FastAPI(title="Northlink API", version="0.2.0")


def get_household(household_id: str) -> Household:
    h = state.households.get(household_id.upper())
    if not h:
        raise HTTPException(404, f"Household {household_id} not found")
    return h


def zone_advisory(zone: str):
    return next((a for a in state.seed.advisories if a.zone == zone), None)


def household_forecast(h: Household):
    return forecast(h.household_size, h.tank_capacity_l, state.readings[h.id], now())


def get_truck(truck: str):
    """Accept "2", "T2" or "t2"."""
    key = truck.upper() if truck.upper().startswith("T") else f"T{truck}"
    t = state.trucks.get(key)
    if not t:
        raise HTTPException(404, f"Truck {truck} not found")
    return t


def build_status(h: Household) -> HouseholdStatus:
    f = household_forecast(h)
    advisory = zone_advisory(h.zone)
    d = state.delivery(h.id)
    truck = state.trucks[h.last_truck_id]
    return HouseholdStatus(
        household=h,
        forecast=Forecast(
            litres_left=int(f.litres_left),
            capacity_l=h.tank_capacity_l,
            percent=round(100 * f.litres_left / h.tank_capacity_l),
            daily_use_l=int(f.daily_use_l),
            days_left=f.days_left,
            predicted_empty=f.predicted_empty,
            confidence=f.confidence,
            confidence_note=f.confidence_note,
            method=f.method,
        ),
        safety=Safety(
            status=advisory.status if advisory else "safe",
            zone=h.zone,
            since=advisory.since if advisory else None,
            reason=advisory.reason if advisory else None,
        ),
        delivery=Delivery(
            stage=DELIVERY_STAGES[d["stage_index"]],
            stage_index=d["stage_index"],
            truck_id=truck.id,
            truck_name=truck.name,
            eta=d["eta"],
            updated_at=d["updated_at"],
        ),
    )


@app.get("/api/health", response_model=Health)
def health() -> Health:
    return Health(status="ok", version=app.version)


@app.get("/api/households", response_model=list[Household])
def households() -> list[Household]:
    return list(state.households.values())


@app.get("/api/households/{household_id}/status", response_model=HouseholdStatus)
def household_status(household_id: str) -> HouseholdStatus:
    return build_status(get_household(household_id))


@app.post("/api/households/{household_id}/level", response_model=HouseholdStatus)
def update_level(household_id: str, body: LevelUpdate) -> HouseholdStatus:
    h = get_household(household_id)
    litres = round(h.tank_capacity_l * LEVEL_FRACTIONS[body.level])
    state.readings[h.id].append(Reading(now(), litres))
    return build_status(h)


@app.post("/api/reports", response_model=Report, status_code=201)
def create_report(body: ReportIn) -> Report:
    h = get_household(body.household_id)
    report = Report(
        **body.model_dump(exclude={"timestamp", "household_id"}),
        household_id=h.id,
        id=f"U{len(state.reports) + 1}",
        timestamp=body.timestamp or now(),
        zone=h.zone,
    )
    state.reports.append(report)
    return report


@app.post("/api/deliveries/{household_id}/advance", response_model=HouseholdStatus)
def advance_delivery(household_id: str) -> HouseholdStatus:
    h = get_household(household_id)
    state.advance_delivery(h.id)
    return build_status(h)


@app.get("/api/route/today", response_model=RouteToday)
def route_today(truck: str = "2") -> RouteToday:
    t = get_truck(truck)
    today = now().date()
    done_today = [c for c in state.completions if c.truck_id == t.id and c.at.date() == today]
    done_ids = {c.household_id for c in state.completions if c.at.date() == today}

    inputs = []
    for h in state.households.values():
        if h.zone not in t.zones or h.id in done_ids:
            continue
        f = household_forecast(h)
        adv = zone_advisory(h.zone)
        inputs.append(
            StopInput(
                household_id=h.id,
                zone=h.zone,
                hours_until_empty=f.days_left * 24,
                litres_left=f.litres_left,
                tank_capacity_l=h.tank_capacity_l,
                vulnerable_type=h.vulnerable_type,
                advisory=adv.status if adv and adv.status != "safe" else None,
            )
        )
    stops = [RouteStop(**vars(s)) for s in rank_stops(inputs, t.capacity_l)]
    return RouteToday(truck=t, generated_at=now(), stops=stops, completed=sorted(done_today, key=lambda c: c.at, reverse=True))


@app.post("/api/deliveries/{household_id}/complete", response_model=Completion)
def complete_delivery(household_id: str, body: CompleteIn | None = None) -> Completion:
    h = get_household(household_id)
    body = body or CompleteIn()
    truck_id = get_truck(body.truck_id).id if body.truck_id else h.last_truck_id
    return state.complete_delivery(h.id, truck_id, body.timestamp or now())
