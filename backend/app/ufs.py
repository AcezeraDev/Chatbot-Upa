"""Unidades federativas com o código IBGE usado pelo CNES."""

from .models import UF


UFS: tuple[UF, ...] = (
    UF(code=12, sigla="AC", name="Acre"),
    UF(code=27, sigla="AL", name="Alagoas"),
    UF(code=16, sigla="AP", name="Amapá"),
    UF(code=13, sigla="AM", name="Amazonas"),
    UF(code=29, sigla="BA", name="Bahia"),
    UF(code=23, sigla="CE", name="Ceará"),
    UF(code=53, sigla="DF", name="Distrito Federal"),
    UF(code=32, sigla="ES", name="Espírito Santo"),
    UF(code=52, sigla="GO", name="Goiás"),
    UF(code=21, sigla="MA", name="Maranhão"),
    UF(code=51, sigla="MT", name="Mato Grosso"),
    UF(code=50, sigla="MS", name="Mato Grosso do Sul"),
    UF(code=31, sigla="MG", name="Minas Gerais"),
    UF(code=15, sigla="PA", name="Pará"),
    UF(code=25, sigla="PB", name="Paraíba"),
    UF(code=41, sigla="PR", name="Paraná"),
    UF(code=26, sigla="PE", name="Pernambuco"),
    UF(code=22, sigla="PI", name="Piauí"),
    UF(code=33, sigla="RJ", name="Rio de Janeiro"),
    UF(code=24, sigla="RN", name="Rio Grande do Norte"),
    UF(code=43, sigla="RS", name="Rio Grande do Sul"),
    UF(code=11, sigla="RO", name="Rondônia"),
    UF(code=14, sigla="RR", name="Roraima"),
    UF(code=42, sigla="SC", name="Santa Catarina"),
    UF(code=35, sigla="SP", name="São Paulo"),
    UF(code=28, sigla="SE", name="Sergipe"),
    UF(code=17, sigla="TO", name="Tocantins"),
)

_BY_SIGLA = {uf.sigla: uf for uf in UFS}
_BY_NAME = {uf.name.casefold(): uf for uf in UFS}
_BY_CODE = {uf.code: uf for uf in UFS}


def resolve_uf(value: str) -> UF | None:
    """Aceita sigla ('SP') ou nome por extenso ('São Paulo')."""
    cleaned = value.strip()
    if not cleaned:
        return None
    return _BY_SIGLA.get(cleaned.upper()) or _BY_NAME.get(cleaned.casefold())


def uf_by_code(code: int) -> UF | None:
    """Estado a partir do código do IBGE. Usado para descobrir o fuso horário."""
    return _BY_CODE.get(code)
