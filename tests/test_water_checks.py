import pytest
from fastapi import HTTPException

from api import water_checks as W
from api.state import state


@pytest.fixture(autouse=True)
def fresh_state():
    state.__init__()
    yield
    state.__init__()


def todays_run():
    return W.list_runs().runs[0]


def test_seeded_run_flags_missing_and_unreviewed_drop_points():
    run = todays_run()
    assert not run.missing_source
    assert run.missing_drop_points == ["C-21"]
    assert run.unreviewed == 1  # C-12 reading not yet reviewed
    assert run.needs_review


def test_complete_reviewed_run_needs_no_review():
    yesterday = W.list_runs().runs[1]
    assert not yesterday.needs_review


def test_logging_and_reviewing_clears_the_flags():
    run = todays_run()
    W.log_check(W.WaterCheckIn(checkpoint="drop_point", run_id=run.run_id, household_id="c-21",
                               collector="Community Water Monitor", parameter="Free chlorine", value=0.5, units="mg/L"))
    after_log = todays_run()
    assert after_log.missing_drop_points == []
    assert after_log.unreviewed == 2  # new readings start unreviewed

    for dp in after_log.drop_points:
        for c in dp.checks:
            W.review_check(c.id, "reviewed")
    assert not todays_run().needs_review


def test_no_automatic_pass_fail_and_drop_point_needs_household():
    assert "does not pass or fail" in W.list_runs().thresholds_note
    with pytest.raises(HTTPException):
        W.log_check(W.WaterCheckIn(checkpoint="drop_point", run_id=todays_run().run_id,
                                   collector="Community Water Monitor", parameter="Free chlorine"))
