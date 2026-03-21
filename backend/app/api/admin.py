# -*- coding: utf-8 -*-
"""
Admin OS — 전문 관리자 대시보드 API

엔드포인트 목록:
  GET  /api/admin/stats              — KPI 집계 (asyncio.gather 병렬)
  GET  /api/admin/analytics          — 날짜별 트렌드
  GET  /api/admin/target/companies   — 사업장별 계산 비중
  GET  /api/admin/target/segments    — 근무기간/급여 세그먼트
  GET  /api/admin/inquiries          — 문의 목록 (필터·페이징)
  PATCH /api/admin/inquiries/{id}/status  — 상태 변경
  PATCH /api/admin/inquiries/{id}/answer  — 답변 등록
  POST  /api/admin/inquiries/bulk-status  — 일괄 상태 변경
  GET  /api/admin/templates          — 답변 템플릿 목록
  POST /api/admin/templates          — 템플릿 생성
  DELETE /api/admin/templates/{id}   — 템플릿 삭제
  POST /api/admin/templates/{id}/use — 사용 카운트 증가
  GET  /api/admin/settings           — 시스템 설정 전체
  PATCH /api/admin/settings          — 단일 설정 변경
  GET  /api/admin/blocked-ips        — 차단 IP 목록
  POST /api/admin/blocked-ips        — IP 차단
  DELETE /api/admin/blocked-ips/{id} — 차단 해제
  GET  /api/admin/logs               — 감사 로그
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
# service role key가 없으면 anon key로 fallback (RLS가 없는 테이블에서는 동작)
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY", "")
)
# ADMIN_SECRET이 없으면 SUPABASE_ANON_KEY 뒤 32자로 자동 파생 (환경변수 미설정 시 폴백)
ADMIN_SECRET = (
    os.getenv("ADMIN_SECRET")
    or os.getenv("SUPABASE_ANON_KEY", "")[-32:]
    or ""
)


# ── 공통 헬퍼 ─────────────────────────────────────────────

def _check_admin(x_admin_token: Optional[str]) -> None:
    if not ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="ADMIN_SECRET 환경 변수가 설정되지 않았습니다.")
    if x_admin_token != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="관리자 권한이 없습니다.")


def _supabase_headers() -> dict:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Supabase 환경 변수가 설정되지 않았습니다.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def _write_audit(
    client: httpx.AsyncClient,
    admin_email: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    before_val: Any = None,
    after_val: Any = None,
    ip: Optional[str] = None,
) -> None:
    """감사 로그를 audit_logs 테이블에 기록합니다. 오류는 조용히 무시합니다."""
    try:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/audit_logs",
            headers=_supabase_headers(),
            json={
                "admin_email": admin_email,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "before_val": before_val,
                "after_val": after_val,
                "ip_address": ip,
            },
        )
    except Exception:
        pass


# ── Dashboard ─────────────────────────────────────────────

@router.get("/admin/stats")
async def admin_stats(x_admin_token: Optional[str] = Header(default=None)):
    """KPI 집계 — 유저/리포트/문의/클릭 병렬 조회"""
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    today = datetime.utcnow().date().isoformat()
    week_ago = (datetime.utcnow().date() - timedelta(days=7)).isoformat()

    async with httpx.AsyncClient(timeout=15) as client:
        (
            users_res, users_today_res, users_week_res, marketing_res,
            reports_res, inquiries_res, clicks_res,
        ) = await asyncio.gather(
            client.get(f"{SUPABASE_URL}/rest/v1/profiles",    headers=headers, params={"select": "count", "head": "true"}),
            client.get(f"{SUPABASE_URL}/rest/v1/profiles",    headers=headers, params={"select": "count", "head": "true", "created_at": f"gte.{today}"}),
            client.get(f"{SUPABASE_URL}/rest/v1/profiles",    headers=headers, params={"select": "count", "head": "true", "created_at": f"gte.{week_ago}"}),
            client.get(f"{SUPABASE_URL}/rest/v1/profiles",    headers=headers, params={"select": "count", "head": "true", "marketing_agreement": "eq.true"}),
            client.get(f"{SUPABASE_URL}/rest/v1/reports",     headers=headers, params={"select": "*", "order": "created_at.desc", "limit": "1000"}),
            client.get(f"{SUPABASE_URL}/rest/v1/inquiries",   headers=headers, params={"select": "*", "order": "created_at.desc", "limit": "500"}),
            client.get(f"{SUPABASE_URL}/rest/v1/click_counter", headers=headers, params={"select": "*"}),
        )

    def _count(res: httpx.Response) -> int:
        try:
            return int(res.headers.get("content-range", "0/0").split("/")[-1])
        except Exception:
            return 0

    reports = reports_res.json() if reports_res.status_code == 200 else []
    inquiries = inquiries_res.json() if inquiries_res.status_code == 200 else []
    clicks_data = clicks_res.json() if clicks_res.status_code == 200 else []

    # 리포트 집계
    eligible = [r for r in reports if (r.get("payload") or {}).get("eligible")]
    ineligible_count = len(reports) - len(eligible)
    avg_severance = (
        sum((r.get("payload") or {}).get("severance", 0) for r in eligible) / len(eligible)
        if eligible else 0
    )
    # 회사별 집계
    company_counts: dict[str, int] = {}
    for r in reports:
        name = r.get("company_name") or "기타"
        company_counts[name] = company_counts.get(name, 0) + 1
    by_company = sorted(
        [{"name": k, "count": v} for k, v in company_counts.items()],
        key=lambda x: -x["count"],
    )[:10]

    # 문의 집계
    inq_waiting   = sum(1 for i in inquiries if i.get("status") in ("waiting", "대기중"))
    inq_reviewing = sum(1 for i in inquiries if i.get("status") == "reviewing")
    inq_answered  = sum(1 for i in inquiries if i.get("status") in ("answered", "답변완료"))
    inq_closed    = sum(1 for i in inquiries if i.get("status") == "closed")

    # 클릭 집계 (click_counter 테이블 실제 컬럼: total, severance, unemployment)
    total_clicks = severance_clicks = unemployment_clicks = 0
    for row in clicks_data:
        total_clicks        += row.get("total", 0)
        severance_clicks    += row.get("severance", 0)
        unemployment_clicks += row.get("unemployment", 0)

    return {
        "users": {
            "total":              _count(users_res),
            "marketing_agreed":   _count(marketing_res),
            "new_today":          _count(users_today_res),
            "new_this_week":      _count(users_week_res),
        },
        "reports": {
            "total":        len(reports),
            "eligible":     len(eligible),
            "ineligible":   ineligible_count,
            "avg_severance": round(avg_severance),
            "by_company":   by_company,
        },
        "inquiries": {
            "total":     len(inquiries),
            "waiting":   inq_waiting,
            "reviewing": inq_reviewing,
            "answered":  inq_answered,
            "closed":    inq_closed,
        },
        "clicks": {
            "total":        total_clicks,
            "severance":    severance_clicks,
            "unemployment": unemployment_clicks,
        },
    }


@router.get("/admin/analytics")
async def admin_analytics(
    start: str = "",
    end: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    """날짜별 트렌드 — profiles/reports/inquiries의 created_at 집계"""
    _check_admin(x_admin_token)
    headers = _supabase_headers()

    if not start:
        start = (datetime.utcnow().date() - timedelta(days=30)).isoformat()
    if not end:
        end = datetime.utcnow().date().isoformat()

    async with httpx.AsyncClient(timeout=15) as client:
        users_res, reports_res, inquiries_res = await asyncio.gather(
            client.get(f"{SUPABASE_URL}/rest/v1/profiles",  headers=headers, params={"select": "created_at", "created_at": f"gte.{start}T00:00:00Z,lte.{end}T23:59:59Z"}),
            client.get(f"{SUPABASE_URL}/rest/v1/reports",   headers=headers, params={"select": "created_at", "created_at": f"gte.{start}T00:00:00Z,lte.{end}T23:59:59Z"}),
            client.get(f"{SUPABASE_URL}/rest/v1/inquiries", headers=headers, params={"select": "created_at", "created_at": f"gte.{start}T00:00:00Z,lte.{end}T23:59:59Z"}),
        )

    def _by_date(rows: list, key="created_at") -> dict[str, int]:
        counts: dict[str, int] = {}
        for r in rows:
            d = (r.get(key) or "")[:10]
            if d:
                counts[d] = counts.get(d, 0) + 1
        return counts

    users_by_date    = _by_date(users_res.json()    if users_res.status_code    == 200 else [])
    reports_by_date  = _by_date(reports_res.json()  if reports_res.status_code  == 200 else [])
    inquiries_by_date = _by_date(inquiries_res.json() if inquiries_res.status_code == 200 else [])

    # 날짜 범위 생성
    start_dt = datetime.fromisoformat(start)
    end_dt   = datetime.fromisoformat(end)
    daily = []
    cur = start_dt
    while cur <= end_dt:
        d = cur.date().isoformat()
        daily.append({
            "date":          d,
            "new_users":     users_by_date.get(d, 0),
            "new_reports":   reports_by_date.get(d, 0),
            "new_inquiries": inquiries_by_date.get(d, 0),
            "clicks":        0,  # click_counter는 일별 분리가 없음
        })
        cur += timedelta(days=1)

    return {"daily": daily}


# ── Target ────────────────────────────────────────────────

@router.get("/admin/target/companies")
async def target_companies(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/reports",
            headers=_supabase_headers(),
            params={"select": "company_name", "limit": "2000"},
        )
    rows = res.json() if res.status_code == 200 else []
    counts: dict[str, int] = {}
    for r in rows:
        name = r.get("company_name") or "기타"
        counts[name] = counts.get(name, 0) + 1
    total = max(sum(counts.values()), 1)
    companies = sorted(
        [{"name": k, "count": v, "pct": round(v / total * 100, 1)} for k, v in counts.items()],
        key=lambda x: -x["count"],
    )
    return {"companies": companies}


@router.get("/admin/target/segments")
async def target_segments(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/reports",
            headers=_supabase_headers(),
            params={"select": "payload", "limit": "2000"},
        )
    rows = res.json() if res.status_code == 200 else []

    duration_bins = {"3개월 미만": 0, "3~6개월": 0, "6개월~1년": 0, "1년 이상": 0}
    wage_bins     = {"5만원 미만": 0, "5~8만원": 0, "8~12만원": 0, "12만원 이상": 0}

    for r in rows:
        payload = r.get("payload") or {}
        work_days = payload.get("work_days") or 0
        avg_wage  = payload.get("average_wage") or 0

        if work_days < 90:       duration_bins["3개월 미만"] += 1
        elif work_days < 180:    duration_bins["3~6개월"] += 1
        elif work_days < 365:    duration_bins["6개월~1년"] += 1
        else:                    duration_bins["1년 이상"] += 1

        if avg_wage < 50000:     wage_bins["5만원 미만"] += 1
        elif avg_wage < 80000:   wage_bins["5~8만원"] += 1
        elif avg_wage < 120000:  wage_bins["8~12만원"] += 1
        else:                    wage_bins["12만원 이상"] += 1

    return {
        "by_duration": [{"label": k, "count": v} for k, v in duration_bins.items()],
        "by_wage":     [{"label": k, "count": v} for k, v in wage_bins.items()],
    }


# ── Inquiries CRM ─────────────────────────────────────────

@router.get("/admin/inquiries")
async def list_inquiries(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    category: str = "",
    search: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    params: dict = {
        "select": "*",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str((page - 1) * limit),
    }
    if status:
        params["status"] = f"eq.{status}"
    if category:
        params["category"] = f"eq.{category}"

    async with httpx.AsyncClient(timeout=15) as client:
        count_headers = {**headers, "Prefer": "count=exact"}
        res = await client.get(f"{SUPABASE_URL}/rest/v1/inquiries", headers=count_headers, params=params)

    rows = res.json() if res.status_code == 200 else []
    total = int(res.headers.get("content-range", "0/0").split("/")[-1]) if res.status_code == 200 else 0

    # 검색 필터 (Supabase 무료 티어에서 full-text 안 됨, in-memory)
    if search:
        rows = [r for r in rows if search in (r.get("content") or "") or search in (r.get("title") or "") or search in (r.get("category") or "")]
        total = len(rows)

    return {"inquiries": rows, "total": total}


class StatusPayload(BaseModel):
    status: str


class AnswerPayload(BaseModel):
    answer: str


class BulkStatusPayload(BaseModel):
    ids: list[str]
    status: str


@router.patch("/admin/inquiries/{inquiry_id}/status")
async def patch_inquiry_status(
    inquiry_id: str,
    payload: StatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    async with httpx.AsyncClient(timeout=10) as client:
        # 이전 상태 조회
        old_res = await client.get(
            f"{SUPABASE_URL}/rest/v1/inquiries",
            headers=headers,
            params={"select": "status", "id": f"eq.{inquiry_id}"},
        )
        old_status = (old_res.json() or [{}])[0].get("status") if old_res.status_code == 200 else None

        res = await client.patch(
            f"{SUPABASE_URL}/rest/v1/inquiries",
            headers=headers,
            params={"id": f"eq.{inquiry_id}"},
            json={"status": payload.status, "updated_at": datetime.utcnow().isoformat()},
        )
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=res.status_code, detail="상태 변경 실패")

        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "inquiry.status", "inquiry", inquiry_id,
                           before_val={"status": old_status}, after_val={"status": payload.status},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


@router.patch("/admin/inquiries/{inquiry_id}/answer")
async def patch_inquiry_answer(
    inquiry_id: str,
    payload: AnswerPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.patch(
            f"{SUPABASE_URL}/rest/v1/inquiries",
            headers=headers,
            params={"id": f"eq.{inquiry_id}"},
            json={"answer": payload.answer, "status": "answered", "updated_at": datetime.utcnow().isoformat()},
        )
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=res.status_code, detail="답변 등록 실패")

        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "inquiry.answer", "inquiry", inquiry_id,
                           after_val={"answer_length": len(payload.answer)},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


@router.post("/admin/inquiries/bulk-status")
async def bulk_inquiry_status(
    payload: BulkStatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [
            client.patch(
                f"{SUPABASE_URL}/rest/v1/inquiries",
                headers=headers,
                params={"id": f"eq.{id_}"},
                json={"status": payload.status, "updated_at": datetime.utcnow().isoformat()},
            )
            for id_ in payload.ids
        ]
        await asyncio.gather(*tasks)
        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "inquiry.status", "inquiry", ",".join(payload.ids[:5]),
                           after_val={"status": payload.status, "count": len(payload.ids)},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


# ── 답변 템플릿 ───────────────────────────────────────────

@router.get("/admin/templates")
async def list_templates(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/inquiry_templates",
            headers=_supabase_headers(),
            params={"select": "*", "order": "use_count.desc"},
        )
    return {"templates": res.json() if res.status_code == 200 else []}


class TemplatePayload(BaseModel):
    title: str
    content: str
    category: str = "기타"


@router.post("/admin/templates")
async def create_template(
    payload: TemplatePayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{SUPABASE_URL}/rest/v1/inquiry_templates",
            headers=_supabase_headers(),
            json={"title": payload.title, "content": payload.content, "category": payload.category},
        )
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail="템플릿 생성 실패")
        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "template.create", "template", None,
                           after_val={"title": payload.title},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


@router.delete("/admin/templates/{template_id}")
async def delete_template(
    template_id: str,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.delete(
            f"{SUPABASE_URL}/rest/v1/inquiry_templates",
            headers=_supabase_headers(),
            params={"id": f"eq.{template_id}"},
        )
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=res.status_code, detail="템플릿 삭제 실패")
        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "template.delete", "template", template_id,
                           ip=request.client.host if request.client else None)
    return {"ok": True}


@router.post("/admin/templates/{template_id}/use")
async def use_template(template_id: str, x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        # use_count 증가 — Supabase RPC 없이 읽기→쓰기
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/inquiry_templates",
            headers=_supabase_headers(),
            params={"select": "use_count", "id": f"eq.{template_id}"},
        )
        current = (res.json() or [{}])[0].get("use_count", 0)
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/inquiry_templates",
            headers=_supabase_headers(),
            params={"id": f"eq.{template_id}"},
            json={"use_count": current + 1},
        )
    return {"ok": True}


# ── Settings ──────────────────────────────────────────────

@router.get("/admin/settings")
async def get_settings(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/system_settings",
            headers=_supabase_headers(),
            params={"select": "key,value"},
        )
    rows = res.json() if res.status_code == 200 else []
    return {"settings": {r["key"]: r["value"] for r in rows}}


class SettingPayload(BaseModel):
    key: str
    value: str


@router.patch("/admin/settings")
async def patch_setting(
    payload: SettingPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = _supabase_headers()
    async with httpx.AsyncClient(timeout=10) as client:
        # 이전 값 읽기
        old_res = await client.get(
            f"{SUPABASE_URL}/rest/v1/system_settings",
            headers=headers,
            params={"select": "value", "key": f"eq.{payload.key}"},
        )
        old_val = (old_res.json() or [{}])[0].get("value")

        # upsert
        res = await client.post(
            f"{SUPABASE_URL}/rest/v1/system_settings",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json={"key": payload.key, "value": payload.value, "updated_at": datetime.utcnow().isoformat()},
        )
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail="설정 저장 실패")

        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "settings.update", "settings", payload.key,
                           before_val={"value": old_val}, after_val={"value": payload.value},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


# ── IP 차단 ───────────────────────────────────────────────

@router.get("/admin/blocked-ips")
async def list_blocked_ips(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/blocked_ips",
            headers=_supabase_headers(),
            params={"select": "*", "order": "created_at.desc"},
        )
    return {"blocked_ips": res.json() if res.status_code == 200 else []}


class BlockIpPayload(BaseModel):
    ip_address: str
    reason: Optional[str] = None
    expires_at: Optional[str] = None


@router.post("/admin/blocked-ips")
async def block_ip(
    payload: BlockIpPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{SUPABASE_URL}/rest/v1/blocked_ips",
            headers=_supabase_headers(),
            json={
                "ip_address": payload.ip_address,
                "reason": payload.reason,
                "expires_at": payload.expires_at,
            },
        )
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail="IP 차단 실패")
        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "ip.block", "ip", payload.ip_address,
                           after_val={"reason": payload.reason},
                           ip=request.client.host if request.client else None)
    return {"ok": True}


@router.delete("/admin/blocked-ips/{blocked_id}")
async def unblock_ip(
    blocked_id: str,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    async with httpx.AsyncClient(timeout=10) as client:
        # IP 주소 조회 (감사 로그용)
        old_res = await client.get(
            f"{SUPABASE_URL}/rest/v1/blocked_ips",
            headers=_supabase_headers(),
            params={"select": "ip_address", "id": f"eq.{blocked_id}"},
        )
        ip_addr = (old_res.json() or [{}])[0].get("ip_address")

        res = await client.delete(
            f"{SUPABASE_URL}/rest/v1/blocked_ips",
            headers=_supabase_headers(),
            params={"id": f"eq.{blocked_id}"},
        )
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=res.status_code, detail="차단 해제 실패")
        admin_email = x_admin_token or "admin"
        await _write_audit(client, admin_email, "ip.unblock", "ip", ip_addr,
                           ip=request.client.host if request.client else None)
    return {"ok": True}


# ── 감사 로그 ─────────────────────────────────────────────

@router.get("/admin/logs")
async def list_audit_logs(
    page: int = 1,
    limit: int = 50,
    action: str = "",
    start: str = "",
    end: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    headers = {**_supabase_headers(), "Prefer": "count=exact"}
    params: dict = {
        "select": "*",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str((page - 1) * limit),
    }
    if action:
        params["action"] = f"eq.{action}"
    if start:
        params["created_at"] = f"gte.{start}T00:00:00Z"
    if end:
        existing = params.get("created_at", "")
        params["created_at"] = (existing + "," if existing else "") + f"lte.{end}T23:59:59Z"

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(f"{SUPABASE_URL}/rest/v1/audit_logs", headers=headers, params=params)

    rows = res.json() if res.status_code == 200 else []
    total = int(res.headers.get("content-range", "0/0").split("/")[-1]) if res.status_code == 200 else 0
    return {"logs": rows, "total": total}
