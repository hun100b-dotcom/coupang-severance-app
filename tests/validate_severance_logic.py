#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
퇴직금 로직 자동 검증 스크립트

tests/fixtures/test_퇴직금_*.pdf 10개를 대상으로:
- PDF 파싱 → 전처리 → 회사 필터링
- compute_severance / check_continuous_employment 실행
- 통상임금 하한선 적용 여부 및 최종 평균임금 확인
- 최종 수식 severance = avg_wage * 30 * (qualifying_days / 365) 검증

결과는 stdout에 JSON 배열로 출력된다.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pandas as pd  # type: ignore

from backend.app.services.pdf import (
    parse_welcomwel_pdf,
    preprocess_data,
    filter_df_by_company,
    extract_unique_companies,
)
from backend.app.services.severance import (
    compute_severance,
    check_continuous_employment,
    MIN_ORDINARY_WAGE_DAILY,
)


FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def validate_one(pdf_path: Path) -> dict:
    raw = pdf_path.read_bytes()
    df = parse_welcomwel_pdf(raw)
    df = preprocess_data(df)

    companies = extract_unique_companies(raw)
    if companies:
        df = filter_df_by_company(df, companies[0], "")
    if df.empty:
        return {
            "file": pdf_path.name,
            "error": "empty_after_filter",
        }

    # 기본 계산
    sev_result = compute_severance(df, None)
    cont = check_continuous_employment(df)

    qualifying_days = int(cont["qualifying_days"])
    final_avg_wage = float(sev_result["average_wage"])

    # 통상임금 하한선
    last_year = int(df["근무일"].max().year)
    latest_year = max(MIN_ORDINARY_WAGE_DAILY.keys())
    min_ordinary = MIN_ORDINARY_WAGE_DAILY.get(last_year, MIN_ORDINARY_WAGE_DAILY[latest_year])

    is_ordinary_applied = bool(sev_result.get("is_ordinary_wage_applied", False))
    applied_ordinary_wage = sev_result.get("applied_ordinary_wage")

    # 최종 퇴직금 수식 검증
    severance_from_formula = round(final_avg_wage * 30 * (qualifying_days / 365), 0)
    severance_returned = round(float(sev_result["severance"]), 0)
    severance_matches = severance_from_formula == severance_returned

    return {
        "file": pdf_path.name,
        "rows": int(len(df)),
        "last_year": last_year,
        "qualifying_days": qualifying_days,
        "avg_wage_final": round(final_avg_wage, 0),
        "min_ordinary": min_ordinary,
        "is_ordinary_applied": is_ordinary_applied,
        "applied_ordinary_wage": applied_ordinary_wage,
        "severance_from_formula": int(severance_from_formula),
        "severance_returned": int(severance_returned),
        "severance_matches": severance_matches,
    }


def main() -> None:
    results: list[dict] = []
    for pdf_path in sorted(FIXTURES_DIR.glob("test_퇴직금_*.pdf")):
        results.append(validate_one(pdf_path))

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

