# -*- coding: utf-8 -*-
"""주휴수당 API — 일용직 근로자 주휴수당 정밀 계산 (PDF 기반)

근거: 근로기준법 제55조, 제18조
주휴수당 = (주 소정근로시간 / 40) × 8 × 시급
조건: 주 소정근로시간 15시간 이상 + 해당 주 소정근로일 개근
"""
import traceback
from datetime import timedelta
from typing import Optional

import pandas as pd
from fastapi import APIRouter, File, Form, UploadFile

from ..services.pdf import extract_unique_companies, filter_df_by_company, parse_welcomwel_pdf, preprocess_data

router = APIRouter()


def _iso_week_key(dt: pd.Timestamp) -> str:
    """월요일 시작 주차 키 (ISO 8601 기준). 예: '2024-W03'"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _week_monday(dt: pd.Timestamp) -> pd.Timestamp:
    """해당 날짜가 속한 주의 월요일을 반환합니다."""
    return dt - timedelta(days=dt.weekday())


@router.post("/extract-companies")
async def extract_companies(file: UploadFile = File(...)):
    """PDF에서 사업장명 목록 추출 (주휴수당 PDF 정밀계산용)"""
    try:
        raw = await file.read()
        companies = extract_unique_companies(raw)
        return {"companies": companies}
    except Exception:
        traceback.print_exc()
        return {"companies": []}


@router.post("/precise")
async def weekly_allowance_precise(
    file: UploadFile = File(...),
    company: str = Form(...),
    company_other: str = Form(""),
    hourly_wage: int = Form(...),
    daily_hours: float = Form(8.0),
):
    """
    PDF 업로드 → 주차별 주휴수당 정밀 계산

    - 월요일~일요일 기준으로 주차를 묶습니다.
    - 주 소정근로시간 = 근무일수 × daily_hours
    - 주 소정근로시간 ≥ 15시간 → 주휴수당 발생
    - 주휴수당 = (weeklyHours / 40) × 8 × hourly_wage
    """
    try:
        raw = await file.read()
        df_raw = parse_welcomwel_pdf(raw)
        if df_raw is None or df_raw.empty:
            return {"error": "PDF 파싱 실패 또는 데이터 없음", "weeks": [], "total_allowance": 0}

        target = company_other.strip() if company == "기타" and company_other.strip() else company
        df = filter_df_by_company(df_raw, target)
        if df.empty:
            return {"error": f"'{target}' 근무 기록이 없습니다.", "weeks": [], "total_allowance": 0}

        df = preprocess_data(df)
        if df.empty or "근무일" not in df.columns:
            return {"error": "데이터 전처리 실패", "weeks": [], "total_allowance": 0}

        # 주차별 집계 (월요일 기준)
        df["week_monday"] = df["근무일"].apply(_week_monday)
        df["week_key"]    = df["근무일"].apply(_iso_week_key)

        weekly_groups = df.groupby("week_key").agg(
            week_monday=("week_monday", "first"),
            work_days=("근무일", "count"),
            total_pay=("지급액", "sum"),
        ).reset_index()

        weekly_groups["weekly_hours"]  = weekly_groups["work_days"] * daily_hours
        weekly_groups["eligible"]      = weekly_groups["weekly_hours"] >= 15
        weekly_groups["allowance"]     = weekly_groups.apply(
            lambda r: round((r["weekly_hours"] / 40) * 8 * hourly_wage) if r["eligible"] else 0,
            axis=1,
        )
        weekly_groups["week_end"]      = weekly_groups["week_monday"] + timedelta(days=6)

        weeks_out = []
        for _, row in weekly_groups.sort_values("week_monday").iterrows():
            weeks_out.append({
                "week_key":    row["week_key"],
                "week_start":  str(row["week_monday"].date()),
                "week_end":    str(row["week_end"].date()),
                "work_days":   int(row["work_days"]),
                "weekly_hours": float(row["weekly_hours"]),
                "total_pay":   float(row["total_pay"]),
                "eligible":    bool(row["eligible"]),
                "allowance":   int(row["allowance"]),
            })

        total_allowance = int(weekly_groups["allowance"].sum())
        eligible_weeks  = int(weekly_groups["eligible"].sum())
        total_weeks     = len(weeks_out)

        return {
            "company":        target,
            "hourly_wage":    hourly_wage,
            "daily_hours":    daily_hours,
            "total_weeks":    total_weeks,
            "eligible_weeks": eligible_weeks,
            "total_allowance": total_allowance,
            "weeks":          weeks_out,
        }

    except Exception:
        traceback.print_exc()
        return {"error": "계산 중 오류가 발생했습니다.", "weeks": [], "total_allowance": 0}
