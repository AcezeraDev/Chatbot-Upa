"""Testes do assistente com modelo de linguagem.

Nenhum teste toca a rede: o cliente do modelo é substituído. O que interessa
aqui não é o texto que o modelo produz, e sim as amarras em volta dele.
"""

import json
import sys
from types import SimpleNamespace

import pytest

from app import assistant, cnes
from app.domain import EMERGENCY_REPLY


def _raw_unit(cnes_code: int, name: str, lat: float, lon: float, **extra):
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


@pytest.fixture
def seeded(tmp_path, monkeypatch):
    """Um estado com duas unidades reais, sem tocar na API do CNES."""
    seed_dir = tmp_path / "seed"
    seed_dir.mkdir()
    (seed_dir / "upas-uf-35.json").write_text(
        json.dumps(
            [
                _raw_unit(1, "UPA PERTO", -23.55, -46.63),
                _raw_unit(2, "UPA LONGE", -23.70, -46.80),
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(cnes, "SEED_DIR", seed_dir)
    cnes.clear_cache()
    yield
    cnes.clear_cache()


class _ClienteQueExplode:
    """Substituto do cliente do modelo que falha se for chamado."""

    def __init__(self):
        raise AssertionError("o modelo não deveria ter sido consultado")


def test_emergency_never_reaches_the_model(monkeypatch):
    """Sinal de risco é respondido por regra fixa, com o modelo configurado.

    É a garantia mais importante do módulo: um modelo pode suavizar o alerta
    ou falhar em reconhecê-lo, e numa urgência a demora é o dano.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "chave-de-teste")
    monkeypatch.setattr(assistant, "_ask_model", _ClienteQueExplode)

    reply, kind, route_url = assistant.reply_to(
        "estou com dor no peito", -23.55, -46.63, "SP"
    )

    assert kind == "emergency"
    assert reply == EMERGENCY_REPLY
    assert route_url is None


def test_falls_back_to_rules_without_api_key(monkeypatch, seeded):
    """Sem chave configurada, o serviço responde por regra fixa."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    reply, kind, route_url = assistant.reply_to(
        "qual a mais perto?", -23.55, -46.63, "SP"
    )

    assert kind != "assistant"
    assert "Upa Perto" in reply
    assert route_url is None


def test_falls_back_to_rules_when_the_model_fails(monkeypatch, seeded):
    """Falha do modelo não pode virar erro para quem perguntou."""
    monkeypatch.setenv("OPENAI_API_KEY", "chave-de-teste")

    def explode(*args, **kwargs):
        raise RuntimeError("cota esgotada")

    monkeypatch.setattr(assistant, "_ask_model", explode)

    reply, kind, route_url = assistant.reply_to(
        "qual a mais perto?", -23.55, -46.63, "SP"
    )

    assert kind != "assistant"
    assert "Upa Perto" in reply
    assert route_url is None


def test_openai_responses_executes_the_cnes_tool(monkeypatch, seeded):
    """A integração usa Luna e devolve ao modelo somente unidades do CNES."""
    function_call = SimpleNamespace(
        type="function_call",
        name="buscar_unidades_proximas",
        arguments=json.dumps({"limite": 1}),
        call_id="call_123",
    )
    responses = [
        SimpleNamespace(output=[function_call], output_text=""),
        SimpleNamespace(output=[], output_text="A UPA Perto é a mais próxima."),
    ]
    requests = []

    class FakeResponses:
        def create(self, **kwargs):
            requests.append(kwargs)
            return responses.pop(0)

    fake_client = SimpleNamespace(responses=FakeResponses())
    fake_module = SimpleNamespace(OpenAI=lambda: fake_client)
    monkeypatch.setitem(sys.modules, "openai", fake_module)
    monkeypatch.setenv("OPENAI_API_KEY", "chave-de-teste")
    monkeypatch.delenv("OPENROUTESERVICE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_REASONING_EFFORT", raising=False)

    reply, kind, route_url = assistant.reply_to(
        "qual a mais perto?", -23.55, -46.63, "SP"
    )

    assert kind == "assistant"
    assert reply == "A UPA Perto é a mais próxima."
    assert route_url is None
    assert len(requests) == 2
    assert requests[0]["model"] == "gpt-5.6-luna"
    assert requests[0]["reasoning"] == {"effort": "low"}
    assert requests[0]["max_output_tokens"] == assistant._max_output_tokens()
    assert requests[0]["store"] is False
    assert [tool["name"] for tool in requests[0]["tools"]] == [
        "buscar_unidades_proximas"
    ]

    tool_outputs = [
        item
        for item in requests[1]["input"]
        if isinstance(item, dict) and item.get("type") == "function_call_output"
    ]
    assert len(tool_outputs) == 1
    assert tool_outputs[0]["call_id"] == "call_123"
    payload = json.loads(tool_outputs[0]["output"])
    assert [unit["nome"] for unit in payload["unidades"]] == ["Upa Perto"]


def test_openai_configuration_can_override_model_and_effort(monkeypatch):
    """Modelo e esforço podem mudar sem alteração no código."""
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.6-luna")
    monkeypatch.setenv("OPENAI_REASONING_EFFORT", "medium")

    assert assistant._model_name() == "gpt-5.6-luna"
    assert assistant._reasoning_effort() == "medium"

    monkeypatch.setenv("OPENAI_REASONING_EFFORT", "valor-invalido")
    assert assistant._reasoning_effort() == "low"


def test_tool_returns_real_units_ordered_by_distance(seeded):
    """A ferramenta entrega dados do cadastro, do mais perto para o mais longe."""
    payload = json.loads(assistant._run_tool({}, -23.55, -46.63, "SP"))

    nomes = [unidade["nome"] for unidade in payload["unidades"]]
    assert nomes == ["Upa Perto", "Upa Longe"]
    assert payload["estado"] == "SP"
    assert payload["distanciaEmLinhaReta"] is True


def test_tool_never_reports_a_wait_time(seeded):
    """Nenhuma unidade sai da ferramenta com tempo de fila numérico."""
    payload = json.loads(assistant._run_tool({}, -23.55, -46.63, "SP"))

    for unidade in payload["unidades"]:
        assert unidade["tempoDeFila"] == "não informado publicamente"
        assert "waitMinutes" not in unidade


def test_tool_reports_missing_state_instead_of_guessing(seeded):
    """Sem estado, a ferramenta devolve erro em vez de escolher um."""
    payload = json.loads(assistant._run_tool({}, -23.55, -46.63, None))

    assert "erro" in payload


def test_tool_caps_the_requested_limit(seeded):
    """Um limite absurdo pedido pelo modelo é contido."""
    payload = json.loads(assistant._run_tool({"limite": 999}, -23.55, -46.63, "SP"))

    assert len(payload["unidades"]) <= assistant.MAX_UNIT_LIMIT


def test_routes_tool_uses_ors_and_orders_by_travel_time(monkeypatch, seeded):
    """A recomendação por rota usa unidades CNES e a duração devolvida pelo ORS."""
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")

    def fake_matrix(latitude, longitude, units, mode):
        assert (latitude, longitude) == (-23.55, -46.63)
        assert mode == "carro"
        assert [unit.name for unit in units] == ["Upa Perto", "Upa Longe"]
        return [
            assistant.openrouteservice.RouteEstimate(0, 4.0, 18),
            assistant.openrouteservice.RouteEstimate(1, 8.0, 12),
        ]

    monkeypatch.setattr(
        assistant.openrouteservice, "compute_route_matrix", fake_matrix
    )

    payload = json.loads(
        assistant._run_routes_tool(
            {"limite": 2, "modo": "carro"}, -23.55, -46.63, "SP"
        )
    )

    assert payload["fonteDaRota"] == "OpenRouteService (OpenStreetMap)"
    assert payload["consideraTransitoEmTempoReal"] is False
    assert [unit["nome"] for unit in payload["unidades"]] == [
        "Upa Longe",
        "Upa Perto",
    ]
    assert payload["unidades"][0]["tempoEstimadoMinutos"] == 12
    assert payload["unidades"][0]["tempoDeFila"] == "não informado publicamente"
    assert payload["unidades"][0]["googleMapsUrl"].startswith(
        "https://www.google.com/maps/dir/?api=1&"
    )


def test_routes_tool_can_geocode_an_explicit_address(monkeypatch, seeded):
    """Sem GPS, um endereço informado pode virar a origem da rota."""
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")
    monkeypatch.setattr(
        assistant.openrouteservice,
        "geocode_address",
        lambda address, uf: assistant.openrouteservice.GeocodedLocation(
            -23.55, -46.63, "Praça da Sé - São Paulo, SP"
        ),
    )
    monkeypatch.setattr(
        assistant.openrouteservice,
        "compute_route_matrix",
        lambda latitude, longitude, units, mode: [
            assistant.openrouteservice.RouteEstimate(0, 2.4, 7)
        ],
    )

    payload = json.loads(
        assistant._run_routes_tool(
            {"endereco": "Praça da Sé", "limite": 1}, None, None, "SP"
        )
    )

    assert payload["origem"] == "Praça da Sé - São Paulo, SP"
    assert payload["unidades"][0]["tempoEstimadoMinutos"] == 7


def test_openai_responses_executes_the_ors_tool(monkeypatch, seeded):
    """O modelo pode pedir uma rota, mas somente o backend chama o ORS."""
    function_call = SimpleNamespace(
        type="function_call",
        name="calcular_rotas_para_upas",
        arguments=json.dumps({"limite": 1, "modo": "carro"}),
        call_id="call_routes",
    )
    responses = [
        SimpleNamespace(output=[function_call], output_text=""),
        SimpleNamespace(output=[], output_text="A UPA Perto leva cerca de 8 minutos."),
    ]
    requests = []

    class FakeResponses:
        def create(self, **kwargs):
            requests.append(kwargs)
            return responses.pop(0)

    fake_client = SimpleNamespace(responses=FakeResponses())
    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=lambda: fake_client))
    monkeypatch.setenv("OPENAI_API_KEY", "chave-openai-de-teste")
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")
    monkeypatch.setattr(
        assistant.openrouteservice,
        "compute_route_matrix",
        lambda latitude, longitude, units, mode: [
            assistant.openrouteservice.RouteEstimate(0, 3.1, 8)
        ],
    )

    reply, kind, route_url = assistant.reply_to(
        "qual é mais rápida de carro?", -23.55, -46.63, "SP"
    )

    assert kind == "assistant"
    assert "8 minutos" in reply
    assert route_url is not None
    assert route_url.startswith("https://www.google.com/maps/dir/?api=1&")
    assert [tool["name"] for tool in requests[0]["tools"]] == [
        "buscar_unidades_proximas",
        "calcular_rotas_para_upas",
    ]
    outputs = [
        item
        for item in requests[1]["input"]
        if isinstance(item, dict) and item.get("type") == "function_call_output"
    ]
    assert len(outputs) == 1
    payload = json.loads(outputs[0]["output"])
    assert payload["fonteDaRota"] == "OpenRouteService (OpenStreetMap)"
    assert payload["unidades"][0]["nome"] == "Upa Perto"


