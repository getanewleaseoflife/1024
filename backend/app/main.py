"""FastAPI 入口：路由注册、CORS、异常处理。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import history, interview, positions, report, resume, tts

app = FastAPI(title="岗位胜任力评估智能体 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(positions.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(history.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
