"""报告生成器：汇总证据 → 双轨评分 → 组装报告（雷达图 + 优劣 + 匹配度 + 建议 + STAR）。"""

import json
from pathlib import Path

from app.core.scoring import score
from app.services.llm import chat

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def _load_seed(position_id: str) -> dict:
    path = _DATA_DIR / position_id / "seed.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _extract_star(profile: dict, position_name: str) -> dict:
    """从简历画像的项目/经历中，用 STAR 法则提取一次代表性经历。"""
    projects = profile.get("projects", []) if profile else []
    experiences = profile.get("experiences", []) if profile else []
    lines = [f"项目：{p}" for p in projects] + [f"经历：{e}" for e in experiences]
    if not lines:
        return {"situation": "（简历中未提供项目经历）", "task": "", "action": "", "result": ""}

    content = "\n".join(lines)
    prompt = f"""你是资深 HR。请从候选人简历的项目/经历中，用 STAR 法则提取一次最有代表性的经历。
只输出 JSON（不要输出其他文字）：
{{
  "situation": "情境（一句话）",
  "task": "任务（一句话）",
  "action": "行动（一句话）",
  "result": "结果（一句话）"
}}
目标岗位：{position_name}
简历项目/经历：
{content}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.2)
    try:
        data = json.loads(raw)
        return {
            "situation": data.get("situation", ""),
            "task": data.get("task", ""),
            "action": data.get("action", ""),
            "result": data.get("result", ""),
        }
    except (json.JSONDecodeError, AttributeError):
        return {"situation": "（STAR 提取失败）", "task": "", "action": "", "result": ""}


def _anchor_for(level: int, rubric: list[dict]) -> str:
    """把 0~5 档掌握度映射到 3 档评分锚点描述（rubric: 1/2/3）。"""
    if not rubric:
        return ""
    target = 3 if level >= 4 else 2 if level >= 3 else 1
    for r in rubric:
        if r.get("level") == target:
            return r.get("desc", "")
    return ""


def generate_report(
    position_id: str,
    evidence_list: list[dict],
    dialogues: list[dict],
    profile: dict | None = None,
    voice_metrics: dict | None = None,
) -> dict:
    """生成报告。返回前端可直接渲染的结构。"""
    seed = _load_seed(position_id)
    dimensions = [d["name"] for d in seed["dimensions"]]
    position_name = seed["position_name"]

    scored = score(evidence_list, position_name, dimensions)
    final_scores = scored["final_scores"]

    # 雷达图数据（无证据维度 value=null → 待考察）
    radar = [{"name": d, "value": final_scores.get(d)} for d in dimensions]

    # 匹配度 = 有证据维度的平均分 / 5 * 100
    valid = [v for v in final_scores.values() if v is not None]
    match_score = round(sum(valid) / len(valid) / 5 * 100) if valid else 0

    # 分维度得分（绑定证据）
    dimension_scores = []
    for d in dimensions:
        v = final_scores.get(d)
        quotes = [e["quote"] for e in evidence_list if e["dimension"] == d]
        dimension_scores.append({"name": d, "score": v, "quote": quotes[0] if quotes else ""})

    # 逐题复盘：每条证据绑定维度 / 掌握度 / 原话 / 评分锚点 / 考核要点
    dim_map = {d["name"]: d for d in seed["dimensions"]}
    review = []
    for e in evidence_list:
        dim = dim_map.get(e["dimension"])
        if not dim:
            continue
        review.append(
            {
                "dimension": e["dimension"],
                "level": e["level"],
                "quote": e["quote"],
                "anchor": _anchor_for(int(e.get("level", 0)), dim.get("rubric", [])),
                "key_points": dim.get("key_points", []),
            }
        )

    # STAR 分析：从简历画像的项目/经历 LLM 结构化提取
    star = _extract_star(profile or {}, position_name)

    return {
        "position_name": position_name,
        "match_score": match_score,
        "radar": radar,
        "dimension_scores": dimension_scores,
        "strengths": scored["strengths"],
        "weaknesses": scored["weaknesses"],
        "suggestions": scored["suggestions"],
        "star": star,
        "soft_skills": [
            {"name": name, "score": scored.get("soft_skills", {}).get(name, 1)}
            for name in ["沟通表达", "逻辑思维", "临场应变"]
        ],
        "voice_metrics": voice_metrics or {},
        "review": review,
        "dialogues": dialogues,
    }
