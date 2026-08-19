import os

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
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

# CORS fecha por padrão. O app é nativo (não envia cabeçalho Origin, então CORS
# nem se aplica a ele) e a página inicial é servida pelo próprio backend, na mesma
# origem — nenhum dos dois precisa de CORS aberto. Deixar "*" como padrão só servia
# para um site de terceiros mandar o navegador de seus visitantes bater no endpoint
# pago /api/chat. Se um dia existir um front web em outra origem, liste-a em
# CORS_ORIGINS (separada por vírgula). "*" continua possível, mas agora é opção
# explícita, não o padrão.
configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# Cabeçalhos de segurança em toda resposta. Nenhum conteúdo não confiável é
# renderizado pelo servidor, então isto é higiene — mas o Referrer-Policy também
# evita que a URL de /api/upas/nearby (com coordenada) vaze no cabeçalho Referer.
@app.middleware("http")
async def _security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
    )
    return response


@app.exception_handler(RequestValidationError)
async def _validation_handler(request: Request, exc: RequestValidationError):
    """422 sem ecoar de volta a entrada do usuário.

    O tratamento padrão devolve o campo `input` com o valor enviado — inclusive a
    mensagem do chat, que pode conter dado de saúde. Não há motivo para repetir a
    entrada na resposta; removemos `input` e `url` de cada erro.
    """
    limpos = []
    for erro in exc.errors():
        erro = {chave: valor for chave, valor in erro.items() if chave not in ("input", "url")}
        limpos.append(erro)
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(limpos)})


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
    # A página só conversa com a própria origem. A CSP prende tudo a 'self' e
    # bloqueia enquadramento; 'unsafe-inline' é necessário porque o script e os
    # estilos são inline no arquivo. Aplicada só aqui: uma CSP global quebraria o
    # Swagger em /docs, que carrega assets de CDN.
    csp = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; "
        "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    )
    if not HOME_PAGE.exists():
        return HTMLResponse(
            "<h1>UPA Agora API</h1><p>Documentacao em <a href=/docs>/docs</a>.</p>",
            headers={"Content-Security-Policy": csp},
        )
    return HTMLResponse(
        HOME_PAGE.read_text(encoding="utf-8"),
        headers={"Content-Security-Policy": csp},
    )


@app.get("/api/meta", tags=["system"], dependencies=[Depends(limit_read)])
def meta() -> dict:
    """Metadados do cadastro e a hora que o servidor está usando.

    A hora entra aqui porque o "aberto agora" depende dela: sem expô-la, uma
    divergência de fuso entre a máquina de desenvolvimento e a de produção só
    apareceria como unidade marcada errado, sem pista da causa.
    """
    from .schedule import now_in

    agora = now_in("SP")
    return {
        **seed_metadata(),
        "horaServidor": agora.isoformat(),
        "fusoServidor": str(agora.tzinfo),
    }


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
    abertas: bool = Query(
        default=False,
        description=(
            "Descarta as que sabidamente estão fechadas agora. As de horário "
            "indeterminado permanecem, com aviso."
        ),
    ),
) -> list[Upa]:
    """Unidades mais próximas do ponto informado, da mais perto para a mais longe."""
    return _guard_cnes(
        find_nearby, lat, lon, _uf_code_or_400(uf), limit, only_open=abertas
    )


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
