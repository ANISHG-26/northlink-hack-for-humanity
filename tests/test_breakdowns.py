import pytest

from api import breakdowns as B
from api.state import state


@pytest.fixture(autouse=True)
def fresh_state():
    state.__init__()
    yield
    state.__init__()


def test_seed_has_fixed_example_with_downtime_and_open_truck_out_of_service():
    res = B.list_breakdowns()
    fixed = next(b for b in res.breakdowns if b.status == "fixed")
    assert fixed.downtime_minutes == 6 * 60  # opened 4d3h ago, fixed 3d21h ago
    assert state.trucks["T3"].status == "maintenance"
    assert res.trucks_in_service == 2


def test_breakdown_removes_truck_from_coverage_and_fix_restores_it():
    b = B.report_breakdown(B.BreakdownIn(truck_id="2", part_id="P3", symptom="Coupling cracked"))
    assert b.cause == "unknown" and not b.cause_confirmed
    assert state.trucks["T2"].status == "maintenance"
    assert B.list_breakdowns().trucks_in_service == 1

    fixed = B.update_status(b.id, B.StatusUpdate(status="fixed"))
    assert fixed.fixed_at is not None and fixed.downtime_minutes is not None
    assert state.trucks["T2"].status == "in_service"


def test_unknown_cause_cannot_be_marked_confirmed():
    b = B.report_breakdown(B.BreakdownIn(truck_id="T1", symptom="Pump noise"))
    out = B.update_status(b.id, B.StatusUpdate(status="in_repair", cause_confirmed=True))
    assert out.cause == "unknown" and out.cause_confirmed is False


def test_part_stock_and_reorder_need_are_attached():
    b = B.list_breakdowns().breakdowns
    pump = next(x for x in b if x.part_id == "P1")
    assert pump.part_name == "Truck water pump"
    assert pump.stock_on_hand == 1
    assert pump.reorder_needed is True  # pump won't last to the following sealift
