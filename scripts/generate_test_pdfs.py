# -*- coding: utf-8 -*-
"""
근로복지공단 일용근로내역서와 동일한 양식의 테스트 PDF 생성.
실행: python scripts/generate_test_pdfs.py
생성 위치: tests/fixtures/
"""
import os
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

# 출력 디렉토리
OUT_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def make_table_pdf(filepath: Path, header: list, rows: list, title: str = "고용·일용 근로내역"):
    """헤더 + 데이터 행으로 테이블 PDF 생성 (pdfplumber extract_tables 호환)."""
    if not HAS_REPORTLAB:
        print("reportlab 미설치: pip install reportlab")
        return
    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=15 * mm,
    )
    data = [header] + rows
    t = Table(data, colWidths=[22 * mm, 35 * mm, 45 * mm, 18 * mm, 28 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("ALIGN", (1, 0), (1, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    doc.build([t])


def main():
    if not HAS_REPORTLAB:
        print("reportlab이 필요합니다: pip install reportlab")
        return

    # 공통 헤더 (앱 파서가 찾는 컬럼명)
    header = ["근로년월", "사업장명", "근로일자", "근로일수", "임금총액"]

    # --- 테스트 1: 2024/01 형식, 쿠팡, 3개월 (퇴직금 계산용)
    rows1 = [
        ["2024/01", "(주)쿠팡", "1, 2, 3, 4, 5", "5", "750000"],
        ["2024/02", "(주)쿠팡", "1, 2, 5, 6, 7", "5", "800000"],
        ["2024/03", "(주)쿠팡", "1, 4, 5, 6, 7, 8", "6", "960000"],
    ]
    make_table_pdf(OUT_DIR / "test_일용근로내역_쿠팡_3개월.pdf", header, rows1)

    # --- 테스트 2: 2024.01 형식, 마켓컬리, 5개월
    rows2 = [
        ["2024.01", "마켓컬리(주)", "1 2 3 4 5", "5", "700000"],
        ["2024.02", "마켓컬리(주)", "1 2 5 6 7 8", "6", "840000"],
        ["2024.03", "마켓컬리(주)", "1 4 5 6 7", "5", "775000"],
        ["2024.04", "마켓컬리(주)", "1 2 3 4 5 6", "6", "900000"],
        ["2024.05", "마켓컬리(주)", "1 2 3 4 5", "5", "825000"],
    ]
    make_table_pdf(OUT_DIR / "test_일용근로내역_컬리_5개월.pdf", header, rows2)

    # --- 테스트 3: 202401 형식(붙여쓰기), CJ대한통운, 1년 근접
    rows3 = [
        ["202401", "CJ대한통운", "1,2,3,4,5", "5", "650000"],
        ["202402", "CJ대한통운", "1,2,5,6,7,8", "6", "780000"],
        ["202403", "CJ대한통운", "1,4,5,6,7", "5", "700000"],
        ["202404", "CJ대한통운", "1,2,3,4,5,6", "6", "810000"],
        ["202405", "CJ대한통운", "1,2,3,4,5", "5", "720000"],
        ["202406", "CJ대한통운", "1,2,3,4,5,6,7", "7", "980000"],
        ["202407", "CJ대한통운", "1,2,3,4,5", "5", "750000"],
        ["202408", "CJ대한통운", "1,2,3,4,5,6", "6", "870000"],
        ["202409", "CJ대한통운", "1,2,3,4,5", "5", "730000"],
        ["202410", "CJ대한통운", "1,2,3,4,5,6", "6", "860000"],
    ]
    make_table_pdf(OUT_DIR / "test_일용근로내역_CJ_10개월.pdf", header, rows3)

    # --- 테스트 4: 보수총액 컬럼명 (임금총액 대신)
    header_alt = ["근로년월", "사업장명", "근로일자", "근로일수", "보수총액"]
    rows4 = [
        ["2024/11", "테스트물류(주)", "1, 2, 3", "3", "450000"],
        ["2024/12", "테스트물류(주)", "1, 2, 3, 4, 5", "5", "750000"],
    ]
    make_table_pdf(OUT_DIR / "test_일용근로내역_보수총액.pdf", header_alt, rows4)

    print(f"테스트 PDF {4}개 생성 완료: {OUT_DIR}")
    for f in sorted(OUT_DIR.glob("*.pdf")):
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
