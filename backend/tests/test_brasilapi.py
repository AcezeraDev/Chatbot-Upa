"""Testes da resolução de CEP, sem chamadas externas reais.

Os formatos verificados aqui foram medidos na API de produção: coordenada como
string, `location` ausente em parte dos CEPs, 404 com corpo próprio e um
`timezoneName` que erra o Acre. Os testes existem para que o tratamento dessas
esquisitices não seja removido por engano.
"""

import httpx
import pytest

from app import brasilapi


def _mock(monkeypatch, handler):
    original = httpx.Client
    transport = httpx.MockTransport(handler)

    def client_factory(*args, **kwargs):
        return original(*args, **{**kwargs, "transport": transport})

    monkeypatch.setattr(brasilapi.httpx, "Client", client_factory)


def _resposta(**extra):
    payload = {
        "cep": "01310100",
        "state": "SP",
        "city": "São Paulo",
        "neighborhood": "Bela Vista",
        "street": "Avenida Paulista",
        "service": "open-cep",
        "timezoneName": "America/Sao_Paulo",
        "location": {
            "type": "Point",
            "coordinates": {"longitude": "-46.63611", "latitude": "-23.5475"},
        },
    }
    payload.update(extra)
    return httpx.Response(200, json=payload)


def test_resolves_a_cep_and_parses_string_coordinates(monkeypatch):
    """A API devolve latitude e longitude como texto, não como número."""
    _mock(monkeypatch, lambda request: _resposta())

    found = brasilapi.lookup_cep("01310-100")

    assert found.cep == "01310100"
    assert found.state.sigla == "SP"
    assert found.state.code == 35
    assert found.city == "São Paulo"
    assert found.has_coordinates
    assert found.latitude == pytest.approx(-23.5475)
    assert found.longitude == pytest.approx(-46.63611)
    assert isinstance(found.latitude, float)


def test_missing_location_is_not_an_error(monkeypatch):
    """Parte dos CEPs volta sem coordenada; UF e cidade ainda servem."""
    _mock(monkeypatch, lambda request: _resposta(location=None))

    found = brasilapi.lookup_cep("01310100")

    assert found.has_coordinates is False
    assert found.latitude is None
    assert found.state.sigla == "SP"
    assert found.as_address() == "Avenida Paulista, Bela Vista, São Paulo"


def test_half_a_coordinate_pair_is_discarded(monkeypatch):
    """Uma latitude sem longitude não mede distância nenhuma."""
    _mock(
        monkeypatch,
        lambda request: _resposta(
            location={"coordinates": {"latitude": "-23.5475", "longitude": None}}
        ),
    )

    assert brasilapi.lookup_cep("01310100").has_coordinates is False


def test_out_of_range_coordinate_is_discarded(monkeypatch):
    _mock(
        monkeypatch,
        lambda request: _resposta(
            location={"coordinates": {"latitude": "999", "longitude": "-46.6"}}
        ),
    )

    assert brasilapi.lookup_cep("01310100").has_coordinates is False


def test_general_cep_falls_back_to_the_city_name(monkeypatch):
    """CEP geral de cidade pequena não tem rua nem bairro."""
    _mock(
        monkeypatch,
        lambda request: _resposta(
            state="AC",
            city="Capixaba",
            neighborhood=None,
            street=None,
            location={"coordinates": {"latitude": "-10.57278", "longitude": "-67.67556"}},
        ),
    )

    found = brasilapi.lookup_cep("69931000")

    assert found.street is None
    assert found.as_address() == "Capixaba"
    assert found.state.sigla == "AC"


def test_unknown_cep_becomes_a_not_found_error(monkeypatch):
    """O corpo do 404 lista provedores que falharam e não pode vazar."""
    _mock(
        monkeypatch,
        lambda request: httpx.Response(
            404,
            json={
                "name": "CepPromiseError",
                "message": "Todos os serviços de CEP retornaram erro.",
                "errors": [{"service": "correios", "message": "detalhe interno"}],
            },
        ),
    )

    with pytest.raises(brasilapi.CepNotFoundError) as captured:
        brasilapi.lookup_cep("00000000")

    assert "detalhe interno" not in str(captured.value)
    assert "correios" not in str(captured.value)


def test_external_failure_becomes_a_safe_error(monkeypatch):
    _mock(monkeypatch, lambda request: httpx.Response(500))

    with pytest.raises(brasilapi.BrasilApiError):
        brasilapi.lookup_cep("01310100")


def test_malformed_cep_never_reaches_the_network(monkeypatch):
    def explode(request):
        raise AssertionError("não deveria ter feito requisição")

    _mock(monkeypatch, explode)

    for entrada in ("123", "", "abcdefgh", "0131010012"):
        with pytest.raises(brasilapi.CepNotFoundError):
            brasilapi.lookup_cep(entrada)


def test_repeated_lookups_use_the_cache(monkeypatch):
    """CEP não muda; a segunda consulta não deve sair para a rede."""
    chamadas = []

    def handler(request):
        chamadas.append(request.url.path)
        return _resposta()

    _mock(monkeypatch, handler)

    primeiro = brasilapi.lookup_cep("01310100")
    segundo = brasilapi.lookup_cep("01310-100")

    assert len(chamadas) == 1
    assert primeiro == segundo


def test_finds_a_cep_inside_free_text():
    """A pessoa escreve como quiser; o backend extrai os oito dígitos."""
    assert brasilapi.find_cep("meu cep é 01310-100, qual upa?") == "01310100"
    assert brasilapi.find_cep("CEP 01310100") == "01310100"
    assert brasilapi.find_cep("cep 01310 100") == "01310100"
    assert brasilapi.find_cep("estou com dor no peito") is None
    assert brasilapi.find_cep("liguei 192 e 12345") is None


def test_timezone_from_the_api_is_ignored(monkeypatch):
    """A API erra o fuso do Acre em uma hora; schedule.py é a fonte correta."""
    _mock(
        monkeypatch,
        lambda request: _resposta(state="AC", city="Capixaba", timezoneName="America/La_Paz"),
    )

    found = brasilapi.lookup_cep("69931000")

    assert not hasattr(found, "timezone")
    assert "La_Paz" not in repr(found)
