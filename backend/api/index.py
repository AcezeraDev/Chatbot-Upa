"""Entrypoint da função serverless no Vercel.

O Vercel procura um objeto ASGI chamado `app` neste módulo. O aplicativo em si
continua em app/main.py, sem nada específico de hospedagem.
"""

from app.main import app

__all__ = ["app"]
