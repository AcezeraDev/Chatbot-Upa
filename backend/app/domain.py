import unicodedata

from .models import Upa


def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    without_accents = "".join(character for character in decomposed if not unicodedata.combining(character))
    return without_accents.casefold()


def create_chat_reply(message: str, upas: list[Upa]) -> str:
    """Create a safe deterministic response while the LLM integration is out of scope."""
    normalized = _normalize(message)

    if "emergencia" in normalized or "grave" in normalized:
        return (
            "Em uma emergência, não escolha a unidade apenas pelo tempo de espera. "
            "Procure atendimento imediato pelos canais oficiais da sua cidade."
        )

    if not upas:
        return "Não há unidades disponíveis para consulta neste momento."

    if "todas" in normalized or "lista" in normalized:
        return "\n".join(
            f"{upa.name}: cerca de {upa.waitMinutes} minutos" for upa in sorted(upas, key=lambda item: item.waitMinutes)
        )

    best = min(upas, key=lambda item: item.waitMinutes)
    return (
        f"{best.name} apresenta a menor espera estimada entre as unidades demonstrativas: "
        f"cerca de {best.waitMinutes} minutos. Os dados deste protótipo são fictícios."
    )

