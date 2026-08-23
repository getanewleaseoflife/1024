"""Edge TTS 语音合成（免费、无需 key）。"""

import edge_tts


async def synthesize(text: str, voice: str = "zh-CN-XiaoxiaoNeural") -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)
