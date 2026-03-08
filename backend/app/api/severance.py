# -*- coding: utf-8 -*-
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
from typing import Optional
import pandas as pd

from ..services.pdf import parse_welcomwel_pdf, filter_df_by_company, preprocess_data
from ..services.severance import (
    compute_average_wage,
    check_continuous_employment,
    compute_severance,
    compute_severance_simple,
    analyze_employment_detail,
    generate_attorney_comment,
)
from ..schemas.severance import (
    SeverancePreciseResponse,
    SeveranceSimpleRequest,
    SeveranceSimpleResponse,
    WeeklyData,
    EmploymentReport,
    WeeklyDetailItem,
    MonthlySummaryItem,
    WorkGap,
    BlockItem,
    SegmentItem,
)

router = APIRouter()


@router.post("/precise", response_model=SeverancePreciseResponse)
async def precise_calculation(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    end_date: Optional[str] = Form(None),
):
    raw = await file.read()
    df  = parse_welcomwel_pdf(raw)

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="PDF에서 데이터를 추출할 수 없어요. 근로복지공단 일용근로내역서인지 확인해 주세요.",
        )

    df       = preprocess_data(df)
    filtered = filter_df_by_company(df, company, company_other)

    if filtered.empty:
        raise HTTPException(
            status_code=422,
            detail=(
                f"PDF에서 '{company}' 관련 근무 이력을 찾지 못했어요. "
                "PDF 파일이 맞는지 또는 '기타' 옵션으로 회사명을 직접 입력해 주세요."
            ),
        )

    end_dt: datetime | None = None
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            end_dt = None

    # ── 기본 계산 ─────────────────────────────────────────────
    result  = compute_severance(filtered, end_dt)
    cont    = check_continuous_employment(filtered)   # 28일 블록 기반
    avg_res = result["avg_result"] or {}
    period_df: pd.DataFrame = avg_res.get("period_df", pd.DataFrame())

    # ── 주별 근무일수 (3개월, 차트용) ─────────────────────────
    weekly_data: list[WeeklyData] = []
    if not period_df.empty and "근무일" in period_df.columns:
        tmp = period_df.copy()
        tmp["week_start"] = tmp["근무일"] - pd.to_timedelta(tmp["근무일"].dt.dayofweek, unit="d")
        wg = tmp.groupby("week_start").size().reset_index(name="days")
        for _, row in wg.iterrows():
            weekly_data.append(WeeklyData(week=str(row["week_start"])[:10], days=int(row["days"])))

    # ── 일별 지급액 (차트용) ──────────────────────────────────
    pay_data: list[dict] = []
    if not period_df.empty:
        for _, row in period_df.iterrows():
            pay_data.append({"date": str(row["근무일"])[:10], "pay": round(float(row["지급액"]), 0)})

    # ── 심층 분석 리포트 ──────────────────────────────────────
    detail = analyze_employment_detail(filtered)

    avg_period_start = str(avg_res["start_date"])[:10] if avg_res.get("start_date") is not None else ""
    avg_period_end   = str(avg_res["end_date"])[:10]   if avg_res.get("end_date")   is not None else ""
    avg_total_days   = int(avg_res.get("total_days", 0))
    avg_total_pay    = float(avg_res.get("total_pay", 0))

    company_display = company if company != "기타" else (company_other or company)

    # ── 동적 노무사 코멘트 ────────────────────────────────────
    comment = generate_attorney_comment(
        company              = company_display,
        eligible             = cont["eligible"],
        work_days            = int(result["work_days"]),
        effective_days       = detail["effective_days"],
        excluded_days        = detail["excluded_days"],
        qualifying_days      = cont["qualifying_days"],        # 28일 블록 기준
        qualifying_weeks     = detail["qualifying_weeks"],
        non_qualifying_weeks = detail["non_qualifying_weeks"],
        monthly_summary      = detail["monthly_summary"],
        work_gaps            = detail["work_gaps"],
        segments             = cont["segments"],               # 구간 분리 정보
        average_wage         = float(avg_res.get("average_wage", 0)),
        severance            = float(result["severance"]),
        avg_period_start     = avg_period_start,
        avg_period_end       = avg_period_end,
        avg_total_days       = avg_total_days,
        avg_total_pay        = avg_total_pay,
    )

    # ── WorkGap 스키마 변환 (from → from_date) ───────────────
    work_gaps_schema = [
        WorkGap(
            from_date=g["from"],
            to_date=g["to"],
            gap_weeks=g["gap_weeks"],
            gap_days=g["gap_days"],
        )
        for g in detail["work_gaps"]
    ]

    # ── BlockItem 스키마 변환 ─────────────────────────────────
    blocks_schema = [
        BlockItem(
            seg_idx          = b["seg_idx"],
            start            = b["start"],
            end              = b["end"],
            block_days       = b["block_days"],
            work_days        = b["work_days"],
            total_hours      = b["total_hours"],
            avg_weekly_hours = b["avg_weekly_hours"],
            qualifies        = b["qualifies"],
        )
        for b in cont["blocks"]
    ]

    # ── SegmentItem 스키마 변환 ───────────────────────────────
    segments_schema = [
        SegmentItem(
            seg_idx        = s["seg_idx"],
            first_date     = s["first_date"],
            last_date      = s["last_date"],
            qualifying_days = s["qualifying_days"],
            eligible       = s["eligible"],
            block_count    = s["block_count"],
        )
        for s in cont["segments"]
    ]

    report = EmploymentReport(
        first_work_date          = detail["first_work_date"],
        last_work_date           = detail["last_work_date"],
        total_calendar_days      = detail["total_calendar_days"],
        excluded_days            = detail["excluded_days"],
        effective_days           = detail["effective_days"],
        qualifying_days          = cont["qualifying_days"],
        segments                 = segments_schema,
        blocks                   = blocks_schema,
        total_weeks              = detail["total_weeks"],
        qualifying_weeks         = detail["qualifying_weeks"],
        non_qualifying_weeks     = detail["non_qualifying_weeks"],
        avg_period_start         = avg_period_start,
        avg_period_end           = avg_period_end,
        avg_total_days_in_period = avg_total_days,
        avg_total_pay_in_period  = round(avg_total_pay, 0),
        weekly_detail            = [WeeklyDetailItem(**w) for w in detail["weekly_detail"]],
        monthly_summary          = [MonthlySummaryItem(**m) for m in detail["monthly_summary"]],
        work_gaps                = work_gaps_schema,
        attorney_comment         = comment,
    )

    return SeverancePreciseResponse(
        eligible             = cont["eligible"],
        qualifying_days      = cont["qualifying_days"],
        weeks_15h_plus       = cont["weeks_15h_plus"],
        eligibility_message  = cont["message"],
        average_wage         = round(float(avg_res.get("average_wage", 0)), 0),
        total_pay            = round(avg_total_pay, 0),
        total_days_3m        = avg_total_days,
        severance            = round(float(result["severance"]), 0),
        work_days            = int(result["work_days"]),
        weekly_data          = weekly_data,
        pay_data             = pay_data,
        company_found        = True,
        report               = report,
    )


@router.post("/simple", response_model=SeveranceSimpleResponse)
async def simple_calculation(req: SeveranceSimpleRequest):
    sev = compute_severance_simple(req.work_days, req.avg_daily_wage)
    return SeveranceSimpleResponse(
        severance    = round(sev, 0),
        work_days    = req.work_days,
        average_wage = req.avg_daily_wage,
    )
