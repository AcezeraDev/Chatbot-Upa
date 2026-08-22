"""Testes do OpenRouteService sem chamadas externas reais."""

import json

import httpx
import pytest

from app import openrouteservice
from app.models import Upa


def _mock_ors(monkeypatch, handler):
    original = httpx.Client
    transport = httpx.MockTransport(handler)

    def client_factory(*args, **kwargs):
        return original(*args, **{**kwargs, "transport": transport})

    monkeypatch.setattr(openrouteservice.httpx, "Client", client_factory)


def _unit(index: int) -> Upa:
    return Upa(
        id=str(index),
        cnes=str(index),
        name=f"UPA {index}",
        neighborhood="Centro",
        address=f"Rua {index}",
        latitude=-23.55 - index / 100,
        longitude=-46.63 - index / 100,
    )


def test_services_are_disabled_without_server_key(monkeypatch):
    monkeypatch.delenv("OPENROUTESERVICE_API_KEY", raising=False)

    assert openrouteservice.is_configured() is False
    with pytest.raises(openrouteservice.OpenRouteServiceError):
        openrouteservice.geocode_address("Avenida Paulista, 1000", "SP")


def test_geocodes_a_brazilian_address_with_secret_in_header(monkeypatch):
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "api.openrouteservice.org"
        assert request.headers["authorization"] == "chave-ors-de-teste"
        assert "api_key" not in request.url.params
        assert request.url.params["boundary.country"] == "BR"
        assert request.url.params["lang"] == "pt"
        assert "SP, Brasil" in request.url.params["text"]
        return httpx.Response(
            200,
            json={
                "features": [
                    {
                        "geometry": {
                            "type": "Point",
                            "coordinates": [-46.652, -23.564],
                        },
                        "properties": {
                            "label": "Avenida Paulista, 1000 - São Paulo, SP"
                        },
                    }
                ]
            },
        )

    _mock_ors(monkeypatch, handler)

    result = openrouteservice.geocode_address("  Avenida   Paulista, 1000  ", "sp")

    assert result.latitude == -23.564
    assert result.longitude == -46.652
    assert result.formatted_address.startswith("Avenida Paulista")


def test_geocoding_reports_an_unknown_address(monkeypatch):
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")
    _mock_ors(
        monkeypatch,
        lambda request: httpx.Response(200, json={"features": []}),
    )

    with pytest.raises(openrouteservice.OpenRouteServiceNotFoundError):
        openrouteservice.geocode_address("endereço inexistente", "SP")


def test_route_matrix_returns_only_valid_routes(monkeypatch):
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/v2/matrix/driving-car")
        assert request.headers["authorization"] == "chave-ors-de-teste"
        body = json.loads(request.content)
        assert body["sources"] == ["0"]
        assert body["destinations"] == ["1", "2"]
        assert len(body["locations"]) == 3
        return httpx.Response(
            200,
            json={
                "distances": [[4.82, None]],
                "durations": [[721, None]],
            },
        )

    _mock_ors(monkeypatch, handler)

    result = openrouteservice.compute_route_matrix(
        -23.55, -46.63, [_unit(1), _unit(2)]
    )

    assert result == [
        openrouteservice.RouteEstimate(
            destination_index=0,
            distance_km=4.8,
            duration_minutes=13,
        )
    ]


def test_route_matrix_caps_destinations_and_selects_walking(monkeypatch):
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/v2/matrix/foot-walking")
        body = json.loads(request.content)
        assert len(body["locations"]) == openrouteservice.MAX_ROUTE_DESTINATIONS + 1
        return httpx.Response(
            200,
            json={
                "distances": [[1.0] * openrouteservice.MAX_ROUTE_DESTINATIONS],
                "durations": [[60.0] * openrouteservice.MAX_ROUTE_DESTINATIONS],
            },
        )

    _mock_ors(monkeypatch, handler)

    result = openrouteservice.compute_route_matrix(
        -23.55,
        -46.63,
        [_unit(index) for index in range(1, 8)],
        mode="a_pe",
    )

    assert len(result) == openrouteservice.MAX_ROUTE_DESTINATIONS


def test_external_error_never_exposes_the_key(monkeypatch):
    secret = "segredo-que-nao-pode-aparecer"
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", secret)
    _mock_ors(monkeypatch, lambda request: httpx.Response(500))

    with pytest.raises(openrouteservice.OpenRouteServiceError) as captured:
        openrouteservice.geocode_address("Avenida Paulista, 1000", "SP")

    assert secret not in str(captured.value)


def test_google_maps_link_needs_no_key_and_uses_expected_mode():
    link = openrouteservice.google_maps_directions_url(
        -23.5505,
        -46.6333,
        -23.564,
        -46.652,
        "a_pe",
    )

    assert link.startswith("https://www.google.com/maps/dir/?api=1&")
    assert "travelmode=walking" in link
    assert "key=" not in link


def test_timeout_is_read_at_call_time_and_stays_within_bounds(monkeypatch):
    """Mudar o ambiente basta; o valor não fica preso no import do módulo."""
    monkeypatch.delenv("OPENROUTESERVICE_TIMEOUT", raising=False)
    assert (
        openrouteservice._timeout_seconds()
        == openrouteservice.DEFAULT_TIMEOUT_SECONDS
    )

    monkeypatch.setenv("OPENROUTESERVICE_TIMEOUT", "12")
    assert openrouteservice._timeout_seconds() == 12.0

    monkeypatch.setenv("OPENROUTESERVICE_TIMEOUT", "9999")
    assert (
        openrouteservice._timeout_seconds() == openrouteservice.MAX_TIMEOUT_SECONDS
    )

    monkeypatch.setenv("OPENROUTESERVICE_TIMEOUT", "0")
    assert (
        openrouteservice._timeout_seconds() == openrouteservice.MIN_TIMEOUT_SECONDS
    )

    monkeypatch.setenv("OPENROUTESERVICE_TIMEOUT", "oito segundos")
    assert (
        openrouteservice._timeout_seconds()
        == openrouteservice.DEFAULT_TIMEOUT_SECONDS
    )


def test_address_length_errors_say_which_limit_was_broken(monkeypatch):
    """Endereço curto e endereço longo têm causas opostas e mensagens opostas."""
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")

    with pytest.raises(openrouteservice.OpenRouteServiceNotFoundError) as curto:
        openrouteservice.geocode_address("ab", "SP")
    assert "específico" in str(curto.value)

    with pytest.raises(openrouteservice.OpenRouteServiceNotFoundError) as longo:
        openrouteservice.geocode_address(
            "a" * (openrouteservice.MAX_ADDRESS_LENGTH + 1), "SP"
        )
    assert "longo demais" in str(longo.value)
