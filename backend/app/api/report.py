"""报告接口。"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.report_generator import generate_report
from app.services import history

router = APIRouter(tags=["report"])


class ReportRequest(BaseModel):
    session_id: str = ""
    position_id: str = "ai_algorithm"
    persona_id: str = "rigorous"
    user_id: str = ""
    evidence: list[dict] = []
    dialogues: list[dict] = []


@router.post("/report/generate")
def generate(req: ReportRequest) -> dict:
    if not req.evidence:
        raise HTTPException(status_code=400, detail="暂无能力证据，无法生成报告")
    report = generate_report(req.position_id, req.evidence, req.dialogues)
    if req.user_id:
        history.save_history(
            req.user_id,
            req.position_id,
            report["position_name"],
            req.persona_id,
            report["match_score"],
            report,
        )
    return report
