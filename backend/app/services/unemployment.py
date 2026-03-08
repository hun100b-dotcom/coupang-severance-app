# -*- coding: utf-8 -*-
"""실업급여 계산 서비스"""
from datetime import datetime, timedelta
import pandas as pd


def get_unemployment_days(insured_days: int, age_50_or_over: bool) -> int:
    """고용보험 가입일수와 50세 이상 여부로 수급 가능 일수 반환"""
    years = insured_days / 365.0 if insured_days else 0
    if years < 1:
        return 120
    if years < 3:
        return 180 if age_50_or_over else 150
    if years < 5:
        return 210 if age_50_or_over else 180
    if years < 10:
        return 240 if age_50_or_over else 210
    return 270 if age_50_or_over else 240


def compute_unemployment_estimate(
    avg_daily_wage: float,
    insured_days_in_18m: int,
    age_50_or_over: bool,
) -> dict:
    """실업급여: 180일 충족 여부, 일당 약 60%, 수급일수, 총 예상액"""
    eligible_180   = insured_days_in_18m >= 180
    daily_benefit  = avg_daily_wage * 0.6 if avg_daily_wage else 0.0
    days           = get_unemployment_days(insured_days_in_18m, age_50_or_over) if eligible_180 else 0
    total_estimate = daily_benefit * days if days else 0.0
    return {
        "eligible_180":       eligible_180,
        "insured_days_in_18m": insured_days_in_18m,
        "daily_benefit":      daily_benefit,
        "days":               days,
        "total_estimate":     total_estimate,
        "avg_daily_wage":     avg_daily_wage,
    }


def compute_insured_days_from_df(df: pd.DataFrame, end_date: datetime = None) -> int:
    """최근 18개월 내 근무일수(고용보험 가입일수 추정)"""
    if df.empty or "근무일" not in df.columns:
        return 0
    if end_date is None:
        end_date = df["근무일"].max()
    if isinstance(end_date, pd.Timestamp):
        end_date = end_date.to_pydatetime()
    start_18m = end_date - timedelta(days=548)  # 18개월
    mask = (df["근무일"] >= pd.Timestamp(start_18m)) & (df["근무일"] <= pd.Timestamp(end_date))
    return int(mask.sum())


def check_ub_eligibility_daily(df: pd.DataFrame, end_date: datetime = None) -> dict:
    """일용직 실업급여 자격: 최근 1개월 근로일수 < 10일 여부 확인"""
    if df.empty or "근무일" not in df.columns:
        return {"eligible_daily": False, "days_last_month": 0, "message": "데이터 없음"}
    if end_date is None:
        end_date = df["근무일"].max()
    if isinstance(end_date, pd.Timestamp):
        end_date = end_date.to_pydatetime()
    start_1m = end_date - timedelta(days=30)
    mask = (df["근무일"] >= pd.Timestamp(start_1m)) & (df["근무일"] <= pd.Timestamp(end_date))
    days_last_month = int(mask.sum())
    eligible_daily = days_last_month < 10
    return {
        "eligible_daily":  eligible_daily,
        "days_last_month": days_last_month,
        "message": f"최근 1개월 근로일수: {days_last_month}일 (기준: 10일 미만)",
    }
