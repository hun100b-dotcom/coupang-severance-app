# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional
from datetime import date


class UBPreciseRequest(BaseModel):
    company: str
    company_other: Optional[str] = ""
    end_date: Optional[date] = None
    age_50: bool = False
    daily_hours: float = 8.0  # 1일 소정근로시간(하한액 산정용, 기본 8시간)


class UBPreciseResponse(BaseModel):
    eligible_180: bool
    insured_days_in_18m: int
    avg_daily_wage: float
    daily_benefit: float
    days: int
    total_estimate: float
    days_last_month: int
    company_found: bool
    # 상·하한 적용 투명성 필드 (2026 상·하한 반영)
    daily_benefit_raw: Optional[float] = None  # 상·하한 적용 전 (평균일급 × 60%)
    bound_applied: Optional[str] = None        # "lower" | "upper" | None
    error: Optional[str] = None


class UBSimpleRequest(BaseModel):
    insured_days: int
    avg_daily_wage: float
    age_50: bool = False
    daily_hours: float = 8.0  # 1일 소정근로시간(하한액 산정용, 기본 8시간)
    # 전체 고용보험 가입기간(년) — 소정급여일수 tier 판정용(18개월 창과 분리). None이면 근사 폴백.
    insured_years: Optional[float] = None


class UBSimpleResponse(BaseModel):
    eligible_180: bool
    insured_days_in_18m: int
    avg_daily_wage: float
    daily_benefit: float
    days: int
    total_estimate: float
    daily_benefit_raw: Optional[float] = None
    bound_applied: Optional[str] = None
