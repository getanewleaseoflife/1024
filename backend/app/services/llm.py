"""DeepSeek 客户端封装（官方 openai SDK，只走 chat.completions.create）。"""

from collections.abc import Iterator
from typing import cast

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    return _client


def chat(messages: list[dict[str, str]], temperature: float = 0.3) -> str:
    """非流式调用，返回完整文本（用于分类器等结构化短输出）。"""
    resp = get_client().chat.completions.create(
        model=settings.deepseek_model,
        messages=cast(list[ChatCompletionMessageParam], messages),
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""


def chat_stream(messages: list[dict[str, str]], temperature: float = 0.7) -> Iterator[str]:
    """流式调用，逐块 yield 文本（用于追问原文打字机）。"""
    stream = get_client().chat.completions.create(
        model=settings.deepseek_model,
        messages=cast(list[ChatCompletionMessageParam], messages),
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            yield delta
