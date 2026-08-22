"""Verifica a integração do OpenRouteService contra a API real.

Os testes de `test_openrouteservice.py` usam transporte mockado: eles provam
que o nosso código trata bem as respostas que **assumimos** que a API dá. Este
script prova a outra metade — que a API realmente dá aquelas respostas. A
dúvida concreta que motivou escrevê-lo: a matriz recebe os índices de origem e
destino como texto (``"sources": ["0"]``), que é o que a documentação do ORS
tipa, mas isso nunca tinha sido exercitado de verdade.

Uso, com a chave no ambiente do terminal (ela não é impressa em lugar nenhum):

    $env:OPENROUTESERVICE_API_KEY = "..."
    .\\.venv\\Scripts\\python.exe scripts\\smoke_openrouteservice.py

Consome poucas chamadas da cota gratuita: uma geocodificação e uma matriz.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import openrouteservice  # noqa: E402
from app.models import Upa  # noqa: E402


# Unidades reais de São Paulo, com coordenadas do CNES.
DESTINOS = [
    Upa(
        id="1", cnes="2078287", name="UPA Vergueiro", neighborhood="Liberdade",
        address="Rua Vergueiro, 613", latitude=-23.5686, longitude=-46.6394,
    ),
    Upa(
        id="2", cnes="2077663", name="UPA Prates", neighborhood="Bom Retiro",
        address="Rua Prates, 1101", latitude=-23.5297, longitude=-46.6321,
    ),
]

ORIGEM_LAT, ORIGEM_LON = -23.5505, -46.6333  # Praça da Sé


def _ok(texto: str) -> None:
    print(f"  ok   {texto}")


def _falha(texto: str) -> None:
    print(f"  FALHA {texto}")


def verificar_geocodificacao() -> bool:
    print("geocodificação")
    try:
        local = openrouteservice.geocode_address("Avenida Paulista, 1000", "SP")
    except openrouteservice.OpenRouteServiceError as erro:
        _falha(f"{erro}")
        return False

    if not -24 < local.latitude < -23 or not -47 < local.longitude < -46:
        _falha(f"coordenada fora de São Paulo: {local.latitude}, {local.longitude}")
        return False

    _ok(f"{local.formatted_address} -> {local.latitude:.4f}, {local.longitude:.4f}")
    return True


def verificar_matriz() -> bool:
    """O ponto central: índices como texto são aceitos pela matriz do ORS?"""
    print("matriz de rotas (índices como texto)")
    try:
        estimativas = openrouteservice.compute_route_matrix(
            ORIGEM_LAT, ORIGEM_LON, DESTINOS, mode="carro"
        )
    except openrouteservice.OpenRouteServiceError as erro:
        _falha(f"{erro}")
        print("       Se a mensagem for de resposta inválida, o formato de")
        print("       'sources'/'destinations' em openrouteservice.py precisa virar int.")
        return False

    if len(estimativas) != len(DESTINOS):
        _falha(f"esperava {len(DESTINOS)} rotas, vieram {len(estimativas)}")
        return False

    for estimativa in estimativas:
        unidade = DESTINOS[estimativa.destination_index]
        if not 0 < estimativa.distance_km < 50 or not 0 < estimativa.duration_minutes < 180:
            _falha(
                f"{unidade.name}: valores implausíveis "
                f"({estimativa.distance_km} km, {estimativa.duration_minutes} min)"
            )
            return False
        _ok(
            f"{unidade.name}: {estimativa.distance_km} km, "
            f"{estimativa.duration_minutes} min"
        )
    return True


def verificar_caminhada() -> bool:
    print("matriz a pé")
    try:
        estimativas = openrouteservice.compute_route_matrix(
            ORIGEM_LAT, ORIGEM_LON, DESTINOS[:1], mode="a_pe"
        )
    except openrouteservice.OpenRouteServiceError as erro:
        _falha(f"{erro}")
        return False

    if not estimativas:
        _falha("nenhuma rota a pé devolvida")
        return False

    _ok(f"{estimativas[0].distance_km} km, {estimativas[0].duration_minutes} min")
    return True


def main() -> int:
    if not openrouteservice.is_configured():
        print("OPENROUTESERVICE_API_KEY não está no ambiente deste terminal.")
        print("Crie uma chave gratuita em https://openrouteservice.org/dev/#/signup")
        return 2

    print("Consultando a API real do OpenRouteService.\n")
    resultados = [
        verificar_geocodificacao(),
        verificar_matriz(),
        verificar_caminhada(),
    ]

    print()
    if all(resultados):
        print("Tudo certo: a integração funciona contra a API real.")
        return 0

    print("Há falhas acima. A chave nunca é impressa; se precisar do detalhe")
    print("bruto, rode a chamada manualmente com curl.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
