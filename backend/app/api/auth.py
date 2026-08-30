"""账号接口：注册 / 登录 / 当前用户。"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import require_user_id
from app.services import auth

router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/register")
def register(req: RegisterRequest) -> dict:
    username = req.username.strip()
    if len(username) < 2 or len(req.password) < 4:
        raise HTTPException(status_code=400, detail="用户名至少 2 位，密码至少 4 位")
    user_id = auth.create_user(username, req.password)
    if user_id is None:
        raise HTTPException(status_code=409, detail="用户名已存在")
    return {"token": auth.create_token(user_id, username), "user": {"id": user_id, "username": username}}


@router.post("/auth/login")
def login(req: LoginRequest) -> dict:
    user = auth.authenticate(req.username.strip(), req.password)
    if user is None:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"token": auth.create_token(user["id"], user["username"]), "user": user}


@router.get("/auth/me")
def me(user_id: str = Depends(require_user_id)) -> dict:
    return {"user_id": user_id}
