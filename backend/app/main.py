import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .domain import create_chat_reply
from .models import ChatRequest, ChatResponse, HealthResponse, Upa
from .repository import get_best_upa, list_upas


app = FastAPI(
    title="UPA Agora API",
    description="API demonstrativa para consulta de tempos fictícios de espera em UPAs.",
    version="0.1.0",
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


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/upas", response_model=list[Upa], tags=["wait-times"])
def get_upas() -> list[Upa]:
    return list_upas()


@app.get("/api/upas/best", response_model=Upa, tags=["wait-times"])
def get_best() -> Upa:
    return get_best_upa()


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
def chat(payload: ChatRequest) -> ChatResponse:
    reply = create_chat_reply(payload.message, list_upas())
    return ChatResponse(reply=reply)

