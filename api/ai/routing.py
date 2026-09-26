"""Delivery route planning — pure functions, no I/O.

Rank households by predicted hours until their tank is empty, then boost
priority for vulnerable households and zones under a water advisory.
"""
from dataclasses import dataclass
from typing import Literal

VulnerableType = Literal["elder", "infant", "medical"]
Advisory = Literal["boil", "nodrink"]
Urgency = Literal["urgent", "soon", "ok"]
Service = Literal["water", "sewage"]

# Effective hours are divided by (1 + weights): a vulnerable home with 12 h
# left ranks like an ordinary home with 8 h left.
VULNERABLE_WEIGHT = 0.5
ADVISORY_WEIGHT = {"boil": 0.25, "nodrink": 0.5}

URGENT_HOURS = 12
SOON_HOURS = 36
# Vulnerable homes become urgent earlier.
URGENT_HOURS_VULNERABLE = 24

VULNERABLE_TEXT = {"elder": "elder in home", "infant": "infant in home", "medical": "medical needs in home"}
ADVISORY_TEXT = {"boil": "boil-water advisory in zone", "nodrink": "do-not-drink advisory in zone"}


@dataclass(frozen=True)
class StopInput:
    """hours_until_empty = hours until the clean tank is empty (water) or the
    wastewater tank is full (sewage). litres_left = clean litres left, or
    free space left in the wastewater tank."""

    household_id: str
    zone: str
    hours_until_empty: float
    litres_left: float
    tank_capacity_l: float
    vulnerable_type: VulnerableType | None
    advisory: Advisory | None
    service: Service = "water"


@dataclass(frozen=True)
class RankedStop:
    rank: int
    household_id: str
    zone: str
    hours_until_empty: float
    litres_left: int
    litres_to_fill: int
    vulnerable_type: VulnerableType | None
    advisory: Advisory | None
    urgency: Urgency
    priority_score: float
    fits_in_load: bool
    reason: str
    service: Service


def describe_hours(hours: float) -> str:
    if hours < 1:
        return "Empty now or within the hour"
    if hours < 48:
        return f"Empty in about {round(hours)} hours"
    return f"Empty in about {round(hours / 24)} days"


def urgency_for(hours: float, score: float, vulnerable: bool) -> Urgency:
    """Badge follows the weighted score, so badges read in route order."""
    if min(hours, score) <= URGENT_HOURS or (vulnerable and hours <= URGENT_HOURS_VULNERABLE):
        return "urgent"
    if score <= SOON_HOURS:
        return "soon"
    return "ok"


def priority_score(s: StopInput) -> float:
    """Lower = deliver sooner. Effective hours until empty after weighting."""
    weight = 1.0
    if s.vulnerable_type:
        weight += VULNERABLE_WEIGHT
    if s.advisory:
        weight += ADVISORY_WEIGHT[s.advisory]
    return max(s.hours_until_empty, 0.0) / weight


def describe_sewage(hours: float) -> str:
    if hours < 1:
        return "Wastewater tank full (red light on); home cannot use water"
    if hours < 48:
        return f"Wastewater tank full in about {round(hours)} hours"
    return f"Wastewater tank full in about {round(hours / 24)} days"


def reason_for(s: StopInput) -> str:
    parts = [describe_sewage(s.hours_until_empty) if s.service == "sewage" else describe_hours(s.hours_until_empty)]
    if s.vulnerable_type:
        parts.append(VULNERABLE_TEXT[s.vulnerable_type])
    if s.advisory:
        parts.append(ADVISORY_TEXT[s.advisory])
    return "; ".join(parts)


def rank_stops(stops: list[StopInput], truck_capacity_l: float) -> list[RankedStop]:
    """Order stops for today's route and mark which fit in one truck load."""
    ordered = sorted(stops, key=lambda s: (priority_score(s), s.household_id, s.service))
    load_used = 0.0
    out: list[RankedStop] = []
    for i, s in enumerate(ordered, start=1):
        # Water: litres to top up. Sewage: litres to pump out (capacity - free space).
        to_fill = max(s.tank_capacity_l - s.litres_left, 0.0)
        if s.service == "water":
            load_used += to_fill
        out.append(
            RankedStop(
                rank=i,
                household_id=s.household_id,
                zone=s.zone,
                hours_until_empty=round(s.hours_until_empty, 1),
                litres_left=round(s.litres_left),
                litres_to_fill=round(to_fill),
                vulnerable_type=s.vulnerable_type,
                advisory=s.advisory,
                urgency=urgency_for(s.hours_until_empty, priority_score(s), s.vulnerable_type is not None),
                priority_score=round(priority_score(s), 1),
                fits_in_load=s.service == "sewage" or load_used <= truck_capacity_l,
                reason=reason_for(s),
                service=s.service,
            )
        )
    return out
