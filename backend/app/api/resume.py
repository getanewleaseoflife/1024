"""简历解析接口。"""

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.resume_parser import parse_resume
from app.schemas.resume import ResumeParseResult
from app.services.pdf import extract_pdf_text

router = APIRouter(tags=["resume"])


class ResumeParseRequest(BaseModel):
    resume_text: str
    position_id: str = "ai_algorithm"


@router.post("/resume/parse", response_model=ResumeParseResult)
def parse(request: ResumeParseRequest) -> ResumeParseResult:
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    return parse_resume(request.resume_text, request.position_id)


@router.post("/resume/parse_pdf", response_model=ResumeParseResult)
async def parse_pdf(
    position_id: str = "ai_algorithm",
    file: UploadFile = File(...),  # noqa: B008
) -> ResumeParseResult:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")
    text = extract_pdf_text(content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="无法从 PDF 提取文本")
    return parse_resume(text, position_id)
