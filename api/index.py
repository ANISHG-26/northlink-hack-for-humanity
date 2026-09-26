"""Northlink API — FastAPI app, served by Vercel as a Python serverless function.

Northlink never tests water or decides that water is safe. Advisories are
issued only by staff on behalf of the municipal water office or regional
health board; the AI only flags patterns for staff review.
"""
import sys
from pathlib import Path

# Make `api.*` importable both under uvicorn (run from repo root) and on Vercel.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from datetime import timedelta  # noqa: E402

from fastapi import FastAPI, Header, HTTPException  # noqa: E402

from api.ai.classify import classify  # noqa: E402
from api.ai.forecast import Reading, forecast, forecast_sewage  # noqa: E402
from api.ai.outbreak import IllnessCase, QualityComplaint, detect_outbreaks  # noqa: E402
from api.ai.routing import StopInput, rank_stops  # noqa: E402
from api.ai.sensing import detect_leak  # noqa: E402
from api.ai.supply import COVER_MONTHS, SAFETY_BUFFER, PartStock, plan_supply  # noqa: E402
from api.ai.triage import AttentionInput, prioritise  # noqa: E402
from api.models import (  # noqa: E402
    DELIVERY_STAGES,
    Advisory,
    AdvisoryIn,
    AttentionItemOut,
    ClassifyIn,
    ClassifyOut,
    CompleteIn,
    Completion,
    Dashboard,
    Delivery,
    Forecast,
    Health,
    Household,
    HouseholdStatus,
    LeakFlag,
    LeakSignalOut,
    LevelUpdate,
    Measurement,
    OrderLine,
    OutbreakAlertOut,
    Part,
    Partner,
    PartPlanOut,
    Report,
    ReportIn,
    RouteStop,
    RouteToday,
    Safety,
    SealiftPlan,
    SensorPoint,
    SensorReading,
    SewageStatus,
    SharedFactorOut,
    SimulateUsage,
    Staffing,
    ZoneStatus,
)
from api.state import now, state  # noqa: E402

LEVEL_FRACTIONS = {"full": 1.0, "three_quarters": 0.75, "half": 0.5, "quarter": 0.25, "empty": 0.0}
STAFF_DEMO_PIN = "1234"  # DEMO ONLY — real deployments need proper staff accounts

app = FastAPI(title="Northlink API", version="0.3.0")


def get_household(household_id: str) -> Household:
    h = state.households.get(household_id.upper())
    if not h:
        raise HTTPException(404, f"Household {household_id} not found")
    return h


def get_truck(truck: str):
    """Accept "2", "T2" or "t2"."""
    key = truck.upper() if truck.upper().startswith("T") else f"T{truck}"
    t = state.trucks.get(key)
    if not t:
        raise HTTPException(404, f"Truck {truck} not found")
    return t


def require_staff(pin: str | None) -> None:
    if pin != STAFF_DEMO_PIN:
        raise HTTPException(403, "Staff mode required")


def zone_advisory(zone: str):
    return state.advisories.get(zone)


def household_forecast(h: Household):
    return forecast(h.household_size, h.tank_capacity_l, state.water_readings(h.id), now())


def household_sewage(h: Household, daily_use_l: float):
    last = max(state.sewage[h.id], key=lambda r: r.at)
    return forecast_sewage(h.sewage_capacity_l, last.litres, last.at, daily_use_l, now())


def measurement_for(h: Household) -> Measurement:
    if h.id in state.sensor_raw:
        return Measurement(source="sensor", updated_at=state.sensor_raw[h.id][-1].at, note="Measured by tank sensor (load cells).")
    last = max(state.readings[h.id], key=lambda r: r.at)
    return Measurement(
        source="estimated",
        updated_at=last.at,
        note="Estimated from the last delivery logged by the driver, minus expected use since then.",
    )


