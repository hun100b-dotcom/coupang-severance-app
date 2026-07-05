# -*- coding: utf-8 -*-
"""실업급여 계산 서비스"""
import math
from datetime import datetime, timedelta
import pandas as pd

# ── 2026년 고용보험 구직급여(실업급여) 기준 ────────────────────────────────
# 근거: 고용보험법 제45~46조 · 찾기쉬운 생활법령정보(구직급여 수급액)
#   구직급여일액 = 기초일액(=이직 전 평균일급) × 60% (원칙)
#   · 상한액: 68,100원/일 (기초일액 상한 113,500원 × 60%, 2026년 7년 만에 인상)
#   · 하한액(최저구직급여일액): 1일 소정근로시간(최대 8h) × 최저임금(10,320원) × 80%
#       - 8시간 근무자 → 10,320 × 8 × 0.8 = 66,048원/일
#       - 8시간 미만 단시간·일용직 → 실제 소정근로시간에 비례
#   ⚠️ 연도 변경 시 아래 3개 상수(최저임금·상한액)만 갱신하면 됩니다.
UB_MIN_HOURLY_WAGE = 10320   # 2026 최저임금(시급, 원)
UB_DAILY_UPPER     = 68100   # 2026 구직급여일액 상한액(원/일)
UB_LOWER_RATE      = 0.80    # 최저구직급여일액 = 최저기초일액 × 80%
UB_STD_HOURS_CAP   = 8.0     # 1일 소정근로시간 상한(시간)
UB_BENEFIT_RATE    = 0.60    # 구직급여일액 = 기초일액 × 60%


def compute_ub_daily_lower_bound(daily_hours: float = UB_STD_HOURS_CAP) -> float:
    """구직급여 1일 하한액(최저구직급여일액) 산정.

    = 1일 소정근로시간(최대 8시간) × 최저임금 × 80%
    단시간·일용직은 실제 소정근로시간을 반영하되, 8시간을 초과하지 않는다.
    방어(리뷰어 B): NaN·inf·0·음수 등 비정상 입력(주로 API 직접 호출)은
      '표준 근무일 8시간'으로 폴백해 하한이 사라지거나 왜곡되지 않게 한다.
      (정상 프론트는 parseFloat>0?:8 로 항상 유효값을 보낸다.)
    """
    try:
        h = float(daily_hours)
    except (TypeError, ValueError):
        h = UB_STD_HOURS_CAP
    if not math.isfinite(h) or h <= 0:
        h = UB_STD_HOURS_CAP
    hours = min(h, UB_STD_HOURS_CAP)
    return UB_MIN_HOURLY_WAGE * hours * UB_LOWER_RATE


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
    daily_hours: float = UB_STD_HOURS_CAP,
) -> dict:
    """실업급여: 180일 충족 여부, 구직급여일액(상·하한 적용), 수급일수, 총 예상액.

    구직급여일액 = clamp(평균일급 × 60%, 하한액, 상한액)
      · 원칙: 평균일급 × 60%
      · 하한액: 1일 소정근로시간(최대 8h) × 최저임금 × 80%  → daily_hours 반영
      · 상한액: 2026년 68,100원/일
    bound_applied 로 어느 한도가 적용됐는지(lower/upper/None) 함께 반환한다.
    """
    eligible_180 = insured_days_in_18m >= 180

    # ── 구직급여일액 산정 (상·하한 적용) ──────────────────────────────
    raw_benefit = avg_daily_wage * UB_BENEFIT_RATE if avg_daily_wage else 0.0
    if not math.isfinite(raw_benefit):   # NaN·inf 방어(API 직접 호출 등)
        raw_benefit = 0.0
    lower = compute_ub_daily_lower_bound(daily_hours)
    upper = UB_DAILY_UPPER
    bound_applied = None
    if raw_benefit <= 0:
        daily_benefit = 0.0
    else:
        daily_benefit = raw_benefit
        # ① 하한액까지 상향
        if daily_benefit < lower:
            daily_benefit = lower
            bound_applied = "lower"
        # ② 상한액에서 절삭 — 하한 적용 후에도 상한을 넘으면 상한이 우선(역전 대비).
        #    2026 값(하한 66,048 < 상한 68,100)에선 ①과 배타적이지만, 미래에 최저임금
        #    인상으로 하한>상한이 되어도 상한이 구조적으로 보장되도록 순차 적용한다.
        if daily_benefit > upper:
            daily_benefit = upper
            bound_applied = "upper"

    days           = get_unemployment_days(insured_days_in_18m, age_50_or_over) if eligible_180 else 0
    total_estimate = daily_benefit * days if days else 0.0
    return {
        "eligible_180":        eligible_180,
        "insured_days_in_18m": insured_days_in_18m,
        "daily_benefit":       daily_benefit,
        "daily_benefit_raw":   raw_benefit,   # 상·하한 적용 전 (평균일급 × 60%)
        "bound_applied":       bound_applied, # "lower" | "upper" | None
        "lower_bound":         lower,
        "upper_bound":         upper,
        "days":                days,
        "total_estimate":      total_estimate,
        "avg_daily_wage":      avg_daily_wage,
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
