"""Testes da interpretação de horário de atendimento.

Todos passam data e hora fixas: o resultado depende do relógio e do dia da
semana, e um teste que depende do relógio passa de dia e quebra de madrugada.

2026-08-19 é quarta-feira, 2026-08-22 é sábado, 2026-08-23 é domingo.
"""

from datetime import datetime

import pytest

from app.schedule import MANHA, NOITE, TARDE, classify, now_in, open_now


def quarta(hora: int, minuto: int = 0) -> datetime:
    return datetime(2026, 8, 19, hora, minuto)


def sabado(hora: int, minuto: int = 0) -> datetime:
    return datetime(2026, 8, 22, hora, minuto)


def domingo(hora: int, minuto: int = 0) -> datetime:
    return datetime(2026, 8, 23, hora, minuto)


CONTINUO = "ATENDIMENTO CONTINUO DE 24 HORAS/DIA (PLANTAO:INCLUI SABADOS, DOMINGOS E FERIADOS)"
TRES_TURNOS = "ATENDIMENTO NOS TURNOS DA MANHA, TARDE E NOITE"
DOIS_TURNOS = "ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE"
SO_NOITE = "ATENDIMENTO SOMENTE A NOITE"
SO_TARDE = "ATENDIMENTO SOMENTE A TARDE"
INTERMITENTE = "ATENDIMENTO COM TURNOS INTERMITENTES"


@pytest.mark.parametrize(
    "descricao, esperado",
    [
        (CONTINUO, "24h"),
        (TRES_TURNOS, "turnos"),
        (DOIS_TURNOS, "turnos"),
        (SO_NOITE, "turnos"),
        (SO_TARDE, "turnos"),
        (INTERMITENTE, "intermitente"),
        (None, "desconhecido"),
        ("", "desconhecido"),
    ],
)
def test_classifies_every_value_the_cnes_uses(descricao, esperado):
    """Os 7 valores do cadastro caem nas categorias certas."""
    assert classify(descricao) == esperado


def test_shift_ranges_compose_into_the_published_schedules():
    """Os turnos somados reproduzem os horários oficiais.

    Manhã e tarde dão 07h–19h, o padrão de 12 horas contínuas do Saúde na Hora
    e das AMAs paulistanas. Somando a noite dá 07h–22h, o formato do DF. É o
    que sustenta as faixas: elas não são convenção nossa.
    """
    assert (MANHA[0].hour, TARDE[1].hour) == (7, 19)
    assert (MANHA[0].hour, NOITE[1].hour) == (7, 22)
    assert TARDE[1] == NOITE[0]


def test_24h_is_open_at_any_hour_of_any_day_with_certainty():
    """Atendimento contínuo inclui sábados, domingos e feriados."""
    for momento in (quarta(3), quarta(15), sabado(3), domingo(23)):
        assert open_now(CONTINUO, "SP", momento) == (True, "exata")


def test_shift_unit_is_closed_at_dawn():
    """A unidade de turnos fecha de madrugada — o caso que motivou tudo isto.

    Sem esta distinção, o app apresentaria às 3h uma unidade fechada como "a
    mais próxima", que é o mesmo erro do tempo de fila inventado.
    """
    aberta, precisao = open_now(TRES_TURNOS, "SP", quarta(3))
    assert aberta is False
    assert precisao == "estimada"


def test_three_shift_unit_follows_the_seven_to_twentytwo_window():
    assert open_now(TRES_TURNOS, "SP", quarta(7))[0] is True
    assert open_now(TRES_TURNOS, "SP", quarta(21, 59))[0] is True
    assert open_now(TRES_TURNOS, "SP", quarta(22))[0] is False
    assert open_now(TRES_TURNOS, "SP", quarta(6, 59))[0] is False


def test_two_shift_unit_follows_the_seven_to_nineteen_window():
    assert open_now(DOIS_TURNOS, "SP", quarta(18, 59))[0] is True
    assert open_now(DOIS_TURNOS, "SP", quarta(19))[0] is False


def test_single_shift_units_respect_their_own_window():
    assert open_now(SO_NOITE, "SP", quarta(20))[0] is True
    assert open_now(SO_NOITE, "SP", quarta(15))[0] is False
    assert open_now(SO_TARDE, "SP", quarta(15))[0] is True
    assert open_now(SO_TARDE, "SP", quarta(9))[0] is False


def test_weekend_within_hours_is_not_asserted():
    """No fim de semana, dentro do horário, dizemos que não sabemos.

    Parte das unidades de turno abre no sábado (as AMAs paulistanas abrem) e
    parte não, e o cadastro não distingue. Afirmar "fechada" mandaria a pessoa
    para longe de uma unidade que pode estar atendendo.
    """
    for momento in (sabado(10), domingo(15)):
        aberta, precisao = open_now(TRES_TURNOS, "SP", momento)
        assert aberta is None
        assert precisao == "desconhecida"


def test_weekend_outside_hours_is_still_closed():
    """Nenhum formato de turno abre de madrugada, em nenhum dia.

    A dúvida do fim de semana é sobre o dia, não sobre a hora — então às 3h da
    manhã de domingo a resposta continua sendo fechada.
    """
    aberta, precisao = open_now(TRES_TURNOS, "SP", domingo(3))
    assert aberta is False
    assert precisao == "estimada"


@pytest.mark.parametrize("descricao", [INTERMITENTE, None, ""])
def test_indeterminate_schedules_are_never_asserted(descricao):
    """Sem base para afirmar, o campo vem nulo em vez de um palpite."""
    aberta, precisao = open_now(descricao, "SP", quarta(3))
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
