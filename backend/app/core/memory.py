"""记忆层：L1 全量对话 + L3 能力证据累积（SQLite tempfile 临时库，会话结束即删）。

MVP 实现两层：L1 全量对话不滑窗；L3 能力证据累积。L2 增量摘要预留不实现。
"""

import shutil
import sqlite3
import tempfile
from pathlib import Path


class MemoryStore:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self._tmpdir = Path(tempfile.mkdtemp(prefix="interview_"))
        self._conn = sqlite3.connect(self._tmpdir / "memory.db", check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self) -> None:
        cur = self._conn.cursor()
        cur.execute(
            """CREATE TABLE IF NOT EXISTS question_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT, seq INTEGER, dimension TEXT,
                question TEXT, answer TEXT, action TEXT, score INTEGER
            )"""
        )
        cur.execute(
            """CREATE TABLE IF NOT EXISTS ability_evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT, dimension TEXT, level INTEGER, quote TEXT
            )"""
        )
        self._conn.commit()

    def add_question(
        self,
        seq: int,
        dimension: str,
        question: str,
        answer: str,
        action: str,
        score: int | None = None,
    ) -> None:
        cur = self._conn.cursor()
        cur.execute(
            "INSERT INTO question_record "
            "(session_id, seq, dimension, question, answer, action, score) "
            "VALUES (?,?,?,?,?,?,?)",
            (self.session_id, seq, dimension, question, answer, action, score),
        )
        self._conn.commit()

    def add_evidence(self, dimension: str, level: int, quote: str) -> None:
        cur = self._conn.cursor()
        cur.execute(
            "INSERT INTO ability_evidence (session_id, dimension, level, quote) VALUES (?,?,?,?)",
            (self.session_id, dimension, level, quote),
        )
        self._conn.commit()

    def get_evidence(self) -> list[dict]:
        cur = self._conn.cursor()
        rows = cur.execute(
            "SELECT dimension, level, quote FROM ability_evidence WHERE session_id=? ORDER BY id",
            (self.session_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_dialogues(self) -> list[dict]:
        """返回全量对话（L1），供追问上下文使用。"""
        cur = self._conn.cursor()
        rows = cur.execute(
            "SELECT seq, dimension, question, answer, action FROM question_record WHERE session_id=? ORDER BY seq",
            (self.session_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self) -> None:
        self._conn.close()
        shutil.rmtree(self._tmpdir, ignore_errors=True)
