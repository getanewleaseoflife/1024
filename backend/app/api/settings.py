"""设置接口：读取 / 保存用户多 provider 配置，保存时同步切换运行时 provider。"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user_id
from app.services import llm
from app.services import settings as settings_service

router = APIRouter(tags=["settings"])


class SettingsUpdate(BaseModel):
    llm_base_url: str = ""
    llm_model: str = ""
    tts_voice: str = ""


@router.get("/settings")
def get(user_id: str = Depends(get_current_user_id)) -> dict:
    return settings_service.get_settings(user_id)


@router.put("/settings")
def update(req: SettingsUpdate, user_id: str = Depends(get_current_user_id)) -> dict:
    result = settings_service.save_settings(user_id, req.llm_base_url, req.llm_model, req.tts_voice)
    # 运行时切换 provider（OpenAI 兼容端点），全局生效（单用户演示场景）
    llm.set_provider(req.llm_base_url, req.llm_model)
    return result
