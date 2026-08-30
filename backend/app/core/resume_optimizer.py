"""简历优化：JD 匹配分析 + STAR 改写建议（复用简历结构化画像 + 岗位种子数据）。"""

import json
from pathlib import Path

from app.core.resume_parser import parse_resume
from app.services.llm import chat

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def _load_jd(position_id: str) -> str:
    seed = json.loads((_DATA_DIR / position_id / "seed.json").read_text(encoding="utf-8"))
    parts = [f"岗位：{seed['position_name']}", f"方向：{seed.get('tagline', '')}"]
    for d in seed["dimensions"]:
        kps = "；".join(d.get("key_points", []))
        parts.append(f"- {d['name']}：{kps}")
    return "\n".join(parts)


def _match_analysis(resume_text: str, jd: str) -> dict:
    prompt = f"""你是资深 HR。请对比候选人简历与目标岗位 JD，输出匹配度与能力缺口。只输出 JSON，不要输出其他文字：
{{
  "match_rate": 0 到 100 的整数,
  "gaps": ["缺口1", "缺口2"]
}}
岗位 JD：
<jd>
{jd}
</jd>
候选人简历：
<resume>
{resume_text}
</resume>"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.2)
    try:
        data = json.loads(raw)
        return {"match_rate": int(data.get("match_rate", 0)), "gaps": data.get("gaps", [])}
    except (json.JSONDecodeError, ValueError, TypeError):
        return {"match_rate": 0, "gaps": []}


def _profile_text(profile) -> str:
    lines: list[str] = []
    if profile.education:
        lines.append(f"教育：{profile.education}")
    if profile.skills:
        lines.append("技能：" + "、".join(profile.skills))
    for p in profile.projects:
        lines.append(f"项目：{p}")
    for e in profile.experiences:
        lines.append(f"经历：{e}")
    return "\n".join(lines)


def _star_suggestions(profile_text: str, jd: str) -> list[dict]:
    prompt = f"""你是简历优化专家。针对候选人的项目/经历，用 STAR 法则改写，突出与目标岗位 JD 的匹配点。
只输出 JSON 数组，不要输出其他文字：
[
  {{"original": "原经历一句话", "suggestion": "STAR 改写后的描述"}}
]
岗位 JD：
<jd>
{jd}
</jd>
候选人画像：
<profile>
{profile_text}
</profile>"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.4)
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def optimize_resume(resume_text: str, position_id: str) -> dict:
    profile = parse_resume(resume_text, position_id).profile
    jd = _load_jd(position_id)
    match = _match_analysis(resume_text, jd)
    stars = _star_suggestions(_profile_text(profile), jd)
    return {"match_rate": match["match_rate"], "gaps": match["gaps"], "star_suggestions": stars}
