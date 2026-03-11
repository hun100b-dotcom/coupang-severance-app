# -*- coding: utf-8 -*-
"""퇴직금 계산 서비스 — 28일 역산 블록 기반 법적 기준 적용"""
from datetime import datetime, timedelta
import pandas as pd


# ──────────────────────────────────────────────────────────────────────────────
# 퇴직 연도별 최저 통상임금 일급 (최저시급 × 8시간)
#   - 근로기준법 제2조 제2항: 평균임금이 통상임금보다 적을 경우 통상임금을 평균임금으로 봄
#   - 여기서는 연도별 최저 통상임금 일급을 기준으로 평균임금 하한선을 적용한다.
# ──────────────────────────────────────────────────────────────────────────────
MIN_ORDINARY_WAGE_DAILY: dict[int, int] = {
    2021: 69_760,
    2022: 73_280,
    2023: 76_960,
    2024: 78_880,
    # 2025년 이후 값이 미정인 경우, 최신값을 그대로 사용한다.
}


# ──────────────────────────────────────────────────────────────────────────────
# 기본 계산 함수
# ──────────────────────────────────────────────────────────────────────────────

def compute_average_wage(df: pd.DataFrame, end_date: datetime = None) -> dict:
    if df.empty or "근무일" not in df.columns or "지급액" not in df.columns:
        return {
            "average_wage": 0.0,
            "total_pay": 0.0,
            "total_days": 0,
            "calendar_days": 0,
            "start_date": None,
            "end_date": None,
            "period_df": pd.DataFrame(),
        }
    if end_date is None:
        end_date = df["근무일"].max()
    if isinstance(end_date, pd.Timestamp):
        end_date = end_date.to_pydatetime()
    period_start = end_date - timedelta(days=90)
    mask = (df["근무일"] >= pd.Timestamp(period_start)) & (df["근무일"] <= pd.Timestamp(end_date))
    period_df = df.loc[mask].copy()
    total_pay = period_df["지급액"].sum()
    # 퇴직금 산정 평균임금 = 최근 3개월 총 지급액 / 해당 기간의 총 달력 일수 (실제 출근일이 아님)
    calendar_days = (end_date - period_start).days + 1  # 약 91일
    average_wage = (total_pay / calendar_days) if calendar_days > 0 else 0.0
    # total_days: 해당 기간 내 실제 근로 일수 (표시용)
    total_days = int(period_df["근무일"].dt.normalize().nunique()) if not period_df.empty else 0
    return {
        "average_wage": average_wage,
        "total_pay": total_pay,
        "total_days": total_days,
        "calendar_days": calendar_days,
        "start_date": period_df["근무일"].min() if not period_df.empty else None,
        "end_date":   period_df["근무일"].max() if not period_df.empty else None,
        "period_df":  period_df,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 28일 역산 블록 기반 자격 판단 (법적 기준)
# ──────────────────────────────────────────────────────────────────────────────

def split_by_break(df: pd.DataFrame, break_days: int = 90) -> list[pd.DataFrame]:
    """90일(약 3개월) 이상 미근무 시 근로 단절로 구간 분리."""
    if df.empty:
        return [df]
    sorted_df = df.sort_values("근무일").reset_index(drop=True)
    dates = sorted_df["근무일"].dt.normalize()
    segments = []
    seg_start = 0
    for i in range(1, len(dates)):
        gap = (dates.iloc[i] - dates.iloc[i - 1]).days
        if gap > break_days:
            segments.append(sorted_df.iloc[seg_start:i].copy().reset_index(drop=True))
            seg_start = i
    segments.append(sorted_df.iloc[seg_start:].copy().reset_index(drop=True))
    return [s for s in segments if not s.empty]


def check_continuous_employment(df: pd.DataFrame) -> dict:
    """
    28일 역산 블록 기반 퇴직금 자격 판단 (근로자퇴직급여보장법 기준).

    알고리즘:
      1. 3개월(90일) 이상 미근무 → 근로 단절 → 구간 분리 후 각각 산정
      2. 각 구간에서 마지막 근무일부터 역산으로 28일 블록 구성
      3. 블록 내 근무일수 × 8시간 ÷ 4주 ≥ 15시간/주 → 해당 블록 전체 인정
         (동치: 블록 내 근무일수 ≥ 8일)
      4. qualifying_days = 인정된 블록의 총 일수 합산
      5. qualifying_days ≥ 365일 → 퇴직금 대상
    """
    if df.empty or "근무일" not in df.columns:
        return {
            "eligible": False,
            "qualifying_days": 0,
            "weeks_15h_plus": 0,
            "segments": [],
            "blocks": [],
            "message": "데이터 없음",
        }

    segments_df = split_by_break(df, break_days=90)
    all_blocks: list[dict] = []
    segment_results: list[dict] = []

    for seg_idx, seg_df in enumerate(segments_df):
        work_dates = set(seg_df["근무일"].dt.normalize())
        last_date  = seg_df["근무일"].max().normalize()
        first_date = seg_df["근무일"].min().normalize()

        blocks: list[dict] = []
        block_end = last_date

        while block_end >= first_date:
            block_start = block_end - pd.Timedelta(days=27)
            if block_start < first_date:
                block_start = first_date  # 부분 블록 (첫 구간)

            block_days = int((block_end - block_start).days) + 1
            work_count = sum(1 for d in work_dates if block_start <= d <= block_end)
            total_hours = work_count * 8
            avg_weekly  = round(total_hours / 4, 1)   # 항상 4주 기준으로 나눔
            qualifies   = avg_weekly >= 15              # ≡ work_count >= 8

            b = {
                "seg_idx":          seg_idx,
                "start":            str(block_start.date()),
                "end":              str(block_end.date()),
                "block_days":       block_days,
                "work_days":        work_count,
                "total_hours":      total_hours,
                "avg_weekly_hours": avg_weekly,
                "qualifies":        qualifies,
            }
            blocks.append(b)
            all_blocks.append(b)
            block_end = block_start - pd.Timedelta(days=1)

        seg_qualifying_days = sum(b["block_days"] for b in blocks if b["qualifies"])
        seg_eligible        = seg_qualifying_days >= 365

        segment_results.append({
            "seg_idx":         seg_idx,
            "first_date":      str(first_date.date()),
            "last_date":       str(last_date.date()),
            "qualifying_days": seg_qualifying_days,
            "eligible":        seg_eligible,
            "block_count":     len(blocks),
        })

    overall_eligible     = any(s["eligible"] for s in segment_results)
    best_qualifying_days = max(s["qualifying_days"] for s in segment_results)

    # 하위 호환: weeks_15h_plus → 적격 블록 수로 대체
    qualifying_block_count = sum(1 for b in all_blocks if b["qualifies"])

    # 메시지 생성
    if len(segment_results) == 1:
        seg = segment_results[0]
        if seg["eligible"]:
            msg = (
                f"인정 근속기간 {seg['qualifying_days']}일 (기준: 365일). 요건을 충족했어요."
            )
        else:
            needed = 365 - seg["qualifying_days"]
            msg = (
                f"인정 근속기간 {seg['qualifying_days']}일 (기준: 365일). "
                f"{needed}일 더 필요해요."
            )
    else:
        eligible_count = sum(1 for s in segment_results if s["eligible"])
        break_count    = len(segment_results) - 1
        if eligible_count:
            msg = (
                f"근로 단절 {break_count}회 발생. "
                f"{eligible_count}개 구간에서 퇴직금 요건 충족."
            )
        else:
            msg = (
                f"근로 단절 {break_count}회 발생. 모든 구간에서 요건 미충족."
            )

    all_blocks_sorted = sorted(all_blocks, key=lambda b: b["start"])

    return {
        "eligible":        overall_eligible,
        "qualifying_days": best_qualifying_days,
        "weeks_15h_plus":  qualifying_block_count,  # 하위 호환 (적격 블록 수)
        "segments":        segment_results,
        "blocks":          all_blocks_sorted,
        "message":         msg,
    }


def estimate_allowance(df: pd.DataFrame, standard_rate: float = None) -> pd.DataFrame:
    out = df.copy()
    if "지급액" not in out.columns:
        return out
    if standard_rate is None:
        standard_rate = float(out["지급액"].mean())
    out["표준단가"] = standard_rate
    out["추정_추가수당"] = out["지급액"] - out["표준단가"]
    return out


def compute_severance(df: pd.DataFrame, end_date: datetime = None) -> dict:
    if df.empty or "근무일" not in df.columns:
        return {
            "severance": 0.0,
            "work_days": 0,
            "average_wage": 0.0,
            "avg_result": None,
            "is_ordinary_wage_applied": False,
            "applied_ordinary_wage": None,
        }
    if end_date is None:
        end_date = df["근무일"].max()
    if isinstance(end_date, pd.Timestamp):
        end_date = end_date.to_pydatetime()
    # 총 근무일수 = PDF 기준 실제 근로 일수만 합산 (중복 제거, 달력 일수 아님)
    work_days = int(df["근무일"].dt.normalize().nunique())
    avg_result = compute_average_wage(df, end_date)
    avg_wage = float(avg_result["average_wage"])

    # 근로기준법 제2조 제2항: 평균임금이 통상임금보다 적으면 통상임금을 평균임금으로 본다.
    year = end_date.year
    # 정의되지 않은 연도는 가장 최근 연도의 값으로 대체
    if MIN_ORDINARY_WAGE_DAILY:
        latest_year = max(MIN_ORDINARY_WAGE_DAILY.keys())
        min_ordinary = MIN_ORDINARY_WAGE_DAILY.get(year, MIN_ORDINARY_WAGE_DAILY[latest_year])
    else:
        min_ordinary = 0

    is_ordinary_wage_applied = False
    applied_ordinary_wage: float | None = None

    if min_ordinary > 0 and avg_wage > 0 and avg_wage < min_ordinary:
        avg_wage = float(min_ordinary)
        is_ordinary_wage_applied = True
        applied_ordinary_wage = float(min_ordinary)

    severance = (avg_wage * 30 * (work_days / 365)) if work_days > 0 else 0.0
    return {
        "severance":    severance,
        "work_days":    work_days,
        "average_wage": avg_wage,
        "avg_result":   avg_result,
        "is_ordinary_wage_applied": is_ordinary_wage_applied,
        "applied_ordinary_wage": applied_ordinary_wage,
    }


def compute_severance_simple(work_days: int, avg_daily_wage: float) -> float:
    if work_days <= 0 or avg_daily_wage <= 0:
        return 0.0
    return avg_daily_wage * 30 * (work_days / 365)


# ──────────────────────────────────────────────────────────────────────────────
# 심층 분석 (주별 집계, 공백 시각화)
# ──────────────────────────────────────────────────────────────────────────────

def analyze_employment_detail(df: pd.DataFrame) -> dict:
    """
    주별·월별 집계 및 공백 기간 시각화용 상세 분석.
    (적격 판단은 check_continuous_employment의 28일 블록 기준 사용)
    """
    if df.empty or "근무일" not in df.columns:
        return _empty_detail()

    df = df.copy()
    df["week_start"] = df["근무일"] - pd.to_timedelta(df["근무일"].dt.dayofweek, unit="d")

    weekly = (
        df.groupby("week_start")
        .agg(days=("근무일", "count"), total_pay=("지급액", "sum"))
        .reset_index()
    )
    weekly["hours"]     = weekly["days"] * 8
    weekly["qualifies"] = weekly["hours"] >= 15
    weekly["month"]     = weekly["week_start"].dt.strftime("%Y-%m")

    weekly_detail = [
        {
            "week":      str(r["week_start"])[:10],
            "days":      int(r["days"]),
            "hours":     int(r["hours"]),
            "qualifies": bool(r["qualifies"]),
            "month":     r["month"],
            "total_pay": round(float(r["total_pay"]), 0),
        }
        for _, r in weekly.iterrows()
    ]

    monthly_df = (
        weekly.groupby("month")
        .agg(
            total_weeks=("week_start", "count"),
            qualifying_weeks=("qualifies", "sum"),
            total_days=("days", "sum"),
        )
        .reset_index()
    )
    monthly_df["non_qualifying"] = monthly_df["total_weeks"] - monthly_df["qualifying_weeks"]

    monthly_summary = [
        {
            "month":            r["month"],
            "total_weeks":      int(r["total_weeks"]),
            "qualifying_weeks": int(r["qualifying_weeks"]),
            "non_qualifying":   int(r["non_qualifying"]),
            "total_days":       int(r["total_days"]),
        }
        for _, r in monthly_df.iterrows()
    ]

    # 공백 기간 (2주 이상 연속 미근무, 시각화용)
    sorted_weeks = weekly.sort_values("week_start").reset_index(drop=True)
    work_gaps: list[dict] = []
    for i in range(1, len(sorted_weeks)):
        prev = sorted_weeks.loc[i - 1, "week_start"]
        curr = sorted_weeks.loc[i, "week_start"]
        gap_weeks = int((curr - prev).days // 7) - 1
        if gap_weeks >= 2:
            gap_from = prev + pd.Timedelta(days=7)
            gap_to   = curr - pd.Timedelta(days=1)
            work_gaps.append({
                "from":      str(gap_from.date()),
                "to":        str(gap_to.date()),
                "gap_weeks": gap_weeks,
                "gap_days":  gap_weeks * 7,
            })

    first_date = df["근무일"].min()
    last_date  = df["근무일"].max()
    total_calendar_days = int((last_date - first_date).days)
    excluded_days       = int(sum(g["gap_days"] for g in work_gaps))
    effective_days      = total_calendar_days - excluded_days

    total_weeks          = len(weekly)
    qualifying_weeks     = int(weekly["qualifies"].sum())
    non_qualifying_weeks = int((~weekly["qualifies"]).sum())

    return {
        "first_work_date":       str(first_date.date()),
        "last_work_date":        str(last_date.date()),
        "total_calendar_days":   total_calendar_days,
        "excluded_days":         excluded_days,
        "effective_days":        effective_days,
        "total_weeks":           total_weeks,
        "qualifying_weeks":      qualifying_weeks,
        "non_qualifying_weeks":  non_qualifying_weeks,
        "weekly_detail":         weekly_detail,
        "monthly_summary":       monthly_summary,
        "work_gaps":             work_gaps,
    }


def _empty_detail() -> dict:
    return {
        "first_work_date": "", "last_work_date": "",
        "total_calendar_days": 0, "excluded_days": 0, "effective_days": 0,
        "total_weeks": 0, "qualifying_weeks": 0, "non_qualifying_weeks": 0,
        "weekly_detail": [], "monthly_summary": [], "work_gaps": [],
    }


# ──────────────────────────────────────────────────────────────────────────────
# 동적 노무사 코멘트 생성
# ──────────────────────────────────────────────────────────────────────────────

def generate_attorney_comment(
    company: str,
    eligible: bool,
    work_days: int,
    effective_days: int,
    excluded_days: int,
    qualifying_days: int,        # 28일 블록 기준 적격 근속일수 (핵심 지표)
    qualifying_weeks: int,       # 주단위 집계 (참고용)
    non_qualifying_weeks: int,
    monthly_summary: list[dict],
    work_gaps: list[dict],
    segments: list[dict],        # 구간 분리 정보
    average_wage: float,
    severance: float,
    avg_period_start: str,
    avg_period_end: str,
    avg_total_days: int,
    avg_total_pay: float,
) -> str:
    lines: list[str] = []
    years       = work_days // 365
    months_rem  = (work_days % 365) // 30
    needed_days = max(0, 365 - qualifying_days)
    multi_seg   = len(segments) > 1

    # ──────────────────── 수급 가능 ────────────────────────
    if eligible:
        lines.append(
            f"{company}에서의 근무 이력을 분석한 결과, 퇴직금 수급 요건을 충족합니다."
        )
        lines.append("")
        lines.append(
            f"마지막 근무일부터 역산한 28일 블록 기준 인정 근속기간은 {qualifying_days}일로, "
            f"법정 기준(365일)을 초과했습니다."
        )

        if multi_seg:
            lines.append("")
            lines.append(
                f"근로 이력에서 3개월 이상 단절이 {len(segments)-1}회 감지되었으나, "
                f"해당 적격 구간의 인정 근속기간이 365일 이상입니다."
            )

        if work_gaps:
            gap_total = sum(g["gap_days"] for g in work_gaps)
            lines.append("")
            lines.append(
                f"근무 이력에 일시적 공백이 {len(work_gaps)}회 발생(총 {gap_total}일)했으나, "
                f"28일 블록 기준으로 충분한 적격 기간이 확보되어 지급 의무에 영향이 없습니다."
            )

        lines.append("")
        lines.append(
            f"평균임금 {average_wage:,.0f}원/일 기준 예상 퇴직금은 {severance:,.0f}원입니다."
        )
        lines.append(
            "실제 지급액은 사업주 급여 대장·고용보험 기록 대조 후 확정되며 차이가 생길 수 있습니다."
        )
        lines.append("")
        lines.append(
            "청구 시 고용보험 가입이력서, 일용근로내역서, 출근 기록을 함께 제출하면 분쟁 예방에 유리합니다."
        )

    # ──────────────────── 비수급 ────────────────────────────
    else:
        lines.append(
            f"{company}에서의 근무 이력 분석 결과, 퇴직금 수급 요건을 충족하지 못했습니다."
        )
        lines.append("")
        lines.append(
            f"28일 역산 블록 기준 인정 근속기간: {qualifying_days}일 "
            f"(기준: 365일 — {needed_days}일 부족)"
        )

        if multi_seg:
            lines.append("")
            lines.append("【근로 단절 분석 (3개월 이상 미근무 시 구간 분리)】")
            for s in segments:
                status = "✓ 충족" if s["eligible"] else f"✗ 미충족 ({s['qualifying_days']}일)"
                lines.append(
                    f"  · 구간 {s['seg_idx']+1}: {s['first_date']} ~ {s['last_date']} → {status}"
                )

        if work_gaps:
            lines.append("")
            lines.append("【공백 기간 상세 (시각적 공백 구간)】")
            for g in work_gaps:
                lines.append(
                    f"  · {g['from']} ~ {g['to']}: "
                    f"연속 {g['gap_weeks']}주({g['gap_days']}일) 미근무"
                )

        bad_months = sorted(
            [m for m in monthly_summary if m["non_qualifying"] > 0],
            key=lambda x: x["non_qualifying"],
            reverse=True,
        )[:5]
        if bad_months:
            lines.append("")
            lines.append("【미달 기간 분석 (주 근무일수 2일 미만)】")
            for m in bad_months:
                lines.append(
                    f"  · {m['month']}: {m['total_weeks']}주 중 "
                    f"{m['non_qualifying']}주 미달"
                )

        lines.append("")
        lines.append(
            f"앞으로 월 10일 이상 꾸준히 근무하면서 약 {needed_days}일을 추가로 채우시면 요건을 달성할 수 있습니다."
        )
        lines.append("")
        lines.append("【실무 조언】")
        lines.append(
            "일용직 퇴직금은 28일 블록 내 근무일수가 8일(4주 평균 주 15시간) 이상이어야 "
            "해당 블록이 인정됩니다. 월 10일 이상 규칙적으로 근무하는 것이 가장 유리합니다."
        )
        lines.append(
            "출근부, 문자 내역, 앱 기록 등 근무 사실을 입증할 수 있는 자료를 보관해 두세요."
        )
        lines.append(
            "요건 달성 후 퇴직금이 지급되지 않으면, 고용노동부(1350) 또는 "
            "민원마당(minwon.moel.go.kr)에 진정하실 수 있습니다."
        )

    return "\n".join(lines)
