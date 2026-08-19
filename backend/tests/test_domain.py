"""Testes da triagem de emergência.

A triagem é a garantia de segurança mais importante do app: diante de sinal de
risco, a resposta tem de ser 192/SAMU, não "a unidade mais próxima". Estes casos
incluem paráfrases naturais que a lista de termos anterior deixava passar.
"""

import pytest

from app.domain import EMERGENCY_REPLY, create_chat_reply, is_emergency


# Frases como alguém em pânico realmente escreve — não o termo do glossário.
FRASES_DE_EMERGENCIA = [
    "meu peito esta apertando muito",
    "estou com muita dificuldade pra respirar",
    "nao consigo respirar direito",
    "meu filho engoliu veneno de rato",
    "estou perdendo muito sangue",
    "acho que ele teve um avc, esta com a boca torta",
    "socorro, minha esposa desmaiou",
    "me queimei com agua fervendo",
    "sofri um acidente de moto",
    "acho que estou tendo um infarto",
    "minha bolsa estourou, o bebe vai nascer",
    "estou pensando em me matar",
]


@pytest.mark.parametrize("mensagem", FRASES_DE_EMERGENCIA)
def test_reconhece_emergencia_em_linguagem_natural(mensagem):
    assert is_emergency(mensagem) is True


@pytest.mark.parametrize("mensagem", FRASES_DE_EMERGENCIA)
def test_emergencia_responde_192_sem_depender_de_unidades(mensagem):
    reply, kind = create_chat_reply(mensagem, [])
    assert kind == "emergency"
    assert reply == EMERGENCY_REPLY
    assert "192" in reply


# Perguntas comuns que NÃO são emergência: não podem disparar o alerta, senão o
# aviso perde o valor por excesso de ruído.
FRASES_COMUNS = [
    "qual a unidade mais perto?",
    "qual o tempo de espera?",
    "me mostre todas as unidades proximas",
    "qual tem menos fila?",
    "como funciona o horario de atendimento?",
]


@pytest.mark.parametrize("mensagem", FRASES_COMUNS)
def test_nao_confunde_pergunta_comum_com_emergencia(mensagem):
    assert is_emergency(mensagem) is False
