"""岗位相关 Pydantic 模型。"""

from pydantic import BaseModel


class Position(BaseModel):
    id: str
    name: str
    tagline: str = ""
    available: bool = True
    dimensions: list[str] = []
