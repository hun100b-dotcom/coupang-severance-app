# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional


class SeverancePreciseRequest(BaseModel):
    company: str
    company_other: Optional[str] = ""
    end_date: Optional[str] = None


class WeeklyData(BaseModel):
    week: str
    days: int


# ── 리포트 세부 모델 ─────────────────────────────────────
class WeeklyDetailItem(BaseModel):
    week: str
    days: int
    hours: int
    qualifies: bool
    month: str
    total_pay: float


class MonthlySummaryItem(BaseModel):
    month: str
    total_weeks: int
    qualifying_weeks: int
    non_qualifying: int
    total_days: int


class WorkGap(BaseModel):
    from_date: str   # JSON key를 from_date로 (Python 예약어 from 회피)
    to_date: str
    gap_weeks: int
    gap_days: int


class BlockItem(BaseModel):
    """28일 역산 블록 하나의 분석 결과."""
    seg_idx: int
    start: str
    end: str
    block_days: int
    work_days: int
    total_hours: int
    avg_weekly_hours: float
    qualifies: bool


class SegmentItem(BaseModel):
    """근로 단절(3개월 이상 미근무)로 분리된 구간."""
    seg_idx: int
    first_date: str
    last_date: str
    qualifying_days: int
    eligible: bool
    block_count: int


class EmploymentReport(BaseModel):
    # 근로 기간
    first_work_date: str
    last_work_date: str
    total_calendar_days: int
    excluded_days: int
    effective_days: int
    # 28일 블록 기준 적격 근속일수 (핵심 판단 지표)
    qualifying_days: int
    # 구간 정보 (3개월 단절 발생 시 복수)
    segments: list[SegmentItem]
    # 28일 블록 상세
    blocks: list[BlockItem]
    # 주수 집계 (시각화 참고용)
    total_weeks: int
    qualifying_weeks: int
    non_qualifying_weeks: int
    # 평균임금 산정 상세
    avg_period_start: str
    avg_period_end: str
    avg_total_days_in_period: int
    avg_total_pay_in_period: float
    # 세부 데이터
    weekly_detail: list[WeeklyDetailItem]
    monthly_summary: list[MonthlySummaryItem]
    work_gaps: list[WorkGap]
    # 동적 노무사 코멘트
    attorney_comment: str


# ── 메인 응답 ────────────────────────────────────────────
class SeverancePreciseResponse(BaseModel):
    eligible: bool
    qualifying_days: int          # 28일 블록 기준 인정 근속일수
    weeks_15h_plus: int           # 적격 블록 수 (하위 호환)
    eligibility_message: str
    average_wage: float
    total_pay: float
    total_days_3m: int
    severance: float
    work_days: int
    weekly_data: list[WeeklyData]
    pay_data: list[dict]
    company_found: bool
    report: Optional[EmploymentReport] = None
    error: Optional[str] = None


class SeveranceSimpleRequest(BaseModel):
    work_days: int
    avg_daily_wage: float


class SeveranceSimpleResponse(BaseModel):
    severance: float
    work_days: int
    average_wage: float
