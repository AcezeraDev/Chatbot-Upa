"""Testes do cliente CNES com transporte HTTP simulado."""

import json

import httpx
import pytest

from app import cnes


def _raw_unit(cnes_code: int, name: str, lat: float | None, lon: float | None, **extra):
    unit = {
        "codigo_cnes": cnes_code,
        "nome_fantasia": name,
        "nome_razao_social": name,
        "bairro_estabelecimento": "CENTRO",
        "endereco_estabelecimento": "RUA TESTE",
        "numero_estabelecimento": "10",
        "numero_telefone_estabelecimento": "1133334444",
        "descricao_turno_atendimento": "ATENDIMENTO CONTINUO 24 HORAS",
        "latitude_estabelecimento_decimo_grau": lat,
        "longitude_estabelecimento_decimo_grau": lon,
        "codigo_municipio": 355030,
        "codigo_motivo_desabilitacao_estabelecimento": None,
        "data_atualizacao": "2025-09-03",
    }
    unit.update(extra)
    return unit


def _mock_api(total_units: int, monkeypatch):
    """Simula a API do CNES respeitando o teto de 20 registros por página."""
    units = [_raw_unit(1000 + i, f"UPA {i}", -23.5 - i / 100, -46.6) for i in range(total_units)]

    def handler(request: httpx.Request) -> httpx.Response:
        offset = int(request.url.params.get("offset", 0))
        limit = min(int(request.url.params.get("limit", 20)), cnes.PAGE_SIZE)
        return httpx.Response(200, json={"estabelecimentos": units[offset : offset + limit]})

    transport = httpx.MockTransport(handler)
    original = httpx.Client

    def client_factory(*args, **kwargs):
        kwargs["transport"] = transport
        return original(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", client_factory)
    return units


def test_pagination_collects_every_page(monkeypatch):
    _mock_api(537, monkeypatch)

    units = cnes.list_units_by_uf(35)

    assert len(units) == 537


def test_pagination_stops_on_exact_page_boundary(monkeypatch):
    """40 registros = duas páginas cheias; a busca não pode entrar em laço."""
    _mock_api(40, monkeypatch)

    assert len(cnes.list_units_by_uf(35)) == 40


def test_units_without_coordinates_are_dropped():
    raw = [
        _raw_unit(1, "UPA COM COORD", -23.5, -46.6),
        _raw_unit(2, "UPA SEM COORD", None, None),
    ]

    mapped = [unit for unit in (cnes._to_upa(item) for item in raw) if unit is not None]

    assert len(mapped) == 1
    assert mapped[0].name == "Upa Com Coord"


def test_disabled_units_are_dropped():
    raw = _raw_unit(1, "UPA DESATIVADA", -23.5, -46.6, codigo_motivo_desabilitacao_estabelecimento="08")

    assert cnes._to_upa(raw) is None


def test_api_failure_raises_domain_error(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    transport = httpx.MockTransport(handler)
    original = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda *a, **k: original(*a, **{**k, "transport": transport})
    )

    with pytest.raises(cnes.CnesUnavailableError):
        cnes.list_units_by_uf(35)


def test_centroid_cluster_is_flagged_as_approximate():
    """Reproduz o caso real: UPAs de Perus, Lapa e zona sul no mesmo ponto."""
    raw = [
        _raw_unit(1, "UPA PERUS", -23.548527, -46.635997,
                  codigo_cep_estabelecimento="05202140", bairro_estabelecimento="PERUS"),
        _raw_unit(2, "UPA III LAPA", -23.548271, -46.635826,
                  codigo_cep_estabelecimento="05319000", bairro_estabelecimento="VILA HAMBURGUESA"),
        _raw_unit(3, "UPA VERA CRUZ", -23.550520, -46.633309,
                  codigo_cep_estabelecimento="04965140", bairro_estabelecimento="JARDIM VERA CRUZ"),
        _raw_unit(4, "UPA VERGUEIRO", -23.5686, -46.6395,
                  codigo_cep_estabelecimento="01504000", bairro_estabelecimento="LIBERDADE"),
    ]
    units = [u for u in (cnes._to_upa(item) for item in raw) if u is not None]

    flagged = {u.name: u.locationPrecision for u in cnes.detect_unreliable_coordinates(units)}

    assert flagged["Upa Perus"] == "aproximada"
    assert flagged["Upa Iii Lapa"] == "aproximada"
    assert flagged["Upa Vera Cruz"] == "aproximada"
    # Longe do amontoado, mantém a precisão declarada.
    assert flagged["Upa Vergueiro"] == "exata"


def test_units_sharing_one_district_are_not_flagged():
    """Unidades vizinhas do mesmo distrito são plausíveis: não marcar."""
    raw = [
        _raw_unit(i, f"UPA {i}", -23.5505 + i / 10000, -46.6333,
                  codigo_cep_estabelecimento="01020030")
        for i in range(4)
    ]
    units = [u for u in (cnes._to_upa(item) for item in raw) if u is not None]

    assert all(u.locationPrecision == "exata" for u in cnes.detect_unreliable_coordinates(units))


def test_seed_is_used_before_hitting_the_api(tmp_path, monkeypatch):
    """Com seed presente, a API do CNES não é chamada.

    É o caminho de produção em serverless: o disco gravável nasce vazio a cada
    cold start e baixar a UF inteira dentro da requisição seria lento demais.
    """
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "upas-uf-35.json").write_text(
        json.dumps([_raw_unit(9001, "UPA DO SEED", -23.5, -46.6)]), encoding="utf-8"
    )
    monkeypatch.setattr(cnes, "SEED_DIR", seed_dir)

    def explode(*args, **kwargs):
        raise AssertionError("a API do CNES não deveria ser consultada com seed disponível")

    monkeypatch.setattr(cnes, "_fetch_all_pages", explode)

    units = cnes.list_units_by_uf(35)

    assert [unit.name for unit in units] == ["Upa Do Seed"]


def test_live_fetch_still_runs_when_seed_lacks_the_uf(monkeypatch):
    """Seed é atalho, não prisão: UF ausente ainda cai na busca ao vivo."""
    _mock_api(3, monkeypatch)

    units = cnes.list_units_by_uf(41)

    assert len(units) == 3
