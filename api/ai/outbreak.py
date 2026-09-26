"""Illness cluster detection — pure functions, no I/O.

1. For each zone, count stomach-illness reports in a rolling window (7 days)
   and compare with that zone's usual weekly rate (baseline).
2. Flag a cluster when the count is well above baseline
   (at least MIN_REPORTS and more than RATIO_THRESHOLD × baseline).
3. For flagged zones, look for shared factors among the sick households:
   same water truck, same delivery day, and recent water-quality complaints.
"""
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Literal

WINDOW_DAYS = 7
MIN_REPORTS = 3
RATIO_THRESHOLD = 2.0
BASELINE_FLOOR = 0.25  # avoid dividing by ~0 for zones with almost no history

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@dataclass(frozen=True)
class IllnessCase:
    household_id: str
    zone: str
    reported: date
    truck_id: str | None  # truck that last delivered to the household
    delivery_date: date | None  # that delivery's date


@dataclass(frozen=True)
class QualityComplaint:
    household_id: str
    zone: str
    reported: date


@dataclass(frozen=True)
class SharedFactor:
    kind: Literal["truck_and_day", "truck", "none"]
    truck_id: str | None
    delivery_date: date | None
    weekday: str | None
    matching: int
    total: int


@dataclass(frozen=True)
class OutbreakAlert:
    zone: str
    count: int
    window_days: int
    span_days: int  # days from first to latest report, inclusive
    baseline_weekly: float
    ratio: float
    households: list[str]
    shared: SharedFactor
    water_quality_reports: int
    suggested_level: Literal["boil", "nodrink"]
    summary: str
    recommended_action: str
    how_detected: list[str] = field(default_factory=list)


def _shared_factor(cases: list[IllnessCase]) -> SharedFactor:
    total = len(cases)
    by_truck_day = Counter((c.truck_id, c.delivery_date) for c in cases if c.truck_id and c.delivery_date)
    if by_truck_day:
        (truck, day), n = by_truck_day.most_common(1)[0]
        if n >= 2 and n * 2 >= total:
            return SharedFactor("truck_and_day", truck, day, WEEKDAYS[day.weekday()], n, total)
    by_truck = Counter(c.truck_id for c in cases if c.truck_id)
    if by_truck:
        truck, n = by_truck.most_common(1)[0]
        if n >= 2 and n * 2 >= total:
            return SharedFactor("truck", truck, None, None, n, total)
    return SharedFactor("none", None, None, None, 0, total)


def detect_outbreaks(
    cases: list[IllnessCase],
    complaints: list[QualityComplaint],
    baseline_weekly: dict[str, float],
    today: date,
    truck_names: dict[str, str] | None = None,
) -> list[OutbreakAlert]:
    truck_names = truck_names or {}
    start = today - timedelta(days=WINDOW_DAYS - 1)
    recent = [c for c in cases if start <= c.reported <= today]
    alerts: list[OutbreakAlert] = []

    for zone in sorted({c.zone for c in recent}):
        zone_cases = [c for c in recent if c.zone == zone]
        count = len(zone_cases)
        base = max(baseline_weekly.get(zone, BASELINE_FLOOR), BASELINE_FLOOR)
        ratio = count / base
        if count < MIN_REPORTS or ratio <= RATIO_THRESHOLD:
            continue

        first = min(c.reported for c in zone_cases)
        last = max(c.reported for c in zone_cases)
        span = (last - first).days + 1
        shared = _shared_factor(zone_cases)
        wq = sum(1 for q in complaints if q.zone == zone and start <= q.reported <= today)
        truck = truck_names.get(shared.truck_id or "", shared.truck_id or "")

        summary = f"{count} stomach illness reports in Zone {zone} in {span} day{'s' if span != 1 else ''}."
        if shared.kind == "truck_and_day":
            summary += f" {shared.matching} of these homes got water from {truck} on {shared.weekday}."
        elif shared.kind == "truck":
            summary += f" {shared.matching} of these homes get water from {truck}."
        if wq:
            summary += f" {wq} water quality complaint{'s' if wq != 1 else ''} in the zone this week."

        action = f"Boil water advisory for Zone {zone}"
        action += f" and testing for {truck}." if shared.truck_id else " and water testing in the zone."

        how = [
            f"Counted illness reports in each zone over the last {WINDOW_DAYS} days.",
            f"Zone {zone} usually has about {base:g} report{'s' if base != 1 else ''} a week; "
            f"this week it has {count} ({ratio:.1f}× normal).",
            f"A cluster is flagged at {MIN_REPORTS}+ reports and more than {RATIO_THRESHOLD:g}× the usual rate.",
        ]
        if shared.kind != "none":
            how.append(
                f"Checked which truck last delivered to each sick home and when: "
                f"{shared.matching} of {shared.total} match{' the same truck and day' if shared.kind == 'truck_and_day' else ' the same truck'}."
            )
        else:
            how.append("No single truck or delivery day is shared by most of the sick homes.")
        how.append(f"Found {wq} water quality complaint{'s' if wq != 1 else ''} in Zone {zone} this week.")
        how.append("This is a signal for follow-up, not a diagnosis. Public health staff should confirm.")

        alerts.append(
            OutbreakAlert(
                zone=zone,
                count=count,
                window_days=WINDOW_DAYS,
                span_days=span,
                baseline_weekly=base,
                ratio=round(ratio, 1),
                households=sorted({c.household_id for c in zone_cases}),
                shared=shared,
                water_quality_reports=wq,
                suggested_level="boil",
                summary=summary,
                recommended_action=f"Recommended: {action}",
                how_detected=how,
            )
        )
    return sorted(alerts, key=lambda a: a.ratio, reverse=True)
