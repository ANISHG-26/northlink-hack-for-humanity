from api.ai.routing import StopInput, priority_score, rank_stops


def stop(hid, hours, vulnerable=None, advisory=None, service="water", litres=500):
    return StopInput(hid, "C", hours, litres, 1000, vulnerable, advisory, service)


def test_ranks_by_hours_until_empty():
    ranked = rank_stops([stop("A-01", 40), stop("A-02", 5), stop("A-03", 20)], 9000)
    assert [s.household_id for s in ranked] == ["A-02", "A-03", "A-01"]
    assert ranked[0].urgency == "urgent"


def test_vulnerable_and_advisory_raise_priority():
    plain = stop("A-01", 18)
    elder = stop("A-02", 24, vulnerable="elder", advisory="boil")
    assert priority_score(elder) < priority_score(plain)
    ranked = rank_stops([plain, elder], 9000)
    assert ranked[0].household_id == "A-02"
    assert "elder in home" in ranked[0].reason
    assert "boil-water advisory" in ranked[0].reason


def test_full_sewage_tank_goes_first_and_ignores_water_load():
    ranked = rank_stops([stop("A-01", 3), stop("A-02", 0, service="sewage", litres=0)], truck_capacity_l=100)
    assert ranked[0].household_id == "A-02"
    assert ranked[0].service == "sewage"
    assert "red light" in ranked[0].reason
    assert ranked[0].fits_in_load  # sewage doesn't use the water load


def test_marks_stops_beyond_truck_load():
    ranked = rank_stops([stop("A-01", 1, litres=0), stop("A-02", 2, litres=0)], truck_capacity_l=1500)
    assert ranked[0].fits_in_load and not ranked[1].fits_in_load
