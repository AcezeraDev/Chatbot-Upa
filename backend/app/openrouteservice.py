"""Integração server-side com geocodificação e matriz de rotas do ORS.

O OpenRouteService usa dados do OpenStreetMap. A chave fica somente no
ambiente do backend e é enviada no cabeçalho ``Authorization``; assim ela não
aparece em URLs, logs de proxies ou no aplicativo móvel.
"""

from __future__ import annotations

import math
import os
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode

import httpx

from .models import Upa


GEOCODING_URL = "https://api.openrouteservice.org/geocode/search"
MATRIX_URLS = {
    "carro": "https://api.openrouteservice.org/v2/matrix/driving-car",
    "a_pe": "https://api.openrouteservice.org/v2/matrix/foot-walking",
}

DEFAULT_TIMEOUT_SECONDS = 8.0
MIN_TIMEOUT_SECONDS = 1.0
MAX_TIMEOUT_SECONDS = 30.0

MAX_ROUTE_DESTINATIONS = 5
MIN_ADDRESS_LENGTH = 3
MAX_ADDRESS_LENGTH = 200

TravelMode = Literal["carro", "a_pe"]
_GOOGLE_MAPS_TRAVEL_MODES: dict[TravelMode, str] = {
    "carro": "driving",
    "a_pe": "walking",
}


class OpenRouteServiceError(RuntimeError):
    """Erro seguro e esperado ao consultar o OpenRouteService."""


class OpenRouteServiceNotFoundError(OpenRouteServiceError):
    """O endereço informado não pôde ser localizado."""


@dataclass(frozen=True)
class GeocodedLocation:
    latitude: float
    longitude: float
    formatted_address: str


@dataclass(frozen=True)
class RouteEstimate:
    destination_index: int
    distance_km: float
    duration_minutes: int


def is_configured() -> bool:
    """A credencial server-side do OpenRouteService está disponível?"""
    return bool(os.getenv("OPENROUTESERVICE_API_KEY", "").strip())


def _api_key() -> str:
    key = os.getenv("OPENROUTESERVICE_API_KEY", "").strip()
    if not key:
        raise OpenRouteServiceError("OpenRouteService não está configurado.")
    return key


def _timeout_seconds() -> float:
    """Lido a cada chamada, como a chave: mudar o ambiente basta."""
    try:
        raw = float(os.getenv("OPENROUTESERVICE_TIMEOUT", "") or DEFAULT_TIMEOUT_SECONDS)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    if not math.isfinite(raw):
        return DEFAULT_TIMEOUT_SECONDS
    return max(MIN_TIMEOUT_SECONDS, min(raw, MAX_TIMEOUT_SECONDS))


def _timeout() -> httpx.Timeout:
    seconds = _timeout_seconds()
    return httpx.Timeout(seconds, connect=min(4.0, seconds))


def _headers() -> dict[str, str]:
    return {
        "Accept": "application/json",
        "Authorization": _api_key(),
        "User-Agent": "UPA-Agora/1.0",
    }


def _clean_address(address: str, uf: str | None) -> str:
    cleaned = " ".join(str(address).split())
    if len(cleaned) < MIN_ADDRESS_LENGTH:
        raise OpenRouteServiceNotFoundError("Informe um endereço mais específico.")
    if len(cleaned) > MAX_ADDRESS_LENGTH:
        raise OpenRouteServiceNotFoundError(
            f"Endereço longo demais; use no máximo {MAX_ADDRESS_LENGTH} caracteres."
        )

    suffix = ", Brasil"
    if uf:
        suffix = f", {uf.strip().upper()}, Brasil"
    return f"{cleaned}{suffix}"


