"""Consultas de unidades sobre os dados reais do CNES."""

from .cnes import list_units_by_uf
from .geo import haversine_km
from .models import Upa


DEFAULT_RESULT_LIMIT = 10
DEFAULT_MAX_DISTANCE_KM = 60.0


def list_upas(uf_code: int) -> list[Upa]:
    """Unidades de uma UF em ordem alfabética."""
    return sorted(list_units_by_uf(uf_code), key=lambda unit: unit.name)


def find_nearby(
    latitude: float,
    longitude: float,
    uf_code: int,
    limit: int = DEFAULT_RESULT_LIMIT,
    max_distance_km: float = DEFAULT_MAX_DISTANCE_KM,
) -> list[Upa]:
    """Unidades mais próximas de um ponto, da mais perto para a mais longe."""
    measured: list[Upa] = []

    for unit in list_units_by_uf(uf_code):
        distance = haversine_km(latitude, longitude, unit.latitude, unit.longitude)
        if distance > max_distance_km:
            continue
        measured.append(unit.model_copy(update={"distanceKm": round(distance, 1)}))

    # Unidades com coordenada não confiável caem para o fim da lista. A
    # coordenada errada delas é o centro da cidade, exatamente onde a maioria
    # das buscas acontece — sem isso elas ocupariam o topo indevidamente.
    measured.sort(key=lambda unit: (unit.locationPrecision != "exata", unit.distanceKm or 0.0))
    return measured[:limit]


def nearest_reliable(units: list[Upa]) -> Upa | None:
    """Primeira unidade cuja localização é confiável o bastante para afirmar."""
    return next((unit for unit in units if unit.locationPrecision == "exata"), None)
