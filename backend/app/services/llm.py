"""LLM 客户端封装（官方 openai SDK，只走 chat.completions.create；支持运行时切换 OpenAI 兼容 provider）。"""

from collections.abc import Iterator
from typing import cast

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.config import settings

_client: OpenAI | None = None
_client_key: tuple[str, str] = ("", "")
_override: dict[str, str] = {}


def set_provider(base_url: str, model: str) -> None:
    """运行时切换 provider（OpenAI 兼容端点），全局生效（单用户演示场景）。"""
    _override["base_url"] = base_url.strip()
    _override["model"] = model.strip()


def _base_url() -> str:
    return _override.get("base_url") or settings.deepseek_base_url


def _model() -> str:
    return _override.get("model") or settings.deepseek_model


def get_client() -> OpenAI:
    global _client, _client_key
    url = _base_url()
    key = (url, settings.deepseek_api_key)
    if _client is None or _client_key != key:
        _client = OpenAI(api_key=settings.deepseek_api_key, base_url=url)
        _client_key = key
    return _client


def chat(messages: list[dict[str, str]], temperature: float = 0.3) -> str:
    """非流式调用，返回完整文本（用于分类器等结构化短输出）。"""
    resp = get_client().chat.completions.create(
        model=_model(),
        messages=cast(list[ChatCompletionMessageParam], messages),
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""


def chat_stream(messages: list[dict[str, str]], temperature: float = 0.7) -> Iterator[str]:
    """流式调用，逐块 yield 文本（用于追问原文打字机）。"""
    stream = get_client().chat.completions.create(
        model=_model(),
        messages=cast(list[ChatCompletionMessageParam], messages),
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            yield delta
