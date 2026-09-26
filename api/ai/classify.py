"""Free-text problem report classifier — pure functions, no paid API.

A transparent keyword/phrase matcher in English and French. Every category has
a list of phrases with weights; the category with the highest total wins, and
we return the phrases that matched so residents and staff can see why.
The resident always confirms (or changes) the category before it is saved.
"""
import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

Category = Literal["clean_water_low", "sewage_full", "water_quality", "tank_damage", "illness", "other"]

# (phrase, weight). Phrases are matched on accent-free, lower-case text at word boundaries.
# Longer, more specific phrases carry more weight.
RULES: dict[str, list[tuple[str, float]]] = {
    "sewage_full": [
        ("red light", 3), ("light is red", 3), ("cannot flush", 3), ("can't flush", 3), ("cant flush", 3),
        ("won't flush", 3), ("toilet won't", 2), ("toilet", 1), ("sewage", 3), ("wastewater", 3),
        ("waste water", 3), ("septic", 2), ("drain", 1.5), ("not draining", 3), ("backing up", 3),
        ("overflow", 2), ("smells like sewage", 3),
        # French
        ("lumiere rouge", 3), ("voyant rouge", 3), ("egout", 3), ("eaux usees", 3), ("toilette", 1),
        ("chasse", 2), ("ne se vide pas", 3), ("refoule", 3), ("deborde", 2),
    ],
    "clean_water_low": [
        ("no water", 3), ("out of water", 3), ("ran out", 3), ("running out", 3), ("tank is empty", 3),
        ("tank empty", 3), ("empty tank", 3), ("water is low", 3), ("low water", 3), ("almost empty", 3),
        ("need water", 2), ("need a delivery", 3), ("no delivery", 2), ("low pressure", 1.5), ("nothing comes out", 3),
        # French
        ("plus d'eau", 3), ("pas d'eau", 3), ("manque d'eau", 3), ("reservoir vide", 3), ("presque vide", 3),
        ("besoin d'eau", 2), ("livraison", 1.5),
    ],
    "water_quality": [
        ("tastes", 2), ("taste", 2), ("smells", 1.5), ("smell", 1.5), ("chlorine", 2), ("cloudy", 3),
        ("dirty", 2.5), ("brown", 2.5), ("yellow", 2), ("colour", 1.5), ("color", 1.5), ("particles", 2.5),
        ("bits in", 2), ("strange", 1), ("funny", 1), ("weird", 1),
        # French
        ("gout", 2), ("odeur", 1.5), ("chlore", 2), ("trouble", 2.5), ("sale", 2), ("brune", 2.5), ("couleur", 1.5),
    ],
    "tank_damage": [
        ("leak", 3), ("leaking", 3), ("crack", 3), ("cracked", 3), ("broken", 2), ("frozen", 2.5),
        ("pipe burst", 3), ("burst", 2.5), ("hole", 2), ("damaged", 2.5), ("valve", 1.5), ("heater", 1.5),
        ("dripping", 2), ("puddle", 2),
        # French
        ("fuite", 3), ("fissure", 3), ("brise", 2), ("gele", 2.5), ("trou", 2), ("endommage", 2.5), ("valve", 1.5),
    ],
    "illness": [
        ("sick", 3), ("ill", 2), ("diarrhea", 3), ("diarrhoea", 3), ("vomit", 3), ("vomiting", 3), ("throwing up", 3),
        ("stomach", 2.5), ("fever", 2), ("cramps", 2), ("nausea", 2.5),
        # French
        ("malade", 3), ("diarrhee", 3), ("vomi", 3), ("vomissement", 3), ("ventre", 2), ("estomac", 2.5),
        ("fievre", 2), ("nausee", 2.5), ("gastro", 3),
    ],
}

# Confidence: share of the winning score, scaled by how much evidence there is.
STRONG_SCORE = 5.0


@dataclass(frozen=True)
class Classification:
    category: Category
    confidence: float  # 0..1
    matched: list[str]
    scores: dict[str, float]


def normalize(text: str) -> str:
    """Lower-case, strip accents, straighten apostrophes, collapse spaces."""
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", text).strip()


def _matches(phrase: str, text: str) -> bool:
    return re.search(rf"(?<![\w']){re.escape(phrase)}(?![\w'])", text) is not None


def classify(text: str) -> Classification:
    t = normalize(text)
    scores: dict[str, float] = {}
    hits: dict[str, list[str]] = {}
    for cat, rules in RULES.items():
        for phrase, weight in rules:
            if _matches(phrase, t):
                scores[cat] = scores.get(cat, 0.0) + weight
                hits.setdefault(cat, []).append(phrase)

    if not scores:
        return Classification("other", 0.0, [], {})

    best = max(scores, key=lambda c: scores[c])
    total = sum(scores.values())
    share = scores[best] / total
    evidence = min(scores[best] / STRONG_SCORE, 1.0)
    confidence = round(share * (0.5 + 0.5 * evidence), 2)
    return Classification(best, confidence, hits[best], {k: round(v, 1) for k, v in scores.items()})  # type: ignore[arg-type]
