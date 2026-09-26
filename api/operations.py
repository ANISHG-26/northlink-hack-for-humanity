"""Operational summaries. Sample staffing and coverage assumptions are explicit."""
from datetime import timedelta
from math import ceil

from api.models import (
    Breakdown, CheckpointPair, Coverage, Driver, Operations, ServiceCoverage,
    ServiceRequest, Truck, VisitSummary, WaterCheck,
)


def run_id(truck_id, at):
    return f"{truck_id}:{at.date().isoformat()}"


def seed_operations(state, at):
    state.trucks["T4"] = Truck(id="T4", name="Sanitation truck", capacity_l=9000,
        status="in_service", zones=list("ABCDEF"), last_disinfection=at.date(), service="sewage")
    state.drivers = {
        d.id: d for d in [
            Driver(id=f"D{i}", name=f"Sample driver {i}", service="water", status="available")
            for i in range(1, 4)
        ] + [Driver(id="D4", name="Sample sanitation driver", service="sewage", status="available"),
             Driver(id="D5", name="Sample standby driver", service="water", status="standby")]
    }
    state.breakdowns = [Breakdown(event_id="sample-repair", truck_id="T3", part_id="P1",
        symptom="Pump fails to start (sample)", opened_at=at - timedelta(hours=3), stock_quantity=1)]
    state.water_checks = [WaterCheck(event_id="sample-source", checkpoint="source", truck_id="T2",
        run_id=run_id("T2", at), sampled_at=at - timedelta(hours=1), collector="Sample collector",
        parameter="Free chlorine (sample)", value=0.4, units="mg/L", method=None),
        WaterCheck(event_id="sample-drop", checkpoint="drop_point", truck_id="T2",
        run_id=run_id("T2", at), household_id="C-12", sampled_at=at - timedelta(minutes=30),
        collector="Sample collector", parameter="Free chlorine (sample)", value=0.3, units="mg/L", method=None)]
    # Explicit requests, separate from forecast-generated route priorities.
    from api.models import Report
    for hid, service, kind in [("C-12", "water", "clean_water_low"), ("C-21", "sewage_full", "sewage_full")]:
        state.reports.append(Report(id=f"sample-{service}", event_id=f"sample-{service}",
            household_id=hid, zone=state.households[hid].zone, type=kind, service_type=service,
            source="sample", timestamp=at - timedelta(hours=2), reported_at=at - timedelta(hours=2)))
    for report in state.reports:
        report.reported_at = report.reported_at or report.timestamp
        report.service_type = report.service_type or {"clean_water_low": "water", "sewage_full": "sewage_full"}.get(report.type)


def requests(state):
    result = []
    for r in state.reports:
        if not r.service_type:
            continue
        reported = r.reported_at or r.timestamp
        matches = [c for c in state.completions if c.household_id == r.household_id
                   and c.service_type == r.service_type and c.completed_at >= reported]
        c = min(matches, key=lambda c: c.completed_at) if matches else None
        result.append(ServiceRequest(id=r.id, household_id=r.household_id, service_type=r.service_type,
            source=r.source, reported_at=reported, completion_event_id=c.event_id if c else None,
            completed_at=c.completed_at if c else None,
            response_seconds=(c.completed_at - reported).total_seconds() if c else None))
    return sorted(result, key=lambda r: r.reported_at)


def coverage(state):
    def service_coverage(service):
        trucks = [t for t in state.trucks.values() if t.service == service]
        ready = [t for t in trucks if t.status == "in_service"]
        drivers = [d for d in state.drivers.values() if d.service == service]
        available = sum(d.status == "available" for d in drivers)
        crews = min(available, len(ready))
        # Zone assignments remain in force. Standby drivers must be activated explicitly.
        needed = max(ceil(len(state.households) / 500), len({tuple(t.zones) for t in trucks})) if service == "water" else 1
        covered = set()
        for truck in ready[:crews]:
            covered.update([h.id for h in state.households.values() if h.zone in truck.zones][:500])
        return ServiceCoverage(service=service, drivers_available=available,
            drivers_standby=sum(d.status == "standby" for d in drivers), trucks_in_service=len(ready),
            crews_available=crews, crews_needed=needed, shortfall=max(0, needed - crews),
            households_per_truck=500 if service == "water" else None,
            household_coverage=len(covered) if service == "water" else None,
            uncovered_households=len(state.households) - len(covered) if service == "water" else None)
    water, sanitation = service_coverage("water"), service_coverage("sewage")
    return Coverage(drivers_available=water.drivers_available + sanitation.drivers_available,
        drivers_standby=water.drivers_standby + sanitation.drivers_standby,
        trucks_in_service=water.trucks_in_service + sanitation.trucks_in_service,
        shortfall=bool(water.shortfall or water.uncovered_households or sanitation.shortfall), water=water, sanitation=sanitation,
        assumption="Up to 500 households per water truck is a coverage assumption, not daily throughput. "
        "Sample zone assignments require three water crews; sanitation requires one separate crew. Standby is not active.")


def operations(state, storage):
    rs = requests(state)
    visits = []
    for hid in state.households:
        for service in ("water", "sewage_full", "sewage_blocked"):
            cs = [c for c in state.completions if c.household_id == hid and c.service_type == service]
            visits.append(VisitSummary(household_id=hid, service_type=service, visit_count=len(cs),
                last_visit=max((c.completed_at for c in cs), default=None)))
    return Operations(storage=storage, open_requests=[r for r in rs if r.completed_at is None],
        completed_requests=[r for r in rs if r.completed_at is not None], visits=visits,
        completions=state.completions, drivers=list(state.drivers.values()), trucks=list(state.trucks.values()), coverage=coverage(state))


def checkpoint_pairs(state, truck_id, run, households):
    checks = [c for c in state.water_checks if c.truck_id == truck_id and c.run_id == run]
    source = [c for c in checks if c.checkpoint == "source"]
    result = []
    for hid in sorted(set(households)):
        drop = [c for c in checks if c.household_id == hid]
        flags = []
        if not source:
            flags.append("missing_source")
        if not drop:
            flags.append("missing_drop_point")
        for status in ("unreviewed", "follow_up"):
            if any(c.review_status == status for c in source + drop):
                flags.append(status)
        result.append(CheckpointPair(household_id=hid, source=source, drop_point=drop, flags=flags))
    return result
