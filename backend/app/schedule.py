"""Interpretação do horário de atendimento do CNES.

Às três da manhã, saber se a unidade está aberta importa mais do que saber
qual é a mais próxima: 16% das unidades do cadastro não funcionam 24 horas, e
apresentar uma delas como "a mais próxima" na madrugada é o mesmo erro do
tempo de fila inventado — informação que parece útil e leva ao lugar errado.

O campo `descricao_turno_atendimento` parece texto livre, mas em 2061 unidades
há apenas 7 valores distintos. É vocabulário fechado, e por isso dá para
classificá-lo com segurança.

O que **não** dá para saber: o CNES informa "manhã, tarde e noite" sem dizer
que horas isso significa. As faixas abaixo são convenção nossa, não dado — por
isso essas unidades saem com precisão "estimada", e só as de 24 horas saem como
"exata".
"""

from __future__ import annotations

import unicodedata
from datetime import datetime, time
from zoneinfo import ZoneInfo


# O Brasil tem quatro fusos. Usar um só faria o app errar em até três horas no
# Acre, justamente onde há menos unidades para escolher.
_FUSO_POR_UF = {
    "AC": "America/Rio_Branco",
    "AM": "America/Manaus",
    "RO": "America/Porto_Velho",
    "RR": "America/Boa_Vista",
    "MT": "America/Cuiaba",
    "MS": "America/Campo_Grande",
}
_FUSO_PADRAO = "America/Sao_Paulo"

# Convenção nossa para os turnos, não informação do CNES. Ver o cabeçalho.
MANHA = (time(7, 0), time(12, 0))
TARDE = (time(12, 0), time(18, 0))
NOITE = (time(18, 0), time(23, 0))


def _normalizar(valor: str) -> str:
    decomposto = unicodedata.normalize("NFD", valor)
    sem_acento = "".join(c for c in decomposto if not unicodedata.combining(c))
    return " ".join(sem_acento.casefold().split())


def classify(descricao: str | None) -> str:
    """Classifica a descrição do CNES em um dos quatro tipos conhecidos.

    Devolve "24h", "turnos", "intermitente" ou "desconhecido".
    """
    if not descricao:
        return "desconhecido"

    texto = _normalizar(descricao)

    if "24 horas" in texto or "continuo" in texto:
        return "24h"
    if "intermitente" in texto:
        return "intermitente"
    if "turno" in texto or "somente" in texto:
        return "turnos"
    return "desconhecido"


def _turnos_da_descricao(descricao: str) -> list[tuple[time, time]]:
    """Extrai as faixas de horário citadas na descrição."""
    texto = _normalizar(descricao)
    faixas: list[tuple[time, time]] = []
    if "manha" in texto:
        faixas.append(MANHA)
    if "tarde" in texto:
        faixas.append(TARDE)
    if "noite" in texto:
        faixas.append(NOITE)
    return faixas


def now_in(uf_sigla: str | None) -> datetime:
    """Hora local do estado da unidade."""
    fuso = _FUSO_POR_UF.get((uf_sigla or "").upper(), _FUSO_PADRAO)
    return datetime.now(ZoneInfo(fuso))


def open_now(
    descricao: str | None,
    uf_sigla: str | None = None,
    agora: datetime | None = None,
) -> tuple[bool | None, str]:
    """Diz se a unidade está aberta agora.

    Devolve (aberta, precisão), onde precisão é:

    - "exata": atendimento contínuo de 24 horas, não há o que estimar.
    - "estimada": a unidade atende por turnos e nós supomos os horários.
    - "desconhecida": turnos intermitentes ou campo vazio — não afirmamos nada,
      e `aberta` vem como None.
    """
    tipo = classify(descricao)

    if tipo == "24h":
        return True, "exata"

    if tipo in ("intermitente", "desconhecido"):
        return None, "desconhecida"

    faixas = _turnos_da_descricao(descricao or "")
    if not faixas:
        return None, "desconhecida"

    momento = (agora or now_in(uf_sigla)).time()
    aberta = any(inicio <= momento < fim for inicio, fim in faixas)
    return aberta, "estimada"
