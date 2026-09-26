"""In-memory demo state, built from seed.json at startup.

Serverless instances are short-lived, so this resets on cold start — fine for
a demo. Seed dates are shifted so the sample data always looks "current".
Tank sensors are SIMULATED: we generate plausible load-cell weight readings.
"""
import json
import random
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from api.ai.forecast import Reading
from api.ai.sensing import Sample, to_litres_series
from api.models import DELIVERY_STAGES, Advisory, Completion, Household, Report, SeedData

# Inukjuak is on Eastern Time.
TZ = ZoneInfo("America/Toronto")
SEED_PATH = Path(__file__).resolve().parent / "data" / "seed.json"
SHIFTED_DATE_FIELDS = {"last_delivery", "last_disinfection", "reported", "since", "last_sewage_pickup"}

SENSOR_STEP = timedelta(minutes=15)
SENSOR_HISTORY = timedelta(hours=24)
SENSOR_NOISE_KG = 2.5
# Relative water use by hour of day (quiet overnight, peaks morning and evening).
HOURLY_PROFILE = [0.15, 0.1, 0.1, 0.1, 0.1, 0.3, 1.0, 2.0, 2.0, 1.4, 1.0, 1.0,
                  1.2, 1.0, 0.9, 0.9, 1.1, 1.6, 1.9, 1.8, 1.5, 1.1, 0.6, 0.3]


def now() -> datetime:
    return datetime.now(TZ)


