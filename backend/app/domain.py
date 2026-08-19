"""Respostas determinísticas do assistente.

Não há LLM aqui: as respostas são construídas a partir dos dados reais do
CNES. Isso mantém o comportamento auditável, que é um requisito quando a
informação pode influenciar a escolha de um serviço de urgência.
"""

import unicodedata

from .models import Upa


# Sinais que exigem atendimento imediato. A recomendação nunca deve ser
# "vá até a unidade com menor fila" diante de qualquer um deles.
EMERGENCY_TERMS = (
    "emergencia",
    "grave",
    "dor no peito",
    "aperto no peito",
    "falta de ar",
    "nao consigo respirar",
    "sem respirar",
    "desmaio",
    "desmaiou",
    "inconsciente",
    "convulsao",
    "avc",
    "derrame",
    "infarto",
    "sangramento",
    "hemorragia",
    "envenenamento",
    "intoxicacao",
    "overdose",
    "queimadura",
    "fratura exposta",
    "atropelado",
    "acidente",
    "parto",
    "suicidio",
    "se matar",
)

EMERGENCY_REPLY = (
    "Pelo que você descreveu, isso pode ser uma emergência. Não escolha a unidade "
    "pelo tempo de fila: procure o pronto atendimento mais próximo agora ou ligue "
    "192 (SAMU). Se houver risco de vida, ligue imediatamente."
)


def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    without_accents = "".join(character for character in decomposed if not unicodedata.combining(character))
    return without_accents.casefold()


def is_emergency(message: str) -> bool:
    normalized = _normalize(message)
    return any(term in normalized for term in EMERGENCY_TERMS)


def _describe(unit: Upa) -> str:
    parts = [unit.name]
    if unit.distanceKm is not None:
        parts.append(f"a {unit.distanceKm:.1f} km em linha reta")
    parts.append(f"{unit.address}, {unit.neighborhood}")
    if unit.phone:
        parts.append(f"telefone {unit.phone}")
    return " — ".join(parts)


def create_chat_reply(message: str, units: list[Upa]) -> tuple[str, str]:
    """Devolve (resposta, tipo). O tipo ajuda o app a destacar avisos."""
    if is_emergency(message):
        return EMERGENCY_REPLY, "emergency"

    normalized = _normalize(message)

    if not units:
        return (
            "Não encontrei unidades de pronto atendimento para essa localização. "
            "Verifique se o estado selecionado está correto.",
            "unavailable",
        )

    if "todas" in normalized or "lista" in normalized or "proximas" in normalized:
        listed = "\n".join(f"• {_describe(unit)}" for unit in units[:5])
        return (
            f"Unidades de pronto atendimento mais próximas:\n{listed}\n\n"
            "As distâncias são em linha reta, não pelo trajeto de carro.",
            "list",
        )

    nearest = next((unit for unit in units if unit.locationPrecision == "exata"), None)

    if nearest is None:
        return (
            "Encontrei unidades na sua região, mas o endereço delas está cadastrado "
            "de forma imprecisa no CNES e eu não consigo garantir qual é a mais "
            "próxima. Confira a lista e ligue antes de sair.",
            "unavailable",
        )

    if "tempo" in normalized or "espera" in normalized or "fila" in normalized:
        return (
            "Ainda não há fonte pública nacional de tempo de fila em tempo real. "
            f"O que posso confirmar é a unidade mais próxima de você: {_describe(nearest)}. "
            "Ligue antes de sair para confirmar o atendimento.",
            "unavailable",
        )

    return (
        f"A unidade de pronto atendimento mais próxima de você é {_describe(nearest)}. "
        "A distância é em linha reta e o tempo de fila não é informado publicamente.",
        "nearest",
    )
