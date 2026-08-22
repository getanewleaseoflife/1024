"""BGE 本地嵌入（fastembed / ONNX，无 torch）。"""

import os

import certifi

from app.config import settings

# 必须在 import fastembed 之前设置环境变量（其依赖 huggingface_hub 在 import 时读取）：
# - HF_ENDPOINT：国内镜像下载模型
# - SSL_CERT_FILE：Windows 下用 certifi 的 CA，避免 SSL 证书验证失败
os.environ.setdefault("HF_ENDPOINT", settings.hf_endpoint)
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")  # 禁用 xet 存储，走普通 HTTP（镜像不支持 xet）
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

from fastembed import TextEmbedding  # noqa: E402

_model: TextEmbedding | None = None


def get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=settings.embedding_model)
    return _model


def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_model()
    return [v.tolist() for v in model.embed(texts)]
