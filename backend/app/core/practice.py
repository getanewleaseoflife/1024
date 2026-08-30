"""刷题：复用岗位种子题库（典型面试题 + 参考答案锚点），LLM 即时评分。"""

import json
import random
from pathlib import Path

from app.services.llm import chat

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def _load_seed(position_id: str) -> dict:
    return json.loads((_DATA_DIR / position_id / "seed.json").read_text(encoding="utf-8"))


def list_dimensions(position_id: str) -> list[str]:
    seed = _load_seed(position_id)
    return [d["name"] for d in seed["dimensions"]]


def pick_question(position_id: str, dimension: str) -> dict:
    seed = _load_seed(position_id)
    dim = next((d for d in seed["dimensions"] if d["name"] == dimension), None)
    if dim is None or not dim.get("questions"):
        dim = seed["dimensions"][0]
    q = random.choice(dim["questions"])
    return {"dimension": dim["name"], "question": q["q"], "reference": q.get("answer_points", [])}


def grade_answer(dimension: str, question: str, answer: str, reference: list[str]) -> dict:
    ref_text = "；".join(reference)
    prompt = f"""你是面试官。请对候选人的回答打分并点评。只输出 JSON，不要输出其他文字：
{{
  "score": 0 到 5 的整数,
  "feedback": "一句点评（指出亮点与不足）",
  "reference": "参考答案要点（可基于下面要点组织）"
}}
考察维度：{dimension}
题目：{question}
参考答案要点：{ref_text}
候选人回答：
<candidate_answer>
{answer}
</candidate_answer>"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.2)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"score": 0, "feedback": "评分失败，请重试", "reference": ref_text}
