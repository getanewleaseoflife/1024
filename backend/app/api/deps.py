"""轻量鉴权依赖：优先 JWT，回退游客 X-User-Id 头（向后兼容 localStorage UUID 流程）。"""

from fastapi import Header, HTTPException

from app.services import auth


def require_user_id(authorization: str | None = Header(default=None)) -> str:
    if authorization and authorization.startswith("Bearer "):
        payload = auth.decode_token(authorization.removeprefix("Bearer ").strip())
        if payload and payload.get("sub"):
            return str(payload["sub"])
    raise HTTPException(status_code=401, detail="未登录")


def get_current_user_id(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> str:
    if authorization and authorization.startswith("Bearer "):
        payload = auth.decode_token(authorization.removeprefix("Bearer ").strip())
        if payload and payload.get("sub"):
            return str(payload["sub"])
    return x_user_id or ""
