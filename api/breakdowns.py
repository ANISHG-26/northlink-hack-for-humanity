"""Truck breakdowns and repair parts (#7).

Records a breakdown (truck, affected part, observed symptom, cause category,
opened/fixed times, repair status) and ties it to parts stock and coverage:
a truck with an open repair is out of service; fixing its last open repair
returns it to service. Causes stay "unknown" unless staff confirm them;
a guessed cause is never shown as a confirmed diagnosis.

Demo state lives in process memory like the rest of the API (see #9).
"""
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.ai.supply import PartStock, plan_part
from api.state import now, state

Cause = Literal["unknown", "wear", "freezing", "damage", "electrical", "other"]
RepairStatus = Literal["open", "waiting_parts", "in_repair", "fixed"]

router = APIRouter()


class BreakdownIn(BaseModel):
    truck_id: str
    part_id: str | None = None
    symptom: str
    cause: Cause = "unknown"


class StatusUpdate(BaseModel):
    status: RepairStatus
    cause: Cause | None = None
    cause_confirmed: bool | None = None


class Breakdown(BaseModel):
    id: str
    truck_id: str
    truck_name: str
    part_id: str | None
    part_name: str | None
    symptom: str
    cause: Cause
    cause_confirmed: bool
    status: RepairStatus
    opened_at: datetime
    fixed_at: datetime | None
    # Time from incident to restored service; only once fixed.
    downtime_minutes: int | None
    stock_on_hand: int | None
    reorder_needed: bool | None


class TruckStatus(BaseModel):
    id: str
    name: str
    status: Literal["in_service", "maintenance", "out_of_service"]


class BreakdownsResponse(BaseModel):
    breakdowns: list[Breakdown]
    trucks: list[TruckStatus]
    trucks_in_service: int
    trucks_total: int


# --- demo state ---------------------------------------------------------------------


def _records() -> list[dict]:
    """Breakdown records, re-seeded whenever the demo state is reset."""
    if getattr(state, "_breakdowns_for", None) is not state.seed:
        t = now()
        state._breakdowns_for = state.seed  # type: ignore[attr-defined]
        state._breakdowns = [  # type: ignore[attr-defined]
            # Fixed example: shows time from incident to restored service.
            dict(id="BR-1", truck_id="T1", part_id="P3", symptom="Hose coupling leaking at the delivery nozzle",
                 cause="wear", cause_confirmed=True, status="fixed",
                 opened_at=t - timedelta(days=4, hours=3), fixed_at=t - timedelta(days=3, hours=21)),
            # Open example: Truck 3 is out of service, cause not yet known.
            dict(id="BR-2", truck_id="T3", part_id="P1", symptom="Water pump losing pressure during delivery",
                 cause="unknown", cause_confirmed=False, status="waiting_parts",
                 opened_at=t - timedelta(days=1, hours=5), fixed_at=None),
        ]
        _sync_truck_status()
    return state._breakdowns  # type: ignore[attr-defined]


def _sync_truck_status() -> None:
    """A truck with any unfixed breakdown is out of coverage; otherwise it is in service."""
    open_trucks = {r["truck_id"] for r in state._breakdowns if r["status"] != "fixed"}  # type: ignore[attr-defined]
    for tid, truck in state.trucks.items():
        truck.status = "maintenance" if tid in open_trucks else "in_service"


def _part_info(part_id: str | None) -> tuple[str | None, int | None, bool | None]:
    part = next((p for p in state.seed.parts if p.id == part_id), None)
    if not part:
        return None, None, None
    today = now().date()
    nxt = today + timedelta(days=42)  # matches the sealift plan in index.py
    plan = plan_part(PartStock(part.id, part.name, part.unit, part.on_hand, part.monthly_use), today, nxt, nxt + timedelta(days=365))
    return part.name, part.on_hand, plan.status != "ok"


def _out(r: dict) -> Breakdown:
    name, stock, reorder = _part_info(r["part_id"])
    downtime = int((r["fixed_at"] - r["opened_at"]).total_seconds() // 60) if r["fixed_at"] else None
    return Breakdown(
        **r,
        truck_name=state.trucks[r["truck_id"]].name,
        part_name=name,
        downtime_minutes=downtime,
        stock_on_hand=stock,
        reorder_needed=reorder,
    )


def list_breakdowns() -> BreakdownsResponse:
    records = _records()
    trucks = [TruckStatus(id=t.id, name=t.name, status=t.status) for t in state.trucks.values()]
    return BreakdownsResponse(
        breakdowns=[_out(r) for r in sorted(records, key=lambda r: r["opened_at"], reverse=True)],
        trucks=trucks,
        trucks_in_service=sum(1 for t in trucks if t.status == "in_service"),
        trucks_total=len(trucks),
    )


def report_breakdown(body: BreakdownIn) -> Breakdown:
    records = _records()
    tid = body.truck_id.upper() if body.truck_id.upper().startswith("T") else f"T{body.truck_id}"
    if tid not in state.trucks:
        raise HTTPException(404, f"Truck {body.truck_id} not found")
    if body.part_id and not any(p.id == body.part_id for p in state.seed.parts):
        raise HTTPException(404, f"Part {body.part_id} not found")
    r = dict(
        id=f"BR-{len(records) + 1}", truck_id=tid, part_id=body.part_id, symptom=body.symptom.strip(),
        cause=body.cause, cause_confirmed=False, status="open", opened_at=now(), fixed_at=None,
    )
    records.append(r)
    _sync_truck_status()
    return _out(r)


def update_status(breakdown_id: str, body: StatusUpdate) -> Breakdown:
    r = next((x for x in _records() if x["id"] == breakdown_id), None)
    if not r:
        raise HTTPException(404, f"Breakdown {breakdown_id} not found")
    r["status"] = body.status
    r["fixed_at"] = now() if body.status == "fixed" else None
    if body.cause is not None:
        r["cause"] = body.cause
    if body.cause_confirmed is not None:
        # An unknown cause can never be "confirmed".
        r["cause_confirmed"] = body.cause_confirmed and r["cause"] != "unknown"
    _sync_truck_status()
    return _out(r)


@router.get("/api/breakdowns", response_model=BreakdownsResponse)
def get_breakdowns() -> BreakdownsResponse:
    return list_breakdowns()


@router.post("/api/breakdowns", response_model=Breakdown, status_code=201)
def post_breakdown(body: BreakdownIn) -> Breakdown:
    return report_breakdown(body)


@router.post("/api/breakdowns/{breakdown_id}/status", response_model=Breakdown)
def post_status(breakdown_id: str, body: StatusUpdate) -> Breakdown:
    return update_status(breakdown_id, body)
