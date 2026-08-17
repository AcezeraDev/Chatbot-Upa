from datetime import UTC, datetime

from .models import Upa


_UPAS = (
    {
        "id": "upa-centro",
        "name": "UPA Centro",
        "neighborhood": "Centro",
        "address": "Av. Principal, 120",
        "waitMinutes": 18,
        "patients": 7,
        "status": "low",
        "distanceKm": 2.1,
    },
    {
        "id": "upa-zona-norte",
        "name": "UPA Zona Norte",
        "neighborhood": "Jardim Norte",
        "address": "Rua das Flores, 890",
        "waitMinutes": 34,
        "patients": 14,
        "status": "moderate",
        "distanceKm": 4.7,
    },
    {
        "id": "upa-zona-sul",
        "name": "UPA Zona Sul",
        "neighborhood": "Vila Esperança",
        "address": "Av. Saúde, 455",
        "waitMinutes": 56,
        "patients": 22,
        "status": "high",
        "distanceKm": 6.3,
    },
)


def list_upas() -> list[Upa]:
    """Return a fresh, ordered snapshot of the demonstration queue data."""
    timestamp = datetime.now(UTC).isoformat()
    return [Upa(**item, lastUpdated=timestamp) for item in _UPAS]


def get_best_upa() -> Upa:
    """Select the lowest deterministic wait estimate."""
    return min(list_upas(), key=lambda upa: upa.waitMinutes)

