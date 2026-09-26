"""Tank level sensing — pure functions, no I/O.

Hardware design (proposed for new and retrofitted homes): load cells under the
tank measure its total weight. Water weighs about 1 kg per litre, so

    litres = (current weight − empty tank weight) / 1.0 kg/L

Load cells are noisy (vibration, temperature, someone leaning on the tank), so
readings are smoothed before use, and sudden drops are flagged as possible leaks.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import median
from typing import Literal

WATER_KG_PER_L = 1.0

# Leak detection
SUDDEN_DROP_L = 150.0  # more than this lost...
SUDDEN_WINDOW = timedelta(minutes=60)  # ...within this window looks like a leak/burst
OVERNIGHT_HOURS = (1, 5)  # 1 am to 5 am: normal household use is close to zero
OVERNIGHT_RATE_L_PER_H = 10.0  # sustained loss above this overnight suggests a slow leak


@dataclass(frozen=True)
class Sample:
    at: datetime
    value: float  # kg (raw) or litres (converted)


@dataclass(frozen=True)
class LeakSignal:
    kind: Literal["sudden_drop", "overnight_loss"]
    start: datetime
    end: datetime
    litres_lost: float
    rate_l_per_h: float
    note: str


def weight_to_litres(weight_kg: float, empty_tank_kg: float, capacity_l: float | None = None) -> float:
    """Convert a load-cell weight to litres of water, clamped to [0, capacity]."""
    litres = (weight_kg - empty_tank_kg) / WATER_KG_PER_L
    litres = max(litres, 0.0)
    if capacity_l is not None:
        litres = min(litres, capacity_l)
    return litres


def median_filter(values: list[float], window: int = 5) -> list[float]:
    """Remove single-reading spikes: each point becomes the median of its neighbourhood."""
    if window < 1 or not values:
        return list(values)
    half = window // 2
    return [median(values[max(0, i - half) : i + half + 1]) for i in range(len(values))]


def ema(values: list[float], alpha: float = 0.3) -> list[float]:
    """Exponential moving average: smooths remaining small noise."""
    if not values:
        return []
    out = [values[0]]
    for v in values[1:]:
        out.append(alpha * v + (1 - alpha) * out[-1])
    return out


def smooth(values: list[float], window: int = 5, alpha: float = 0.3) -> list[float]:
    """Median filter (kills spikes) then EMA (evens out jitter)."""
    return ema(median_filter(values, window), alpha)


def to_litres_series(raw: list[Sample], empty_tank_kg: float, capacity_l: float | None = None) -> list[Sample]:
    """Raw weight samples -> smoothed litres samples."""
    smoothed = smooth([s.value for s in raw])
    return [Sample(s.at, weight_to_litres(w, empty_tank_kg, capacity_l)) for s, w in zip(raw, smoothed)]


def detect_sudden_drop(series: list[Sample], drop_l: float = SUDDEN_DROP_L, window: timedelta = SUDDEN_WINDOW) -> LeakSignal | None:
    """Largest loss within any `window` that exceeds `drop_l` (litres series, time-ordered)."""
    best: LeakSignal | None = None
    j = 0
    for i, end in enumerate(series):
        while series[j].at < end.at - window:
            j += 1
        # highest level inside the window before `end`
        peak = max(series[j : i + 1], key=lambda s: s.value)
        lost = peak.value - end.value
        if lost > drop_l and (best is None or lost > best.litres_lost):
            hours = max((end.at - peak.at).total_seconds() / 3600, 1 / 60)
            best = LeakSignal(
                "sudden_drop",
                peak.at,
                end.at,
                round(lost),
                round(lost / hours),
                f"{round(lost)} L lost in {round(hours * 60)} minutes; much faster than normal use.",
            )
    return best


def detect_overnight_loss(series: list[Sample], rate_l_per_h: float = OVERNIGHT_RATE_L_PER_H) -> LeakSignal | None:
    """Sustained loss between 1 am and 5 am, when a household normally uses almost nothing."""
    start_h, end_h = OVERNIGHT_HOURS
    night = [s for s in series if start_h <= s.at.hour < end_h]
    if len(night) < 2:
        return None
    first, last = night[0], night[-1]
    hours = (last.at - first.at).total_seconds() / 3600
    lost = first.value - last.value
    if hours >= 2 and lost / hours > rate_l_per_h:
        return LeakSignal(
            "overnight_loss",
            first.at,
            last.at,
            round(lost),
            round(lost / hours, 1),
            f"Losing about {lost / hours:.0f} L per hour overnight, when use is normally near zero.",
        )
    return None


def detect_leak(series: list[Sample]) -> LeakSignal | None:
    return detect_sudden_drop(series) or detect_overnight_loss(series)
