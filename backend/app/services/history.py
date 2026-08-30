"""面试历史持久化（app.db，跨会话保留，按 user 隔离）+ 聚合统计。"""

import json
from datetime import datetime

from app.services import db


def save_history(
    user_id: str,
    position_id: str,
    position_name: str,
    persona_id: str,
    match_score: int,
    report: dict,
) -> int:
    db.init()
    conn = db.get_conn()
    cur = conn.execute(
        "INSERT INTO interview_history "
        "(user_id, position_id, position_name, persona_id, match_score, report_json, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
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
    db.init()
    conn = db.get_conn()
    rows = conn.execute(
        "SELECT id, position_name, persona_id, match_score, created_at "
        "FROM interview_history WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_history(history_id: int) -> dict | None:
    db.init()
    conn = db.get_conn()
    row = conn.execute("SELECT * FROM interview_history WHERE id = ?", (history_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    data = dict(row)
    data["report"] = json.loads(data.pop("report_json"))
    return data


def history_stats(user_id: str) -> dict:
    """聚合统计：次数 / 平均匹配度 / 趋势 / 最弱维度（供工作台与历史中心可视化）。"""
    db.init()
    conn = db.get_conn()
    rows = conn.execute(
        "SELECT match_score, created_at, report_json FROM interview_history WHERE user_id = ? ORDER BY id ASC",
        (user_id,),
    ).fetchall()
    conn.close()

    if not rows:
        return {"count": 0, "avg_match_score": 0, "trend": [], "weakest_dimensions": []}

    scores = [r["match_score"] for r in rows if r["match_score"] is not None]
    avg = round(sum(scores) / len(scores)) if scores else 0
    trend = [{"match_score": r["match_score"], "created_at": r["created_at"]} for r in rows]

    # 最弱维度：聚合所有报告的分维度得分，取平均分最低的 3 个
    dim_scores: dict[str, list[float]] = {}
    for r in rows:
        try:
            report = json.loads(r["report_json"] or "{}")
        except (json.JSONDecodeError, TypeError):
            continue
        for d in report.get("dimension_scores", []):
            if d.get("score") is not None:
                dim_scores.setdefault(d["name"], []).append(d["score"])

    weakest = [
        {"name": name, "avg": round(sum(vals) / len(vals), 1)}
        for name, vals in sorted(dim_scores.items(), key=lambda kv: sum(kv[1]) / len(kv[1]))[:3]
    ]

    return {"count": len(rows), "avg_match_score": avg, "trend": trend, "weakest_dimensions": weakest}
