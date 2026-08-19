"""Cliente da API pública de dados abertos do CNES (Ministério da Saúde).

A API não exige autenticação, devolve no máximo 20 registros por página e
mantém os dados de estabelecimentos com atualização mensal. Por isso as
páginas são buscadas de forma concorrente e o resultado fica em cache
(memória + disco) por 24 horas.
"""

from __future__ import annotations

import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import httpx

from .geo import haversine_km
from .models import Upa


CNES_BASE_URL = os.getenv(
    "CNES_BASE_URL", "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos"
)

# 73 = PRONTO ATENDIMENTO no CNES. Cobre UPAs, PAs municipais e AMAs.
TIPO_UNIDADE_PRONTO_ATENDIMENTO = 73

PAGE_SIZE = 20            # limite fixo imposto pela API
CONCURRENT_PAGES = 8      # páginas buscadas por vez
MAX_PAGES = 200           # trava de segurança (4000 unidades por UF)
CACHE_TTL_SECONDS = int(os.getenv("CNES_CACHE_TTL", str(24 * 60 * 60)))
REQUEST_TIMEOUT = 20.0

# Em serverless o único caminho gravável é /tmp, e mesmo ele não sobrevive ao
# cold start. A escrita é otimização: se falhar, a leitura cai no seed.
_DEFAULT_CACHE_DIR = (
    Path("/tmp/cnes-cache")
    if os.getenv("VERCEL")
    else Path(__file__).resolve().parent.parent / ".cache"
)
CACHE_DIR = Path(os.getenv("CNES_CACHE_DIR", _DEFAULT_CACHE_DIR))

# Cadastro embarcado no deploy. Em ambiente serverless não há disco
# persistente: o cache gravável nasce vazio a cada cold start e baixar a UF
# inteira dentro da requisição seria lento demais. O seed é lido sem TTL —
# ele envelhece por redeploy, não por relógio. Gerado por scripts/build_cnes_seed.py.
SEED_DIR = Path(os.getenv("CNES_SEED_DIR", Path(__file__).resolve().parent.parent / "data" / "cnes"))

_memory_cache: dict[int, tuple[float, list[Upa]]] = {}
_lock = threading.Lock()


class CnesUnavailableError(RuntimeError):
    """A API do CNES não respondeu a tempo ou devolveu erro."""


def _cache_file(uf_code: int) -> Path:
    return CACHE_DIR / f"upas-uf-{uf_code}.json"


def _read_disk_cache(uf_code: int) -> list[dict[str, Any]] | None:
    path = _cache_file(uf_code)
    if not path.exists():
        return None
    if time.time() - path.stat().st_mtime > CACHE_TTL_SECONDS:
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _read_seed(uf_code: int) -> list[dict[str, Any]] | None:
    """Cadastro embarcado no deploy, usado quando não há cache gravável válido."""
    path = SEED_DIR / f"upas-uf-{uf_code}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _write_disk_cache(uf_code: int, raw: list[dict[str, Any]]) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _cache_file(uf_code).write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    except OSError:
        # Cache é otimização, nunca motivo para derrubar a requisição.
        pass


def _fetch_page(client: httpx.Client, uf_code: int, offset: int) -> list[dict[str, Any]]:
    response = client.get(
        CNES_BASE_URL,
        params={
            "codigo_uf": uf_code,
            "codigo_tipo_unidade": TIPO_UNIDADE_PRONTO_ATENDIMENTO,
            "limit": PAGE_SIZE,
            "offset": offset,
        },
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("estabelecimentos", []) if isinstance(payload, dict) else []


def _fetch_all_pages(uf_code: int) -> list[dict[str, Any]]:
    """Percorre a paginação em ondas concorrentes até uma onda vir incompleta."""
    collected: list[dict[str, Any]] = []

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers={"Accept": "application/json"}) as client:
            with ThreadPoolExecutor(max_workers=CONCURRENT_PAGES) as pool:
                page = 0
                while page < MAX_PAGES:
                    offsets = [(page + index) * PAGE_SIZE for index in range(CONCURRENT_PAGES)]
                    waves = list(pool.map(lambda off: _fetch_page(client, uf_code, off), offsets))

                    for chunk in waves:
                        collected.extend(chunk)

                    # Uma página menor que PAGE_SIZE significa fim dos resultados.
                    if any(len(chunk) < PAGE_SIZE for chunk in waves):
                        break
                    page += CONCURRENT_PAGES
    except httpx.HTTPError as error:
        raise CnesUnavailableError(str(error)) from error

    return collected


