import pytest
from fastapi.testclient import TestClient

from app import repository
from app.cnes import CnesUnavailableError
from app.main import app
from app.models import Upa


client = TestClient(app)


# Coordenadas reais de referência para checar a ordenação por distância.
SE_LAT, SE_LON = -23.5505, -46.6333  # Praça da Sé, São Paulo

UNITS = [
    Upa(
        id="1", cnes="1", name="Upa Longe", neighborhood="Grajau",
        address="Av. Saude, 455", latitude=-23.7494978, longitude=-46.6900968,
        phone="1140001111",
    ),
    Upa(
        id="2", cnes="2", name="Upa Perto", neighborhood="Sacoma",
        address="Rua A, 10", latitude=-23.61349792, longitude=-46.59383833,
        phone=None,
    ),
    Upa(
        id="3", cnes="3", name="Upa Media", neighborhood="Perus",
        address="Rua B, 20", latitude=-23.54852685, longitude=-46.63599729,
    ),
]


@pytest.fixture(autouse=True)
def stub_cnes(monkeypatch):
    monkeypatch.setattr(repository, "list_units_by_uf", lambda uf_code: list(UNITS))


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ufs_endpoint_lists_every_state() -> None:
    response = client.get("/api/ufs")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 27
    assert {"code": 35, "sigla": "SP", "name": "São Paulo"} in data


def test_nearby_orders_units_by_real_distance() -> None:
    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "SP"})

    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    assert names == ["Upa Media", "Upa Perto", "Upa Longe"]


def test_nearby_reports_distance_in_km() -> None:
    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "SP"})

    nearest = response.json()[0]
    # Perus fica a poucos km da Sé; a checagem é de ordem de grandeza.
    assert 0 < nearest["distanceKm"] < 5


def test_nearby_excludes_units_beyond_radius() -> None:
    # Coordenada no Rio de Janeiro: todas as unidades de SP ficam fora do raio.
    response = client.get("/api/upas/nearby", params={"lat": -22.9068, "lon": -43.1729, "uf": "SP"})

    assert response.status_code == 200
    assert response.json() == []


def test_nearby_accepts_state_full_name() -> None:
    response = client.get(
        "/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "São Paulo"}
    )

    assert response.status_code == 200


def test_unknown_uf_returns_400() -> None:
    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "XX"})

    assert response.status_code == 400


def test_wait_time_is_never_invented() -> None:
    """Sem fonte real de fila, o campo precisa vir nulo — nunca um número."""
    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "SP"})

    assert all(item["waitMinutes"] is None for item in response.json())


def test_chat_prioritises_emergency_over_queue_advice() -> None:
    response = client.post(
        "/api/chat",
        json={"message": "estou com dor no peito", "lat": None, "uf": "SP"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "emergency"
    assert "192" in body["reply"]


def test_chat_returns_nearest_unit_with_coordinates() -> None:
    response = client.post(
        "/api/chat",
        json={"message": "qual a unidade mais perto", "latitude": SE_LAT, "longitude": SE_LON, "uf": "SP"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "nearest"
    assert "Upa Media" in body["reply"]


def test_chat_is_honest_about_missing_wait_times() -> None:
    response = client.post(
        "/api/chat",
        json={"message": "qual o tempo de espera?", "latitude": SE_LAT, "longitude": SE_LON, "uf": "SP"},
    )

    body = response.json()
    assert body["kind"] == "unavailable"
    assert "tempo real" in body["reply"]


def test_chat_rejects_empty_input() -> None:
    response = client.post("/api/chat", json={"message": ""})

    assert response.status_code == 422


def test_cnes_outage_returns_503(monkeypatch) -> None:
    def explode(uf_code):
        raise CnesUnavailableError("timeout")

    monkeypatch.setattr(repository, "list_units_by_uf", explode)

    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "SP"})

    assert response.status_code == 503


def test_unreliable_units_are_pushed_below_reliable_ones(monkeypatch) -> None:
    """A coordenada errada fica no centro da cidade — não pode liderar a lista."""
    fake_center = Upa(
        id="99", cnes="99", name="Upa Coordenada Suspeita", neighborhood="Perus",
        address="Rua X, 1", latitude=SE_LAT, longitude=SE_LON,
        locationPrecision="aproximada",
    )
    monkeypatch.setattr(repository, "list_units_by_uf", lambda uf: [fake_center, *UNITS])

    response = client.get("/api/upas/nearby", params={"lat": SE_LAT, "lon": SE_LON, "uf": "SP"})

    names = [item["name"] for item in response.json()]
    assert names[0] == "Upa Media"
    assert names[-1] == "Upa Coordenada Suspeita"


def test_chat_never_claims_an_unreliable_unit_is_nearest(monkeypatch) -> None:
    only_unreliable = [UNITS[0].model_copy(update={"locationPrecision": "aproximada"})]
    monkeypatch.setattr(repository, "list_units_by_uf", lambda uf: only_unreliable)

    response = client.post(
        "/api/chat",
        json={"message": "qual a mais perto", "latitude": SE_LAT, "longitude": SE_LON, "uf": "SP"},
    )

    body = response.json()
    assert body["kind"] == "unavailable"
    assert "Upa Longe" not in body["reply"]
