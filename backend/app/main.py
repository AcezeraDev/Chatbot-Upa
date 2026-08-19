import os

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from .cnes import CnesUnavailableError, seed_metadata
from .assistant import reply_to
from .ratelimit import limit_chat, limit_read
from .models import ChatRequest, ChatResponse, HealthResponse, Upa, UF
from .repository import DEFAULT_RESULT_LIMIT, find_nearby, list_upas
from .ufs import UFS, resolve_uf


app = FastAPI(
    title="UPA Agora API",
    description=(
        "Consulta unidades de pronto atendimento reais a partir do CNES "
        "(Cadastro Nacional de Estabelecimentos de Saúde) e as ordena por "
        "proximidade. Tempo de fila não é fornecido: não existe fonte "
        "pública nacional em tempo real."
    ),
    version="0.2.0",
)

configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


def _uf_code_or_400(uf: str) -> int:
    resolved = resolve_uf(uf)
    if resolved is None:
        raise HTTPException(status_code=400, detail=f"UF desconhecida: {uf}")
    return resolved.code


def _guard_cnes(callable_, *args, **kwargs):
    try:
        return callable_(*args, **kwargs)
    except CnesUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail="A base do CNES está indisponível no momento.",
        ) from error


HOME_PAGE = Path(__file__).resolve().parent / "static" / "home.html"


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def home() -> HTMLResponse:
    """Pagina inicial em portugues.

    O /docs e escrito para quem programa. Esta pagina mostra o mesmo servidor
    em linguagem comum, com os dados reais chegando, para quem so quer ver
    se esta funcionando.
    """
    if not HOME_PAGE.exists():
        return HTMLResponse("<h1>UPA Agora API</h1><p>Documentacao em <a href=/docs>/docs</a>.</p>")
    return HTMLResponse(HOME_PAGE.read_text(encoding="utf-8"))


@app.get("/api/meta", tags=["system"], dependencies=[Depends(limit_read)])
def meta() -> dict:
    """Quantos estados e unidades o cadastro embarcado tem, e quando foi gerado."""
    return seed_metadata()


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/ufs", response_model=list[UF], tags=["locations"], dependencies=[Depends(limit_read)])
def get_ufs() -> list[UF]:
    """Estados disponíveis, usados pelo seletor manual do aplicativo."""
    return list(UFS)


@app.get("/api/upas", response_model=list[Upa], tags=["locations"], dependencies=[Depends(limit_read)])
def get_upas(uf: str = Query(description="Sigla ou nome do estado, ex.: SP")) -> list[Upa]:
    return _guard_cnes(list_upas, _uf_code_or_400(uf))


@app.get("/api/upas/nearby", response_model=list[Upa], tags=["locations"], dependencies=[Depends(limit_read)])
def get_nearby(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    uf: str = Query(description="Sigla ou nome do estado, ex.: SP"),
    limit: int = Query(default=DEFAULT_RESULT_LIMIT, ge=1, le=50),
) -> list[Upa]:
    """Unidades mais próximas do ponto informado, da mais perto para a mais longe."""
    return _guard_cnes(find_nearby, lat, lon, _uf_code_or_400(uf), limit)


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"], dependencies=[Depends(limit_chat)])
def chat(payload: ChatRequest) -> ChatResponse:
    """Assistente.

    A triagem de emergencia e as consultas ao cadastro ficam em assistant.py,
    que decide entre o modelo de linguagem e a regra fixa. Aqui so validamos a
    UF, para que uma sigla errada continue devolvendo 400 em vez de virar
    conversa.
    """
    if payload.uf:
        _uf_code_or_400(payload.uf)

    reply, kind = reply_to(
        payload.message,
        latitude=payload.latitude,
        longitude=payload.longitude,
        uf=payload.uf,
    )
    return ChatResponse(reply=reply, kind=kind)
