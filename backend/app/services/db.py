"""统一 SQLite 连接（app.db）与建表，含旧 history.db 一次性迁移。"""

import sqlite3
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_PATH = _DATA_DIR / "app.db"
_LEGACY_HISTORY_DB = _DATA_DIR / "history.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT NOT NULL PRIMARY KEY,
    llm_base_url TEXT,
    llm_model TEXT,
    tts_voice TEXT,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS interview_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    position_id TEXT,
    position_name TEXT,
    persona_id TEXT,
    match_score INTEGER,
    report_json TEXT,
    created_at TEXT
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _migrate_legacy_history(conn: sqlite3.Connection) -> None:
    """旧 history.db 存在时，把其中的 interview_history 一次性搬进 app.db（按 id 去重，幂等）。"""
    if not _LEGACY_HISTORY_DB.exists():
        return
    try:
        conn.execute("ATTACH DATABASE ? AS legacy", (str(_LEGACY_HISTORY_DB),))
        conn.execute(
            """
            INSERT OR IGNORE INTO interview_history
            (id, user_id, position_id, position_name, persona_id, match_score, report_json, created_at)
            SELECT id, user_id, position_id, position_name, persona_id, match_score, report_json, created_at
            FROM legacy.interview_history
            """
        )
        conn.execute("DETACH DATABASE legacy")
    except sqlite3.Error:
        # 旧库无该表或已迁移过，忽略
        pass


def init() -> None:
    conn = get_conn()
    conn.executescript(_SCHEMA)
    _migrate_legacy_history(conn)
    conn.commit()
    conn.close()
