"""Manual water quality checkpoints at the source and household drop point (#8).

A record-and-review workflow, NOT safety certification: readings are
logged against a truck run, shown side by side (source vs drop point), and
anything missing or unreviewed is flagged for staff. There is no automatic
pass/fail or advisory. Parameters, methods and thresholds stay unspecified
until the local authority confirms them.

Seeded sample readings only. Demo state lives in process memory (see #9).
"""
from datetime import datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from api.state import TZ, now, state

Checkpoint = Literal["source", "drop_point"]
ReviewStatus = Literal["unreviewed", "reviewed", "needs_follow_up"]

# Same demo PIN as advisories in api/index.py. DEMO ONLY.
STAFF_DEMO_PIN = "1234"
THRESHOLDS_NOTE = "Thresholds and methods to be confirmed by the local authority. Northlink does not pass or fail water."

router = APIRouter()


class WaterCheckIn(BaseModel):
    checkpoint: Checkpoint
    run_id: str
    household_id: str | None = None  # required for drop_point
    sampled_at: datetime | None = None
    collector: str  # a role, e.g. "Community Water Monitor" — no personal names in the demo
    parameter: str  # e.g. "Free chlorine"
    value: float | None = None
    units: str | None = None
    method: str | None = None
    note: str | None = None


class WaterCheck(WaterCheckIn):
    id: str
    truck_id: str
    sampled_at: datetime
    review_status: ReviewStatus


class ReviewIn(BaseModel):
    status: ReviewStatus


class DropPoint(BaseModel):
    household_id: str
    checks: list[WaterCheck]
    missing: bool


class RunSummary(BaseModel):
    run_id: str
    truck_id: str
    date: str
    source: list[WaterCheck]
    drop_points: list[DropPoint]
    missing_source: bool
    missing_drop_points: list[str]
    unreviewed: int
    needs_review: bool


class WaterChecksResponse(BaseModel):
    runs: list[RunSummary]
    thresholds_note: str


# --- demo state ---------------------------------------------------------------------


def _data() -> dict:
    """Runs and checks, re-seeded whenever the demo state is reset."""
    if getattr(state, "_water_checks_for", None) is not state.seed:
        today = now().date()
        yday = today - timedelta(days=1)
        at = lambda d, h, m=0: datetime.combine(d, time(h, m), TZ)  # noqa: E731
        runs = {
            f"RUN-{today:%m%d}-T2": dict(truck_id="T2", date=today, drop_points=["C-12", "C-21", "D-01"]),
            f"RUN-{yday:%m%d}-T1": dict(truck_id="T1", date=yday, drop_points=["A-07", "B-13"]),
        }
        r_today, r_yday = list(runs)
        common = dict(collector="Community Water Monitor", parameter="Free chlorine", units="mg/L", method="Test kit (sample)")
        checks = [
            dict(id="WC-1", run_id=r_today, checkpoint="source", household_id=None, sampled_at=at(today, 8, 10), value=0.8, review_status="reviewed", **common),
            dict(id="WC-2", run_id=r_today, checkpoint="drop_point", household_id="C-12", sampled_at=at(today, 10, 40), value=0.3, review_status="unreviewed", **common),
            dict(id="WC-3", run_id=r_today, checkpoint="drop_point", household_id="D-01", sampled_at=at(today, 11, 15), value=0.6, review_status="reviewed", **common),
            dict(id="WC-4", run_id=r_yday, checkpoint="source", household_id=None, sampled_at=at(yday, 8, 5), value=0.9, review_status="reviewed", **common),
            dict(id="WC-5", run_id=r_yday, checkpoint="drop_point", household_id="A-07", sampled_at=at(yday, 9, 50), value=0.7, review_status="reviewed", **common),
            dict(id="WC-6", run_id=r_yday, checkpoint="drop_point", household_id="B-13", sampled_at=at(yday, 10, 30), value=0.6, review_status="reviewed", **common),
        ]
        for c in checks:
            c["truck_id"] = runs[c["run_id"]]["truck_id"]
            c.setdefault("note", None)
        state._water_checks_for = state.seed  # type: ignore[attr-defined]
        state._water_checks = {"runs": runs, "checks": checks}  # type: ignore[attr-defined]
    return state._water_checks  # type: ignore[attr-defined]


def summarize(run_id: str, run: dict, checks: list[dict]) -> RunSummary:
    mine = [WaterCheck(**c) for c in checks if c["run_id"] == run_id]
    source = [c for c in mine if c.checkpoint == "source"]
    drops = []
    for hid in run["drop_points"]:
        hc = [c for c in mine if c.checkpoint == "drop_point" and c.household_id == hid]
        drops.append(DropPoint(household_id=hid, checks=hc, missing=not hc))
    missing = [d.household_id for d in drops if d.missing]
    unreviewed = sum(1 for c in mine if c.review_status != "reviewed")
    return RunSummary(
        run_id=run_id,
        truck_id=run["truck_id"],
        date=run["date"].isoformat(),
        source=source,
        drop_points=drops,
        missing_source=not source,
        missing_drop_points=missing,
        unreviewed=unreviewed,
        needs_review=bool(missing or not source or unreviewed),
    )


def list_runs() -> WaterChecksResponse:
    d = _data()
    runs = [summarize(rid, run, d["checks"]) for rid, run in d["runs"].items()]
    runs.sort(key=lambda r: r.date, reverse=True)
    return WaterChecksResponse(runs=runs, thresholds_note=THRESHOLDS_NOTE)


def log_check(body: WaterCheckIn) -> WaterCheck:
    d = _data()
    run = d["runs"].get(body.run_id)
    if not run:
        raise HTTPException(404, f"Run {body.run_id} not found")
    if body.checkpoint == "drop_point":
        if not body.household_id:
            raise HTTPException(422, "Drop-point checks need a household code")
        if body.household_id.upper() not in state.households:
            raise HTTPException(404, f"Household {body.household_id} not found")
    c = body.model_dump()
    c.update(
        id=f"WC-{len(d['checks']) + 1}",
        truck_id=run["truck_id"],
        household_id=body.household_id.upper() if body.household_id else None,
        sampled_at=body.sampled_at or now(),
        review_status="unreviewed",
    )
    if c["household_id"] and c["household_id"] not in run["drop_points"]:
        run["drop_points"].append(c["household_id"])
    d["checks"].append(c)
    return WaterCheck(**c)


def review_check(check_id: str, status: ReviewStatus) -> WaterCheck:
    c = next((x for x in _data()["checks"] if x["id"] == check_id), None)
    if not c:
        raise HTTPException(404, f"Check {check_id} not found")
    c["review_status"] = status
    return WaterCheck(**c)


@router.get("/api/water-checks", response_model=WaterChecksResponse)
def get_water_checks() -> WaterChecksResponse:
    return list_runs()


@router.post("/api/water-checks", response_model=WaterCheck, status_code=201)
def post_water_check(body: WaterCheckIn) -> WaterCheck:
    return log_check(body)


@router.post("/api/water-checks/{check_id}/review", response_model=WaterCheck)
def post_review(check_id: str, body: ReviewIn, x_staff_pin: str | None = Header(default=None)) -> WaterCheck:
    """Staff only (demo PIN)."""
    if x_staff_pin != STAFF_DEMO_PIN:
        raise HTTPException(403, "Staff mode required")
    return review_check(check_id, body.status)