def _shift_dates(obj, days: int):
    if isinstance(obj, list):
        return [_shift_dates(x, days) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in SHIFTED_DATE_FIELDS and isinstance(v, str):
                out[k] = (date.fromisoformat(v) + timedelta(days=days)).isoformat()
            elif k == "timestamp" and isinstance(v, str):
                out[k] = (datetime.fromisoformat(v) + timedelta(days=days)).isoformat()
            else:
                out[k] = _shift_dates(v, days)
        return out
    return obj


def _planned_eta(t: datetime) -> datetime:
    """Today about 2:30 PM, or ~1.5 h from now (next half hour) if that has passed."""
    eta = datetime.combine(t.date(), time(14, 30), TZ)
    if t > eta - timedelta(hours=1):
        eta = (t + timedelta(minutes=90)).replace(second=0, microsecond=0)
        eta += timedelta(minutes=(30 - eta.minute % 30) % 30)
    return eta


def _slot_use(h: Household, at: datetime) -> float:
    """Simulated litres used by a household in one 15-minute slot."""
    daily = h.household_size * 30.0
    return daily * HOURLY_PROFILE[at.hour] / sum(HOURLY_PROFILE) / 4


class State:
    def __init__(self) -> None:
        raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        start = now()
        offset = (start.date() - date.fromisoformat(raw["generated_for"])).days
        self.seed = SeedData.model_validate(_shift_dates(raw, offset))
        self.households: dict[str, Household] = {h.id: h for h in self.seed.households}
        self.trucks = {t.id: t for t in self.seed.trucks}
        self.completions: list[Completion] = []
        # Resident reports (all types) — seed + new.
        self.reports: list[Report] = list(self.seed.resident_reports)
        # Active advisories by zone (issued only by staff).
        self.advisories: dict[str, Advisory] = {a.zone: a for a in self.seed.advisories}
        self._rng = random.Random(42)

        # Clean-water readings that aren't from a sensor: driver-logged deliveries and resident updates.
        self.readings: dict[str, list[Reading]] = {}
        # Raw load-cell samples (kg) for sensor homes.
        self.sensor_raw: dict[str, list[Sample]] = {}
        # Wastewater tank level readings: seeded level, then pickups (reset to 0).
        self.sewage: dict[str, list[Reading]] = {}

        for h in self.seed.households:
            delivered = datetime.combine(h.last_delivery, time(10, 0), TZ)
            if delivered >= start:
                delivered = start - timedelta(hours=2)
            self.readings[h.id] = [Reading(delivered, h.last_delivery_litres)]
            if h.measurement_source == "sensor":
                self.sensor_raw[h.id] = self._simulate_history(h, start)
            self.sewage[h.id] = [Reading(start, h.sewage_level_l)]

        # Delivery tracker per household (created lazily).
        self.deliveries: dict[str, dict] = {}
        from api.operations import seed_operations
        seed_operations(self, start)

    # --- simulated tank sensors -------------------------------------------------

    def _noisy(self, h: Household, litres: float) -> float:
        kg = (h.empty_tank_weight_kg or 0) + litres + self._rng.gauss(0, SENSOR_NOISE_KG)
        if self._rng.random() < 0.02:  # occasional spike (someone leaning on the tank)
            kg += 25
        return round(kg, 1)

    def _simulate_history(self, h: Household, end: datetime) -> list[Sample]:
        """24 h of load-cell samples ending at `end`, finishing at the seeded level."""
        slots = int(SENSOR_HISTORY / SENSOR_STEP)
        times = [end - SENSOR_STEP * (slots - i) for i in range(slots + 1)]
        uses = [_slot_use(h, t) for t in times[1:]]
        if h.sensor_leak_demo:  # burst about 3 hours ago
            uses[slots - 12] += 150
            uses[slots - 11] += 130
        level = min(h.current_level_l + sum(uses), h.tank_capacity_l)
        out = [Sample(times[0], self._noisy(h, level))]
        for t, u in zip(times[1:], uses):
            level = max(level - u, 0.0)
            out.append(Sample(t, self._noisy(h, level)))
        return out

    def sensor_tick(self, household_id: str) -> None:
        """Advance a simulated sensor to now in 15-minute steps."""
        raw = self.sensor_raw.get(household_id)
        if not raw:
            return
        h = self.households[household_id]
        t = now()
        while raw[-1].at + SENSOR_STEP <= t:
            at = raw[-1].at + SENSOR_STEP
            litres = self.sensor_litres(household_id)[-1].value
            raw.append(Sample(at, self._noisy(h, max(litres - _slot_use(h, at), 0.0))))
        cutoff = t - SENSOR_HISTORY - SENSOR_STEP
        while len(raw) > 2 and raw[0].at < cutoff:
            raw.pop(0)

    def sensor_litres(self, household_id: str) -> list[Sample]:
        h = self.households[household_id]
        return to_litres_series(self.sensor_raw[household_id], h.empty_tank_weight_kg or 0, h.tank_capacity_l)

    def sensor_set_litres(self, household_id: str, litres: float, at: datetime | None = None) -> None:
        """Record new load-cell samples at a given water level (usage, refill)."""
        h = self.households[household_id]
        at = at or now()
        # Several samples so the median filter treats it as a real change, not a spike.
        for i in range(3):
            self.sensor_raw[household_id].append(Sample(at + timedelta(seconds=i), self._noisy(h, litres)))
        self.sensor_raw[household_id].sort(key=lambda sample: sample.at)

    def live_weight(self, household_id: str) -> float:
        h = self.households[household_id]
        return self._noisy(h, self.sensor_litres(household_id)[-1].value)

    # --- clean water readings ------------------------------------------------------

    def water_readings(self, household_id: str) -> list[Reading]:
        """All clean-water level observations used by the forecast."""
        readings = list(self.readings[household_id])
        if household_id in self.sensor_raw:
            self.sensor_tick(household_id)
            series = self.sensor_litres(household_id)
            hourly = series[::4] + [series[-1]]
            readings += [Reading(s.at, s.value) for s in hourly]
        return readings

    def record_fill(self, household_id: str, at: datetime) -> None:
        h = self.households[household_id]
        self.readings[household_id].append(Reading(at, h.tank_capacity_l))
        if household_id in self.sensor_raw:
            self.sensor_set_litres(household_id, h.tank_capacity_l, at)

    # --- deliveries --------------------------------------------------------------------

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
            self.record_fill(household_id, t)
        d["stage_index"] = idx
        d["updated_at"] = t
        return d

    def complete(self, household_id: str, truck_id: str, at: datetime, service: str,
                 event_id: str, service_type: str | None = None, run: str | None = None) -> Completion:
        """Driver filled the clean tank or emptied the wastewater tank.
        Idempotent by event ID; separate visits on the same day remain distinct."""
        from fastapi import HTTPException
        from api.operations import run_id
        t = now()
        at = min(at.astimezone(TZ), t)
        service_type = service_type or ("water" if service == "water" else "sewage_full")
        run = run or run_id(truck_id, at)
        for c in self.completions:
            if c.event_id == event_id:
                if (c.household_id, c.truck_id, c.service_type, c.run_id, c.at) != (household_id, truck_id, service_type, run, at):
                    raise HTTPException(409, "Event ID already belongs to another completion")
                return c
        h = self.households[household_id]
        if service == "sewage":
            # Replace the synthetic startup estimate on the first recorded pickup.
            # Later offline pickups are ordered by event time, never arrival time.
            if not any(c.household_id == household_id and c.service == "sewage" for c in self.completions):
                self.sewage[household_id] = []
            self.sewage[household_id].append(Reading(at, 0))
            h.last_sewage_pickup = max(h.last_sewage_pickup or at.date(), at.date())
        else:
            self.record_fill(household_id, at)
            d = self.delivery(household_id)
            if at >= d["updated_at"] or d["stage_index"] != DELIVERY_STAGES.index("delivered"):
                d.update(stage_index=DELIVERY_STAGES.index("delivered"), eta=at, updated_at=at)
            if at.date() >= h.last_delivery:
                h.last_delivery = at.date()
                h.last_truck_id = truck_id
        c = Completion(event_id=event_id, household_id=household_id, zone=h.zone, truck_id=truck_id,
            service=service, service_type=service_type, at=at, completed_at=at, run_id=run)
        self.completions.append(c)
        return c


state = State()
