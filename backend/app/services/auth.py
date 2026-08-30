"""账号：PBKDF2 密码哈希 + JWT 签发/校验（stdlib 哈希 + PyJWT，零额外付费依赖）。"""

import hashlib
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
from app.services import db

_ALGO = "HS256"
_ITERATIONS = 120_000


def _hash_password(password: str, salt: str) -> str:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), _ITERATIONS)
    return f"{salt}${dk.hex()}"


def hash_password(password: str) -> str:
    return _hash_password(password, secrets.token_hex(16))


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(_hash_password(password, salt), stored)


def create_token(user_id: int, username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGO)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[_ALGO])
    except jwt.PyJWTError:
        return None


def create_user(username: str, password: str) -> int | None:
    db.init()
    conn = db.get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, hash_password(password), datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
        return int(cur.lastrowid or 0)
    except sqlite3.IntegrityError:
        return None  # 用户名已存在
    finally:
        conn.close()


def authenticate(username: str, password: str) -> dict | None:
    db.init()
    conn = db.get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if row is None or not verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "username": row["username"]}


def ensure_default_user() -> None:
    """预置演示账号（幂等）：账号 `18836762839` / 密码 `000000`。"""
    db.init()
    conn = db.get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
        ("18836762839", hash_password("000000"), datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()
