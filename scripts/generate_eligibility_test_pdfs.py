# -*- coding: utf-8 -*-
"""
퇴직금·실업급여 자격 테스트용 PDF 생성 스크립트.

★ 실제 근로내역서와 동일한 9열 양식:
  일련번호 | 근로년월 | 사업장명 | 직종명(코드) | 근로일자 | 근로일수 | 임금총액 | 보수총액 | 근로자구분
  - 근로일자: 쉼표 구분 일자 (예: 8,9,11,13,14,15,17,19,20,21,24,26)
  - 근로일수: "12일" 형식
  - 임금총액/보수총액: "1,541,300원" 형식

퇴직금: 28일 역산 블록, 블록당 8일 이상 → qualifying_days ≥ 365
실업급여: 최근 18개월 내 피보험 단위기간 ≥ 180일

케이스: 비대상 | 아슬아슬_비대상 | 아슬아슬_대상 | 대상
"""
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    HAS_REPORTLAB = True
    COL_WIDTHS_9 = [
        12 * mm, 22 * mm, 42 * mm, 38 * mm, 38 * mm,
        18 * mm, 28 * mm, 28 * mm, 18 * mm,
    ]
except ImportError:
    HAS_REPORTLAB = False
    COL_WIDTHS_9 = []

OUT_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 실제 근로내역서와 동일한 9열 헤더
HEADER_9 = [
    "일련번호",
    "근로년월",
    "사업장명",
    "직종명(코드)",
    "근로일자",
    "근로일수",
    "임금총액",
    "보수총액",
    "근로자구분",
]

# 회사별 실제 사업장명 (고용포털 PDF와 동일하게)
COMPANIES = {
    "쿠팡": "쿠팡풀필먼트서비스 유한회사",
    "마켓컬리": "마켓컬리(주)",
    "CJ대한통운": "CJ대한통운(주)",
}

JOB_CODE = "제조 단순 종사자(890)"
WORKER_TYPE = "근로자"

# 28일 블록당 8일 이상 되도록 설계한 일자 패턴 (월별)
DAYS_10 = [2, 3, 9, 10, 16, 17, 22, 23, 24, 25]
DAYS_12 = [2, 3, 8, 9, 10, 15, 16, 17, 22, 23, 24, 25]
DAYS_1 = [15]


def _ym(y: int, m: int) -> str:
    return f"{y}/{m:02d}"


def _pay_fmt(amount: int) -> str:
    return f"{amount:,}원"


def make_pdf_9col(filepath: Path, rows: list[list], col_widths: list[float]):
    """9열 실제 근로내역서 양식으로 PDF 생성."""
    if not HAS_REPORTLAB:
        return
    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=18 * mm,
        bottomMargin=15 * mm,
    )
    data = [HEADER_9] + rows
    t = Table(data, colWidths=col_widths)
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),   # 일련번호
                ("ALIGN", (1, 0), (1, -1), "CENTER"),   # 근로년월
                ("ALIGN", (2, 0), (2, -1), "LEFT"),      # 사업장명
                ("ALIGN", (3, 0), (3, -1), "LEFT"),      # 직종명
                ("ALIGN", (4, 0), (4, -1), "LEFT"),     # 근로일자
                ("ALIGN", (5, 0), (5, -1), "CENTER"),   # 근로일수
                ("ALIGN", (6, 0), (6, -1), "RIGHT"),    # 임금총액
                ("ALIGN", (7, 0), (7, -1), "RIGHT"),    # 보수총액
                ("ALIGN", (8, 0), (8, -1), "CENTER"),   # 근로자구분
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    doc.build([t])


