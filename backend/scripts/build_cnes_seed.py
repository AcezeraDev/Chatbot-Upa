"""Gera o cadastro do CNES embarcado no deploy.

Em serverless não há disco persistente, então o backend precisa levar os dados
junto. Este script baixa as unidades de pronto atendimento de todas as UFs e
grava em backend/data/cnes/, de onde app/cnes.py lê sem prazo de validade.

Rodar antes de cada deploy para atualizar o cadastro:

    python scripts/build_cnes_seed.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.cnes import SEED_DIR, _fetch_all_pages, CnesUnavailableError
from app.ufs import UFS


def main() -> int:
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    total_units = 0
    failures: list[str] = []

    for uf in UFS:
        try:
            raw = _fetch_all_pages(uf.code)
        except CnesUnavailableError as error:
            failures.append(f"{uf.sigla}: {error}")
            print(f"  {uf.sigla}  FALHOU  {error}")
            continue

        # Uma UF vazia quase sempre significa resposta truncada, não ausência
        # real de unidades. Preservamos o arquivo anterior em vez de zerá-lo.
        if not raw:
            failures.append(f"{uf.sigla}: resposta vazia")
            print(f"  {uf.sigla}  VAZIO   (arquivo anterior mantido)")
            continue

        destination = SEED_DIR / f"upas-uf-{uf.code}.json"
        destination.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        total_units += len(raw)
        print(f"  {uf.sigla}  {len(raw):>5} registros  {destination.stat().st_size / 1024:>7.0f} KB")

    (SEED_DIR / "gerado-em.json").write_text(
        json.dumps(
            {
                "geradoEm": datetime.now(timezone.utc).isoformat(),
                "registros": total_units,
                "ufsComFalha": failures,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\ntotal: {total_units} registros, {len(failures)} UFs com falha")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
