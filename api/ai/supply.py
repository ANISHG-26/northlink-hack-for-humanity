"""Parts supply planning against the annual sealift — pure functions, no I/O.

Most supplies reach Inukjuak by sealift about once a year. For each part:
- months of stock left = on hand / monthly use
- runs out before the NEXT sealift arrives  -> "critical" (needs air freight)
- won't last until the FOLLOWING sealift     -> "order" (add to sealift order)
- otherwise                                  -> "ok"
Order quantity covers 12 months after the next sealift plus a safety buffer,
minus whatever stock will still be on the shelf when the sealift arrives.
"""
import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

DAYS_PER_MONTH = 30.44
COVER_MONTHS = 12
SAFETY_BUFFER = 0.25  # +25%

Status = Literal["ok", "order", "critical"]


@dataclass(frozen=True)
class PartStock:
    id: str
    name: str
    unit: str
    on_hand: float
    monthly_use: float


@dataclass(frozen=True)
class PartPlan:
    id: str
    name: str
    unit: str
    on_hand: float
    monthly_use: float
    months_left: float | None  # None = not used, never runs out
    runs_out_on: date | None
    status: Status
    sealift_qty: int  # to add to the next sealift order
    air_freight_qty: int  # to bridge until the sealift arrives (critical only)
    reason: str


def plan_part(p: PartStock, today: date, next_sealift: date, following_sealift: date) -> PartPlan:
    months_to_next = (next_sealift - today).days / DAYS_PER_MONTH
    months_to_following = (following_sealift - today).days / DAYS_PER_MONTH

    if p.monthly_use <= 0:
        return PartPlan(p.id, p.name, p.unit, p.on_hand, p.monthly_use, None, None, "ok", 0, 0, "Not used recently.")

    months_left = p.on_hand / p.monthly_use
    runs_out = today + timedelta(days=round(months_left * DAYS_PER_MONTH))

    if months_left < months_to_next:
        status: Status = "critical"
        reason = f"Runs out in about {months_left:.1f} months, before the next sealift arrives."
    elif months_left < months_to_following:
        status = "order"
        reason = f"Lasts about {months_left:.1f} months, not until the following sealift."
    else:
        status = "ok"
        reason = f"Lasts about {months_left:.1f} months, past the following sealift."

    # Air freight: enough to reach the sealift, with buffer.
    need_to_next = p.monthly_use * months_to_next * (1 + SAFETY_BUFFER)
    air_qty = math.ceil(need_to_next - p.on_hand) if status == "critical" else 0

    # Sealift: 12 months of use + buffer, minus stock left when the sealift lands.
    left_at_sealift = max(p.on_hand + air_qty - p.monthly_use * months_to_next, 0.0)
    need_12m = p.monthly_use * COVER_MONTHS * (1 + SAFETY_BUFFER)
    sealift_qty = max(math.ceil(need_12m - left_at_sealift), 0) if status != "ok" else 0

    return PartPlan(
        p.id,
        p.name,
        p.unit,
        p.on_hand,
        p.monthly_use,
        round(months_left, 1),
        runs_out,
        status,
        sealift_qty,
        max(air_qty, 0),
        reason,
    )


def plan_supply(parts: list[PartStock], today: date, next_sealift: date, following_sealift: date) -> list[PartPlan]:
    order = {"critical": 0, "order": 1, "ok": 2}
    plans = [plan_part(p, today, next_sealift, following_sealift) for p in parts]
    return sorted(plans, key=lambda pl: (order[pl.status], pl.months_left if pl.months_left is not None else 1e9))
