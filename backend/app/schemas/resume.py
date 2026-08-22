"""简历解析相关 Pydantic 模型。"""

from pydantic import BaseModel, Field


class ResumeProfile(BaseModel):
    name: str = ""
    education: str = ""
    skills: list[str] = []
    projects: list[str] = []
    experiences: list[str] = []


class GapItem(BaseModel):
    dimension: str
    status: str = Field(description="have / pending / missing")


class ResumeParseResult(BaseModel):
    profile: ResumeProfile
    gaps: list[GapItem]
