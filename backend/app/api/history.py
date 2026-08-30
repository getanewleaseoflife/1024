"""面试历史接口（多用户：按 user_id 隔离）+ 统计聚合 + 报告 PDF 导出。"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services import history, report_pdf

router = APIRouter(tags=["history"])


@router.get("/history")
def list_history(user_id: str) -> list[dict]:
    return history.list_history(user_id)


@router.get("/history/stats")
def stats(user_id: str) -> dict:
    return history.history_stats(user_id)


@router.get("/history/{history_id}")
def get_history(history_id: int) -> dict:
    item = history.get_history(history_id)
    if item is None:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return item


@router.get("/history/{history_id}/pdf")
def export_pdf(history_id: int) -> Response:
    item = history.get_history(history_id)
    if item is None:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    pdf_bytes = report_pdf.build_report_pdf(item.get("position_name", ""), item["report"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{history_id}.pdf"'},
    )
