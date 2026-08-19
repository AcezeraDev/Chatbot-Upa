"""Consultas de unidades sobre os dados reais do CNES."""

from .cnes import list_units_by_uf
from .geo import haversine_km
from .models import Upa
from .schedule import open_now
from .ufs import uf_by_code


DEFAULT_RESULT_LIMIT = 10
DEFAULT_MAX_DISTANCE_KM = 60.0


def _with_schedule(units: list[Upa], uf_code: int) -> list[Upa]:
    """Marca cada unidade como aberta ou não neste momento.

    Feito na consulta, não no cache: a resposta depende da hora, e as unidades
    ficam em memória por 24 horas. Gravar isso no objeto cacheado faria o app
    dizer "aberta" de madrugada porque alguém consultou à tarde.
    """
    uf = uf_by_code(uf_code)
    sigla = uf.sigla if uf else None

    marcadas: list[Upa] = []
    for unit in units:
        aberta, precisao = open_now(unit.openingHours, sigla)
        marcadas.append(unit.model_copy(update={"openNow": aberta, "openingPrecision": precisao}))
    return marcadas


def list_upas(uf_code: int) -> list[Upa]:
    """Unidades de uma UF em ordem alfabética."""
    unidades = sorted(list_units_by_uf(uf_code), key=lambda unit: unit.name)
    return _with_schedule(unidades, uf_code)


def find_nearby(
    latitude: float,
    longitude: float,
    uf_code: int,
    limit: int = DEFAULT_RESULT_LIMIT,
    max_distance_km: float = DEFAULT_MAX_DISTANCE_KM,
    only_open: bool = False,
) -> list[Upa]:
    """Unidades mais próximas de um ponto, da mais perto para a mais longe.

    Com `only_open`, descarta as que sabidamente estão fechadas agora. As de
    horário indeterminado permanecem: omiti-las esconderia unidades que podem
    estar abertas, o que é pior do que mostrá-las com aviso.
    """
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

    measured = _with_schedule(measured, uf_code)
    if only_open:
        measured = [unit for unit in measured if unit.openNow is not False]

    return measured[:limit]


def nearest_reliable(units: list[Upa]) -> Upa | None:
    """Primeira unidade cuja localização é confiável o bastante para afirmar."""
    return next((unit for unit in units if unit.locationPrecision == "exata"), None)
