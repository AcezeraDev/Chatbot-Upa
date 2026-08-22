import pytest

from app import brasilapi, cnes, ratelimit


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Cada teste roda com cache limpo e em diretório temporário.

    O seed embarcado também é redirecionado para uma pasta vazia: com os dados
    reais no caminho padrão, nenhum teste chegaria a exercitar a busca ao vivo.
    """
    monkeypatch.setattr(cnes, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(cnes, "SEED_DIR", tmp_path / "seed")
    cnes.clear_cache()
    # A contagem do limitador tambem e estado global: sem zerar, as
    # requisicoes de um teste consomem o teto do seguinte.
    ratelimit.reset()
    # O cache de CEP tambem e global: sem zerar, um teste enxerga o resultado
    # que outro guardou e a chamada mockada nunca acontece.
    brasilapi.clear_cache()
    yield
    cnes.clear_cache()
    ratelimit.reset()
    brasilapi.clear_cache()
