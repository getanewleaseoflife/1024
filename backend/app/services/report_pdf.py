"""报告 PDF 导出（fpdf2 + CJK 字体）。字体按内置目录 → 系统字体 → 降级顺序解析。"""

from pathlib import Path

from fpdf import FPDF

_FONT_DIR = Path(__file__).resolve().parent.parent / "data" / "fonts"

_FONT_CANDIDATES = [
    _FONT_DIR / "NotoSansSC-Regular.otf",
    Path("C:/Windows/Fonts/simhei.ttf"),
    Path("C:/Windows/Fonts/Deng.ttf"),
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/simsun.ttc"),
    Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]

_FAMILY = "cjk"


def _find_font() -> Path | None:
    for p in _FONT_CANDIDATES:
        if p.exists():
            return p
    return None


def build_report_pdf(position_name: str, report: dict) -> bytes:
    pdf = FPDF()
    font = _find_font()
    family = "helvetica"
    if font is not None:
        try:
            pdf.add_font(_FAMILY, "", str(font))
            family = _FAMILY
        except Exception:  # noqa: BLE001
            family = "helvetica"

    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    w = pdf.w - pdf.l_margin - pdf.r_margin

    def heading(text: str) -> None:
        pdf.ln(4)
        pdf.set_font(family, size=14)
        pdf.cell(w, 10, text, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(family, size=11)

    def para(text: str) -> None:
        pdf.multi_cell(w, 7, text, new_x="LMARGIN", new_y="NEXT")

    # 标题 + 概览
    pdf.set_font(family, size=18)
    pdf.cell(w, 12, "岗位胜任力评估报告", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font(family, size=12)
    para(f"目标岗位：{position_name}")
    para(f"综合匹配度：{report.get('match_score', 0)}%")

    # 分维度得分
    heading("分维度得分")
    for d in report.get("dimension_scores", []):
        score = d.get("score")
        score_text = f"{score} / 5" if score is not None else "待考察"
        quote = d.get("quote") or ""
        para(f"- {d.get('name', '')}: {score_text}  「{quote}」")

    # 优势
    heading("优势")
    for s in report.get("strengths", []):
        para(f"- {s.get('text', '') if isinstance(s, dict) else s}")

    # 待提升
    heading("待提升")
    for item in report.get("weaknesses", []):
        para(f"- {item.get('text', '') if isinstance(item, dict) else item}")

    # 提升建议
    heading("提升建议")
    for i, s in enumerate(report.get("suggestions", []), 1):
        para(f"{i}. {s}")

    return bytes(pdf.output())
