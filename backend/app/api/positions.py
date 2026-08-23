"""岗位列表接口：动态扫描种子库目录（新增岗位 = 加目录，零代码）。"""

import json
from pathlib import Path

from fastapi import APIRouter

from app.schemas.position import Position

router = APIRouter(tags=["positions"])

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def _load_positions() -> list[Position]:
    positions: list[Position] = []
    for path in sorted(_DATA_DIR.iterdir()):
        if not path.is_dir():
            continue
        seed_path = path / "seed.json"
        if not seed_path.exists():
            continue
        seed = json.loads(seed_path.read_text(encoding="utf-8"))
        dimensions = [d["name"] for d in seed.get("dimensions", [])]
        positions.append(
            Position(
                id=path.name,
                name=seed.get("position_name", path.name),
                tagline=seed.get("tagline", ""),
                available=True,
                dimensions=dimensions,
            )
        )
    return positions


@router.get("/positions", response_model=list[Position])
def list_positions() -> list[Position]:
    return _load_positions()
