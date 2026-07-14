# -*- coding: utf-8 -*-
import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
from typing import Optional
import pandas as pd

from ..services.pdf import parse_welcomwel_pdf, filter_df_by_company, preprocess_data, extract_unique_companies
from ..services.unemployment import (
    compute_unemployment_estimate,
    compute_insured_days_from_df,
    check_ub_eligibility_daily,
)
from ..schemas.unemployment import (
    UBPreciseResponse,
    UBSimpleRequest,
    UBSimpleResponse,
)

router = APIRouter()


@router.post("/extract-companies")
async def extract_companies(file: UploadFile = File(...)):
    """PDF 업로드 시 사업장명 고유 리스트 추출"""
    try:
        raw = await file.read()
        companies = extract_unique_companies(raw)
        return {"companies": companies}
    except Exception as e:
        # 회사 추출 실패 시에도 프론트엔드가 graceful 하게 동작하도록 빈 리스트 반환
        return {"companies": []}


@router.post("/precise", response_model=UBPreciseResponse)
async def ub_precise(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    end_date: Optional[str] = Form(None),
    age_50: bool = Form(False),
    daily_hours: float = Form(8.0),  # 1일 소정근로시간(하한액 산정용, 기본 8시간)
):
    try:
        raw = await file.read()
        df = parse_welcomwel_pdf(raw)
    except Exception:
        traceback.print_exc()  # Render 로그에서 PDF 파싱 실패 원인 추적용
        df = pd.DataFrame()

    if df.empty:
        raise HTTPException(status_code=422, detail="PDF에서 데이터를 추출할 수 없어요. 근로복지공단 일용근로내역서인지 확인해 주세요.")

    df = preprocess_data(df)
    filtered = filter_df_by_company(df, company, company_other)
    company_found = not filtered.empty

    if not company_found:
        display_name = company_other if company_other else company
        raise HTTPException(
            status_code=422,
            detail=f"PDF에서 '{display_name}' 관련 근무 이력을 찾지 못했어요. 사업장 선택이 PDF 내용과 일치하는지 확인해 주세요.",
        )

    end_dt: datetime | None = None
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            end_dt = None

    insured_days = compute_insured_days_from_df(filtered, end_dt)  # 18개월 창(수급자격 180일 판정용)
    daily_check  = check_ub_eligibility_daily(filtered, end_dt)

    # ── 소정급여일수용 전체 피보험기간(년) 산정 (과소 버그 수정) ──────────────
    #  소정급여일수 tier 는 18개월 창이 아니라 PDF **전체 기간**으로 판정해야 한다.
    #  (18개월 창은 위 수급자격 180일 판정에만 사용)
    #  ⚠️ 단순 첫~마지막 span 은 장기 공백(예: 2020년 근무 후 2025년 재근무)이 있는
    #     일용직에서 피보험기간을 과대 추정한다(리뷰어 A·B 지적). 그래서 계산로직의
    #     '3개월(90일) 공백 = 세그먼트 분리' 개념을 재사용해, 90일 초과 공백은 제외한
    #     **실효 피보험기간**(각 연속 근무 구간의 span 합)으로 산정한다.
    total_insured_years: float | None = None
    if not filtered.empty and "근무일" in filtered.columns:
        dates = sorted(pd.to_datetime(filtered["근무일"].dropna().unique()))
        if dates:
            GAP_DAYS = 90  # 3개월 초과 공백 → 피보험기간에서 제외(세그먼트 분리)
            effective_days = 0
            seg_start = prev = dates[0]
            for d in dates[1:]:
                if (d - prev).days > GAP_DAYS:
                    effective_days += (prev - seg_start).days
                    seg_start = d
                prev = d
            # 마지막 세그먼트 — 퇴직일(end_dt)이 마지막 근무일보다 뒤면 그날까지 반영
            seg_end = prev
            if end_dt is not None and pd.Timestamp(end_dt) > prev:
                seg_end = pd.Timestamp(end_dt)
            effective_days += (seg_end - seg_start).days
            total_insured_years = max(0.0, effective_days / 365.0)

    # 평균 일당 계산 (최근 3개월) — 정밀계산은 달력일수 기준이라 기초일액 과다 버그 없음
    from ..services.severance import compute_average_wage
    avg_res = compute_average_wage(filtered, end_dt)
    avg_daily = float(avg_res.get("average_wage", 0))

    result = compute_unemployment_estimate(avg_daily, insured_days, age_50, daily_hours, total_insured_years)

    return UBPreciseResponse(
        eligible_180        = result["eligible_180"],
        insured_days_in_18m = result["insured_days_in_18m"],
        avg_daily_wage      = round(avg_daily, 0),
        daily_benefit       = round(result["daily_benefit"], 0),
        days                = result["days"],
        total_estimate      = round(result["total_estimate"], 0),
        days_last_month     = daily_check["days_last_month"],
        company_found       = True,
        daily_benefit_raw   = round(result["daily_benefit_raw"], 0),
        bound_applied       = result["bound_applied"],
    )


@router.post("/simple", response_model=UBSimpleResponse)
async def ub_simple(req: UBSimpleRequest):
    result = compute_unemployment_estimate(req.avg_daily_wage, req.insured_days, req.age_50, req.daily_hours, req.insured_years)
    return UBSimpleResponse(
        eligible_180        = result["eligible_180"],
        insured_days_in_18m = result["insured_days_in_18m"],
        avg_daily_wage      = round(req.avg_daily_wage, 0),
        daily_benefit       = round(result["daily_benefit"], 0),
        days                = result["days"],
        total_estimate      = round(result["total_estimate"], 0),
        daily_benefit_raw   = round(result["daily_benefit_raw"], 0),
        bound_applied       = result["bound_applied"],
    )