def geocode_address(address: str, uf: str | None = None) -> GeocodedLocation:
    """Converte um endereço brasileiro em coordenadas sem expor a chave."""
    query = _clean_address(address, uf)

    try:
        with httpx.Client(timeout=_timeout(), headers=_headers()) as client:
            response = client.get(
                GEOCODING_URL,
                params={
                    "text": query,
                    "boundary.country": "BR",
                    "lang": "pt",
                    "size": 1,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        raise OpenRouteServiceError(
            "Não foi possível consultar o serviço de localização."
        ) from None

    if not isinstance(payload, dict):
        raise OpenRouteServiceError("Resposta de localização inválida.")

    features = payload.get("features")
    if not isinstance(features, list) or not features:
        raise OpenRouteServiceNotFoundError("Endereço não encontrado.")

    try:
        first = features[0]
        coordinates = first["geometry"]["coordinates"]
        longitude = float(coordinates[0])
        latitude = float(coordinates[1])
        properties = first.get("properties") or {}
        formatted_address = str(
            properties.get("label") or properties.get("name") or query
        )
    except (AttributeError, KeyError, TypeError, ValueError, IndexError) as error:
        raise OpenRouteServiceError("Resposta de localização incompleta.") from error

    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise OpenRouteServiceError("Coordenadas inválidas na resposta de localização.")

    return GeocodedLocation(latitude, longitude, formatted_address)


def _valid_coordinate(latitude: float, longitude: float) -> bool:
    return (
        math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    )


def compute_route_matrix(
    origin_latitude: float,
    origin_longitude: float,
    destinations: Sequence[Upa],
    mode: TravelMode = "carro",
) -> list[RouteEstimate]:
    """Calcula distância e duração por rua para até cinco unidades do CNES."""
    if not _valid_coordinate(origin_latitude, origin_longitude):
        raise OpenRouteServiceError("Localização de origem inválida.")
    if mode not in MATRIX_URLS:
        raise OpenRouteServiceError("Modo de deslocamento inválido.")

    selected = list(destinations[:MAX_ROUTE_DESTINATIONS])
    if not selected:
        return []

    locations = [[origin_longitude, origin_latitude]]
    locations.extend([[unit.longitude, unit.latitude] for unit in selected])
    body = {
        "locations": locations,
        "sources": ["0"],
        "destinations": [str(index) for index in range(1, len(locations))],
        "metrics": ["distance", "duration"],
        "units": "km",
    }

    try:
        with httpx.Client(timeout=_timeout(), headers=_headers()) as client:
            response = client.post(MATRIX_URLS[mode], json=body)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        raise OpenRouteServiceError(
            "Não foi possível calcular as rotas no momento."
        ) from None

    if not isinstance(payload, dict):
        raise OpenRouteServiceError("Resposta de rotas inválida.")

    distances = payload.get("distances")
    durations = payload.get("durations")
    if (
        not isinstance(distances, list)
        or not distances
        or not isinstance(distances[0], list)
        or not isinstance(durations, list)
        or not durations
        or not isinstance(durations[0], list)
    ):
        raise OpenRouteServiceError("Resposta de rotas incompleta.")

    estimates: list[RouteEstimate] = []
    for destination_index, (raw_distance, raw_duration) in enumerate(
        zip(distances[0], durations[0], strict=False)
    ):
        try:
            distance_km = float(raw_distance)
            duration_seconds = float(raw_duration)
        except (TypeError, ValueError):
            continue

        if (
            destination_index >= len(selected)
            or not math.isfinite(distance_km)
            or not math.isfinite(duration_seconds)
            or distance_km < 0
            or duration_seconds < 0
        ):
            continue

        estimates.append(
            RouteEstimate(
                destination_index=destination_index,
                distance_km=round(distance_km, 1),
                duration_minutes=max(1, math.ceil(duration_seconds / 60)),
            )
        )

    return estimates


def google_maps_directions_url(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    mode: TravelMode,
) -> str:
    """Cria um link universal do Google Maps; não usa API nem chave."""
    if not _valid_coordinate(origin_latitude, origin_longitude) or not _valid_coordinate(
        destination_latitude, destination_longitude
    ):
        raise OpenRouteServiceError("Não foi possível criar o link da rota.")
    if mode not in _GOOGLE_MAPS_TRAVEL_MODES:
        raise OpenRouteServiceError("Modo de deslocamento inválido.")

    query = urlencode(
        {
            "api": "1",
            "origin": f"{origin_latitude:.6f},{origin_longitude:.6f}",
            "destination": f"{destination_latitude:.6f},{destination_longitude:.6f}",
            "travelmode": _GOOGLE_MAPS_TRAVEL_MODES[mode],
        }
    )
    return f"https://www.google.com/maps/dir/?{query}"
