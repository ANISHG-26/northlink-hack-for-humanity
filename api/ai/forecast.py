"""Tank level forecasting — pure functions, no I/O.

Estimate daily water use from household size (25 L/person/day by default),
then adjust with the household's own recent level readings when we have them.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

LITRES_PER_PERSON_PER_DAY = 25.0
# Guard rails so one odd reading can't produce a silly forecast.
MIN_LPCD = 8.0
MAX_LPCD = 150.0
# How many days of observed readings before we trust them most (max weight).
FULL_TRUST_DAYS = 4.0
MAX_OBSERVED_WEIGHT = 0.8
# A rise bigger than this is a refill (smaller rises are sensor noise).
REFILL_MIN_L = 50.0
# Wastewater: nearly all water used goes down the drain into the sewage tank.
SEWAGE_RETURN_FRACTION = 0.95
SEWAGE_FULL_FRACTION = 0.95  # red light threshold

Confidence = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class Reading:
    at: datetime
    litres: float


@dataclass(frozen=True)
class ForecastResult:
    litres_left: float
    daily_use_l: float
    days_left: float
    predicted_empty: datetime
    confidence: Confidence
    confidence_note: str
    method: Literal["household_size", "blended"]


def _since_last_refill(readings: list[Reading]) -> list[Reading]:
    """Readings after the most recent refill (a level increase restarts the curve)."""
    ordered = sorted(readings, key=lambda r: r.at)
    start = 0
    for i in range(1, len(ordered)):
        if ordered[i].litres - ordered[i - 1].litres > REFILL_MIN_L:
            start = i
    return ordered[start:]


def forecast(
    household_size: int,
    tank_capacity_l: float,
    readings: list[Reading],
    now: datetime,
    lpcd: float = LITRES_PER_PERSON_PER_DAY,
) -> ForecastResult:
    """Forecast how long a household's tank will last.

    `readings` are (time, litres) level observations — deliveries (tank full)
    and resident updates. The most recent reading is the starting level.
    """
    people = max(household_size, 1)
    baseline = people * lpcd
    segment = _since_last_refill(readings)

    daily = baseline
    method: Literal["household_size", "blended"] = "household_size"
    confidence: Confidence = "low"
    note = f"Based on household size only ({people} people × {lpcd:g} L/day)."

    if len(segment) >= 2:
        first, last = segment[0], segment[-1]
        span_days = (last.at - first.at).total_seconds() / 86400
        used = first.litres - last.litres
        if span_days >= 0.5 and used > 0:
            observed = used / span_days
            weight = min(MAX_OBSERVED_WEIGHT, span_days / FULL_TRUST_DAYS * MAX_OBSERVED_WEIGHT)
            daily = weight * observed + (1 - weight) * baseline
            method = "blended"
            if span_days >= 2 and len(segment) >= 3:
                confidence = "high"
                note = f"Based on {len(segment)} level readings over {span_days:.1f} days."
            else:
                confidence = "medium"
                note = f"Adjusted using recent use over {span_days:.1f} days; more updates will improve this."

    daily = min(max(daily, people * MIN_LPCD), people * MAX_LPCD)

    if segment:
        latest = segment[-1]
        elapsed_days = max((now - latest.at).total_seconds() / 86400, 0.0)
        litres_left = max(latest.litres - daily * elapsed_days, 0.0)
    else:
        litres_left = tank_capacity_l / 2
        confidence = "low"
        note = "No level readings yet; assuming half full."

    litres_left = min(litres_left, tank_capacity_l)
    days_left = litres_left / daily
    return ForecastResult(
        litres_left=round(litres_left),
        daily_use_l=round(daily),
        days_left=round(days_left, 1),
        predicted_empty=now + timedelta(days=days_left),
        confidence=confidence,
        confidence_note=note,
        method=method,
    )


@dataclass(frozen=True)
class SewageForecast:
    litres: float
    capacity_l: float
    daily_inflow_l: float
    days_until_full: float
    predicted_full: datetime
    is_full: bool


def forecast_sewage(
    capacity_l: float,
    last_level_l: float,
    last_level_at: datetime,
    daily_water_use_l: float,
    now: datetime,
) -> SewageForecast:
    """Predict when the wastewater tank fills (red light) from the household's water use."""
    inflow = max(daily_water_use_l * SEWAGE_RETURN_FRACTION, 1.0)
    elapsed_days = max((now - last_level_at).total_seconds() / 86400, 0.0)
    level = min(last_level_l + inflow * elapsed_days, capacity_l)
    full_at = capacity_l * SEWAGE_FULL_FRACTION
    days = max(full_at - level, 0.0) / inflow
    return SewageForecast(
        litres=round(level),
        capacity_l=capacity_l,
        daily_inflow_l=round(inflow),
        days_until_full=round(days, 1),
        predicted_full=now + timedelta(days=days),
        is_full=level >= full_at,
    )
