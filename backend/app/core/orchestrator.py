"""面试编排器：状态机推进 + 硬护栏（追问上限 / 换题 / 降级结束）。"""

import json
from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

from app.core.followup_engine import classify, generate_followup
from app.core.memory import MemoryStore
from app.core.rag import ensure_seed

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"

MAX_FOLLOWUP = 3  # 每题追问上限
MAX_QUESTIONS = 8  # 题量上限
MISS_THRESHOLD = 4  # 累计基础题失误阈值

_FOLLOWUP_ACTIONS = {"clarify", "verify", "deepen", "challenge", "transfer"}


def _load_seed(position_id: str) -> dict:
    path = _DATA_DIR / position_id / "seed.json"
    return json.loads(path.read_text(encoding="utf-8"))


class InterviewOrchestrator:
    def __init__(self, position_id: str, persona_id: str, resume_text: str = ""):
        seed = _load_seed(position_id)
        ensure_seed(position_id)
        self.position_id = position_id
        self.position_name = seed["position_name"]
        self.persona_id = persona_id
        self.resume_text = resume_text
        self.dimensions = [d["name"] for d in seed["dimensions"]]
        self._dim_data = {d["name"]: d for d in seed["dimensions"]}
        self.memory = MemoryStore(uuid4().hex)
        self.state = "opening"
        self.current_dimension: str | None = None
        self.dim_index = 0
        self.seq = 0
        self.followup_count = 0
        self.miss_count = 0
        self.closed = False

    def _current_question(self) -> str:
        d = self._dim_data[self.current_dimension or self.dimensions[0]]
        if d.get("questions"):
            return d["questions"][0]["q"]
        return f"请谈谈你对「{self.current_dimension}」的理解。"

    def opening(self) -> str:
        self.current_dimension = self.dimensions[0]
        return (
            f"你好，欢迎参加本次「{self.position_name}」岗位面试。"
            f"我们先从「{self.current_dimension}」开始：{self._current_question()}"
        )

    def answer(self, answer: str) -> dict:
        """处理一轮回答，返回 {action, evidence, followup_iter, closed}。"""
        if self.closed:
            return {
                "action": "close",
                "evidence": None,
                "followup_iter": iter(["面试已结束。"]),
                "closed": True,
            }

        self.seq += 1
        result = classify(answer, self.position_name, self.current_dimension or "")
        action = result.action
        evidence = result.evidence

        # L3 证据落库
        if evidence and evidence.quote:
            self.memory.add_evidence(evidence.dimension, evidence.level, evidence.quote)

        # 硬护栏：累计基础题失误
        if evidence and evidence.level <= 1:
            self.miss_count += 1

        # 硬护栏：追问上限
        if action in _FOLLOWUP_ACTIONS:
            self.followup_count += 1
            if self.followup_count >= MAX_FOLLOWUP:
                action = "next"

        if action in ("next", "close"):
            self._record(answer, action)
            if action == "close" or self.dim_index + 1 >= len(self.dimensions):
                self.closed = True
                followup_iter: Iterator[str] = iter(
                    ["感谢你的时间，本次面试到此结束。接下来我会生成你的能力评估报告。"]
                )
            else:
                self.dim_index += 1
                self.current_dimension = self.dimensions[self.dim_index]
                self.followup_count = 0
                followup_iter = iter([f"（进入下一维度）{self._current_question()}"])
        else:
            self._record(answer, action)
            followup_iter = generate_followup(
                action,
                result.reason,
                answer,
                self.position_name,
                self.current_dimension or "",
                self.persona_id,
            )

        return {
            "action": action,
            "evidence": evidence.model_dump() if evidence else None,
            "followup_iter": followup_iter,
            "closed": self.closed,
        }

    def _record(self, answer: str, action: str) -> None:
        self.memory.add_question(self.seq, self.current_dimension or "", "", answer, action)

    def get_evidence(self) -> list[dict]:
        return self.memory.get_evidence()

    def close(self) -> None:
        self.memory.close()
