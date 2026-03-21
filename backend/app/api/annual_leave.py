# -*- coding: utf-8 -*-
"""연차수당 API — 연차 발생일수·미지급수당 정밀 계산 (PDF 기반)

근거: 근로기준법 제60조
- 1년 미만: 1개월 개근 시 1일 (최대 11일)
- 1년 이상~3년 미만: 15일/년
- 3년 이상: 15일 + (근속연수 - 1) ÷ 2 (최대 25일)
"""
import traceback
from datetime import date, datetime, timedelta
from typing import Optional

import pandas as pd
from fastapi import APIRouter, File, Form, UploadFile

from ..services.pdf import extract_unique_companies, filter_df_by_company, parse_welcomwel_pdf, preprocess_data

router = APIRouter()


def _calc_annual_leave_days(hire_date: date, ref_date: date) -> dict:
    """
    연차 발생일수 계산 (근로기준법 제60조).

    Returns:
      {
        years_worked: int,        # 만 근속연수
        months_worked: int,       # 총 근속 개월 수
        first_year_days: int,     # 1년 미만 연차 발생 (1개월=1일, max 11)
        annual_days: int,         # 현재 연도 기준 발생 연차
        total_entitlement: int,   # 총 발생 연차 (근속 기간 누적)
      }
    """
    delta = ref_date - hire_date
    total_months = int(delta.days / 30.44)
    years_worked = total_months // 12
    rem_months   = total_months % 12

    # 1년 미만 기간: 개월당 1일
    first_year_days = min(total_months, 11)

    # 1년 이상 시 연도별 연차
    if years_worked == 0:
        annual_days = 0
    elif years_worked < 3:
        annual_days = 15
    else:
        annual_days = min(15 + (years_worked - 1) // 2, 25)

    # 총 발생 연차 (간이 추정 — 실무상 연도별 갱신이 맞지만 여기선 대표값)
    if years_worked == 0:
        total_entitlement = first_year_days
    else:
        # 1년차 11일 + 이후 연도별 합산
        total = 11  # 첫 해 max
        for y in range(1, years_worked + 1):
            if y < 3:
                total += 15
            else:
                total += min(15 + (y - 1) // 2, 25)
        # 현재 연도 잔여 기간 (rem_months / 12) 비율로 추가
        total += round(annual_days * rem_months / 12)
        total_entitlement = total

    return {
        "years_worked":       years_worked,
        "months_worked":      total_months,
        "first_year_days":    first_year_days,
        "annual_days":        annual_days,
        "total_entitlement":  total_entitlement,
    }


@router.post("/extract-companies")
async def extract_companies(file: UploadFile = File(...)):
    """PDF에서 사업장명 목록 추출 (연차수당 PDF 정밀계산용)"""
    try:
        raw = await file.read()
        companies = extract_unique_companies(raw)
        return {"companies": companies}
    except Exception:
        traceback.print_exc()
        return {"companies": []}


@router.post("/precise")
async def annual_leave_precise(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    hire_date_str: str = Form(...),       # "YYYY-MM-DD"
    end_date_str: str = Form(""),         # "YYYY-MM-DD" or "" for today
    used_days: int = Form(0),             # 이미 사용한 연차 일수
    avg_daily_wage: float = Form(0.0),    # 평균 일급 (미지급 수당 계산용)
):
    """
    PDF 업로드 → 연차 발생일수 및 미지급 연차수당 계산

    - hire_date ~ end_date(or today) 기간 기준으로 연차 계산
    - PDF에서 근무일 패턴을 분석해 월별 개근 여부를 추정합니다.
    """
    try:
        # 날짜 파싱
        try:
            hire_date = datetime.strptime(hire_date_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            return {"error": "입사일 형식이 잘못됐습니다. YYYY-MM-DD 형식으로 입력하세요."}

        ref_date = date.today()
        if end_date_str.strip():
            try:
                ref_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
            except ValueError:
                pass

        if hire_date >= ref_date:
            return {"error": "입사일이 퇴직일보다 같거나 이후입니다."}

        # PDF 파싱
        raw = await file.read()
        df_raw = parse_welcomwel_pdf(raw)
        if df_raw is None or df_raw.empty:
            return {"error": "PDF 파싱 실패 또는 데이터 없음"}

        target = company_other.strip() if company == "기타" and company_other.strip() else company
        df = filter_df_by_company(df_raw, target)
        if df.empty:
            return {"error": f"'{target}' 근무 기록이 없습니다."}

        df = preprocess_data(df)
        if df.empty or "근무일" not in df.columns:
            return {"error": "데이터 전처리 실패"}

        # 월별 근무일수 분석 (개근 추정: 근무일 ≥ 1이면 개근)
        df["year_month"] = df["근무일"].dt.to_period("M")
        monthly_work = df.groupby("year_month")["근무일"].count().reset_index()
        monthly_work.columns = ["period", "work_days"]
        attended_months = int((monthly_work["work_days"] >= 1).sum())

        # 연차 계산
        leave_info = _calc_annual_leave_days(hire_date, ref_date)

        # 실제 개근 개월수 기준으로 1년 미만 연차 재계산
        first_year_days_actual = min(attended_months, 11)

        # 남은 연차 = 발생 연차 - 사용 연차
        entitlement = leave_info["total_entitlement"]
        remaining   = max(entitlement - used_days, 0)

        # 미지급 연차수당
        unpaid_allowance = round(remaining * avg_daily_wage) if avg_daily_wage > 0 else None

        # 월별 상세 (최대 24개월만 반환)
        monthly_detail = []
        for _, row in monthly_work.sort_values("period").tail(24).iterrows():
            monthly_detail.append({
                "month":      str(row["period"]),
                "work_days":  int(row["work_days"]),
                "attended":   int(row["work_days"]) >= 1,
            })

        return {
            "company":                target,
            "hire_date":              hire_date_str,
            "ref_date":               str(ref_date),
            "years_worked":           leave_info["years_worked"],
            "months_worked":          leave_info["months_worked"],
            "attended_months":        attended_months,
            "first_year_days":        first_year_days_actual,
            "annual_days":            leave_info["annual_days"],
            "total_entitlement":      entitlement,
            "used_days":              used_days,
            "remaining_days":         remaining,
            "avg_daily_wage":         avg_daily_wage,
            "unpaid_allowance":       unpaid_allowance,
            "monthly_detail":         monthly_detail,
        }

    except Exception:
        traceback.print_exc()
        return {"error": "계산 중 오류가 발생했습니다."}
