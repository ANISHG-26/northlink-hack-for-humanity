from datetime import datetime

from api.ai.triage import AttentionInput, prioritise

T = datetime(2026, 9, 26, 12, 0)


def test_full_sewage_outranks_other_problems():
    items = prioritise([
        AttentionInput("1", "water_quality", "A-01", "A", T),
        AttentionInput("2", "sewage_full", "B-01", "B", T),
        AttentionInput("3", "other", "C-01", "C", T),
    ])
    assert [i.kind for i in items] == ["sewage_full", "water_quality", "other"]
    assert items[0].priority == "urgent"


def test_vulnerable_and_signal_boost_priority_and_explain_why():
    item = prioritise([AttentionInput("1", "illness", "C-05", "C", T, "infant", True)])[0]
    assert item.score == 90
    assert "infant in home" in item.why
    assert "illness signal in Zone C" in item.why
