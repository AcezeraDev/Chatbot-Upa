"""Cálculos geográficos usados para ordenar unidades por proximidade."""

from math import asin, cos, radians, sin, sqrt


EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em linha reta entre dois pontos, em quilômetros.

    É uma aproximação: não considera o trajeto real por ruas, apenas a
    distância geodésica. O app deixa isso explícito para o usuário.
    """
    lat1_rad, lat2_rad = radians(lat1), radians(lat2)
    delta_lat = lat2_rad - lat1_rad
    delta_lon = radians(lon2) - radians(lon1)

    inner = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(inner))
