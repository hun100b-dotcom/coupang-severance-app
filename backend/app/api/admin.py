# -*- coding: utf-8 -*-
"""
Admin OS — 전문 관리자 대시보드 API

NOTE: 모든 엔드포인트는 sync def + httpx.Client() 사용.
      counter.py와 동일 패턴 — Render에서 async httpx DNS 오류 우회.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

# ── 프로젝트 고정 상수 (Supabase 프로젝트 ID 기반) ──────────
_PROJECT_ID      = "hmjxrqhcwjyfkvlcejfc"
_CORRECT_SB_URL  = f"https://{_PROJECT_ID}.supabase.co"
_DEFAULT_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtanhycWhjd2p5Zmt2bGNlamZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTEwNTMsImV4cCI6MjA4ODYyNzA1M30"
    ".gr9poC-5808qHRoYc-5WH3dTqXupEEJpDdztv2fddog"
)
# Vercel VITE_ADMIN_SECRET 와 동일한 기본값 (환경변수 미설정 시 폴백)
_DEFAULT_ADMIN_SECRET = "Luck2058qorwhdgns3"

# SUPABASE_URL 환경변수가 다른 프로젝트를 가리키면 올바른 URL로 강제 교정
_env_sb_url = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_URL = _env_sb_url if _PROJECT_ID in _env_sb_url else _CORRECT_SB_URL

SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY", _DEFAULT_ANON_KEY)
)
ADMIN_SECRET = os.getenv("ADMIN_SECRET") or _DEFAULT_ADMIN_SECRET

# 허용 토큰: 환경변수 값 + 기본값 모두 허용 (Render 환경변수 불일치 대비)
_VALID_ADMIN_TOKENS = {_DEFAULT_ADMIN_SECRET}
if ADMIN_SECRET:
    _VALID_ADMIN_TOKENS.add(ADMIN_SECRET)


# ── 공통 헬퍼 ─────────────────────────────────────────────

def _check_admin(x_admin_token: Optional[str]) -> None:
    if x_admin_token not in _VALID_ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="관리자 권한이 없습니다.")


def _supabase_headers(count: bool = False, upsert: bool = False) -> dict:
    prefer = []
    if count:
        prefer.append("count=exact")
    if upsert:
        prefer.append("resolution=merge-duplicates")
    if not prefer:
        prefer.append("return=representation")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": ",".join(prefer),
    }


def _sb_get(path: str, params: dict | None = None, count: bool = False) -> httpx.Response:
    """Supabase GET — sync httpx (Render DNS 호환)"""
    return httpx.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(count=count),
        params=params or {},
        timeout=15,
    )


def _sb_post(path: str, json: dict, upsert: bool = False) -> httpx.Response:
    return httpx.post(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(upsert=upsert),
        json=json,
        timeout=10,
    )


def _sb_patch(path: str, params: dict, json: dict) -> httpx.Response:
    return httpx.patch(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(),
        params=params,
        json=json,
        timeout=10,
    )


def _sb_delete(path: str, params: dict) -> httpx.Response:
    return httpx.delete(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(),
        params=params,
        timeout=10,
    )


def _count_header(res: httpx.Response) -> int:
    try:
        return int(res.headers.get("content-range", "0/0").split("/")[-1])
    except Exception:
        return 0


def _write_audit(
    admin_email: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    before_val: Any = None,
    after_val: Any = None,
    ip: Optional[str] = None,
) -> None:
    """감사 로그 기록 — 오류 조용히 무시"""
    try:
        httpx.post(
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
            timeout=5,
        )
    except Exception:
        pass


# ── Debug ─────────────────────────────────────────────────

@router.get("/admin/health")
def admin_health(x_admin_token: Optional[str] = Header(default=None)):
    """환경변수 및 Supabase 연결 상태 확인"""
    _check_admin(x_admin_token)
    try:
        r = _sb_get("system_settings", {"select": "key", "limit": "1"})
        return {
            "ok": True,
            "supabase_url": SUPABASE_URL,
            "admin_secret_len": len(ADMIN_SECRET),
            "service_key_len": len(SUPABASE_SERVICE_ROLE_KEY),
            "settings_status": r.status_code,
            "body": r.text[:120],
        }
    except Exception as e:
        return {"ok": False, "url": SUPABASE_URL, "error": str(e), "type": type(e).__name__}


# ── Dashboard ─────────────────────────────────────────────

@router.get("/admin/stats")
def admin_stats(x_admin_token: Optional[str] = Header(default=None)):
    """KPI 집계 — sync parallel via ThreadPoolExecutor"""
    _check_admin(x_admin_token)
    today = datetime.utcnow().date().isoformat()
    week_ago = (datetime.utcnow().date() - timedelta(days=7)).isoformat()

    def fetch(path, params, count=False):
        try:
            return _sb_get(path, params, count=count)
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=7) as pool:
        futures = {
            "users":         pool.submit(fetch, "profiles",     {"select": "count", "head": "true"}, True),
            "users_today":   pool.submit(fetch, "profiles",     {"select": "count", "head": "true", "created_at": f"gte.{today}"}, True),
            "users_week":    pool.submit(fetch, "profiles",     {"select": "count", "head": "true", "created_at": f"gte.{week_ago}"}, True),
            "marketing":     pool.submit(fetch, "profiles",     {"select": "count", "head": "true", "marketing_agreement": "eq.true"}, True),
            "reports":       pool.submit(fetch, "reports",      {"select": "*", "order": "created_at.desc", "limit": "1000"}),
            "inquiries":     pool.submit(fetch, "inquiries",    {"select": "*", "order": "created_at.desc", "limit": "500"}),
            "clicks":        pool.submit(fetch, "click_counter",{"select": "*"}),
        }
        results = {k: v.result() for k, v in futures.items()}

    def json_or_empty(res):
        try:
            return res.json() if res and res.status_code == 200 else []
        except Exception:
            return []

    reports    = json_or_empty(results["reports"])
    inquiries  = json_or_empty(results["inquiries"])
    clicks_data = json_or_empty(results["clicks"])

    eligible = [r for r in reports if (r.get("payload") or {}).get("eligible")]
    avg_severance = (
        sum((r.get("payload") or {}).get("severance", 0) for r in eligible) / len(eligible)
        if eligible else 0
    )
    company_counts: dict[str, int] = {}
    for r in reports:
        name = r.get("company_name") or "기타"
        company_counts[name] = company_counts.get(name, 0) + 1
    by_company = sorted(
        [{"name": k, "count": v} for k, v in company_counts.items()],
        key=lambda x: -x["count"],
    )[:10]

    total_clicks = severance_clicks = unemployment_clicks = 0
    for row in clicks_data:
        total_clicks        += row.get("total", 0)
        severance_clicks    += row.get("severance", 0)
        unemployment_clicks += row.get("unemployment", 0)

    return {
        "users": {
            "total":            _count_header(results["users"])     if results["users"]     else 0,
            "marketing_agreed": _count_header(results["marketing"]) if results["marketing"] else 0,
            "new_today":        _count_header(results["users_today"]) if results["users_today"] else 0,
            "new_this_week":    _count_header(results["users_week"])  if results["users_week"]  else 0,
        },
        "reports": {
            "total":         len(reports),
            "eligible":      len(eligible),
            "ineligible":    len(reports) - len(eligible),
            "avg_severance": round(avg_severance),
            "by_company":    by_company,
        },
        "inquiries": {
            "total":     len(inquiries),
            "waiting":   sum(1 for i in inquiries if i.get("status") in ("waiting", "대기중")),
            "reviewing": sum(1 for i in inquiries if i.get("status") == "reviewing"),
            "answered":  sum(1 for i in inquiries if i.get("status") in ("answered", "답변완료")),
            "closed":    sum(1 for i in inquiries if i.get("status") == "closed"),
        },
        "clicks": {
            "total":        total_clicks,
            "severance":    severance_clicks,
            "unemployment": unemployment_clicks,
        },
    }


@router.get("/admin/analytics")
def admin_analytics(
    start: str = "",
    end: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)

    if not start:
        start = (datetime.utcnow().date() - timedelta(days=30)).isoformat()
    if not end:
        end = datetime.utcnow().date().isoformat()

    date_gte = f"gte.{start}T00:00:00Z"

    def fetch_dated(table):
        try:
            # 날짜 범위: gte + lte를 URL에 직접 조합
            url = (
                f"{SUPABASE_URL}/rest/v1/{table}"
                f"?select=created_at"
                f"&created_at=gte.{start}T00:00:00Z"
                f"&created_at=lte.{end}T23:59:59Z"
            )
            return httpx.get(url, headers=_supabase_headers(), timeout=15)
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=3) as pool:
        u_fut = pool.submit(fetch_dated, "profiles")
        r_fut = pool.submit(fetch_dated, "reports")
        i_fut = pool.submit(fetch_dated, "inquiries")
        users_res, reports_res, inq_res = u_fut.result(), r_fut.result(), i_fut.result()

    def _by_date(res) -> dict[str, int]:
        counts: dict[str, int] = {}
        rows = res.json() if res and res.status_code == 200 else []
        for r in rows:
            d = (r.get("created_at") or "")[:10]
            if d:
                counts[d] = counts.get(d, 0) + 1
        return counts

    users_by_date    = _by_date(users_res)
    reports_by_date  = _by_date(reports_res)
    inq_by_date      = _by_date(inq_res)

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
            "new_inquiries": inq_by_date.get(d, 0),
            "clicks":        0,
        })
        cur += timedelta(days=1)

    return {"daily": daily}


# ── Target ────────────────────────────────────────────────

@router.get("/admin/target/companies")
def target_companies(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("reports", {"select": "company_name", "limit": "2000"})
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
def target_segments(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("reports", {"select": "payload", "limit": "2000"})
    rows = res.json() if res.status_code == 200 else []

    duration_bins = {"3개월 미만": 0, "3~6개월": 0, "6개월~1년": 0, "1년 이상": 0}
    wage_bins     = {"5만원 미만": 0, "5~8만원": 0, "8~12만원": 0, "12만원 이상": 0}

    for r in rows:
        payload  = r.get("payload") or {}
        work_days = payload.get("work_days") or 0
        avg_wage  = payload.get("average_wage") or 0

        if work_days < 90:      duration_bins["3개월 미만"] += 1
        elif work_days < 180:   duration_bins["3~6개월"] += 1
        elif work_days < 365:   duration_bins["6개월~1년"] += 1
        else:                   duration_bins["1년 이상"] += 1

        if avg_wage < 50000:    wage_bins["5만원 미만"] += 1
        elif avg_wage < 80000:  wage_bins["5~8만원"] += 1
        elif avg_wage < 120000: wage_bins["8~12만원"] += 1
        else:                   wage_bins["12만원 이상"] += 1

    return {
        "by_duration": [{"label": k, "count": v} for k, v in duration_bins.items()],
        "by_wage":     [{"label": k, "count": v} for k, v in wage_bins.items()],
    }


# ── Inquiries CRM ─────────────────────────────────────────

@router.get("/admin/inquiries")
def list_inquiries(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    category: str = "",
    search: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
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

    res = _sb_get("inquiries", params, count=True)
    rows  = res.json() if res.status_code == 200 else []
    total = _count_header(res)

    if search:
        rows = [r for r in rows if
                search in (r.get("content") or "") or
                search in (r.get("title") or "") or
                search in (r.get("category") or "")]
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
def patch_inquiry_status(
    inquiry_id: str,
    payload: StatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    old_res    = _sb_get("inquiries", {"select": "status", "id": f"eq.{inquiry_id}"})
    old_status = (old_res.json() or [{}])[0].get("status") if old_res.status_code == 200 else None
    res = _sb_patch("inquiries", {"id": f"eq.{inquiry_id}"},
                    {"status": payload.status, "updated_at": datetime.utcnow().isoformat()})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="상태 변경 실패")
    _write_audit(x_admin_token or "admin", "inquiry.status", "inquiry", inquiry_id,
                 before_val={"status": old_status}, after_val={"status": payload.status},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.patch("/admin/inquiries/{inquiry_id}/answer")
def patch_inquiry_answer(
    inquiry_id: str,
    payload: AnswerPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_patch("inquiries", {"id": f"eq.{inquiry_id}"},
                    {"answer": payload.answer, "status": "answered",
                     "updated_at": datetime.utcnow().isoformat()})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="답변 등록 실패")
    _write_audit(x_admin_token or "admin", "inquiry.answer", "inquiry", inquiry_id,
                 after_val={"answer_length": len(payload.answer)},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.post("/admin/inquiries/bulk-status")
def bulk_inquiry_status(
    payload: BulkStatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    now_iso = datetime.utcnow().isoformat()

    def patch_one(id_):
        try:
            _sb_patch("inquiries", {"id": f"eq.{id_}"},
                      {"status": payload.status, "updated_at": now_iso})
        except Exception:
            pass

    with ThreadPoolExecutor(max_workers=min(len(payload.ids), 5)) as pool:
        list(pool.map(patch_one, payload.ids))

    _write_audit(x_admin_token or "admin", "inquiry.status", "inquiry",
                 ",".join(payload.ids[:5]),
                 after_val={"status": payload.status, "count": len(payload.ids)},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# ── 답변 템플릿 ───────────────────────────────────────────

@router.get("/admin/templates")
def list_templates(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("inquiry_templates", {"select": "*", "order": "use_count.desc"})
    return {"templates": res.json() if res.status_code == 200 else []}


class TemplatePayload(BaseModel):
    title: str
    content: str
    category: str = "기타"


@router.post("/admin/templates")
def create_template(
    payload: TemplatePayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_post("inquiry_templates",
                   {"title": payload.title, "content": payload.content, "category": payload.category})
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="템플릿 생성 실패")
    _write_audit(x_admin_token or "admin", "template.create", "template", None,
                 after_val={"title": payload.title},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.delete("/admin/templates/{template_id}")
def delete_template(
    template_id: str,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_delete("inquiry_templates", {"id": f"eq.{template_id}"})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="템플릿 삭제 실패")
    _write_audit(x_admin_token or "admin", "template.delete", "template", template_id,
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.post("/admin/templates/{template_id}/use")
def use_template(template_id: str, x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("inquiry_templates", {"select": "use_count", "id": f"eq.{template_id}"})
    current = (res.json() or [{}])[0].get("use_count", 0)
    _sb_patch("inquiry_templates", {"id": f"eq.{template_id}"}, {"use_count": current + 1})
    return {"ok": True}


# ── Settings ──────────────────────────────────────────────

@router.get("/admin/settings")
def get_settings(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("system_settings", {"select": "key,value"})
    rows = res.json() if res.status_code == 200 else []
    return {"settings": {r["key"]: r["value"] for r in rows}}


class SettingPayload(BaseModel):
    key: str
    value: str


@router.patch("/admin/settings")
def patch_setting(
    payload: SettingPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    old_res = _sb_get("system_settings", {"select": "value", "key": f"eq.{payload.key}"})
    old_val = (old_res.json() or [{}])[0].get("value")
    res = httpx.post(
        f"{SUPABASE_URL}/rest/v1/system_settings",
        headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
        json={"key": payload.key, "value": payload.value, "updated_at": datetime.utcnow().isoformat()},
        timeout=10,
    )
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="설정 저장 실패")
    _write_audit(x_admin_token or "admin", "settings.update", "settings", payload.key,
                 before_val={"value": old_val}, after_val={"value": payload.value},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# ── IP 차단 ───────────────────────────────────────────────

@router.get("/admin/blocked-ips")
def list_blocked_ips(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    res = _sb_get("blocked_ips", {"select": "*", "order": "created_at.desc"})
    return {"blocked_ips": res.json() if res.status_code == 200 else []}


class BlockIpPayload(BaseModel):
    ip_address: str
    reason: Optional[str] = None
    expires_at: Optional[str] = None


@router.post("/admin/blocked-ips")
def block_ip(
    payload: BlockIpPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_post("blocked_ips", {
        "ip_address": payload.ip_address,
        "reason": payload.reason,
        "expires_at": payload.expires_at,
    })
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="IP 차단 실패")
    _write_audit(x_admin_token or "admin", "ip.block", "ip", payload.ip_address,
                 after_val={"reason": payload.reason},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.delete("/admin/blocked-ips/{blocked_id}")
def unblock_ip(
    blocked_id: str,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    old_res = _sb_get("blocked_ips", {"select": "ip_address", "id": f"eq.{blocked_id}"})
    ip_addr = (old_res.json() or [{}])[0].get("ip_address")
    res = _sb_delete("blocked_ips", {"id": f"eq.{blocked_id}"})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="차단 해제 실패")
    _write_audit(x_admin_token or "admin", "ip.unblock", "ip", ip_addr,
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# ── 감사 로그 ─────────────────────────────────────────────

@router.get("/admin/logs")
def list_audit_logs(
    page: int = 1,
    limit: int = 50,
    action: str = "",
    start: str = "",
    end: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
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

    res = _sb_get("audit_logs", params, count=True)
    rows  = res.json() if res.status_code == 200 else []
    total = _count_header(res)

    # end 필터는 in-memory (PostgREST 중복 키 우회)
    if end:
        end_dt = f"{end}T23:59:59Z"
        rows  = [r for r in rows if (r.get("created_at") or "") <= end_dt]
        total = len(rows)

    return {"logs": rows, "total": total}
