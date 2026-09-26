from datetime import datetime, timedelta

import pytest

from api.ai.sensing import (
    Sample,
    detect_leak,
    detect_overnight_loss,
    detect_sudden_drop,
    ema,
    median_filter,
    smooth,
    to_litres_series,
    weight_to_litres,
)

T0 = datetime(2026, 9, 26, 12, 0)


def series(values, step_min=15, start=T0):
    return [Sample(start + timedelta(minutes=step_min * i), v) for i, v in enumerate(values)]


class TestWeightToLitres:
    def test_one_kg_per_litre(self):
        assert weight_to_litres(615.0, 95.0) == pytest.approx(520.0)

    def test_never_negative(self):
        assert weight_to_litres(90.0, 95.0) == 0.0

    def test_clamped_to_capacity(self):
        assert weight_to_litres(1200.0, 95.0, capacity_l=1000) == 1000


class TestSmoothing:
    def test_median_filter_removes_single_spike(self):
        values = [500, 500, 525, 500, 500]  # someone leaned on the tank
        assert median_filter(values, 5)[2] == 500

    def test_ema_follows_trend_but_damps_jitter(self):
        out = ema([500, 510, 490, 505, 495], alpha=0.3)
        assert max(out) - min(out) < 10  # raw range is 20

    def test_smooth_keeps_length(self):
        assert len(smooth([1.0, 2.0, 3.0, 4.0])) == 4

    def test_to_litres_series_converts_and_smooths(self):
        raw = series([615, 616, 614, 640, 615])  # one spike
        litres = to_litres_series(raw, empty_tank_kg=95)
        assert all(abs(s.value - 520) < 6 for s in litres)


class TestLeakDetection:
    def test_normal_use_is_not_a_leak(self):
        # ~10 L per 15 minutes during the day
        s = series([600 - 10 * i for i in range(12)])
        assert detect_leak(s) is None

    def test_sudden_drop_is_flagged(self):
        s = series([600, 598, 596, 450, 400, 398])  # ~200 L gone in 30 min
        leak = detect_sudden_drop(s)
        assert leak is not None
        assert leak.kind == "sudden_drop"
        assert leak.litres_lost >= 190

    def test_overnight_loss_is_flagged(self):
        night = datetime(2026, 9, 26, 1, 0)
        s = series([700 - 15 * i for i in range(17)], start=night)  # 60 L/h from 1 am to 5 am
        leak = detect_overnight_loss(s)
        assert leak is not None and leak.kind == "overnight_loss"
        assert leak.rate_l_per_h == pytest.approx(60, rel=0.05)

    def test_quiet_night_is_not_a_leak(self):
        night = datetime(2026, 9, 26, 1, 0)
        s = series([700 - 0.5 * i for i in range(17)], start=night)
        assert detect_overnight_loss(s) is None
