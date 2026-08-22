"""Chroma 向量库封装。"""

import chromadb

_client: chromadb.ClientAPI | None = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        # MVP 用内存客户端；种子库每次启动重新嵌入（数据量小）
        _client = chromadb.EphemeralClient()
    return _client


def get_or_create_collection(name: str):
    return get_client().get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})
