"""Interpretação do horário de atendimento do CNES.

Às três da manhã, saber se a unidade está aberta importa mais do que saber
qual é a mais próxima: 16% das unidades do cadastro não funcionam 24 horas, e
apresentar uma delas como "a mais próxima" na madrugada é o mesmo erro do
tempo de fila inventado — informação que parece útil e leva ao lugar errado.

O campo `descricao_turno_atendimento` parece texto livre, mas em 2061 unidades
há apenas 7 valores distintos. É vocabulário fechado, e por isso dá para
classificá-lo com segurança.

O que o CNES **não** informa é que horas cada turno significa, nem em que dias
a unidade abre. As faixas abaixo vêm de horários oficiais publicados, não de
suposição nossa:

- **07h–19h** é o padrão de 12 horas contínuas do Programa Saúde na Hora
  (Portaria nº 397/GM/MS de 2020) e das AMAs de São Paulo. Corresponde a
  "manhã e tarde".
- **07h–22h** é o formato praticado no Distrito Federal para as unidades que
  atendem também à noite. Corresponde a "manhã, tarde e noite".

Compondo os turnos com as faixas abaixo, manhã+tarde fecha exatamente em 07h–19h
e manhã+tarde+noite em 07h–22h — os dois padrões documentados.

Sobre os dias: a própria descrição do CNES para atendimento contínuo diz
"inclui sábados, domingos e feriados", e só ela diz isso. O Saúde na Hora exige
segunda a sexta, com sábado ou domingo apenas em parte dos formatos, e as AMAs
paulistanas abrem de segunda a sábado. Ou seja, dia de semana é garantido e
fim de semana varia por unidade — o que o cadastro não permite distinguir.
Por isso, dentro do horário e em fim de semana, a resposta é "não sei" em vez
de um palpite: dizer "fechada" mandaria a pessoa para longe de uma unidade que
pode estar aberta.

Fontes:
- Programa Saúde na Hora, Ministério da Saúde:
  https://www.gov.br/saude/pt-br/composicao/saps/saude-na-hora
- Portaria nº 397/GM/MS, de 16 de março de 2020:
  https://bvsms.saude.gov.br/bvs/saudelegis/gm/2020/prt0397_16_03_2020.html
- AMA, Prefeitura de São Paulo:
  https://prefeitura.sp.gov.br/web/saude/w/atencao_basica/ama/1911
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

# Faixas derivadas dos horários oficiais citados no cabeçalho: manhã+tarde
# resulta em 07h–19h e os três turnos em 07h–22h.
MANHA = (time(7, 0), time(12, 0))
TARDE = (time(12, 0), time(19, 0))
NOITE = (time(19, 0), time(22, 0))

SABADO = 5
DOMINGO = 6


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
    - "estimada": a unidade atende por turnos e a resposta vem das faixas
      oficiais documentadas no cabeçalho.
    - "desconhecida": turnos intermitentes, campo vazio, ou dentro do horário
      num fim de semana — casos em que `aberta` vem como None.
    """
    tipo = classify(descricao)

    if tipo == "24h":
        return True, "exata"

    if tipo in ("intermitente", "desconhecido"):
        return None, "desconhecida"

    faixas = _turnos_da_descricao(descricao or "")
    if not faixas:
        return None, "desconhecida"

    momento = agora or now_in(uf_sigla)
    dentro_do_horario = any(inicio <= momento.time() < fim for inicio, fim in faixas)

    # Fora do horário está fechada em qualquer dia: nenhum formato de turno
    # abre de madrugada. Dentro do horário, o dia decide.
    if not dentro_do_horario:
        return False, "estimada"

    if momento.weekday() in (SABADO, DOMINGO):
        # Parte das unidades de turno abre no fim de semana e parte não, e o
        # cadastro não distingue. Afirmar "fechada" mandaria a pessoa para
        # longe de uma unidade que pode estar atendendo.
        return None, "desconhecida"

    return True, "estimada"
