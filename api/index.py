"""Northlink API — FastAPI app, served by Vercel as a Python serverless function."""
import sys
from pathlib import Path

# Make `api.*` importable both under uvicorn (run from repo root) and on Vercel.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from datetime import timedelta  # noqa: E402

from fastapi import FastAPI, HTTPException  # noqa: E402

from api.ai.forecast import Reading, forecast  # noqa: E402
from api.ai.outbreak import IllnessCase, QualityComplaint, detect_outbreaks  # noqa: E402
from api.ai.routing import StopInput, rank_stops  # noqa: E402
from api.ai.supply import COVER_MONTHS, SAFETY_BUFFER, PartStock, plan_supply  # noqa: E402
from api.models import (  # noqa: E402
    DELIVERY_STAGES,
    OrderLine,
    Part,
    PartPlanOut,
    Partner,
    SealiftPlan,
    Advisory,
    AdvisoryIn,
    Dashboard,
    OutbreakAlertOut,
    SharedFactorOut,
    ZoneStatus,
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
    return state.advisories.get(zone)


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
            message=advisory.message if advisory else None,
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


# --- Dispatcher ----------------------------------------------------------------

ZONES = ["A", "B", "C", "D", "E", "F"]
OUT_LITRES = 50  # effectively empty
LOW_DAYS = 2
LOW_ZONE_SHARE = 0.3  # zone shows "running low" when this share of homes are low


def illness_cases() -> list[IllnessCase]:
    """Seed illness reports plus new illness reports from residents."""
    cases = [
        IllnessCase(r.household_id, r.zone, r.reported, r.truck_id, state.households[r.household_id].last_delivery)
        for r in state.seed.illness_reports
    ]
    for r in state.reports:
        if r.type == "illness":
            h = state.households[r.household_id]
            cases.append(IllnessCase(h.id, h.zone, r.timestamp.astimezone(now().tzinfo).date(), h.last_truck_id, h.last_delivery))
    return cases


def quality_complaints() -> list[QualityComplaint]:
    return [
        QualityComplaint(r.household_id, r.zone, r.timestamp.astimezone(now().tzinfo).date())
        for r in state.reports
        if r.type == "water_quality"
    ]


def outbreak_alerts() -> list[OutbreakAlertOut]:
    names = {t.id: t.name for t in state.trucks.values()}
    alerts = detect_outbreaks(
        illness_cases(), quality_complaints(), state.seed.baseline_weekly_illness, now().date(), names
    )
    out = []
    for a in alerts:
        adv = zone_advisory(a.zone)
        out.append(
            OutbreakAlertOut(
                **{k: v for k, v in vars(a).items() if k != "shared"},
                shared=SharedFactorOut(**vars(a.shared), truck_name=names.get(a.shared.truck_id or "")),
                advisory_active=adv.status if adv else None,
            )
        )
    return out


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard() -> Dashboard:
    today = now().date()
    start = today - timedelta(days=6)
    cases = [c for c in illness_cases() if start <= c.reported <= today]
    zones = []
    for z in ZONES:
        hs = [h for h in state.households.values() if h.zone == z]
        fs = [household_forecast(h) for h in hs]
        out = sum(1 for f in fs if f.litres_left < OUT_LITRES)
        low = sum(1 for f in fs if f.litres_left >= OUT_LITRES and f.days_left < LOW_DAYS)
        adv = zone_advisory(z)
        status = "advisory" if adv else "out" if out else "low" if hs and low / len(hs) >= LOW_ZONE_SHARE else "ok"
        zones.append(
            ZoneStatus(
                zone=z,
                households=len(hs),
                out_of_water=out,
                running_low=low,
                illness_7d=sum(1 for c in cases if c.zone == z),
                advisory=adv.status if adv else None,
                status=status,
            )
        )
    return Dashboard(
        out_of_water=sum(z.out_of_water for z in zones),
        running_low=sum(z.running_low for z in zones),
        delivered_today=sum(1 for c in state.completions if c.at.date() == today),
        active_advisories=len(state.advisories),
        zones=zones,
    )


@app.get("/api/outbreaks", response_model=list[OutbreakAlertOut])
def outbreaks() -> list[OutbreakAlertOut]:
    return outbreak_alerts()


@app.get("/api/advisories", response_model=list[Advisory])
def advisories() -> list[Advisory]:
    return sorted(state.advisories.values(), key=lambda a: a.zone)


@app.post("/api/advisories", response_model=Advisory, status_code=201)
def issue_advisory(body: AdvisoryIn) -> Advisory:
    t = now()
    adv = Advisory(
        zone=body.zone,
        status="boil" if body.level == "boil" else "nodrink",
        since=t.date(),
        reason="Issued by dispatcher",
        message=body.message.strip() or None,
        issued_at=t,
    )
    state.advisories[body.zone] = adv
    return adv


@app.delete("/api/advisories/{zone}", status_code=204)
def lift_advisory(zone: str) -> None:
    state.advisories.pop(zone.upper(), None)


@app.post("/api/demo/reset", status_code=204)
def demo_reset() -> None:
    """Reset all in-memory demo state back to the seed data."""
    state.__init__()


# --- Parts / sealift -------------------------------------------------------------

SEALIFT_DAYS_AWAY = 42  # demo: next sealift order deadline is 42 days out
SEALIFT_INTERVAL_DAYS = 365


@app.get("/api/parts", response_model=list[Part])
def parts() -> list[Part]:
    return state.seed.parts


@app.get("/api/parts/sealift-plan", response_model=SealiftPlan)
def sealift_plan() -> SealiftPlan:
    today = now().date()
    next_sealift = today + timedelta(days=SEALIFT_DAYS_AWAY)
    following = next_sealift + timedelta(days=SEALIFT_INTERVAL_DAYS)
    by_id = {p.id: p for p in state.seed.parts}
    plans = plan_supply(
        [PartStock(p.id, p.name, p.unit, p.on_hand, p.monthly_use) for p in state.seed.parts],
        today,
        next_sealift,
        following,
    )
    out = [PartPlanOut(**vars(pl), category=by_id[pl.id].category) for pl in plans]
    order: list[OrderLine] = []
    for pl in out:
        if pl.air_freight_qty:
            order.append(OrderLine(part_id=pl.id, name=pl.name, unit=pl.unit, quantity=pl.air_freight_qty, shipping="air_freight"))
    for pl in out:
        if pl.sealift_qty:
            order.append(OrderLine(part_id=pl.id, name=pl.name, unit=pl.unit, quantity=pl.sealift_qty, shipping="sealift"))
    return SealiftPlan(
        today=today,
        next_sealift=next_sealift,
        following_sealift=following,
        days_until_deadline=SEALIFT_DAYS_AWAY,
        cover_months=COVER_MONTHS,
        safety_buffer_pct=round(SAFETY_BUFFER * 100),
        parts=out,
        at_risk=[pl for pl in out if pl.status != "ok"],
        order=order,
    )


@app.get("/api/partners", response_model=list[Partner])
def partners() -> list[Partner]:
    return state.seed.partners
