"""岗位列表接口。"""

from fastapi import APIRouter

from app.schemas.position import Position

router = APIRouter(tags=["positions"])

# M1 静态数据；M5 后从岗位种子库（data/positions/*/）读取
_POSITIONS = [
    Position(
        id="ai_algorithm",
        name="AI 算法工程师",
        tagline="机器学习 / 深度学习 / 算法落地",
        available=True,
        dimensions=[
            "机器学习基础",
            "模型算法深度",
            "项目实战经验",
            "工程落地能力",
            "场景设计能力",
            "数学理论功底",
        ],
    ),
    Position(
        id="java",
        name="Java 开发工程师",
        tagline="后端开发 / 框架 / 系统设计",
        available=False,
        dimensions=["语言与 JVM", "框架与中间件", "并发编程", "数据库与缓存", "系统设计"],
    ),
    Position(
        id="product",
        name="产品经理",
        tagline="需求分析 / 产品设计 / 数据驱动",
        available=False,
        dimensions=["需求分析", "逻辑思维", "沟通表达", "数据驱动", "商业思维"],
    ),
]


@router.get("/positions", response_model=list[Position])
def list_positions() -> list[Position]:
    return _POSITIONS
