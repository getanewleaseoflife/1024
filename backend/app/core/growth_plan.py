"""成长计划：基于报告弱点与建议，LLM 生成分阶段补强计划。"""

import json

from app.services.llm import chat


def generate_growth_plan(position_name: str, weaknesses: list[dict], suggestions: list[str]) -> dict:
    weak_text = "\n".join(f"- {w.get('text', '') if isinstance(w, dict) else w}" for w in weaknesses)
    sug_text = "\n".join(f"- {s}" for s in suggestions)
    prompt = f"""你是职业成长教练。基于下面的面试评估结论，为候选人制定一份分阶段补强计划。
只输出 JSON，不要输出其他文字：
{{
  "phases": [
    {{"title": "阶段名", "goal": "阶段目标", "actions": ["行动1", "行动2"]}}
  ]
}}
目标岗位：{position_name}
待提升项：
{weak_text}
已有建议：
{sug_text}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        data = json.loads(raw)
        return {"phases": data.get("phases", [])}
    except (json.JSONDecodeError, TypeError):
        return {"phases": []}
