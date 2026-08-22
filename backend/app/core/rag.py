"""RAG 服务：种子库向量化 + Hybrid 检索（BGE 向量召回 + jieba 关键词召回）。

MVP 实现向量召回；关键词召回预留，后续融合。
"""

import json
from pathlib import Path

from app.services.embedding import embed
from app.services.vectorstore import get_or_create_collection

_COLLECTION = "seed"
_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "positions"


def build_seed(documents: list[dict]) -> None:
    """将种子库文档嵌入向量库。documents: [{id, text, dimension}]"""
    if not documents:
        return
    col = get_or_create_collection(_COLLECTION)
    ids = [d["id"] for d in documents]
    texts = [d["text"] for d in documents]
    embeddings = embed(texts)
    col.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=[{"dimension": d["dimension"]} for d in documents],
    )


def _seed_to_docs(position_id: str) -> list[dict]:
    """把岗位 seed.json 展开成可检索的 chunk 文档（四件套）。"""
    path = _DATA_DIR / position_id / "seed.json"
    seed = json.loads(path.read_text(encoding="utf-8"))
    docs: list[dict] = []
    for d in seed["dimensions"]:
        name = d["name"]
        for kp in d["key_points"]:
            docs.append(
                {
                    "id": f"{position_id}:{name}:kp:{kp}",
                    "text": f"[{name}]考核要点：{kp}",
                    "dimension": name,
                }
            )
        for i, q in enumerate(d["questions"]):
            text = f"[{name}]面试题：{q['q']}；参考答案要点：{'；'.join(q['answer_points'])}"
            docs.append({"id": f"{position_id}:{name}:q{i}", "text": text, "dimension": name})
        rubric = "；".join(f"{r['level']}档：{r['desc']}" for r in d["rubric"])
        docs.append(
            {
                "id": f"{position_id}:{name}:rubric",
                "text": f"[{name}]评分锚点：{rubric}",
                "dimension": name,
            }
        )
    return docs


def ensure_seed(position_id: str) -> None:
    """确保种子库已嵌入（Ephemeral 客户端，进程内首次调用时构建）。"""
    col = get_or_create_collection(_COLLECTION)
    if col.count() == 0:
        build_seed(_seed_to_docs(position_id))


def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """向量召回，返回 [{id, text, dimension, distance}]。"""
    col = get_or_create_collection(_COLLECTION)
    if col.count() == 0:
        return []
    q_emb = embed([query])[0]
    res = col.query(query_embeddings=[q_emb], n_results=top_k)
    docs = []
    for i, doc_id in enumerate(res["ids"][0]):
        docs.append(
            {
                "id": doc_id,
                "text": res["documents"][0][i],
                "dimension": res["metadatas"][0][i]["dimension"],
                "distance": res["distances"][0][i],
            }
        )
    return docs
