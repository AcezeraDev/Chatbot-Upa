"""Testes do limite de requisições."""

import pytest
from fastapi.testclient import TestClient

from app import ratelimit
from app.main import app


@pytest.fixture(autouse=True)
def contagem_limpa():
    ratelimit.reset()
    yield
    ratelimit.reset()


@pytest.fixture
def client():
    return TestClient(app)


def _chamar(client, ip: str):
    return client.get("/api/ufs", headers={"X-Forwarded-For": ip})


def test_blocks_after_the_read_limit(client, monkeypatch):
    """Passado o teto, a resposta é 429 com Retry-After."""
    monkeypatch.setattr(ratelimit, "READ_LIMIT", 3)

    for _ in range(3):
        assert _chamar(client, "10.0.0.1").status_code == 200

    excedida = _chamar(client, "10.0.0.1")
    assert excedida.status_code == 429
    assert "Retry-After" in excedida.headers
    assert "Muitas requisições" in excedida.json()["detail"]


def test_limits_are_per_client(client, monkeypatch):
    """Um cliente abusivo não derruba os outros."""
    monkeypatch.setattr(ratelimit, "READ_LIMIT", 2)

    for _ in range(2):
        _chamar(client, "10.0.0.1")
    assert _chamar(client, "10.0.0.1").status_code == 429

    assert _chamar(client, "10.0.0.2").status_code == 200


def test_chat_has_a_tighter_limit_than_reads():
    """O assistente é o endpoint caro e precisa do teto mais baixo.

    Cada mensagem pode virar uma chamada paga ao modelo; os demais endpoints
    só leem dados já em memória.
    """
    assert ratelimit.CHAT_LIMIT < ratelimit.READ_LIMIT


def test_chat_blocks_after_its_own_limit(client, monkeypatch):
    monkeypatch.setattr(ratelimit, "CHAT_LIMIT", 2)
    corpo = {"message": "ola", "uf": "SP"}

    for _ in range(2):
        resposta = client.post("/api/chat", json=corpo, headers={"X-Forwarded-For": "10.0.0.3"})
        assert resposta.status_code == 200

    excedida = client.post("/api/chat", json=corpo, headers={"X-Forwarded-For": "10.0.0.3"})
    assert excedida.status_code == 429


def test_health_is_never_limited(client, monkeypatch):
    """Monitoramento não pode ser bloqueado pelo próprio limitador."""
    monkeypatch.setattr(ratelimit, "READ_LIMIT", 1)

    for _ in range(5):
        assert client.get("/health", headers={"X-Forwarded-For": "10.0.0.4"}).status_code == 200


def test_tracked_clients_do_not_grow_without_bound(monkeypatch):
    """IPs inativos são descartados, senão o limitador vira vazamento.

    O X-Forwarded-For é falsificável: sem esta poda, variá-lo a cada
    requisição faria o dicionário crescer sem fim.
    """
    monkeypatch.setattr(ratelimit, "MAX_TRACKED_CLIENTS", 5)
    monkeypatch.setattr(ratelimit, "WINDOW_SECONDS", 0)

    class _Fake:
        def __init__(self, ip):
            self.headers = {"x-forwarded-for": ip}
            self.client = None

    for i in range(50):
        ratelimit.check(_Fake(f"10.1.0.{i}"), limit=100)

    assert len(ratelimit._hits) <= ratelimit.MAX_TRACKED_CLIENTS + 1
