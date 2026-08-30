"""用户设置（多 provider 配置，存 SQLite settings 表；key 仍走 .env 全局，不落库）。"""

from datetime import datetime

from app.services import db

_DEFAULT = {"llm_base_url": "", "llm_model": "", "tts_voice": "zh-CN-XiaoxiaoNeural"}


def get_settings(user_id: str) -> dict:
    db.init()
    conn = db.get_conn()
    row = conn.execute(
        "SELECT llm_base_url, llm_model, tts_voice FROM settings WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return dict(_DEFAULT)
    result = dict(row)
    return {k: (result.get(k) or _DEFAULT[k]) for k in _DEFAULT}


def save_settings(user_id: str, llm_base_url: str, llm_model: str, tts_voice: str) -> dict:
    db.init()
    conn = db.get_conn()
    conn.execute(
        "INSERT INTO settings (user_id, llm_base_url, llm_model, tts_voice, updated_at) "
        "VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET "
        "llm_base_url = excluded.llm_base_url, "
        "llm_model = excluded.llm_model, "
        "tts_voice = excluded.tts_voice, "
        "updated_at = excluded.updated_at",
        (
            user_id,
            llm_base_url.strip(),
            llm_model.strip(),
            tts_voice.strip(),
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    conn.close()
    return get_settings(user_id)
