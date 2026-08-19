"""Limite de requisições por IP.

A API é pública e sem autenticação. Sem limite, um laço mal escrito — ou
alguém mal-intencionado — consome a cota de execuções do Vercel e, depois que
o assistente ganha uma chave, dinheiro real a cada mensagem. Por isso o
/api/chat tem teto bem mais baixo que os demais.

**Limitação honesta desta implementação:** a contagem vive na memória do
processo. Em serverless há várias instâncias e elas não se conversam, então o
teto real é por instância, não global, e zera a cada partida fria. Isso barra
o laço acidental e o abuso ingênuo, que é o risco de fato aqui; não é defesa
contra ataque distribuído. Para um teto global seria preciso um armazenamento
compartilhado (Redis, Vercel KV) ou o firewall da plataforma.
"""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

# O assistente é o endpoint caro: cada mensagem pode virar uma chamada paga ao
# modelo. Os demais só leem dados já em memória.
CHAT_LIMIT = int(os.getenv("RATE_LIMIT_CHAT", "10"))
READ_LIMIT = int(os.getenv("RATE_LIMIT_READ", "120"))

# Teto de IPs rastreados ao mesmo tempo. Sem ele, um atacante variando o
# X-Forwarded-For faria o dicionário crescer sem fim — o limitador viraria o
# próprio vazamento de memória que deveria evitar.
MAX_TRACKED_CLIENTS = 10_000

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def client_key(request: Request) -> str:
    """Identifica quem chama.

    Na Vercel o IP real do cliente chega em `x-vercel-forwarded-for`, que a
    plataforma preenche e o cliente não consegue sobrescrever — ela reescreve o
    `x-forwarded-for` justamente para impedir spoofing de IP. Por isso preferimos
    o cabeçalho da Vercel; o `x-forwarded-for` fica como reserva para rodar atrás
    de outro proxy ou local.

    Ainda assim, isto é proteção contra excesso, não controle de acesso: fora da
    Vercel o `x-forwarded-for` é falsificável, e a contagem vive na memória de cada
    instância (ver o cabeçalho do módulo). Um teto global de verdade precisa da
    borda — Vercel Firewall/WAF — mais um limite de gasto na chave do modelo.
    """
    encaminhado = request.headers.get("x-vercel-forwarded-for") or request.headers.get(
        "x-forwarded-for", ""
    )
    if encaminhado:
        return encaminhado.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def _limpar_antigos(marcas: deque[float], agora: float) -> None:
    while marcas and agora - marcas[0] >= WINDOW_SECONDS:
        marcas.popleft()


def check(request: Request, limit: int) -> None:
    """Registra a requisição e levanta 429 se o cliente passou do teto."""
    chave = client_key(request)
    agora = time.monotonic()

    with _lock:
        marcas = _hits[chave]
        _limpar_antigos(marcas, agora)

        if len(marcas) >= limit:
            espera = int(WINDOW_SECONDS - (agora - marcas[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=(
                    "Muitas requisições em pouco tempo. "
                    f"Tente novamente em {espera} segundos."
                ),
                headers={"Retry-After": str(espera)},
            )

        marcas.append(agora)

        if len(_hits) > MAX_TRACKED_CLIENTS:
            _descartar_inativos(agora)


def _descartar_inativos(agora: float) -> None:
    """Remove clientes sem requisição dentro da janela. Chamado sob o lock."""
    vencidos = [
        chave
        for chave, marcas in _hits.items()
        if not marcas or agora - marcas[-1] >= WINDOW_SECONDS
    ]
    for chave in vencidos:
        del _hits[chave]


def limit_read(request: Request) -> None:
    """Dependência do FastAPI para os endpoints de leitura."""
    check(request, READ_LIMIT)


def limit_chat(request: Request) -> None:
    """Dependência do FastAPI para o assistente, o endpoint caro."""
    check(request, CHAT_LIMIT)


def reset() -> None:
    """Zera a contagem. Usado pelos testes."""
    with _lock:
        _hits.clear()