def _to_upa(raw: dict[str, Any]) -> Upa | None:
    """Converte um registro cru do CNES no modelo do app.

    Descarta unidades desabilitadas ou sem coordenadas — sem latitude e
    longitude não é possível calcular distância, e mostrar uma unidade sem
    saber onde ela fica seria pior do que omiti-la.
    """
    if raw.get("codigo_motivo_desabilitacao_estabelecimento"):
        return None

    latitude = raw.get("latitude_estabelecimento_decimo_grau")
    longitude = raw.get("longitude_estabelecimento_decimo_grau")
    if latitude is None or longitude is None:
        return None

    street = (raw.get("endereco_estabelecimento") or "").strip()
    number = (raw.get("numero_estabelecimento") or "").strip()
    address = f"{street}, {number}".strip(", ") if street else "Endereço não informado"

    name = (raw.get("nome_fantasia") or raw.get("nome_razao_social") or "Unidade sem nome").strip()

    return Upa(
        id=str(raw.get("codigo_cnes")),
        cnes=str(raw.get("codigo_cnes")),
        name=name.title(),
        neighborhood=(raw.get("bairro_estabelecimento") or "").strip().title() or "Bairro não informado",
        address=address.title(),
        latitude=float(latitude),
        longitude=float(longitude),
        phone=(raw.get("numero_telefone_estabelecimento") or "").strip() or None,
        openingHours=(raw.get("descricao_turno_atendimento") or "").strip().capitalize() or None,
        cep=(raw.get("codigo_cep_estabelecimento") or "").strip() or None,
        cityCode=raw.get("codigo_municipio"),
        lastUpdated=raw.get("data_atualizacao"),
    )


# Unidades mais próximas que isto, com CEPs de distritos diferentes, não
# podem estar todas no mesmo lugar: é o sinal do erro de geocodificação.
CLUSTER_RADIUS_KM = 0.5
CLUSTER_MIN_UNITS = 3


def detect_unreliable_coordinates(units: list[Upa]) -> list[Upa]:
    """Marca unidades cuja coordenada do CNES é o centroide do município.

    Parte dos registros do CNES não foi geocodificada pelo endereço: recebeu
    o ponto central da cidade. O sintoma é um amontoado de unidades no mesmo
    ponto com CEPs de distritos distintos — algo geograficamente impossível.

    Heurística, não certeza: pode marcar como aproximada uma unidade correta
    em região central muito densa. Preferimos o falso positivo, porque avisar
    à toa é menos grave do que afirmar uma distância errada.
    """
    from collections import defaultdict

    by_city: dict[int | None, list[Upa]] = defaultdict(list)
    for unit in units:
        by_city[unit.cityCode].append(unit)

    suspicious: set[str] = set()
    for city_units in by_city.values():
        if len(city_units) < CLUSTER_MIN_UNITS:
            continue
        for anchor in city_units:
            neighbours = [
                other
                for other in city_units
                if haversine_km(anchor.latitude, anchor.longitude, other.latitude, other.longitude)
                <= CLUSTER_RADIUS_KM
            ]
            if len(neighbours) < CLUSTER_MIN_UNITS:
                continue
            districts = {unit.cep[:5] for unit in neighbours if unit.cep}
            if len(districts) >= CLUSTER_MIN_UNITS:
                suspicious.update(unit.id for unit in neighbours)

    if not suspicious:
        return units

    return [
        unit.model_copy(update={"locationPrecision": "aproximada"}) if unit.id in suspicious else unit
        for unit in units
    ]


def list_units_by_uf(uf_code: int) -> list[Upa]:
    """Todas as unidades de pronto atendimento de uma UF, com cache."""
    with _lock:
        cached = _memory_cache.get(uf_code)
        if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
            return cached[1]

    raw = _read_disk_cache(uf_code)
    if raw is None:
        raw = _read_seed(uf_code)
    if raw is None:
        raw = _fetch_all_pages(uf_code)
        if raw:
            _write_disk_cache(uf_code, raw)

    units = [unit for unit in (_to_upa(item) for item in raw) if unit is not None]
    units = detect_unreliable_coordinates(units)

    with _lock:
        _memory_cache[uf_code] = (time.time(), units)

    return units


def seed_metadata() -> dict[str, Any]:
    """Resumo do cadastro embarcado, para a pagina inicial mostrar ao visitante."""
    estados = sorted(SEED_DIR.glob("upas-uf-*.json"))
    unidades = 0
    for arquivo in estados:
        try:
            unidades += len(json.loads(arquivo.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue

    gerado_em = None
    marcador = SEED_DIR / "gerado-em.json"
    if marcador.exists():
        try:
            gerado_em = json.loads(marcador.read_text(encoding="utf-8")).get("geradoEm")
        except (json.JSONDecodeError, OSError):
            pass

    return {"estados": len(estados), "unidades": unidades, "dadosGeradoEm": gerado_em}


def clear_cache() -> None:
    """Usado pelos testes e por uma eventual rotina de atualização."""
    with _lock:
        _memory_cache.clear()
