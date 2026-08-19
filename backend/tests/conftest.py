import pytest

from app import cnes


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Cada teste roda com cache limpo e em diretório temporário.

    O seed embarcado também é redirecionado para uma pasta vazia: com os dados
    reais no caminho padrão, nenhum teste chegaria a exercitar a busca ao vivo.
    """
    monkeypatch.setattr(cnes, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(cnes, "SEED_DIR", tmp_path / "seed")
    cnes.clear_cache()
    yield
    cnes.clear_cache()
