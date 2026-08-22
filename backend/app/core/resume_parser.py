"""简历解析：LLM 结构化提取 → 画像 → 与岗位关键词表规则匹配出 Gap。"""

import json
from pathlib import Path

from app.schemas.resume import GapItem, ResumeParseResult, ResumeProfile
from app.services.llm import chat

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"

_EXTRACT_PROMPT = """你是资深 HR。请从下面的候选人简历中提取结构化信息，只输出 JSON，不要输出任何多余文字。

JSON 格式（字段缺省用空字符串或空数组）：
{
  "name": "姓名",
  "education": "学历与学校专业",
  "skills": ["技能1", "技能2"],
  "projects": ["项目1的一句话描述", "项目2的一句话描述"],
  "experiences": ["实习/工作经历的一句话描述"]
}

简历文本：
<resume>
{resume}
</resume>
"""


def _load_keywords(position_id: str) -> dict[str, list[str]]:
    """加载岗位维度关键词表，返回 {维度名: [关键词...]}。"""
    path = _DATA_DIR / position_id / "keywords.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return {d["name"]: d["keywords"] for d in data["dimensions"]}


def _extract_profile(resume_text: str) -> ResumeProfile:
    raw = chat(
        [{"role": "user", "content": _EXTRACT_PROMPT.replace("{resume}", resume_text)}],
        temperature=0,
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # 容错：解析失败时回退为空画像
        return ResumeProfile()
    return ResumeProfile(**data)


def _match_gap(profile: ResumeProfile, keywords: dict[str, list[str]]) -> list[GapItem]:
    """简历文本与岗位维度关键词表做规则匹配，输出三类 Gap。"""
    haystack = " ".join([profile.education, *profile.skills, *profile.projects, *profile.experiences]).lower()

    gaps: list[GapItem] = []
    for dimension, kws in keywords.items():
        hit = any(kw.lower() in haystack for kw in kws)
        # 命中 → 已具备；未命中 → 待考察（M2 简化，缺失留给更细规则）
        gaps.append(GapItem(dimension=dimension, status="have" if hit else "pending"))
    return gaps


def parse_resume(resume_text: str, position_id: str = "ai_algorithm") -> ResumeParseResult:
    profile = _extract_profile(resume_text)
    keywords = _load_keywords(position_id)
    gaps = _match_gap(profile, keywords)
    return ResumeParseResult(profile=profile, gaps=gaps)
