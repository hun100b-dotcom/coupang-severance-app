# -*- coding: utf-8 -*-
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
from typing import Optional
import pandas as pd

from ..services.pdf import parse_welcomwel_pdf, filter_df_by_company, preprocess_data
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


@router.post("/precise", response_model=UBPreciseResponse)
async def ub_precise(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    end_date: Optional[str] = Form(None),
    age_50: bool = Form(False),
):
    raw = await file.read()
    df = parse_welcomwel_pdf(raw)

    if df.empty:
        raise HTTPException(status_code=422, detail="PDF에서 데이터를 추출할 수 없어요.")

    df = preprocess_data(df)
    filtered = filter_df_by_company(df, company, company_other)
    company_found = not filtered.empty

    if not company_found:
        raise HTTPException(
            status_code=422,
            detail=f"PDF에서 '{company}' 관련 근무 이력을 찾지 못했어요.",
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
