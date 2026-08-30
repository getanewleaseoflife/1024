"""面试编排器：状态机推进 + 硬护栏（追问上限 / 换题 / 降级结束）+ 多轮晋级制。"""

import json
import random
from pathlib import Path
from uuid import uuid4

from app.core.followup_engine import (
    classify,
    generate_closing,
    generate_followup,
    generate_opening,
    generate_round_transition,
    generate_transition,
)
from app.core.memory import MemoryStore
from app.core.rag import ensure_seed

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"

MAX_FOLLOWUP = 3  # 每题追问上限
QUESTIONS_PER_ROUND = 3  # 每轮题数
MISS_THRESHOLD = 4  # 累计基础题失误阈值

# 人格 = 起始轮次 → 轮次序列（随和=完整三轮、严谨=两轮、压力=单轮）
ROUND_PERSONAS = {
    "friendly": ["friendly", "rigorous", "stress"],
    "rigorous": ["rigorous", "stress"],
    "stress": ["stress"],
}

_PROMOTE_THRESHOLD = 3.0  # 本轮平均掌握度 ≥ 3 → 晋级

_FOLLOWUP_ACTIONS = {"clarify", "verify", "deepen", "challenge", "transfer"}


def _load_seed(position_id: str) -> dict:
    path = _DATA_DIR / position_id / "seed.json"
    return json.loads(path.read_text(encoding="utf-8"))


class InterviewOrchestrator:
    def __init__(
        self,
        position_id: str,
        persona_id: str,
        resume_text: str = "",
        fast_mode: bool = False,
        gaps: list[dict] | None = None,
    ):
        seed = _load_seed(position_id)
        ensure_seed(position_id)
        self.position_id = position_id
        self.position_name = seed["position_name"]
        self.resume_text = resume_text
        self.dimensions = [d["name"] for d in seed["dimensions"]]
        # 基于简历 Gap 选维度：待考察（pending）全问，已具备（have）按命中数抽前 2 个
        if gaps:
            gap_map = {g["dimension"]: g for g in gaps}
            pending = [d for d in self.dimensions if gap_map.get(d, {}).get("status") == "pending"]
            have = sorted(
                [d for d in self.dimensions if gap_map.get(d, {}).get("status") == "have"],
                key=lambda d: gap_map.get(d, {}).get("hits", 0),
                reverse=True,
            )[:2]
            if pending or have:
                self.dimensions = pending + have
        if fast_mode:
            self.dimensions = self.dimensions[:3]  # 快速演示模式：只面试前 3 个维度
        self._dim_data = {d["name"]: d for d in seed["dimensions"]}

        # 多轮晋级：人格 = 起始轮次
        self.rounds = ROUND_PERSONAS.get(persona_id, ["rigorous"])
        if fast_mode:
            self.rounds = self.rounds[:1]  # 快速演示 = 单轮
        self.round_index = 0
        self.persona_id = self.rounds[0]
        self.round_questions = 0  # 本轮已问题数
        self.round_levels: list[int] = []  # 本轮证据掌握度（算晋级结论）
        self.round_results: list[dict] = []  # 每轮结论
        self.asked_questions: set[str] = set()  # 跨轮去重

        self.memory = MemoryStore(uuid4().hex)
        self.state = "opening"
        self.current_dimension: str | None = self.dimensions[0] if self.dimensions else None
        self.dim_index = 0
        self.seq = 0
        self.followup_count = 0
        self.miss_count = 0
        self.closed = False

    def _current_question(self) -> str:
        """从当前维度选一道未问过的题（跨轮去重），题尽则换维度兜底。"""
        names = [self.current_dimension, *[n for n in self.dimensions if n != self.current_dimension]]
        names = [n for n in names if n]
        for name in names:
            questions = self._dim_data.get(name, {}).get("questions", [])
            candidates = [q["q"] for q in questions if q["q"] not in self.asked_questions]
            if candidates:
                self.current_dimension = name
                q = random.choice(candidates)
                self.asked_questions.add(q)
                return q
        return f"请谈谈你对「{self.current_dimension}」的理解。"

    def opening(self) -> str:
        self.current_dimension = self.dimensions[0] if self.dimensions else None
        return generate_opening(self.position_name, self.persona_id, self._current_question(), len(self.rounds))

    def _advance_round(self) -> dict:
        """结算本轮 → 晋级/待提升 → 推进轮次（永不截断）。"""
        avg = round(sum(self.round_levels) / len(self.round_levels), 1) if self.round_levels else 0.0
        verdict = "晋级" if avg >= _PROMOTE_THRESHOLD else "待提升"
        result = {
            "round": self.round_index + 1,
            "persona_id": self.persona_id,
            "avg_level": avg,
            "verdict": verdict,
        }
        self.round_results.append(result)
        self.round_levels = []
        if self.round_index + 1 >= len(self.rounds):
            self.closed = True
        else:
            self.round_index += 1
            self.persona_id = self.rounds[self.round_index]
            self.round_questions = 0
            self.followup_count = 0
        return result

    def answer(self, answer: str) -> dict:
        """处理一轮回答，返回 {action, evidence, followup_iter, closed, round_result}。"""
        if self.closed:
            return {
                "action": "close",
                "evidence": None,
                "followup_iter": iter(["面试已结束。"]),
                "closed": True,
                "round_result": None,
            }

        self.seq += 1
        result = classify(answer, self.position_name, self.current_dimension or "")
        action = result.action
        evidence = result.evidence

        # L3 证据落库 + 本轮掌握度累积
        if evidence and evidence.quote:
            self.memory.add_evidence(evidence.dimension, evidence.level, evidence.quote)
            self.round_levels.append(evidence.level)

        # 硬护栏：累计基础题失误
        if evidence and evidence.level <= 1:
            self.miss_count += 1

        # 硬护栏：追问上限
        if action in _FOLLOWUP_ACTIONS:
            self.followup_count += 1
            if self.followup_count >= MAX_FOLLOWUP:
                action = "next"

        round_result = None
        if action in ("next", "close"):
            self._record(answer, action)
            self.round_questions += 1
            if action == "close":
                self.closed = True
                followup_iter = generate_closing(self.position_name, self.persona_id)
            elif self.round_questions >= QUESTIONS_PER_ROUND:
                round_result = self._advance_round()
                if self.closed:
                    followup_iter = generate_closing(self.position_name, self.persona_id)
                else:
                    self.dim_index += 1
                    self.current_dimension = self.dimensions[self.dim_index % len(self.dimensions)]
                    followup_iter = generate_round_transition(
                        self.position_name,
                        self.persona_id,
                        round_result["verdict"],
                        round_result["avg_level"],
                        self._current_question(),
                    )
            else:
                self.dim_index += 1
                self.current_dimension = self.dimensions[self.dim_index % len(self.dimensions)]
                self.followup_count = 0
                followup_iter = generate_transition(
                    self.position_name,
                    self.persona_id,
                    self.current_dimension or "",
                    self._current_question(),
                )
        else:
            self._record(answer, action)
            followup_iter = generate_followup(
                action,
                result.reason,
                answer,
                self.position_name,
                self.current_dimension or "",
                self.persona_id,
                evidence.level if evidence else 0,
            )

        return {
            "action": action,
            "evidence": evidence.model_dump() if evidence else None,
            "followup_iter": followup_iter,
            "closed": self.closed,
            "round_result": round_result,
        }

    def _record(self, answer: str, action: str) -> None:
        self.memory.add_question(self.seq, self.current_dimension or "", "", answer, action)

    def get_evidence(self) -> list[dict]:
        return self.memory.get_evidence()

    def close(self) -> None:
        self.memory.close()