def build_severance_rows_9col(
    site: str,
    months: int,
    day_pattern: list[int],
    pay_per_day: int = 100_000,
) -> list[list]:
    """월별 1행, 근로일자 쉼표 구분, 근로일수 'N일', 임금/보수 'N원' 형식."""
    rows = []
    for i in range(months):
        y = 2022 + (i // 12)
        m = (i % 12) + 1
        # 1~28일만 사용 (모든 달에 존재)
        days_in_month = [d for d in day_pattern if 1 <= d <= 28]
        n_days = len(days_in_month)
        if n_days == 0:
            continue
        dates_str = ",".join(str(d) for d in sorted(days_in_month))
        pay_total = n_days * pay_per_day
        row = [
            str(i + 1),
            _ym(y, m),
            site,
            JOB_CODE,
            dates_str,
            f"{n_days}일",
            _pay_fmt(pay_total),
            _pay_fmt(pay_total),
            WORKER_TYPE,
        ]
        rows.append(row)
    return rows


def build_unemployment_rows_9col(
    site: str,
    target_days: int,
    pay_per_day: int = 100_000,
) -> list[list]:
    """최근 18개월 내 target_days일 균등 배분, 월별 1행 9열."""
    months_18 = [(2023, m) for m in range(1, 13)] + [(2024, m) for m in range(1, 7)]
    per_month, remainder = divmod(target_days, 18)
    rows = []
    seq = 0
    remaining = target_days
    for idx, (y, mo) in enumerate(months_18):
        if remaining <= 0:
            break
        cnt = min(per_month + (1 if idx < remainder else 0), remaining, 28)
        if cnt <= 0:
            continue
        dates_str = ",".join(str(d) for d in range(1, cnt + 1))
        pay_total = cnt * pay_per_day
        seq += 1
        row = [
            str(seq),
            _ym(y, mo),
            site,
            JOB_CODE,
            dates_str,
            f"{cnt}일",
            _pay_fmt(pay_total),
            _pay_fmt(pay_total),
            WORKER_TYPE,
        ]
        rows.append(row)
        remaining -= cnt
    return rows


def main():
    if not HAS_REPORTLAB:
        print("reportlab 필요: pip install reportlab")
        return

    # 기존 테스트 PDF 삭제
    for f in OUT_DIR.glob("test_*.pdf"):
        f.unlink()
        print(f"  삭제: {f.name}")

    count = 0

    # ── 퇴직금 (9열, 월별 1행) ─────────────────────────────────────────────
    # 계획에 따라 총 10개의 퇴직금 테스트 PDF만 생성한다.
    # - 비대상, 경계선, 장기근속, 단절 등 다양한 패턴을 회사별로 섞어서 구성.
    severance_cases_explicit = [
        # 쿠팡: 비대상(3개월), 경계선(약 1년), 장기근속(2년)
        ("쿠팡", "비대상_3개월", 3, DAYS_1),
        ("쿠팡", "경계선_약1년", 14, DAYS_10),
        ("쿠팡", "장기근속_2년", 24, DAYS_12),
        # 마켓컬리: 비대상, 경계선, 장기근속
        ("마켓컬리", "비대상_3개월", 3, DAYS_1),
        ("마켓컬리", "경계선_약1년", 14, DAYS_10),
        ("마켓컬리", "장기근속_2년", 24, DAYS_12),
        # CJ대한통운: 비대상, 경계선, 장기근속
        ("CJ대한통운", "비대상_3개월", 3, DAYS_1),
        ("CJ대한통운", "경계선_약1년", 14, DAYS_10),
        ("CJ대한통운", "장기근속_2년", 24, DAYS_12),
        # 혼합 패턴: 쿠팡, 월별 일수는 많지만 단절이 있을 수 있는 중간 케이스
        ("쿠팡", "중간_1년반", 18, DAYS_10),
    ]

    print("=" * 60)
    print("퇴직금 테스트 PDF 생성 (실제 9열 양식, 총 10개)")
    print("=" * 60)
    for company_key, label, months, pattern in severance_cases_explicit:
        site_name = COMPANIES[company_key]
        rows = build_severance_rows_9col(site_name, months, pattern)
        name = f"test_퇴직금_{company_key}_{label}.pdf"
        make_pdf_9col(OUT_DIR / name, rows, COL_WIDTHS_9)
        count += 1
        print(f"  ✓ {name}  ({months}개월, {len(rows)}행)")

    print()
    print(f"총 {count}개 퇴직금 테스트 PDF 생성 완료 → {OUT_DIR}")
    print("(실제 근로내역서와 동일한 9열: 일련번호, 근로년월, 사업장명, 직종명(코드), 근로일자, 근로일수, 임금총액, 보수총액, 근로자구분)")


if __name__ == "__main__":
    main()
