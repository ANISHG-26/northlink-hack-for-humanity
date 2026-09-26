from datetime import date, timedelta

from api.ai.outbreak import IllnessCase, QualityComplaint, detect_outbreaks

TODAY = date(2026, 9, 26)  # a Saturday
TUESDAY = date(2026, 9, 22)
BASELINE = {"A": 0.6, "C": 0.7}


def case(hid, zone, days_ago, truck="T2", delivered=TUESDAY):
    return IllnessCase(hid, zone, TODAY - timedelta(days=days_ago), truck, delivered)


def zone_c_cluster():
    return [
        case("C-05", "C", 1),
        case("C-14", "C", 1),
        case("C-21", "C", 2),
        case("C-26", "C", 2),
        case("C-32", "C", 3, delivered=date(2026, 9, 20)),
    ]


def test_zone_c_cluster_is_flagged_with_shared_truck_and_day():
    alerts = detect_outbreaks(zone_c_cluster(), [], BASELINE, TODAY, {"T2": "Truck 2"})
    assert len(alerts) == 1
    a = alerts[0]
    assert a.zone == "C" and a.count == 5 and a.span_days == 3
    assert a.shared.kind == "truck_and_day" and a.shared.matching == 4 and a.shared.weekday == "Tuesday"
    assert a.summary.startswith("5 stomach illness reports in Zone C in 3 days. 4 of these homes got water from Truck 2 on Tuesday.")


def test_ai_suggests_review_and_never_issues_advisory():
    a = detect_outbreaks(zone_c_cluster(), [], BASELINE, TODAY, {"T2": "Truck 2"})[0]
    assert a.recommended_action.startswith("Suggested for staff review")
    assert "regional health board" in a.recommended_action
    assert any("not a diagnosis" in line for line in a.how_detected)


def test_below_threshold_is_not_flagged():
    cases = [case("A-02", "A", 1, "T1"), case("A-07", "A", 3, "T1")]  # 2 reports < 3 minimum
    assert detect_outbreaks(cases, [], BASELINE, TODAY) == []


def test_old_reports_fall_out_of_window_and_complaints_counted():
    old = [case(f"C-{i}", "C", 10 + i) for i in range(5)]
    assert detect_outbreaks(old, [], BASELINE, TODAY) == []
    complaints = [QualityComplaint("C-21", "C", TODAY - timedelta(days=2))]
    a = detect_outbreaks(zone_c_cluster(), complaints, BASELINE, TODAY)[0]
    assert a.water_quality_reports == 1
