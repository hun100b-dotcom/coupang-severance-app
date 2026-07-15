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


# 연차수당(미사용수당) 청구 소멸시효 (개월). 근로기준법상 임금채권 소멸시효 3년.
ANNUAL_LEAVE_CLAIM_MONTHS = 36


def _calc_annual_leave_days(hire_date: date, ref_date: date, attended_months: Optional[int] = None) -> dict:
    """
    연차 발생일수 + 청구 가능(소멸시효 3년) 연차 계산 (근로기준법 제60조).

    Returns:
      years_worked / months_worked / first_year_days / annual_days
      total_entitlement       : 총 발생 연차(전 근속기간 누적, 표시용)
      claimable_entitlement   : 소멸시효 3년 내 발생분만(미지급수당 청구 대상)

    ⚠️ 버그 수정:
      (a) 미지급수당을 전 기간 누적 연차로 곱하던 과다 → **최근 3년 발생분(claimable)** 으로 제한.
      (c) 1년 미만 연차를 항상 11일로 보던 것 → attended_months(실제 개근 개월) 반영.
    """
    delta = ref_date - hire_date
    total_months = int(delta.days / 30.44)
    years_worked = total_months // 12
    rem_months   = total_months % 12

    # (c) 1년 미만 연차: 개근 정보가 있으면 실제 개근 개월, 없으면 근속 개월 (최대 11일)
    if attended_months is not None:
        first_year_days = min(max(attended_months, 0), 11)
    else:
        first_year_days = min(total_months, 11)

    if years_worked == 0:
        annual_days = 0
    elif years_worked < 3:
        annual_days = 15
    else:
        annual_days = min(15 + (years_worked - 1) // 2, 25)

    # 연도별 발생 연차 + 발생 시점(입사 후 개월). 소멸시효 판정을 위해 시점을 함께 기록.
    grants: list[tuple[int, int]] = []
    if years_worked == 0:
        grants.append((total_months, first_year_days))  # 1년 미만: 현재 시점(전액 청구 가능)
    else:
        grants.append((12, first_year_days))            # 1년 미만분은 만 1년 시점 확정
        for y in range(1, years_worked + 1):
            d = 15 if y < 3 else min(15 + (y - 1) // 2, 25)
            grants.append((y * 12, d))                  # y년차 연차는 만 y년 시점 발생

    # 현재 진행 중인 연차(부분) — 다음 연차의 rem_months/12 비율
    partial = 0
    if years_worked >= 1 and rem_months > 0:
        next_rate = 15 if (years_worked + 1) < 3 else min(15 + years_worked // 2, 25)
        partial = round(next_rate * rem_months / 12)

    total_entitlement = sum(d for _, d in grants) + partial
    # (a) 소멸시효: 발생 시점이 최근 36개월 이내인 연차 + 진행분만 청구 대상
    claimable = sum(d for gm, d in grants if (total_months - gm) < ANNUAL_LEAVE_CLAIM_MONTHS) + partial

    return {
        "years_worked":          years_worked,
        "months_worked":         total_months,
        "first_year_days":       first_year_days,
        "annual_days":           annual_days,
        "total_entitlement":     total_entitlement,
        "claimable_entitlement": max(0, claimable),
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

        # 연차 계산 — 개근 개월(attended_months) 반영, 소멸시효 3년 청구분 산출
        leave_info = _calc_annual_leave_days(hire_date, ref_date, attended_months)

        entitlement = leave_info["total_entitlement"]        # 총 발생(표시용)
        claimable   = leave_info["claimable_entitlement"]    # 최근 3년 청구 대상

        # (a) 미지급수당 청구는 소멸시효 3년 내 발생분만 대상 — 사용 연차를 차감
        remaining   = max(claimable - used_days, 0)

        # (b) 단가는 '1일 통상임금' 기준(입력값을 1일 통상임금으로 간주). 프론트 문구도 통일.
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
            "first_year_days":        leave_info["first_year_days"],  # 개근 개월 반영
            "annual_days":            leave_info["annual_days"],
            "total_entitlement":      entitlement,                    # 총 발생(표시용)
            "claimable_entitlement":  claimable,                      # 최근 3년 청구 대상
            "used_days":              used_days,
            "remaining_days":         remaining,                      # 청구가능 - 사용
            "avg_daily_wage":         avg_daily_wage,                 # 1일 통상임금(간주)
            "wage_basis":             "ordinary",                     # 단가 기준: 통상임금
            "unpaid_allowance":       unpaid_allowance,
            "monthly_detail":         monthly_detail,
        }

    except Exception:
        traceback.print_exc()
        return {"error": "계산 중 오류가 발생했습니다."}
