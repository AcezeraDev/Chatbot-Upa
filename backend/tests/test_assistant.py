"""Testes do assistente com modelo de linguagem.

Nenhum teste toca a rede: o cliente do modelo é substituído. O que interessa
aqui não é o texto que o modelo produz, e sim as amarras em volta dele.
"""

import json

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
    monkeypatch.setenv("GEMINI_API_KEY", "chave-de-teste")
    monkeypatch.setattr(assistant, "_ask_model", _ClienteQueExplode)

    reply, kind = assistant.reply_to("estou com dor no peito", -23.55, -46.63, "SP")

    assert kind == "emergency"
    assert reply == EMERGENCY_REPLY


def test_falls_back_to_rules_without_api_key(monkeypatch, seeded):
    """Sem chave configurada, o serviço responde por regra fixa."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    reply, kind = assistant.reply_to("qual a mais perto?", -23.55, -46.63, "SP")

    assert kind != "assistant"
    assert "Upa Perto" in reply


def test_falls_back_to_rules_when_the_model_fails(monkeypatch, seeded):
    """Falha do modelo não pode virar erro para quem perguntou."""
    monkeypatch.setenv("GEMINI_API_KEY", "chave-de-teste")

    def explode(*args, **kwargs):
        raise RuntimeError("cota esgotada")

    monkeypatch.setattr(assistant, "_ask_model", explode)

    reply, kind = assistant.reply_to("qual a mais perto?", -23.55, -46.63, "SP")

    assert kind != "assistant"
    assert "Upa Perto" in reply


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
