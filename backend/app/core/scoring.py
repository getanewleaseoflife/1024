"""评分引擎：规则锚点 ×0.6 + LLM 综合 ×0.4，单维度 ±1 封顶；证据绑定机械校验。"""

import json

from app.services.llm import chat

_RULE_WEIGHT = 0.6
_LLM_WEIGHT = 0.4
_LLM_MAX_ADJUST = 1  # LLM 单维度调整封顶 ±1 档

_SCORE_PROMPT = """你是岗位胜任力评估专家。根据候选人的能力证据，给出每个维度的综合评分（0~5 的整数）。

岗位：{position}
各维度候选人的能力证据（dimension: level(0-5)，quote 为候选人原话）：
{evidence_text}

请只输出 JSON（不要输出其他文字），格式：
{{
  "scores": {{"维度名": 0到5的整数}},
  "soft_skills": {{"沟通表达": 0到5的整数, "逻辑思维": 0到5的整数, "临场应变": 0到5的整数}},
  "strengths": ["优势1（基于证据）"],
  "weaknesses": ["劣势1（基于证据）"],
  "suggestions": ["具体可执行的提升建议1"]
}}

其中 soft_skills 是基于候选人整场面试的综合软素质，务必区分高下：
- 沟通表达：回答的条理性与清晰度
- 逻辑思维：回答的逻辑严谨性
- 临场应变：对追问的反应与抗压
"""


def _rule_score(evidence_by_dim: dict[str, list[dict]]) -> dict[str, float]:
    """规则评分：取每个维度证据的平均 level（0~5）。"""
    return {dim: round(sum(e["level"] for e in evs) / len(evs), 1) for dim, evs in evidence_by_dim.items() if evs}


def _llm_score(position: str, evidence_by_dim: dict[str, list[dict]], rule: dict[str, float]) -> dict:
    """LLM 综合评分，单维度相对规则分调整封顶 ±1。"""
    lines = []
    for dim, evs in evidence_by_dim.items():
        for e in evs:
            lines.append(f"- {dim}: level={e['level']}，原话「{e['quote']}」")
    evidence_text = "\n".join(lines) if lines else "（无证据）"

    raw = chat(
        [
            {
                "role": "user",
                "content": _SCORE_PROMPT.replace("{position}", position).replace("{evidence_text}", evidence_text),
            }
        ],
        temperature=0,
    )
    try:
        data = json.loads(raw)
        scores = data.get("scores", {})
        soft_skills = data.get("soft_skills", {})
        strengths = data.get("strengths", [])
        weaknesses = data.get("weaknesses", [])
        suggestions = data.get("suggestions", [])
    except (json.JSONDecodeError, AttributeError):
        scores, soft_skills, strengths, weaknesses, suggestions = {}, {}, [], [], []

    # ±1 封顶
    clamped = {}
    for dim, rule_score in rule.items():
        llm = scores.get(dim, rule_score)
        clamped[dim] = max(
            0,
            min(
                5,
                round(min(max(llm, rule_score - _LLM_MAX_ADJUST), rule_score + _LLM_MAX_ADJUST), 1),
            ),
        )
    return {
        "scores": clamped,
        "soft_skills": soft_skills,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
    }


def bind_quote(quote: str, evidence_list: list[dict]) -> bool:
    """证据绑定机械校验：quote 须与 L3 证据原话做子串匹配（只许引用，不许编造）。"""
    if not quote:
        return False
    return any(quote in e["quote"] or e["quote"] in quote for e in evidence_list)


def score(evidence_list: list[dict], position: str, dimensions: list[str]) -> dict:
    """双轨评分：最终分 = 规则锚点 ×0.6 + LLM ×0.4。"""
    evidence_by_dim: dict[str, list[dict]] = {d: [] for d in dimensions}
    for e in evidence_list:
        dim = e["dimension"]
        if dim in evidence_by_dim:
            evidence_by_dim[dim].append(e)

    rule = _rule_score(evidence_by_dim)
    llm = _llm_score(position, evidence_by_dim, rule)

    final = {}
    for dim in dimensions:
        if dim in rule:
            final[dim] = round(rule[dim] * _RULE_WEIGHT + llm["scores"].get(dim, rule[dim]) * _LLM_WEIGHT, 1)
        else:
            final[dim] = None  # 无证据维度不出分

    return {
        "final_scores": final,
        "rule_scores": rule,
        "llm_scores": llm["scores"],
        "soft_skills": llm["soft_skills"],
        "strengths": llm["strengths"],
        "weaknesses": llm["weaknesses"],
        "suggestions": llm["suggestions"],
    }