def test_output_budget_grows_with_the_reasoning_effort(monkeypatch):
    """O teto cobre raciocínio + texto; esforço alto precisa de mais espaço.

    Com um teto fixo e baixo, o raciocínio consome a cota inteira, o modelo
    devolve vazio e o assistente cai no determinístico sem nenhum aviso.
    """
    monkeypatch.setenv("OPENAI_REASONING_EFFORT", "low")
    barato = assistant._max_output_tokens()

    monkeypatch.setenv("OPENAI_REASONING_EFFORT", "max")
    caro = assistant._max_output_tokens()

    assert caro > barato
    assert barato > assistant.VISIBLE_OUTPUT_TOKENS

    monkeypatch.setenv("OPENAI_REASONING_EFFORT", "inexistente")
    assert assistant._max_output_tokens() == barato


def _fake_openai(monkeypatch, replies, requests):
    """Cliente de modelo que devolve as respostas na ordem informada."""

    class FakeResponses:
        def create(self, **kwargs):
            requests.append(kwargs)
            return replies.pop(0)

    monkeypatch.setitem(
        sys.modules,
        "openai",
        SimpleNamespace(OpenAI=lambda: SimpleNamespace(responses=FakeResponses())),
    )
    monkeypatch.setenv("OPENAI_API_KEY", "chave-openai-de-teste")
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")


