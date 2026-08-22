"""简历解析接口。"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.resume_parser import parse_resume
from app.schemas.resume import ResumeParseResult

router = APIRouter(tags=["resume"])


class ResumeParseRequest(BaseModel):
    resume_text: str
    position_id: str = "ai_algorithm"


@router.post("/resume/parse", response_model=ResumeParseResult)
def parse(request: ResumeParseRequest) -> ResumeParseResult:
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    return parse_resume(request.resume_text, request.position_id)
