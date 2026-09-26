from datetime import datetime, timedelta

import pytest

from api.ai.forecast import Reading, forecast, forecast_sewage

NOW = datetime(2026, 9, 26, 12, 0)


def test_household_size_baseline_when_no_history():
    f = forecast(4, 1000, [Reading(NOW, 500)], NOW)
    assert f.daily_use_l == 100  # 4 people x 25 L
    assert f.days_left == pytest.approx(5.0)
    assert f.confidence == "low"
    assert f.method == "household_size"


def test_recent_readings_adjust_the_estimate():
    readings = [Reading(NOW - timedelta(days=3), 1000), Reading(NOW - timedelta(days=1.5), 700), Reading(NOW, 400)]
    f = forecast(4, 1000, readings, NOW)
    assert f.method == "blended"
    assert f.daily_use_l > 100  # observed 200 L/day pulls the estimate up
    assert f.confidence == "high"


def test_refill_restarts_the_curve_but_noise_does_not():
    readings = [
        Reading(NOW - timedelta(days=4), 900),
        Reading(NOW - timedelta(days=2), 100),
        Reading(NOW - timedelta(days=1), 1000),  # refill
        Reading(NOW - timedelta(hours=12), 940),
        Reading(NOW - timedelta(hours=11), 945),  # +5 L sensor noise, not a refill
        Reading(NOW, 880),
    ]
    f = forecast(4, 1000, readings, NOW)
    # Uses only post-refill data (~120 L/day), not the steep 400 L/day before it.
    assert f.daily_use_l < 200


def test_sewage_fills_from_water_use_and_flags_full():
    s = forecast_sewage(1000, 800, NOW, daily_water_use_l=100, now=NOW)
    assert s.days_until_full == pytest.approx((950 - 800) / 95, abs=0.1)
    assert not s.is_full
    full = forecast_sewage(1000, 900, NOW - timedelta(days=1), daily_water_use_l=100, now=NOW)
    assert full.is_full
