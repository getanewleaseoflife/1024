"""面试历史持久化（SQLite 文件库，跨会话保留，按 user 隔离）。"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "history.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    conn = _get_conn()
    conn.execute(
        """CREATE TABLE IF NOT EXISTS interview_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            position_id TEXT,
            position_name TEXT,
            persona_id TEXT,
            match_score INTEGER,
            report_json TEXT,
            created_at TEXT
        )"""
    )
    conn.commit()
    conn.close()


def save_history(
    user_id: str,
    position_id: str,
    position_name: str,
    persona_id: str,
    match_score: int,
    report: dict,
) -> int:
    init()
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO interview_history "
        "(user_id, position_id, position_name, persona_id, match_score, report_json, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (
            user_id,
            position_id,
            position_name,
            persona_id,
            match_score,
            json.dumps(report, ensure_ascii=False),
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    history_id = int(cur.lastrowid or 0)
    conn.close()
    return history_id


def list_history(user_id: str) -> list[dict]:
    init()
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, position_name, persona_id, match_score, created_at "
        "FROM interview_history WHERE user_id=? ORDER BY id DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_history(history_id: int) -> dict | None:
    init()
    conn = _get_conn()
    row = conn.execute("SELECT * FROM interview_history WHERE id=?", (history_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    data = dict(row)
    data["report"] = json.loads(data.pop("report_json"))
    return data
