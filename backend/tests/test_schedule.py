"""Testes da interpretação de horário de atendimento.

Todos passam uma hora fixa: o resultado depende do relógio, e um teste que
depende do relógio passa de dia e quebra de madrugada.
"""

from datetime import datetime

import pytest

from app.schedule import classify, now_in, open_now


MADRUGADA = datetime(2026, 8, 19, 3, 0)
MANHA = datetime(2026, 8, 19, 9, 0)
TARDE = datetime(2026, 8, 19, 15, 0)
NOITE = datetime(2026, 8, 19, 20, 0)


CONTINUO = "ATENDIMENTO CONTINUO DE 24 HORAS/DIA (PLANTAO:INCLUI SABADOS, DOMINGOS E FERIADOS)"
TRES_TURNOS = "ATENDIMENTO NOS TURNOS DA MANHA, TARDE E NOITE"
DOIS_TURNOS = "ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE"
SO_NOITE = "ATENDIMENTO SOMENTE A NOITE"
INTERMITENTE = "ATENDIMENTO COM TURNOS INTERMITENTES"


@pytest.mark.parametrize(
    "descricao, esperado",
    [
        (CONTINUO, "24h"),
        (TRES_TURNOS, "turnos"),
        (DOIS_TURNOS, "turnos"),
        (SO_NOITE, "turnos"),
        (INTERMITENTE, "intermitente"),
        (None, "desconhecido"),
        ("", "desconhecido"),
    ],
)
def test_classifies_every_value_the_cnes_uses(descricao, esperado):
    """Os 7 valores do cadastro caem nas categorias certas."""
    assert classify(descricao) == esperado


def test_24h_is_open_at_any_hour_with_certainty():
    """Atendimento contínuo não tem o que estimar."""
    for momento in (MADRUGADA, MANHA, TARDE, NOITE):
        assert open_now(CONTINUO, "SP", momento) == (True, "exata")


def test_shift_unit_is_closed_at_dawn():
    """A unidade de turnos fecha de madrugada — o caso que motivou tudo isto.

    Sem esta distinção, o app apresentaria às 3h uma unidade fechada como "a
    mais próxima", que é o mesmo erro do tempo de fila inventado.
    """
    aberta, precisao = open_now(TRES_TURNOS, "SP", MADRUGADA)
    assert aberta is False
    assert precisao == "estimada"


def test_shift_unit_is_open_during_its_shifts():
    for momento in (MANHA, TARDE, NOITE):
        aberta, _ = open_now(TRES_TURNOS, "SP", momento)
        assert aberta is True


def test_morning_and_afternoon_unit_is_closed_at_night():
    assert open_now(DOIS_TURNOS, "SP", NOITE)[0] is False
    assert open_now(DOIS_TURNOS, "SP", MANHA)[0] is True


def test_night_only_unit_is_closed_in_the_morning():
    assert open_now(SO_NOITE, "SP", MANHA)[0] is False
    assert open_now(SO_NOITE, "SP", NOITE)[0] is True


@pytest.mark.parametrize("descricao", [INTERMITENTE, None, ""])
def test_indeterminate_schedules_are_never_asserted(descricao):
    """Sem base para afirmar, o campo vem nulo em vez de um palpite."""
    aberta, precisao = open_now(descricao, "SP", MADRUGADA)
    assert aberta is None
    assert precisao == "desconhecida"


def test_state_timezones_differ():
    """O Acre está três horas atrás de São Paulo.

    Usar um fuso único faria o app errar o "aberto agora" justamente onde há
    menos unidades para escolher.
    """
    sao_paulo = now_in("SP")
    acre = now_in("AC")
    manaus = now_in("AM")

    assert sao_paulo.utcoffset() != acre.utcoffset()
    assert acre.utcoffset() < manaus.utcoffset() < sao_paulo.utcoffset()


def test_unknown_state_falls_back_to_brasilia_time():
    assert now_in(None).utcoffset() == now_in("SP").utcoffset()
