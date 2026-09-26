"""Tank level forecasting (pure functions). TODO: implement."""
from api.models import Household

LITRES_PER_PERSON_PER_DAY = 25.0


def days_until_empty(h: Household, lpcd: float = LITRES_PER_PERSON_PER_DAY) -> float:
    """Estimated days until the household tank runs dry."""
    daily = max(h.household_size * lpcd, 1.0)
    return h.current_level_l / daily
