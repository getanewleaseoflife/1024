"""面试相关 Pydantic 模型（追问分类器结构化输出校验）。"""

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    dimension: str = ""
    level: int = Field(default=0, ge=0, le=5, description="掌握度 0~5")
    quote: str = ""


class ClassifyResult(BaseModel):
    action: str = Field(description="clarify / verify / deepen / challenge / transfer / next / close")
    reason: str = ""
    evidence: Evidence = Evidence()
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
