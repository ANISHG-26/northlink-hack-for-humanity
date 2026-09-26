from datetime import date, timedelta

from api.ai.supply import PartStock, plan_part, plan_supply

TODAY = date(2026, 9, 26)
NEXT = TODAY + timedelta(days=42)
FOLLOWING = NEXT + timedelta(days=365)


def plan(on_hand, monthly):
    return plan_part(PartStock("P", "Part", "unit", on_hand, monthly), TODAY, NEXT, FOLLOWING)


def test_runs_out_before_next_sealift_is_critical_with_air_freight():
    p = plan(on_hand=1, monthly=1.2)  # < 1 month left, sealift in 42 days
    assert p.status == "critical"
    assert p.air_freight_qty >= 1
    assert p.sealift_qty > 0


def test_wont_last_until_following_sealift_goes_on_order():
    p = plan(on_hand=6, monthly=1.0)
    assert p.status == "order"
    assert p.air_freight_qty == 0
    # 12 months x 1.0 x 1.25 buffer = 15, minus ~4.6 left when the ship arrives
    assert p.sealift_qty == 11


def test_plenty_of_stock_is_ok_and_sorted_last():
    plans = plan_supply(
        [PartStock("A", "Filters", "f", 30, 2.0), PartStock("B", "Kits", "k", 1, 1.2)], TODAY, NEXT, FOLLOWING
    )
    assert [p.id for p in plans] == ["B", "A"]
    assert plans[1].status == "ok" and plans[1].sealift_qty == 0
