# -*- coding: utf-8 -*-
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
):
    try:
        raw = await file.read()
        df = parse_welcomwel_pdf(raw)
    except Exception:
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

    insured_days = compute_insured_days_from_df(filtered, end_dt)
    daily_check  = check_ub_eligibility_daily(filtered, end_dt)

    # 평균 일당 계산 (최근 3개월)
    from ..services.severance import compute_average_wage
    avg_res = compute_average_wage(filtered, end_dt)
    avg_daily = float(avg_res.get("average_wage", 0))

    result = compute_unemployment_estimate(avg_daily, insured_days, age_50)

    return UBPreciseResponse(
        eligible_180        = result["eligible_180"],
        insured_days_in_18m = result["insured_days_in_18m"],
        avg_daily_wage      = round(avg_daily, 0),
        daily_benefit       = round(result["daily_benefit"], 0),
        days                = result["days"],
        total_estimate      = round(result["total_estimate"], 0),
        days_last_month     = daily_check["days_last_month"],
        company_found       = True,
    )


@router.post("/simple", response_model=UBSimpleResponse)
async def ub_simple(req: UBSimpleRequest):
    result = compute_unemployment_estimate(req.avg_daily_wage, req.insured_days, req.age_50)
    return UBSimpleResponse(
        eligible_180        = result["eligible_180"],
        insured_days_in_18m = result["insured_days_in_18m"],
        avg_daily_wage      = round(req.avg_daily_wage, 0),
        daily_benefit       = round(result["daily_benefit"], 0),
        days                = result["days"],
        total_estimate      = round(result["total_estimate"], 0),
    )
