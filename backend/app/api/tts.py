"""语音合成接口（Edge TTS，增强项）。"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.tts import synthesize

router = APIRouter(tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = "zh-CN-XiaoxiaoNeural"


@router.post("/tts")
async def tts(req: TTSRequest) -> Response:
    try:
        audio = await synthesize(req.text, req.voice)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"TTS 失败：{e}") from e
    return Response(content=audio, media_type="audio/mpeg")