def build_status(h: Household) -> HouseholdStatus:
    f = household_forecast(h)
    s = household_sewage(h, f.daily_use_l)
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
        sewage=SewageStatus(
            litres=int(s.litres),
            capacity_l=int(s.capacity_l),
            percent=round(100 * s.litres / s.capacity_l),
            daily_inflow_l=int(s.daily_inflow_l),
            days_until_full=s.days_until_full,
            predicted_full=s.predicted_full,
            is_full=s.is_full,
        ),
        measurement=measurement_for(h),
        safety=Safety(
            status=advisory.status if advisory else "safe",
            zone=h.zone,
            since=advisory.since if advisory else None,
            reason=advisory.reason if advisory else None,
            message=advisory.message if advisory else None,
            source=advisory.source if advisory else None,
            issued_at=advisory.issued_at if advisory else None,
            last_checked=now(),
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


# --- Tank sensor (simulated) ------------------------------------------------------


def sensor_reading(h: Household) -> SensorReading:
    if h.id not in state.sensor_raw:
        raise HTTPException(404, f"Household {h.id} has no tank sensor")
    state.sensor_tick(h.id)
    series = state.sensor_litres(h.id)
    cutoff = now() - timedelta(hours=24)
    leak = detect_leak(series)
    empty = h.empty_tank_weight_kg or 0.0
    return SensorReading(
        household_id=h.id,
        empty_tank_kg=empty,
        raw_weight_kg=state.live_weight(h.id),
        smoothed_weight_kg=round(series[-1].value + empty, 1),
        litres=round(series[-1].value),
        capacity_l=h.tank_capacity_l,
        updated_at=state.sensor_raw[h.id][-1].at,
        series_24h=[SensorPoint(at=s.at, litres=round(s.value, 1)) for s in series if s.at >= cutoff],
        leak=LeakSignalOut(**vars(leak)) if leak else None,
    )


@app.get("/api/households/{household_id}/sensor", response_model=SensorReading)
def get_sensor(household_id: str) -> SensorReading:
    return sensor_reading(get_household(household_id))


@app.post("/api/households/{household_id}/sensor/simulate-usage", response_model=SensorReading)
def simulate_usage(household_id: str, body: SimulateUsage | None = None) -> SensorReading:
    h = get_household(household_id)
    if h.id not in state.sensor_raw:
        raise HTTPException(404, f"Household {h.id} has no tank sensor")
    litres = state.sensor_litres(h.id)[-1].value
    state.sensor_set_litres(h.id, max(litres - (body or SimulateUsage()).litres, 0.0))
    return sensor_reading(h)


# --- Reports -----------------------------------------------------------------------


@app.post("/api/reports/classify", response_model=ClassifyOut)
def classify_report(body: ClassifyIn) -> ClassifyOut:
    c = classify(body.text)
    return ClassifyOut(category=c.category, confidence=c.confidence, matched=c.matched, scores=c.scores)


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


# --- Deliveries and route -------------------------------------------------------------


@app.post("/api/deliveries/{household_id}/advance", response_model=HouseholdStatus)
def advance_delivery(household_id: str) -> HouseholdStatus:
    h = get_household(household_id)
    state.advance_delivery(h.id)
    return build_status(h)


@app.post("/api/deliveries/{household_id}/complete", response_model=Completion)
def complete_delivery(household_id: str, body: CompleteIn | None = None) -> Completion:
    h = get_household(household_id)
    body = body or CompleteIn()
    truck_id = get_truck(body.truck_id).id if body.truck_id else h.last_truck_id
    return state.complete(h.id, truck_id, body.timestamp or now(), body.service)


SEWAGE_ROUTE_DAYS = 3  # include wastewater pickups due within this many days


@app.get("/api/route/today", response_model=RouteToday)
def route_today(truck: str = "2") -> RouteToday:
    t = get_truck(truck)
    today = now().date()
    done_today = [c for c in state.completions if c.truck_id == t.id and c.at.date() == today]
    done = {(c.household_id, c.service) for c in state.completions if c.at.date() == today}

    inputs = []
    for h in state.households.values():
        if h.zone not in t.zones:
            continue
        f = household_forecast(h)
        adv = zone_advisory(h.zone)
        common = dict(
            household_id=h.id,
            zone=h.zone,
            vulnerable_type=h.vulnerable_type,
            advisory=adv.status if adv and adv.status != "safe" else None,
        )
        if (h.id, "water") not in done:
            inputs.append(
                StopInput(
                    hours_until_empty=f.days_left * 24,
                    litres_left=f.litres_left,
                    tank_capacity_l=h.tank_capacity_l,
                    service="water",
                    **common,
                )
            )
        s = household_sewage(h, f.daily_use_l)
        if (h.id, "sewage") not in done and s.days_until_full <= SEWAGE_ROUTE_DAYS:
            inputs.append(
                StopInput(
                    hours_until_empty=s.days_until_full * 24,
                    litres_left=h.sewage_capacity_l - s.litres,
                    tank_capacity_l=h.sewage_capacity_l,
                    service="sewage",
                    **common,
                )
            )
    stops = [RouteStop(**vars(s)) for s in rank_stops(inputs, t.capacity_l)]
    return RouteToday(truck=t, generated_at=now(), stops=stops, completed=sorted(done_today, key=lambda c: c.at, reverse=True))


# --- Dispatcher ------------------------------------------------------------------------

ZONES = ["A", "B", "C", "D", "E", "F"]
OUT_LITRES = 50  # effectively empty
LOW_DAYS = 2
LOW_ZONE_SHARE = 0.3  # zone shows "running low" when this share of homes are low
# Sample staffing numbers (the municipality reports a chronic driver shortage).
DRIVERS_AVAILABLE_TODAY = 2
DRIVERS_NEEDED = 4  # 3 water trucks + wastewater pickups


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
    alerts = detect_outbreaks(illness_cases(), quality_complaints(), state.seed.baseline_weekly_illness, now().date(), names)
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


def leak_flags() -> list[LeakFlag]:
    flags = []
    for hid in state.sensor_raw:
        state.sensor_tick(hid)
        leak = detect_leak(state.sensor_litres(hid))
        if leak:
            h = state.households[hid]
            flags.append(
                LeakFlag(household_id=hid, zone=h.zone, kind=leak.kind, litres_lost=leak.litres_lost, at=leak.end, note=leak.note)
            )
    return flags


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard() -> Dashboard:
    today = now().date()
    start = today - timedelta(days=6)
    cases = [c for c in illness_cases() if start <= c.reported <= today]
    zones = []
    for z in ZONES:
        hs = [h for h in state.households.values() if h.zone == z]
        fs = [(h, household_forecast(h)) for h in hs]
        out = sum(1 for _, f in fs if f.litres_left < OUT_LITRES)
        low = sum(1 for _, f in fs if f.litres_left >= OUT_LITRES and f.days_left < LOW_DAYS)
        sew = sum(1 for h, f in fs if household_sewage(h, f.daily_use_l).is_full)
        adv = zone_advisory(z)
        status = "advisory" if adv else "out" if out or sew else "low" if hs and low / len(hs) >= LOW_ZONE_SHARE else "ok"
        zones.append(
            ZoneStatus(
                zone=z,
                households=len(hs),
                out_of_water=out,
                running_low=low,
                sewage_full=sew,
                illness_7d=sum(1 for c in cases if c.zone == z),
                advisory=adv.status if adv else None,
                status=status,
            )
        )
    sensors = len(state.sensor_raw)
    total = len(state.households)
    trucks = list(state.trucks.values())
    return Dashboard(
        out_of_water=sum(z.out_of_water for z in zones),
        running_low=sum(z.running_low for z in zones),
        sewage_full=sum(z.sewage_full for z in zones),
        delivered_today=sum(1 for c in state.completions if c.at.date() == today),
        active_advisories=len(state.advisories),
        sensor_homes=sensors,
        estimated_homes=total - sensors,
        sensor_pct=round(100 * sensors / total) if total else 0,
        possible_leaks=leak_flags(),
        staffing=Staffing(
            drivers_available=DRIVERS_AVAILABLE_TODAY,
            drivers_needed=DRIVERS_NEEDED,
            trucks_in_service=sum(1 for t in trucks if t.status == "in_service"),
            trucks_total=len(trucks),
        ),
        zones=zones,
    )


@app.get("/api/outbreaks", response_model=list[OutbreakAlertOut])
def outbreaks() -> list[OutbreakAlertOut]:
    """Signals for staff review. The AI flags patterns; it never issues advisories."""
    return outbreak_alerts()


@app.get("/api/attention", response_model=list[AttentionItemOut])
def attention() -> list[AttentionItemOut]:
    """Reports and household states needing staff attention, highest priority first."""
    t = now()
    signal_homes = {hid for a in outbreak_alerts() for hid in a.households}
    items: dict[tuple[str, str], AttentionInput] = {}

    def add(item: AttentionInput) -> None:
        key = (item.household_id, item.kind)
        if key not in items or item.at > items[key].at:
            items[key] = item

    for h in state.households.values():
        f = household_forecast(h)
        if household_sewage(h, f.daily_use_l).is_full:
            add(AttentionInput(f"sewage-{h.id}", "sewage_full", h.id, h.zone, t, h.vulnerable_type))
        if f.litres_left < OUT_LITRES:
            add(AttentionInput(f"out-{h.id}", "out_of_water", h.id, h.zone, t, h.vulnerable_type))
    week_ago = t.date() - timedelta(days=6)
    for r in state.seed.illness_reports:
        if r.reported >= week_ago:
            h = state.households[r.household_id]
            add(AttentionInput(
                f"ill-{r.id}", "illness", h.id, h.zone,
                t.replace(year=r.reported.year, month=r.reported.month, day=r.reported.day),
                h.vulnerable_type, h.id in signal_homes, ", ".join(r.symptoms),
            ))
    for r in state.reports:
        h = state.households[r.household_id]
        add(AttentionInput(r.id, r.type, h.id, h.zone, r.timestamp, h.vulnerable_type,
                           r.type == "illness" and h.id in signal_homes, r.note))
    for lf in leak_flags():
        h = state.households[lf.household_id]
        add(AttentionInput(f"leak-{h.id}", "possible_leak", h.id, h.zone, lf.at, h.vulnerable_type, False, lf.note))
    return [AttentionItemOut(**vars(a)) for a in prioritise(list(items.values()))]


@app.get("/api/advisories", response_model=list[Advisory])
def advisories() -> list[Advisory]:
    return sorted(state.advisories.values(), key=lambda a: a.zone)


@app.post("/api/advisories", response_model=Advisory, status_code=201)
def issue_advisory(body: AdvisoryIn, x_staff_pin: str | None = Header(default=None)) -> Advisory:
    """Staff only. Records an advisory decided by the named authority."""
    require_staff(x_staff_pin)
    t = now()
    adv = Advisory(
        zone=body.zone,
        status="boil" if body.level == "boil" else "nodrink",
        since=t.date(),
        reason=f"Issued by staff for the {body.source.lower()}",
        message=body.message.strip() or None,
        issued_at=t,
        source=body.source,
    )
    state.advisories[body.zone] = adv
    return adv


@app.delete("/api/advisories/{zone}", status_code=204)
def lift_advisory(zone: str, x_staff_pin: str | None = Header(default=None)) -> None:
    require_staff(x_staff_pin)
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
