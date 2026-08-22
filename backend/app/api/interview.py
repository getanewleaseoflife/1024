"""面试接口：start / answer（SSE 流式）/ end。"""

import json
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.orchestrator import InterviewOrchestrator

router = APIRouter(tags=["interview"])

_SESSIONS: dict[str, InterviewOrchestrator] = {}


class StartRequest(BaseModel):
    position_id: str = "ai_algorithm"
    persona_id: str = "rigorous"
    resume_text: str = ""


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


@router.post("/interview/start")
def start(req: StartRequest) -> dict:
    orch = InterviewOrchestrator(req.position_id, req.persona_id, req.resume_text)
    sid = uuid4().hex
    _SESSIONS[sid] = orch
    return {
        "session_id": sid,
        "opening": orch.opening(),
        "dimensions": orch.dimensions,
    }


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/interview/answer")
def answer(req: AnswerRequest) -> StreamingResponse:
    orch = _SESSIONS.get(req.session_id)
    if orch is None:
        raise HTTPException(status_code=404, detail="会话不存在或已结束")

    result = orch.answer(req.answer)

    def gen():
        yield _sse({"type": "action", "action": result["action"]})
        if result["evidence"]:
            yield _sse({"type": "evidence", "evidence": result["evidence"]})
        for chunk in result["followup_iter"]:
            yield _sse({"type": "delta", "content": chunk})
        yield _sse({"type": "done", "closed": result["closed"]})

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/interview/end")
def end(session_id: str) -> dict:
    orch = _SESSIONS.pop(session_id, None)
    if orch is not None:
        orch.close()
    return {"status": "ok"}
