"""Resolução de CEP pela BrasilAPI, para quando não há GPS.

Sem coordenada o produto degrada muito: `find_nearby` não tem de onde medir e
a única saída era listar o estado inteiro fora de ordem. Um CEP devolve um
ponto bom o bastante para ordenar unidades por proximidade — e a pessoa que
negou a localização quase sempre sabe o próprio CEP.

A BrasilAPI não exige cadastro nem chave: nada aqui é segredo, ao contrário de
`openrouteservice.py`. Ela agrega Correios, ViaCEP, WideNet e open-cep e
devolve o primeiro que responder, o que a torna mais resistente à queda de um
provedor do que bater direto em qualquer um deles.

Duas armadilhas medidas na API real e tratadas abaixo:

- `location` **pode não vir**. Numa amostra de CEPs de capitais, um em oito
  voltou sem coordenada. Quem chama precisa saber lidar com isso, então
  `coordinates` é opcional no resultado em vez de virar erro.
- `timezoneName` **não é confiável**: para um CEP do Acre a API devolve
  `America/La_Paz`, que é UTC-4, enquanto o Acre é UTC-5. A tabela de
  `schedule.py` está certa e continua sendo a fonte do fuso. O campo é
  deliberadamente ignorado aqui.
"""

from __future__ import annotations

import math
import os
import re
import threading
from dataclasses import dataclass

import httpx

from .ufs import UF, resolve_uf


CEP_URL = "https://brasilapi.com.br/api/cep/v2/{cep}"

DEFAULT_TIMEOUT_SECONDS = 6.0
MIN_TIMEOUT_SECONDS = 1.0
MAX_TIMEOUT_SECONDS = 20.0

# CEP é dado praticamente imutável e a API responde com `Cache-Control:
# max-age=0`, então nenhuma CDN guarda por nós. O cache é pequeno de propósito:
# no serverless cada instância tem o seu, e ele existe para poupar a rajada de
# uma mesma pessoa, não para virar banco de dados.
MAX_CACHED_CEPS = 512

_CEP_PATTERN = re.compile(r"\b(\d{5})[-.\s]?(\d{3})\b")

_cache: dict[str, CepLocation] = {}
_cache_lock = threading.Lock()


class BrasilApiError(RuntimeError):
    """Erro seguro e esperado ao consultar a BrasilAPI."""


class CepNotFoundError(BrasilApiError):
    """Nenhum provedor reconheceu o CEP informado."""


@dataclass(frozen=True)
class CepLocation:
    cep: str
    state: UF
    city: str
    neighborhood: str | None
    street: str | None
    latitude: float | None
    longitude: float | None

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    def as_address(self) -> str:
        """Endereço estruturado, para quando não veio coordenada.

        Mesmo sem o ponto, o CEP nos dá rua e cidade já normalizadas — bem
        melhor do que mandar o texto cru da pessoa para um geocodificador.
        """
        partes = [parte for parte in (self.street, self.neighborhood, self.city) if parte]
        return ", ".join(partes) if partes else self.city


def find_cep(text: str) -> str | None:
    """Primeiro CEP reconhecível em um texto livre, só com os oito dígitos."""
    match = _CEP_PATTERN.search(str(text))
    return f"{match.group(1)}{match.group(2)}" if match else None


def normalize_cep(cep: str) -> str:
    """Deixa apenas dígitos e exige os oito de um CEP brasileiro."""
    digits = re.sub(r"\D", "", str(cep))
    if len(digits) != 8:
        raise CepNotFoundError("Informe um CEP com oito dígitos.")
    return digits


def _timeout_seconds() -> float:
    try:
        raw = float(os.getenv("BRASILAPI_TIMEOUT", "") or DEFAULT_TIMEOUT_SECONDS)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    if not math.isfinite(raw):
        return DEFAULT_TIMEOUT_SECONDS
    return max(MIN_TIMEOUT_SECONDS, min(raw, MAX_TIMEOUT_SECONDS))


def _timeout() -> httpx.Timeout:
    seconds = _timeout_seconds()
    return httpx.Timeout(seconds, connect=min(3.0, seconds))


def _coordinate(raw: object) -> float | None:
    """A API devolve latitude e longitude como string; validamos a faixa."""
    try:
        value = float(str(raw))
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def _parse(payload: object, cep: str) -> CepLocation:
    if not isinstance(payload, dict):
        raise BrasilApiError("Resposta de CEP inválida.")

    state = resolve_uf(str(payload.get("state") or ""))
    city = str(payload.get("city") or "").strip()
    if state is None or not city:
        raise BrasilApiError("Resposta de CEP incompleta.")

    latitude = longitude = None
    location = payload.get("location")
    if isinstance(location, dict):
        coordinates = location.get("coordinates")
        if isinstance(coordinates, dict):
            latitude = _coordinate(coordinates.get("latitude"))
            longitude = _coordinate(coordinates.get("longitude"))

    # Um par pela metade, ou fora da faixa, não serve para medir distância.
    if (
        latitude is None
        or longitude is None
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        latitude = longitude = None

    def _texto(chave: str) -> str | None:
        valor = payload.get(chave)
        return str(valor).strip() or None if valor else None

    return CepLocation(
        cep=cep,
        state=state,
        city=city,
        neighborhood=_texto("neighborhood"),
        street=_texto("street"),
        latitude=latitude,
        longitude=longitude,
    )


def _remember(cep: str, location: CepLocation) -> None:
    with _cache_lock:
        if len(_cache) >= MAX_CACHED_CEPS:
            _cache.clear()
        _cache[cep] = location


def clear_cache() -> None:
    """Usado pelos testes; o cache não tem invalidação em produção."""
    with _cache_lock:
        _cache.clear()


def lookup_cep(cep: str) -> CepLocation:
    """Converte um CEP em cidade, estado e — quando houver — coordenada."""
    normalized = normalize_cep(cep)

    with _cache_lock:
        cached = _cache.get(normalized)
    if cached is not None:
        return cached

    try:
        with httpx.Client(timeout=_timeout(), headers={"Accept": "application/json"}) as client:
            response = client.get(CEP_URL.format(cep=normalized))
            if response.status_code == 404:
                raise CepNotFoundError("CEP não encontrado.")
            response.raise_for_status()
            payload = response.json()
    except CepNotFoundError:
        raise
    except (httpx.HTTPError, ValueError):
        # O corpo do erro da BrasilAPI lista os provedores que falharam; é
        # ruído para quem está no aplicativo e não deve vazar.
        raise BrasilApiError("Não foi possível consultar o CEP agora.") from None

    location = _parse(payload, normalized)
    _remember(normalized, location)
    return location
