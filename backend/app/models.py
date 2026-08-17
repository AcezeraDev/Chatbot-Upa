from typing import Literal

from pydantic import BaseModel, Field


QueueStatus = Literal["low", "moderate", "high"]


class Upa(BaseModel):
    id: str
    name: str
    neighborhood: str
    address: str
    waitMinutes: int = Field(ge=0)
    patients: int = Field(ge=0)
    status: QueueStatus
    lastUpdated: str
    distanceKm: float | None = Field(default=None, ge=0)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class ChatResponse(BaseModel):
    reply: str
    source: Literal["demo"] = "demo"
    tool: Literal["get_wait_times"] = "get_wait_times"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "upa-agora-api"

