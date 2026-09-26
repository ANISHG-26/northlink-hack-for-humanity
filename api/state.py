"""In-memory demo state, built from seed.json at startup.

Serverless instances are short-lived, so this resets on cold start — fine for
a demo. Seed dates are shifted so the sample data always looks "current".
"""
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from api.ai.forecast import Reading
from api.models import DELIVERY_STAGES, Household, Report, SeedData

# Inukjuak is on Eastern Time.
TZ = ZoneInfo("America/Toronto")
SEED_PATH = Path(__file__).resolve().parent / "data" / "seed.json"
SHIFTED_DATE_FIELDS = {"last_delivery", "last_disinfection", "reported", "since"}


def now() -> datetime:
    return datetime.now(TZ)


def _shift_dates(obj, days: int):
    if isinstance(obj, list):
        return [_shift_dates(x, days) for x in obj]
    if isinstance(obj, dict):
        return {
            k: (date.fromisoformat(v) + timedelta(days=days)).isoformat()
            if k in SHIFTED_DATE_FIELDS and isinstance(v, str)
            else _shift_dates(v, days)
            for k, v in obj.items()
        }
    return obj


def _planned_eta(t: datetime) -> datetime:
    """Today about 2:30 PM, or ~1.5 h from now (next half hour) if that has passed."""
    eta = datetime.combine(t.date(), time(14, 30), TZ)
    if t > eta - timedelta(hours=1):
        eta = (t + timedelta(minutes=90)).replace(second=0, microsecond=0)
        eta += timedelta(minutes=(30 - eta.minute % 30) % 30)
    return eta


class State:
    def __init__(self) -> None:
        raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        start = now()
        offset = (start.date() - date.fromisoformat(raw["generated_for"])).days
        self.seed = SeedData.model_validate(_shift_dates(raw, offset))
        self.households: dict[str, Household] = {h.id: h for h in self.seed.households}
        self.trucks = {t.id: t for t in self.seed.trucks}
        self.reports: list[Report] = []

        # Level readings: last delivery (tank full) + the seeded current level.
        self.readings: dict[str, list[Reading]] = {}
        for h in self.seed.households:
            delivered = datetime.combine(h.last_delivery, time(10, 0), TZ)
            if delivered >= start:
                delivered = start - timedelta(hours=2)
            self.readings[h.id] = [
                Reading(delivered, h.tank_capacity_l),
                Reading(start, h.current_level_l),
            ]

        # Delivery tracker per household (created lazily).
        self.deliveries: dict[str, dict] = {}

    def delivery(self, household_id: str) -> dict:
        if household_id not in self.deliveries:
            t = now()
            self.deliveries[household_id] = {"stage_index": 0, "eta": _planned_eta(t), "updated_at": t}
        return self.deliveries[household_id]

    def advance_delivery(self, household_id: str) -> dict:
        d = self.delivery(household_id)
        t = now()
        idx = (d["stage_index"] + 1) % len(DELIVERY_STAGES)
        stage = DELIVERY_STAGES[idx]
        if stage == "scheduled":
            d["eta"] = _planned_eta(t + timedelta(days=2))
        elif stage == "en_route":
            d["eta"] = t + timedelta(minutes=35)
        elif stage == "nearby":
            d["eta"] = t + timedelta(minutes=8)
        elif stage == "delivered":
            d["eta"] = t
            h = self.households[household_id]
            self.readings[household_id].append(Reading(t, h.tank_capacity_l))
        d["stage_index"] = idx
        d["updated_at"] = t
        return d


state = State()
