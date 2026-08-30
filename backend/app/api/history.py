"""面试历史接口（多用户：按 user_id 隔离）。"""

from fastapi import APIRouter, HTTPException

from app.services import history

router = APIRouter(tags=["history"])


@router.get("/history")
def list_history(user_id: str) -> list[dict]:
    return history.list_history(user_id)


@router.get("/history/{history_id}")
def get_history(history_id: int) -> dict:
    item = history.get_history(history_id)
    if item is None:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return item
