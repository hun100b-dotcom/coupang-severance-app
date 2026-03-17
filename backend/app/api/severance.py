# -*- coding: utf-8 -*-
import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
from typing import Optional
import pandas as pd

from ..services.pdf import parse_welcomwel_pdf, filter_df_by_company, preprocess_data, extract_unique_companies
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


@router.post("/extract-companies")
async def extract_companies(file: UploadFile = File(...)):
    """PDF 업로드 시 사업장명 고유 리스트 추출 (토스 스타일 사업장 선택용)"""
    try:
        raw = await file.read()
        companies = extract_unique_companies(raw)
        return {"companies": companies}
    except Exception as e:
        traceback.print_exc()
        # 회사 추출 실패 시에도 프론트엔드가 gracefully 동작하도록 빈 리스트 반환
        return {"companies": []}


@router.post("/precise", response_model=SeverancePreciseResponse)
async def precise_calculation(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    end_date: Optional[str] = Form(None),
):
    # PDF 파싱:
    # - pdfplumber 미설치 등 서버 환경 문제는 500으로 명확히 노출
    # - PDF 구조 인식 실패 등 일반적인 파싱 오류는 422로 통일
    try:
        raw = await file.read()
        df  = parse_welcomwel_pdf(raw)
    except RuntimeError as e:
        # 서버 런타임 환경 문제 (예: pdfplumber 미설치)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="서버 설정 문제로 PDF를 읽지 못하고 있어요. 잠시 후 다시 이용해 주세요.",
        )
    except Exception as e:
        # 그 외 파싱 오류는 "데이터를 추출할 수 없음"으로 처리
        traceback.print_exc()
        df = pd.DataFrame()

    try:
        if df.empty:
            raise HTTPException(
                status_code=422,
                detail="PDF에서 데이터를 추출할 수 없어요. 근로복지공단 일용근로내역서인지 확인해 주세요.",
            )

        df       = preprocess_data(df)
        filtered = filter_df_by_company(df, company, company_other)

        if filtered.empty:
            # 실제 사업장명을 오류 메시지에 표시
            display_name = company_other if company_other else company
            raise HTTPException(
                status_code=422,
                detail=(
                    f"PDF에서 '{display_name}' 관련 근무 이력을 찾지 못했어요. "
                    "사업장 선택이 PDF 내용과 일치하는지 확인해 주세요."
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

        # 퇴직금 산정에 실제로 사용할 근속일수(인정 근속기간)와 평균임금
        service_days = int(cont["qualifying_days"])
        final_avg_wage = float(result["average_wage"])

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
        avg_total_days   = int(avg_res.get("calendar_days", 0))
        avg_total_pay    = float(avg_res.get("total_pay", 0))

        company_display = company if company != "기타" else (company_other or company)

        # ── 동적 노무사 코멘트 ────────────────────────────────────
        comment = generate_attorney_comment(
            company              = company_display,
            eligible             = cont["eligible"],
            work_days            = service_days,
            effective_days       = detail["effective_days"],
            excluded_days        = detail["excluded_days"],
            qualifying_days      = cont["qualifying_days"],        # 28일 블록 기준
            qualifying_weeks     = detail["qualifying_weeks"],
            non_qualifying_weeks = detail["non_qualifying_weeks"],
            monthly_summary      = detail["monthly_summary"],
            work_gaps            = detail["work_gaps"],
            segments             = cont["segments"],               # 구간 분리 정보
            average_wage         = final_avg_wage,
            severance            = final_avg_wage * 30 * (service_days / 365) if service_days > 0 else 0.0,
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

        # 최종 퇴직금은 화면에 노출되는 근속일수(service_days)와 동일한 기준으로 계산
        final_severance = float(result["severance"])

        return SeverancePreciseResponse(
            eligible             = cont["eligible"],
            qualifying_days      = cont["qualifying_days"],
            weeks_15h_plus       = cont["weeks_15h_plus"],
            eligibility_message  = cont["message"],
            average_wage         = round(final_avg_wage, 0),
            total_pay            = round(avg_total_pay, 0),
            total_days_3m        = avg_total_days,
            severance            = round(final_severance, 0),
            work_days            = service_days,
            is_ordinary_wage_applied = bool(result.get("is_ordinary_wage_applied", False)),
            applied_ordinary_wage    = (
                float(result["applied_ordinary_wage"])
                if result.get("applied_ordinary_wage") is not None
                else None
            ),
            weekly_data          = weekly_data,
            pay_data             = pay_data,
            company_found        = True,
            report               = report,
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"계산 중 오류: {str(e)}")


@router.post("/simple", response_model=SeveranceSimpleResponse)
async def simple_calculation(req: SeveranceSimpleRequest):
    sev = compute_severance_simple(req.work_days, req.avg_daily_wage)
    return SeveranceSimpleResponse(
        severance    = round(sev, 0),
        work_days    = req.work_days,
        average_wage = req.avg_daily_wage,
    )
