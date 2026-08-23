"""PDF 文本提取（pypdf）。"""

import io

from pypdf import PdfReader


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    parts = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(parts)
