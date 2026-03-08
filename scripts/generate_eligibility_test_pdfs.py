# -*- coding: utf-8 -*-
"""
퇴직금·실업급여 자격 테스트용 PDF 생성 스크립트.

★ 핵심 설계 원칙 (하루 1행):
  - 근로일자 컬럼에 단일 날짜 숫자("5")만 넣어 pdfplumber 오버플로우 방지
  - 날짜 패턴 [2,3,9,10,16,17,22,23,24,25]은 어떤 28일 구간에서도 ≥8일 보장

퇴직금 기준 (28일 역산 블록):
  블록 내 근무일수 × 8h ÷ 4주 ≥ 15h/주 (≡ 블록 내 근무일 ≥ 8일)
  qualifying_days ≥ 365 → 대상

실업급여 기준:
  최근 18개월 내 피보험 단위기간 ≥ 180일 → 대상

케이스:
  비대상         / 아슬아슬_비대상 / 아슬아슬_대상 / 대상

실행: python scripts/generate_eligibility_test_pdfs.py
생성: tests/fixtures/test_퇴직금_<회사>_<케이스>.pdf
               tests/fixtures/test_실업급여_<회사>_<케이스>.pdf
"""
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

OUT_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADER = ["근로년월", "사업장명", "근로일자", "근로일수", "임금총액"]

COMPANIES = {
    "쿠팡":      "(주)쿠팡",
    "마켓컬리":  "마켓컬리(주)",
    "CJ대한통운": "CJ대한통운",
}

# ── 날짜 패턴 ────────────────────────────────────────────────────────────────
# 어떤 28일 구간에서도 반드시 ≥ 8일이 포함되도록 설계
# (각 주에 2일씩 배분: 2-3일 / 9-10일 / 16-17일 / 22-25일)
DAYS_10 = [2, 3, 9, 10, 16, 17, 22, 23, 24, 25]   # 10일/월 (아슬아슬 케이스용)
DAYS_12 = [2, 3, 8, 9, 10, 15, 16, 17, 22, 23, 24, 25]  # 12일/월 (대상용)
DAYS_1  = [15]                                         # 1일/월 (비대상용)


def make_pdf(filepath: Path, rows: list[list]):
    """하루 1행 형식으로 PDF 생성."""
    if not HAS_REPORTLAB:
        return
    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=20*mm, bottomMargin=15*mm,
    )
    data = [HEADER] + rows
    t = Table(data, colWidths=[28*mm, 52*mm, 22*mm, 22*mm, 36*mm])
    t.setStyle(TableStyle([
        ("FONTNAME",   (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1,  0), colors.HexColor("#e8e8e8")),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("ALIGN",      (1, 0), (1,  -1), "LEFT"),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    doc.build([t])


def ym(year: int, month: int) -> str:
    return f"{year}/{month:02d}"


# ── 퇴직금 데이터 빌더 ────────────────────────────────────────────────────────
def build_severance_rows(site: str, months: int,
                          day_pattern: list[int],
                          pay_per_day: int = 100_000) -> list[list]:
    """하루 1행 × months개월 × day_pattern일/월"""
    rows = []
    for i in range(months):
        y = 2022 + (i // 12)
        m = (i % 12) + 1
        for d in day_pattern:
            if 1 <= d <= 28:           # 모든 달에 존재하는 날짜만 사용
                rows.append([ym(y, m), site, str(d), "1", str(pay_per_day)])
    return rows


# ── 실업급여 데이터 빌더 ──────────────────────────────────────────────────────
def build_unemployment_rows(site: str, target_days: int,
                             pay_per_day: int = 100_000) -> list[list]:
    """
    2023/01 ~ 2024/06 (18개월) 구간에서 target_days일 균등 배분.
    하루 1행.
    """
    months_18 = [(2023, m) for m in range(1, 13)] + [(2024, m) for m in range(1, 7)]
    per_month, remainder = divmod(target_days, 18)
    rows = []
    remaining = target_days
    for idx, (y, mo) in enumerate(months_18):
        if remaining <= 0:
            break
        cnt = min(per_month + (1 if idx < remainder else 0), remaining, 22)
        for d in range(1, cnt + 1):
            rows.append([ym(y, mo), site, str(d), "1", str(pay_per_day)])
        remaining -= cnt
    return rows


def main():
    if not HAS_REPORTLAB:
        print("reportlab 필요: pip install reportlab")
        return

    count = 0

    # ── 퇴직금 케이스 정의 ───────────────────────────────────────────────────
    # qualifying_days 기준:
    #   비대상:         3개월 ×  1일/월 → ~0일   (미충족)
    #   아슬아슬_비대상: 14개월 × 10일/월 → ~364일 (미충족, 365 미만)
    #   아슬아슬_대상:  15개월 × 10일/월 → ~392일 (충족, 365 이상)
    #   대상:           24개월 × 12일/월 → ~723일 (충족)
    severance_cases = [
        ("비대상",          3,  DAYS_1),
        ("아슬아슬_비대상", 14, DAYS_10),
        ("아슬아슬_대상",   15, DAYS_10),
        ("대상",            24, DAYS_12),
    ]

    print("=" * 60)
    print("퇴직금 테스트 PDF 생성")
    print("=" * 60)
    for company_key, site_name in COMPANIES.items():
        for label, months, pattern in severance_cases:
            rows = build_severance_rows(site_name, months, pattern)
            name = f"test_퇴직금_{company_key}_{label}.pdf"
            make_pdf(OUT_DIR / name, rows)
            count += 1
            print(f"  ✓ {name}  ({months}개월 × {len(pattern)}일 = {len(rows)}행)")

    # ── 실업급여 케이스 정의 ─────────────────────────────────────────────────
    # 18개월 내 피보험 단위기간 기준:
    #   비대상:         100일 (180 미만)
    #   아슬아슬_비대상: 179일 (180 미만)
    #   아슬아슬_대상:  180일 (180 이상, 충족)
    #   대상:           350일 (충족)
    unemployment_cases = [
        ("비대상",          100),
        ("아슬아슬_비대상", 179),
        ("아슬아슬_대상",   180),
        ("대상",            350),
    ]

    print()
    print("=" * 60)
    print("실업급여 테스트 PDF 생성")
    print("=" * 60)
    for company_key, site_name in COMPANIES.items():
        for label, days in unemployment_cases:
            rows = build_unemployment_rows(site_name, days)
            name = f"test_실업급여_{company_key}_{label}.pdf"
            make_pdf(OUT_DIR / name, rows)
            count += 1
            print(f"  ✓ {name}  (총 {days}일)")

    print()
    print(f"총 {count}개 PDF 생성 완료 → {OUT_DIR}")
    print()
    print("퇴직금 qualifying_days 예상값:")
    print("  비대상         :    0일 (미충족)")
    print("  아슬아슬_비대상: ~364일 (미충족)")
    print("  아슬아슬_대상  : ~392일 (충족)")
    print("  대상           : ~723일 (충족)")
    print()
    print("실업급여 피보험단위기간 예상값:")
    print("  비대상         : 100일 (미충족)")
    print("  아슬아슬_비대상: 179일 (미충족)")
    print("  아슬아슬_대상  : 180일 (충족)")
    print("  대상           : 350일 (충족)")


if __name__ == "__main__":
    main()
