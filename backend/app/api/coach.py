"""辅导接口：简历优化 / 成长计划 / 刷题。"""

import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core import growth_plan, practice, resume_optimizer

router = APIRouter(tags=["coach"])


class ResumeOptimizeRequest(BaseModel):
    resume_text: str
    position_id: str = "ai_algorithm"


class GrowthPlanRequest(BaseModel):
    position_name: str
    weaknesses: list[dict] = []
    suggestions: list[str] = []


class GradeRequest(BaseModel):
    dimension: str
    question: str
    answer: str
    reference: list[str] = []


@router.post("/coach/resume-optimize")
def resume_optimize(req: ResumeOptimizeRequest) -> dict:
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="简历文本不能为空")
    return resume_optimizer.optimize_resume(req.resume_text, req.position_id)


@router.post("/coach/growth-plan")
def growth_plan_generate(req: GrowthPlanRequest) -> dict:
    return growth_plan.generate_growth_plan(req.position_name, req.weaknesses, req.suggestions)


@router.get("/coach/practice")
def practice_question(position_id: str = "ai_algorithm", dimension: str = "") -> dict:
    dimensions = practice.list_dimensions(position_id)
    if not dimensions:
        raise HTTPException(status_code=404, detail="岗位不存在或缺少题库")
    dim = dimension if dimension in dimensions else random.choice(dimensions)
    q = practice.pick_question(position_id, dim)
    return {"dimensions": dimensions, **q}


@router.post("/coach/grade")
def practice_grade(req: GradeRequest) -> dict:
    return practice.grade_answer(req.dimension, req.question, req.answer, req.reference)