def _routes_call(arguments: dict) -> SimpleNamespace:
    return SimpleNamespace(
        type="function_call",
        name="calcular_rotas_para_upas",
        arguments=json.dumps(arguments),
        call_id="call_routes",
    )


def _two_route_estimates(latitude, longitude, units, mode):
    """Upa Perto em 9 minutos, Upa Longe em 4: a mais rápida é a segunda."""
    return [
        assistant.openrouteservice.RouteEstimate(0, 3.1, 9),
        assistant.openrouteservice.RouteEstimate(1, 9.4, 4),
    ]


def test_route_link_follows_the_unit_named_in_the_reply(monkeypatch, seeded):
    """O botão leva à unidade que o texto recomendou, não à mais rápida.

    A ferramenta ordena por tempo, mas o modelo pode indicar a outra porque a
    primeira está fechada. Um botão apontando para outro endereço, numa
    urgência, é pior do que botão nenhum.
    """
    monkeypatch.setattr(
        assistant.openrouteservice, "compute_route_matrix", _two_route_estimates
    )
    requests: list[dict] = []
    _fake_openai(
        monkeypatch,
        [
            SimpleNamespace(output=[_routes_call({"limite": 2})], output_text=""),
            SimpleNamespace(output=[], output_text="Procure a Upa Perto."),
        ],
        requests,
    )

    _, _, route_url = assistant.reply_to("qual devo procurar?", -23.55, -46.63, "SP")

    # A Upa Longe é a mais rápida (4 min) e encabeça a lista da ferramenta.
    payload = json.loads(
        next(
            item["output"]
            for item in requests[1]["input"]
            if isinstance(item, dict) and item.get("type") == "function_call_output"
        )
    )
    assert payload["unidades"][0]["nome"] == "Upa Longe"

    # Mesmo assim o link é o da Upa Perto, a citada na resposta.
    assert route_url is not None
    assert "destination=-23.550000%2C-46.630000" in route_url


