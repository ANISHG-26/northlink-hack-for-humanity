"""Prioritise items needing staff attention — pure functions, no I/O.

Each item gets a base score by kind, plus boosts for vulnerable households and
for being part of an illness signal. Higher score = look at it sooner.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

Kind = Literal[
    "sewage_full", "out_of_water", "clean_water_low", "illness", "water_quality", "possible_leak", "tank_damage", "other"
]

BASE_SCORE: dict[str, int] = {
    "sewage_full": 90,  # red light on: the home cannot use water at all
    "out_of_water": 88,
    "clean_water_low": 75,
    "illness": 70,
    "water_quality": 65,
    "possible_leak": 60,
    "tank_damage": 55,
    "other": 30,
}
VULNERABLE_BOOST = 10
SIGNAL_BOOST = 10  # household is part of an illness signal under staff review

WHY: dict[str, str] = {
    "sewage_full": "Wastewater tank full: the home cannot use water until pickup",
    "out_of_water": "Clean water tank is empty or nearly empty",
    "clean_water_low": "Resident reports clean water is low",
    "illness": "Stomach illness reported in the home",
    "water_quality": "Resident reports water looks, smells, or tastes wrong",
    "possible_leak": "Tank sensor shows a sudden or overnight loss",
    "tank_damage": "Tank or plumbing damage reported",
    "other": "Other problem reported",
}
VULNERABLE_WHY = {"elder": "elder in home", "infant": "infant in home", "medical": "medical needs in home"}


@dataclass(frozen=True)
class AttentionInput:
    id: str
    kind: Kind
    household_id: str
    zone: str
    at: datetime
    vulnerable_type: str | None = None
    in_signal: bool = False
    detail: str | None = None


@dataclass(frozen=True)
class AttentionItem:
    id: str
    kind: Kind
    household_id: str
    zone: str
    at: datetime
    score: int
    priority: Literal["urgent", "soon", "ok"]
    why: str
    detail: str | None


def score(item: AttentionInput) -> int:
    s = BASE_SCORE[item.kind]
    if item.vulnerable_type:
        s += VULNERABLE_BOOST
    if item.in_signal:
        s += SIGNAL_BOOST
    return s


def why(item: AttentionInput) -> str:
    parts = [WHY[item.kind]]
    if item.vulnerable_type:
        parts.append(VULNERABLE_WHY.get(item.vulnerable_type, "vulnerable household"))
    if item.in_signal:
        parts.append(f"part of an illness signal in Zone {item.zone}")
    return "; ".join(parts)


def prioritise(items: list[AttentionInput]) -> list[AttentionItem]:
    out = []
    for it in items:
        s = score(it)
        out.append(
            AttentionItem(
                it.id, it.kind, it.household_id, it.zone, it.at, s,
                "urgent" if s >= 85 else "soon" if s >= 60 else "ok",
                why(it), it.detail,
            )
        )
    # Highest score first; newest first among equals.
    return sorted(out, key=lambda a: (-a.score, -a.at.timestamp()))
