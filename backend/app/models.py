from typing import Literal

from pydantic import BaseModel, Field


class Upa(BaseModel):
    """Unidade de pronto atendimento real, vinda do CNES."""

    id: str
    cnes: str
    name: str
    neighborhood: str
    address: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    phone: str | None = None
    openingHours: str | None = None
    cep: str | None = None
    cityCode: int | None = None
    lastUpdated: str | None = None

    # "aproximada" sinaliza que a coordenada do CNES é pouco confiável para
    # esta unidade (ver detect_unreliable_coordinates em cnes.py). O app
    # mostra um aviso e a distância deixa de ser apresentada como precisa.
    locationPrecision: Literal["exata", "aproximada"] = "exata"

    # Distância em linha reta até o usuário. Preenchida apenas nas
    # consultas por proximidade.
    distanceKm: float | None = Field(default=None, ge=0)

    # Ainda não existe fonte pública nacional de fila em tempo real.
    # O campo fica reservado para integrações municipais futuras e o app
    # exibe "não informado" enquanto vier nulo.
    waitMinutes: int | None = Field(default=None, ge=0)
    waitSource: str | None = None


class UF(BaseModel):
    code: int
    sigla: str
    name: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    uf: str | None = None


class ChatResponse(BaseModel):
    reply: str
    kind: Literal["nearest", "list", "emergency", "unavailable", "help"] = "help"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "upa-agora-api"