def test_route_link_is_dropped_when_the_reply_names_two_units(monkeypatch, seeded):
    """Com duas unidades citadas não há resposta certa; o botão some.

    A ordem das menções não revela a recomendação: em "a Upa Longe está
    fechada, vá à Upa Perto" o primeiro nome é justamente o descartado.
    """
    monkeypatch.setattr(
        assistant.openrouteservice, "compute_route_matrix", _two_route_estimates
    )
    _fake_openai(
        monkeypatch,
        [
            SimpleNamespace(output=[_routes_call({"limite": 2})], output_text=""),
            SimpleNamespace(
                output=[],
                output_text="A Upa Longe está fechada agora; vá à Upa Perto.",
            ),
        ],
        [],
    )

    _, _, route_url = assistant.reply_to("qual devo procurar?", -23.55, -46.63, "SP")

    assert route_url is None


def test_route_link_is_dropped_when_the_reply_names_no_unit(monkeypatch, seeded):
    """Sem menção reconhecível no texto, não mostramos botão de rota."""
    monkeypatch.setattr(
        assistant.openrouteservice,
        "compute_route_matrix",
        lambda latitude, longitude, units, mode: [
            assistant.openrouteservice.RouteEstimate(0, 3.1, 9)
        ],
    )
    _fake_openai(
        monkeypatch,
        [
            SimpleNamespace(output=[_routes_call({"limite": 1})], output_text=""),
            SimpleNamespace(
                output=[],
                output_text="Não consigo confirmar o trajeto agora. Ligue 192.",
            ),
        ],
        [],
    )

    _, _, route_url = assistant.reply_to("quanto tempo leva?", -23.55, -46.63, "SP")

    assert route_url is None


def test_routes_tool_looks_beyond_the_matrix_cap_for_precise_units(monkeypatch):
    """Unidades imprecisas não podem empurrar as boas para fora da lista.

    Filtrar a precisão depois do corte descartaria unidades utilizáveis só
    porque vieram atrás das imprecisas na ordenação por linha reta.
    """
    monkeypatch.setenv("OPENROUTESERVICE_API_KEY", "chave-ors-de-teste")
    pedidos = {}

    def fake_find_nearby(latitude, longitude, uf_code, limit):
        pedidos["limit"] = limit
        imprecisas = [
            assistant.Upa(
                id=f"i{index}",
                cnes=f"i{index}",
                name=f"Upa Imprecisa {index}",
                neighborhood="Centro",
                address="Rua A",
                latitude=-23.55,
                longitude=-46.63,
                distanceKm=float(index),
                locationPrecision="aproximada",
            )
            for index in range(assistant.MAX_ROUTE_UNIT_LIMIT)
        ]
        boa = assistant.Upa(
            id="ok",
            cnes="ok",
            name="Upa Confiável",
            neighborhood="Centro",
            address="Rua B",
            latitude=-23.56,
            longitude=-46.64,
            distanceKm=9.0,
            locationPrecision="exata",
        )
        return (imprecisas + [boa])[:limit]

    monkeypatch.setattr(assistant, "find_nearby", fake_find_nearby)
    monkeypatch.setattr(
        assistant.openrouteservice,
        "compute_route_matrix",
        lambda latitude, longitude, units, mode: [
            assistant.openrouteservice.RouteEstimate(0, 5.0, 14)
        ],
    )

    payload = json.loads(
        assistant._run_routes_tool({"limite": 3}, -23.55, -46.63, "SP")
    )

    assert pedidos["limit"] == assistant.MAX_UNIT_LIMIT
    assert [unit["nome"] for unit in payload["unidades"]] == ["Upa Confiável"]
