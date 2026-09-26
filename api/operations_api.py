"""Staff-reviewed demo workflows for coverage, repairs, and water checkpoints."""
from fastapi import APIRouter, Depends, Header, HTTPException, Request

from api.models import (Breakdown, BreakdownIn, Operations, Part, ReadinessIn, RepairIn,
                        ReviewIn, StockIn, WaterCheck, WaterCheckIn)
from api.operations import operations
from api.state import now
from api.storage import state

router = APIRouter(prefix="/api")


def staff(x_staff_pin: str | None = Header(default=None)):
    if x_staff_pin != "1234":
        raise HTTPException(403, "Demo staff mode required")


def lookup(items, key, label):
    if key not in items:
        raise HTTPException(404, f"{label} not found")
    return items[key]


def part(key):
    return lookup({p.id: p for p in state.seed.parts}, key, "Part")


@router.get("/operations", response_model=Operations)
def read_operations(request: Request):
    return operations(state, request.app.state.store.mode)


@router.post("/operations/readiness", response_model=Operations, dependencies=[Depends(staff)])
def readiness(body: ReadinessIn, request: Request):
    for key in body.drivers:
        lookup(state.drivers, key, "Driver")
    for key, status in body.trucks.items():
        lookup(state.trucks, key, "Truck")
        if status == "in_service" and any(b.truck_id == key and b.status != "fixed" for b in state.breakdowns):
            raise HTTPException(409, "Finish open repairs before returning the truck to service")
    for key, status in body.drivers.items():
        state.drivers[key].status = status
    for key, status in body.trucks.items():
        state.trucks[key].status = status
    return operations(state, request.app.state.store.mode)


@router.get("/breakdowns", response_model=list[Breakdown])
def breakdowns():
    return [b.model_copy(update={"stock_quantity": part(b.part_id).on_hand}) for b in state.breakdowns]


@router.post("/breakdowns", response_model=Breakdown, status_code=201, dependencies=[Depends(staff)])
def create_breakdown(body: BreakdownIn):
    truck = lookup(state.trucks, body.truck_id, "Truck")
    stock = part(body.part_id)
    if body.opened_at > now():
        raise HTTPException(422, "Incident time cannot be in the future")
    for b in state.breakdowns:
        if b.event_id == body.event_id:
            if any(getattr(b, k) != v for k, v in body.model_dump().items()):
                raise HTTPException(409, "Event ID already belongs to another breakdown")
            return b
    b = Breakdown(**body.model_dump(), stock_quantity=stock.on_hand)
    state.breakdowns.append(b)
    truck.status = "maintenance"
    return b


@router.post("/breakdowns/{event_id}/repair", response_model=Breakdown, dependencies=[Depends(staff)])
def repair(event_id: str, body: RepairIn):
    b = lookup({b.event_id: b for b in state.breakdowns}, event_id, "Breakdown")
    stock = part(b.part_id)
    if b.status == "fixed":
        if body.status != "fixed" or body.parts_used != b.parts_used or (body.fixed_at and body.fixed_at != b.fixed_at):
            raise HTTPException(409, "Repair has already been closed")
        return b.model_copy(update={"stock_quantity": stock.on_hand})
    if body.status == "repairing":
        if body.parts_used or body.fixed_at:
            raise HTTPException(422, "Record parts used and fixed time when closing the repair")
        b.status = "repairing"
        return b
    fixed = body.fixed_at or now()
    if fixed < b.opened_at or fixed > now():
        raise HTTPException(422, "Fixed time must be between incident time and now")
    if body.parts_used > stock.on_hand:
        raise HTTPException(409, "Insufficient stock; update stock after receiving parts")
    stock.on_hand -= body.parts_used
    b.status, b.fixed_at, b.parts_used = "fixed", fixed, body.parts_used
    b.stock_quantity = stock.on_hand
    b.restoration_seconds = (fixed - b.opened_at).total_seconds()
    if not any(other.truck_id == b.truck_id and other.status != "fixed" for other in state.breakdowns):
        state.trucks[b.truck_id].status = "in_service"
    return b


@router.post("/parts/{part_id}/stock", response_model=Part, dependencies=[Depends(staff)])
def stock(part_id: str, body: StockIn):
    p = part(part_id)
    p.on_hand = body.on_hand
    return p


@router.get("/water-checks", response_model=list[WaterCheck])
def water_checks(truck_id: str | None = None, run_id: str | None = None):
    return [c for c in state.water_checks if (not truck_id or c.truck_id == truck_id) and (not run_id or c.run_id == run_id)]


@router.post("/water-checks", response_model=WaterCheck, status_code=201, dependencies=[Depends(staff)])
def create_water_check(body: WaterCheckIn):
    truck = lookup(state.trucks, body.truck_id, "Truck")
    if truck.service != "water":
        raise HTTPException(422, "Water checks require a water truck")
    if not body.run_id.startswith(body.truck_id + ":"):
        raise HTTPException(422, "Run must belong to the selected truck")
    if body.household_id:
        lookup(state.households, body.household_id, "Household")
    if body.sampled_at > now():
        raise HTTPException(422, "Sample time cannot be in the future")
    for check in state.water_checks:
        if check.event_id == body.event_id:
            if any(getattr(check, k) != v for k, v in body.model_dump().items()):
                raise HTTPException(409, "Event ID already belongs to another water check")
            return check
    check = WaterCheck(**body.model_dump())
    state.water_checks.append(check)
    return check


@router.post("/water-checks/{event_id}/review", response_model=WaterCheck, dependencies=[Depends(staff)])
def review_water_check(event_id: str, body: ReviewIn):
    check = lookup({c.event_id: c for c in state.water_checks}, event_id, "Water check")
    check.review_status, check.reviewed_by, check.reviewed_at = body.review_status, body.reviewed_by, now()
    return check
