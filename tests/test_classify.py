import pytest

from api.ai.classify import classify, normalize


def test_red_light_example_is_sewage_full():
    result = classify("the red light is on and we cannot flush")
    assert result.category == "sewage_full"
    assert "red light" in result.matched
    assert "cannot flush" in result.matched
    assert result.confidence >= 0.8


def test_chlorine_taste_is_water_quality():
    result = classify("water tastes like chlorine")
    assert result.category == "water_quality"
    assert "chlorine" in result.matched


@pytest.mark.parametrize(
    "text,expected",
    [
        ("We ran out of water this morning", "clean_water_low"),
        ("the tank is leaking under the house", "tank_damage"),
        ("my kids have diarrhea and are throwing up", "illness"),
        ("Le voyant rouge est allumé, la toilette ne se vide pas", "sewage_full"),
        ("L'eau a un goût de chlore", "water_quality"),
        ("Il n'y a plus d'eau, le réservoir est presque vide", "clean_water_low"),
        ("Mon enfant est malade avec la diarrhée", "illness"),
    ],
)
def test_english_and_french(text, expected):
    assert classify(text).category == expected


def test_unknown_text_is_other_with_zero_confidence():
    result = classify("hello, can someone call me back?")
    assert result.category == "other"
    assert result.confidence == 0
    assert result.matched == []


def test_word_boundaries_avoid_false_matches():
    # "ill" must not match inside "will"; "sale" in French, not a sale.
    assert classify("we will be home").category == "other"


def test_normalize_strips_accents_and_apostrophes():
    assert normalize("L’Eau  Usée") == "l'eau usee"
