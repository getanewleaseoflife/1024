"""报告生成器：汇总证据 → 双轨评分 → 组装报告（雷达图 + 优劣 + 匹配度 + 建议 + STAR）。"""

import json
from pathlib import Path

from app.core.scoring import score

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def _load_seed(position_id: str) -> dict:
    path = _DATA_DIR / position_id / "seed.json"
    return json.loads(path.read_text(encoding="utf-8"))


def generate_report(position_id: str, evidence_list: list[dict], dialogues: list[dict]) -> dict:
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

    # STAR 分析：从对话/简历提取（MVP 用占位，后续 LLM 结构化提取）
    star = {
        "situation": "（基于面试对话归纳）",
        "task": "（基于面试对话归纳）",
        "action": "（基于面试对话归纳）",
        "result": "（基于面试对话归纳）",
    }

    return {
        "position_name": position_name,
        "match_score": match_score,
        "radar": radar,
        "dimension_scores": dimension_scores,
        "strengths": [{"text": s, "quote": ""} for s in scored["strengths"]],
        "weaknesses": [{"text": w, "quote": ""} for w in scored["weaknesses"]],
        "suggestions": scored["suggestions"],
        "star": star,
        "soft_skills": [
            {"name": name, "score": scored.get("soft_skills", {}).get(name, 1)}
            for name in ["沟通表达", "逻辑思维", "临场应变"]
        ],
    }
