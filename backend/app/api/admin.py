# -*- coding: utf-8 -*-
"""
Admin OS — 전문 관리자 대시보드 API

NOTE: 모든 엔드포인트는 sync def + httpx 사용 (Render에서 async httpx DNS 오류 우회).
      2026-07-04 2차 전수조사에서 원샷 httpx.get()→모듈레벨 공유 httpx.Client(커넥션
      풀·keep-alive)로 전환해 전 엔드포인트를 가속했다(_client 정의부 주석 참조).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()
_audit_logger = logging.getLogger("admin.audit")

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

# ⚠️ 2026-07-06 어드민 무한로딩→"관리자 인증 실패(401)" 박멸:
#   프론트(frontend/src/lib/api.ts)는 VITE_ADMIN_SECRET 이 없으면 anon key 뒤 32자를
#   토큰으로 파생해 보낸다. Vercel 에는 VITE_ADMIN_SECRET 이 설정돼 있지 않아 실제로는
#   "anon key 뒤 32자"가 프론트 토큰이었는데, 백엔드 허용셋엔 이 파생값이 빠져 있어
#   모든 어드민 백엔드 호출이 401 로 막혔다(대시보드/방문자/문의/공지 전부 실패).
#   → 백엔드도 프론트와 "동일 파생 로직"(anon[-32:])을 허용셋에 추가해 계약을 일치시킨다.
#   (env anon 키가 다른 경우까지 대비해 env·기본 anon 둘 다에서 파생)
for _anon in (os.getenv("SUPABASE_ANON_KEY", ""), _DEFAULT_ANON_KEY):
    if _anon and len(_anon) >= 32:
        _VALID_ADMIN_TOKENS.add(_anon[-32:])


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


# ── 공유 httpx.Client (커넥션 풀 · keep-alive) ────────────────────────────────
# 배경(2026-07-04 2차 전수조사): 기존엔 매 호출이 모듈레벨 httpx.get()=원샷이라
#   호출마다 새 연결(DNS→TCP→TLS 핸드셰이크)을 만들고 버렸다. Render(싱가포르)→
#   Supabase 왕복마다 풀 핸드셰이크 비용을 지불 → /admin/stats(9쿼리 병렬)조차 3초였다.
# 처치: 프로세스당 1개의 공유 Client 로 커넥션을 재사용(keep-alive)한다. TLS 핸드셰이크가
#   재사용돼 전 어드민 엔드포인트가 빨라진다(예상 stats 3s→~0.6s).
#   ⚠️ 이 Client 는 "sync" 라 기존 async httpx DNS 이슈와 무관하고(주석 §NOTE 존중),
#      httpx.Client 는 스레드 세이프라 stats 의 ThreadPoolExecutor 병렬 호출에도 안전하다.
#   http2 는 h2 의존성이 없어 끄고(HTTP/1.1 keep-alive 만으로 핵심 이득), 풀 한도만 넉넉히 둔다.
_HTTP_LIMITS = httpx.Limits(
    max_keepalive_connections=20,  # 재사용 대기 커넥션 수(어드민 동시성 여유)
    max_connections=40,            # 동시 커넥션 상한
    keepalive_expiry=30.0,         # 유휴 커넥션 30초 유지 후 정리
)
_client = httpx.Client(timeout=15, limits=_HTTP_LIMITS)

# 프로세스 종료 시 공유 커넥션 정리(견고성). 단일 프로세스 웹서버라 필수는 아니지만,
#   main.py 를 건드리지 않고 자기완결적으로 소켓을 깔끔히 닫는다(리뷰어 B MINOR 반영).
import atexit as _atexit
_atexit.register(_client.close)


def _sb_get(path: str, params: dict | None = None, count: bool = False) -> httpx.Response:
    """Supabase GET — 공유 Client(keep-alive) 재사용. sync (Render DNS 호환)"""
    return _client.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(count=count),
        params=params or {},
        timeout=15,
    )


def _sb_post(path: str, json: dict, upsert: bool = False) -> httpx.Response:
    return _client.post(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(upsert=upsert),
        json=json,
        timeout=10,
    )


def _sb_patch(path: str, params: dict, json: dict) -> httpx.Response:
    return _client.patch(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_supabase_headers(),
        params=params,
        json=json,
        timeout=10,
    )


def _sb_delete(path: str, params: dict) -> httpx.Response:
    return _client.delete(
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
    """감사 로그 기록 — 관리자 작업을 막지 않도록 예외는 삼키되,
    실패(예외 또는 비정상 status)는 서버 로그로 남겨 '무음 누락'을 탐지 가능하게 한다."""
    try:
        res = _client.post(
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
        if res.status_code not in (200, 201, 204):
            # RLS는 service-role로 우회되지만 컬럼 불일치/제약 위반 등은 여기서 잡힌다
            _audit_logger.warning(
                "감사로그 기록 실패 status=%s action=%s body=%s",
                res.status_code, action, res.text[:200],
            )
    except Exception as e:
        _audit_logger.warning("감사로그 기록 예외 action=%s err=%s", action, e)


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

    with ThreadPoolExecutor(max_workers=9) as pool:
        futures = {
            "users":         pool.submit(fetch, "profiles",     {"select": "id", "limit": "0"}, True),
            "users_today":   pool.submit(fetch, "profiles",     {"select": "id", "limit": "0", "created_at": f"gte.{today}"}, True),
            "users_week":    pool.submit(fetch, "profiles",     {"select": "id", "limit": "0", "created_at": f"gte.{week_ago}"}, True),
            "marketing":     pool.submit(fetch, "profiles",     {"select": "id", "limit": "0",
                                                                  "or": "(marketing_sms.eq.true,marketing_email.eq.true,marketing_phone.eq.true)"}, True),
            "reports":       pool.submit(fetch, "reports",      {"select": "*", "order": "created_at.desc", "limit": "1000"}),
            "inquiries":     pool.submit(fetch, "inquiries",    {"select": "*", "order": "created_at.desc", "limit": "500"}),
            "clicks":        pool.submit(fetch, "click_counter",{"select": "*"}),
            # 채용공고 집계 — 프론트 OverviewTab 의 stats.jobs KPI 용
            #   (과거 프론트가 Supabase 직접 count 했으나 RLS 세션 의존이라 백엔드로 통일)
            "jobs":          pool.submit(fetch, "job_postings", {"select": "id", "limit": "0"}, True),
            "jobs_active":   pool.submit(fetch, "job_postings", {"select": "id", "limit": "0", "status": "eq.active"}, True),
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
        "jobs": {
            "total":  _count_header(results["jobs"])        if results["jobs"]        else 0,
            "active": _count_header(results["jobs_active"]) if results["jobs_active"] else 0,
        },
    }


# ── 계산 리포트 원본 목록 (대시보드 계산통계 탭용) ─────────────────────────
# 배경: 프론트 CalcStatsTab 이 supabase.from('reports') 를 관리자 "브라우저 세션"으로
#   직접 조회했는데, reports RLS 는 owner-only(reports_select_own)라 관리자 본인이
#   계산한 리포트만 보였다(전체 통계처럼 보이는 과소집계 = 사실상 가짜 숫자).
#   service-role 로 전 행을 반환해 진실값을 보장한다. PII 없는 컬럼만 선별.
@router.get("/admin/reports")
def list_reports(
    days: int = 30,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    days = max(1, min(days, 365))  # 1~365일로 제한(과도 조회 방지)
    from_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    try:
        res = _sb_get("reports", {
            "select": "id,title,created_at,payload",
            "created_at": f"gte.{from_date}",
            "order": "created_at.desc",
            "limit": "2000",
        })
    except Exception as e:
        # ★ 가짜 0 금지(리뷰어 B): 업스트림 장애를 빈 배열(정상처럼 보이는 0건)로
        #   무음화하지 않고 명시적 502 로 알린다 → 프론트가 에러 배너를 표시한다.
        raise HTTPException(status_code=502, detail=f"리포트 조회 실패(업스트림): {type(e).__name__}")
    if res.status_code not in (200, 206):
        raise HTTPException(status_code=502, detail=f"리포트 조회 실패(업스트림 HTTP {res.status_code})")
    return {"reports": res.json()}


# ── 채용 운영 통계 (채용현황·채용Summary 메뉴 공용) ─────────────────────────
# 배경: ConfirmedMenu/RecruitSummaryMenu 가 job_postings + job_applications 를
#   브라우저 세션으로 직접 조회 → job_applications 관리자 SELECT RLS 상태에 따라
#   0행(빈 화면) 또는 부분 집계가 발생할 수 있었다. service-role 로 통일.
@router.get("/admin/recruit-stats")
def recruit_stats(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)

    def fetch(path, params):
        try:
            return _sb_get(path, params)
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        jp_fut = pool.submit(fetch, "job_postings", {
            "select": "id,company_name,center_name,status,headcount,section,"
                      "created_at,expires_at,view_count",
            "status": "neq.deleted",
            "order": "created_at.desc",
            "limit": "2000",
        })
        ap_fut = pool.submit(fetch, "job_applications", {
            "select": "id,job_posting_id,status,applied_at,work_date,work_confirmed_at,"
                      "preferred_shift,applied_task,"
                      "job_postings(company_name,center_name,headcount)",
            "order": "applied_at.desc",
            "limit": "5000",
        })
        jp_res, ap_res = jp_fut.result(), ap_fut.result()

    # ★ 가짜 0 금지(리뷰어 B): 업스트림 장애를 빈 배열로 무음화하면 채용현황이
    #   "지원 0건" 정상 화면처럼 보인다 → 명시적 502 로 프론트 에러 배너를 띄운다.
    def _json_or_502(res, what: str):
        if res is None:
            raise HTTPException(status_code=502, detail=f"{what} 조회 실패(업스트림 연결 오류)")
        if res.status_code not in (200, 206):
            raise HTTPException(status_code=502, detail=f"{what} 조회 실패(업스트림 HTTP {res.status_code})")
        try:
            return res.json()
        except Exception:
            raise HTTPException(status_code=502, detail=f"{what} 응답 파싱 실패")

    return {
        "postings": _json_or_502(jp_res, "채용공고"),
        "applications": _json_or_502(ap_res, "지원 데이터"),
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
            return _client.get(url, headers=_supabase_headers(), timeout=15)
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


# ── 방문자 유입경로 분류 (referrer → 채널) ─────────────────────────────────
# document.referrer(직전 페이지 URL)를 사람이 읽을 채널명으로 분류한다.
#   프론트/백엔드가 같은 규칙을 써야 표기가 일관되므로 백엔드를 단일 기준으로 삼는다.
# 앱 자체 도메인(현행·구 도메인 모두) — referrer 가 아래면 '앱 내 이동'으로 본다.
#   catch-daily-worker: 현 프로덕션 / coupang-severance-app: 구 프론트·API 도메인(라이브 유입 확인)
_APP_HOSTS = ("catch-daily-worker", "coupang-severance-app", "localhost", "127.0.0.1")
def _classify_referrer(ref: Optional[str]) -> str:
    if not ref:
        return "직접 방문"          # referrer 없음 = 주소창 직접 입력/북마크/앱 등
    try:
        # URL 파싱 없이 host 부분만 소문자로 추출(가벼움)
        host = ref.split("//", 1)[-1].split("/", 1)[0].lower()
    except Exception:
        return "알 수 없음"
    if any(h in host for h in _APP_HOSTS):
        return "앱 내 이동"
    if "google" in host:      return "Google 검색"
    if "naver" in host:       return "Naver 검색"
    if "daum" in host or "kakao" in host: return "Daum·Kakao"
    if "bing" in host:        return "Bing 검색"
    if "instagram" in host:   return "인스타그램"
    if "facebook" in host or "fb." in host: return "페이스북"
    if "youtube" in host or "youtu.be" in host: return "유튜브"
    if "t.co" in host or "twitter" in host or "x.com" in host: return "X(트위터)"
    if "band.us" in host:     return "네이버 밴드"
    return host or "기타 외부"       # 그 외는 도메인 그대로 노출


@router.get("/admin/visitor-stats")
def visitor_stats(days: int = 30, x_admin_token: Optional[str] = Header(default=None)):
    """방문자 정확 집계 — visitor_logs 를 service-role 로 전수 집계.

    ⚠️ 기존 문제(2026-07-06 수정): 프론트 VisitorTab 이 브라우저 세션으로 직접 조회하며
       `.limit(1000)` 이 걸려 있어, 실제 방문이 1000건을 넘으면 총페이지뷰·순방문자·
       오늘방문·로그인방문이 전부 1000 부근에서 멈춰 '허수'처럼 보였다. 또 '오늘'을
       UTC 자정 기준으로 판정해 한국시간과 최대 9시간 어긋났다(00~09시 방문이 어제로 샘).
    → 처치: ① 총량은 count=exact 헤더로 '전 행 정확' 집계(조회 상한 무관)
            ② '오늘'은 KST(한국시간) 자정 경계로 정확 판정
            ③ 순방문자(세션)·회원 distinct 는 전 행을 받아 집계(상한 도달 시 truncated=true 로 정직히 표기)
    """
    _check_admin(x_admin_token)
    days = max(1, min(days, 365))

    # KST(한국시간, UTC+9) 기준 경계 — '오늘'은 한국 자정부터.
    KST = timezone(timedelta(hours=9))
    now_kst = datetime.now(KST)
    range_start_utc = (now_kst - timedelta(days=days)).astimezone(timezone.utc)
    today_start_utc = now_kst.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    range_gte = range_start_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    today_gte = today_start_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    # count=exact 로 '전 행 정확' 총량을 얻는다(행 본문은 limit=0 로 안 받음).
    def count_exact(gte: str):
        try:
            res = _sb_get("visitor_logs", {"select": "id", "limit": "0", "created_at": f"gte.{gte}"}, count=True)
            return _count_header(res) if res.status_code in (200, 206) else None
        except Exception:
            return None

    # 상세 집계용 행(경로·유입·최근·세션/회원 distinct). 상한 5만(초기 볼륨엔 사실상 전수).
    FETCH_CAP = 50000
    def fetch_rows():
        try:
            return _sb_get("visitor_logs", {
                "select": "session_id,user_id,page_path,referrer,created_at",
                "created_at": f"gte.{range_gte}",
                "order": "created_at.desc",
                "limit": str(FETCH_CAP),
            })
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=3) as pool:
        total_fut = pool.submit(count_exact, range_gte)
        today_fut = pool.submit(count_exact, today_gte)
        rows_fut = pool.submit(fetch_rows)
        total_pv, today_pv, rows_res = total_fut.result(), today_fut.result(), rows_fut.result()

    # ★ 가짜 0 금지: 업스트림 장애 시 빈 0 이 아니라 명시적 502 로 알려 프론트가 에러를 띄운다.
    if rows_res is None or rows_res.status_code not in (200, 206):
        raise HTTPException(status_code=502, detail="방문자 로그 조회 실패(업스트림)")
    rows = rows_res.json()
    truncated = len(rows) >= FETCH_CAP

    sessions: set[str] = set()
    members: set[str] = set()
    logged_in_pv = 0
    page_counts: dict[str, int] = {}
    ref_counts: dict[str, int] = {}
    for r in rows:
        sid = r.get("session_id")
        if sid:
            sessions.add(sid)
        uid = r.get("user_id")
        if uid:
            members.add(uid)
            logged_in_pv += 1
        p = r.get("page_path") or "(경로없음)"
        page_counts[p] = page_counts.get(p, 0) + 1
        ch = _classify_referrer(r.get("referrer"))
        ref_counts[ch] = ref_counts.get(ch, 0) + 1

    top_pages = sorted(
        [{"path": k, "count": v} for k, v in page_counts.items()], key=lambda x: -x["count"]
    )[:10]
    referrers = sorted(
        [{"channel": k, "count": v} for k, v in ref_counts.items()], key=lambda x: -x["count"]
    )
    recent = [{
        "created_at": r.get("created_at"),
        "page_path": r.get("page_path"),
        "channel": _classify_referrer(r.get("referrer")),
        "session_id": r.get("session_id"),
        "user_id": r.get("user_id"),
    } for r in rows[:50]]

    return {
        "range_days": days,
        "total_pageviews": total_pv if total_pv is not None else len(rows),  # 전 행 정확
        "unique_visitors": len(sessions),        # 순 방문자 = distinct 세션
        "today_pageviews": today_pv if today_pv is not None else 0,          # KST 오늘 정확
        "logged_in_pageviews": logged_in_pv,     # 회원 페이지뷰(방문 횟수)
        "logged_in_unique": len(members),        # 회원 순 인원(중복 제거)
        "top_pages": top_pages,
        "referrers": referrers,
        "recent": recent,
        "fetched": len(rows),
        "truncated": truncated,                  # true면 순방문자/회원수는 표시상한 기준(총량은 정확)
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


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


@router.get("/admin/target/insights")
def target_insights(x_admin_token: Optional[str] = Header(default=None)):
    """종합 타겟 인사이트 — 전 서비스 사용자 데이터 통합 분석"""
    _check_admin(x_admin_token)

    def fetch(path, params, count=False):
        try:
            return _sb_get(path, params, count=count)
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {
            "profiles": pool.submit(fetch, "profiles", {
                "select": "id,provider,created_at,marketing_sms,marketing_email,marketing_phone,onboarding_completed",
                "limit": "5000",
            }),
            "profiles_count": pool.submit(fetch, "profiles",
                                          {"select": "id", "limit": "0"}, True),
            "reports": pool.submit(fetch, "reports", {
                "select": "user_id,company_name,payload,created_at",
                "order": "created_at.desc", "limit": "5000",
            }),
            "inquiries": pool.submit(fetch, "inquiries", {
                "select": "category,status,created_at,updated_at,answer",
                "limit": "3000",
            }),
            "clicks": pool.submit(fetch, "click_counter", {"select": "*"}),
        }
        results = {k: v.result() for k, v in futures.items()}

    def _json(res):
        try:
            return res.json() if res and res.status_code == 200 else []
        except Exception:
            return []

    profiles = _json(results["profiles"])
    reports = _json(results["reports"])
    inquiries = _json(results["inquiries"])
    clicks_raw = _json(results["clicks"])
    total_users = (
        _count_header(results["profiles_count"])
        if results["profiles_count"] else len(profiles)
    )

    # ── Overview ──────────────────────────────────────────
    unique_reporters: set[str] = set()
    for r in reports:
        uid = r.get("user_id")
        if uid:
            unique_reporters.add(uid)
    active_users = len(unique_reporters)

    eligible_reports = [
        r for r in reports if (r.get("payload") or {}).get("eligible")
    ]
    total_severance = sum(
        (r.get("payload") or {}).get("severance", 0) for r in eligible_reports
    )
    avg_severance = (
        round(total_severance / len(eligible_reports)) if eligible_reports else 0
    )
    conversion_rate = round(active_users / max(total_users, 1) * 100, 1)
    eligible_rate = round(
        len(eligible_reports) / max(len(reports), 1) * 100, 1
    )
    marketing_count = sum(
        1 for p in profiles
        if p.get("marketing_sms") or p.get("marketing_email")
        or p.get("marketing_phone")
    )
    marketing_rate = round(marketing_count / max(total_users, 1) * 100, 1)
    onboarded = sum(1 for p in profiles if p.get("onboarding_completed"))
    onboarding_rate = round(onboarded / max(total_users, 1) * 100, 1)

    # ── Clicks ────────────────────────────────────────────
    click_total = click_sev = click_unemp = 0
    for row in clicks_raw:
        click_total += row.get("total", 0)
        click_sev += row.get("severance", 0)
        click_unemp += row.get("unemployment", 0)

    # ── Companies ─────────────────────────────────────────
    company_counts: dict[str, int] = {}
    for r in reports:
        name = r.get("company_name") or "기타"
        company_counts[name] = company_counts.get(name, 0) + 1
    total_report_cnt = max(sum(company_counts.values()), 1)
    companies_list = sorted(
        [{"name": k, "count": v, "pct": round(v / total_report_cnt * 100, 1)}
         for k, v in company_counts.items()],
        key=lambda x: -x["count"],
    )

    # ── Segments + Heatmap ────────────────────────────────
    dur_labels = ["3개월 미만", "3~6개월", "6개월~1년", "1년 이상"]
    wage_labels = ["5만원 미만", "5~8만원", "8~12만원", "12만원 이상"]
    dur_bins = {la: 0 for la in dur_labels}
    wage_bins = {la: 0 for la in wage_labels}
    heatmap = [[0] * 4 for _ in range(4)]

    for r in reports:
        p = r.get("payload") or {}
        wd = p.get("work_days") or 0
        aw = p.get("average_wage") or 0
        di = 0 if wd < 90 else (1 if wd < 180 else (2 if wd < 365 else 3))
        wi = 0 if aw < 50000 else (1 if aw < 80000 else (2 if aw < 120000 else 3))
        dur_bins[dur_labels[di]] += 1
        wage_bins[wage_labels[wi]] += 1
        heatmap[di][wi] += 1

    # ── Revenue ───────────────────────────────────────────
    rev_keys = [
        "100만원 미만", "100~300만원", "300~500만원",
        "500만~1000만원", "1000만원 이상",
    ]
    rev_bins: dict[str, dict] = {k: {"count": 0, "total": 0} for k in rev_keys}
    high_value = 0
    for r in eligible_reports:
        sev = (r.get("payload") or {}).get("severance", 0)
        idx = (
            0 if sev < 1_000_000
            else 1 if sev < 3_000_000
            else 2 if sev < 5_000_000
            else 3 if sev < 10_000_000
            else 4
        )
        rev_bins[rev_keys[idx]]["count"] += 1
        rev_bins[rev_keys[idx]]["total"] += sev
        if sev >= 3_000_000:
            high_value += 1

    # ── Demographics ──────────────────────────────────────
    provider_counts: dict[str, int] = {}
    monthly_signups: dict[str, int] = {}
    for p in profiles:
        prov = p.get("provider") or "unknown"
        provider_counts[prov] = provider_counts.get(prov, 0) + 1
        month = (p.get("created_at") or "")[:7]
        if month:
            monthly_signups[month] = monthly_signups.get(month, 0) + 1
    mkt_detail = {
        "sms": sum(1 for p in profiles if p.get("marketing_sms")),
        "email": sum(1 for p in profiles if p.get("marketing_email")),
        "phone": sum(1 for p in profiles if p.get("marketing_phone")),
        "none": sum(
            1 for p in profiles
            if not (p.get("marketing_sms") or p.get("marketing_email")
                    or p.get("marketing_phone"))
        ),
    }

    # ── Inquiry Intelligence ──────────────────────────────
    inq_cat: dict[str, int] = {}
    inq_stat: dict[str, int] = {}
    resp_times: list[float] = []
    for i in inquiries:
        cat = i.get("category") or "기타"
        inq_cat[cat] = inq_cat.get(cat, 0) + 1
        st = i.get("status") or "unknown"
        inq_stat[st] = inq_stat.get(st, 0) + 1
        if i.get("answer") and i.get("created_at") and i.get("updated_at"):
            try:
                c_dt = datetime.fromisoformat(
                    i["created_at"].replace("Z", "+00:00"))
                u_dt = datetime.fromisoformat(
                    i["updated_at"].replace("Z", "+00:00"))
                h = (u_dt - c_dt).total_seconds() / 3600
                if h > 0:
                    resp_times.append(h)
            except Exception:
                pass
    avg_resp = round(sum(resp_times) / len(resp_times), 1) if resp_times else 0

    # ── Computed Tags ─────────────────────────────────────
    user_map: dict[str, list] = {}
    for r in reports:
        uid = r.get("user_id")
        if uid:
            user_map.setdefault(uid, []).append(r)

    tags: dict[str, int] = {
        "퇴직금_적격자": 0, "고액_수급자": 0, "장기근속자": 0,
        "분쟁_위험군": 0, "다중_사업장": 0, "반복_이용자": 0,
    }
    for uid, urs in user_map.items():
        cos: set[str] = set()
        elig = hv = lt = disp = False
        for r in urs:
            pl = r.get("payload") or {}
            cos.add(r.get("company_name") or "")
            if pl.get("eligible"):
                elig = True
                if pl.get("severance", 0) >= 3_000_000:
                    hv = True
            if (pl.get("work_days") or 0) >= 365:
                lt = True
                if not pl.get("eligible"):
                    disp = True
        if elig:
            tags["퇴직금_적격자"] += 1
        if hv:
            tags["고액_수급자"] += 1
        if lt:
            tags["장기근속자"] += 1
        if disp:
            tags["분쟁_위험군"] += 1
        if len(cos) > 1:
            tags["다중_사업장"] += 1
        if len(urs) > 1:
            tags["반복_이용자"] += 1

    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    new_w = sum(1 for p in profiles if (p.get("created_at") or "") > week_ago)
    if new_w > 0:
        tags["신규_유저"] = new_w

    return {
        "overview": {
            "total_users": total_users,
            "active_users": active_users,
            "total_reports": len(reports),
            "total_inquiries": len(inquiries),
            "conversion_rate": conversion_rate,
            "eligible_rate": eligible_rate,
            "avg_severance": avg_severance,
            "total_severance": total_severance,
            "marketing_rate": marketing_rate,
            "onboarding_rate": onboarding_rate,
        },
        "funnel": {
            "visitors": click_total,
            "signups": total_users,
            "calculations": len(reports),
            "eligible": len(eligible_reports),
        },
        "companies": companies_list,
        "segments": {
            "by_duration": [{"label": k, "count": v} for k, v in dur_bins.items()],
            "by_wage": [{"label": k, "count": v} for k, v in wage_bins.items()],
            "heatmap": heatmap,
            "duration_labels": dur_labels,
            "wage_labels": wage_labels,
        },
        "revenue": {
            "total_eligible_severance": total_severance,
            "avg_severance": avg_severance,
            "high_value_count": high_value,
            "segments": [
                {"label": k, "count": v["count"], "total": v["total"]}
                for k, v in rev_bins.items()
            ],
        },
        "demographics": {
            "by_provider": sorted(
                [{"label": k, "count": v} for k, v in provider_counts.items()],
                key=lambda x: -x["count"],
            ),
            "marketing": mkt_detail,
            "onboarding_completed": onboarded,
            "onboarding_pending": total_users - onboarded,
        },
        "service_usage": {
            "total": click_total,
            "severance": click_sev,
            "unemployment": click_unemp,
        },
        "inquiry_analysis": {
            "by_category": sorted(
                [{"label": k, "count": v} for k, v in inq_cat.items()],
                key=lambda x: -x["count"],
            ),
            "by_status": [
                {"label": k, "count": v} for k, v in inq_stat.items()
            ],
            "avg_response_hours": avg_resp,
            "total": len(inquiries),
        },
        "tags": [{"tag": k, "count": v} for k, v in tags.items() if v > 0],
        "growth": [
            {"month": k, "count": v}
            for k, v in sorted(monthly_signups.items())
        ],
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
    # 검색 일원화(P4): 과거엔 "페이지 내 파이썬 substring" 이라 2페이지 이후 매칭을 놓쳤고,
    #   프론트는 별도로 supabase 직접 ilike(원형 주입)를 써 경로가 이원화돼 있었다.
    #   → 회원/지원자와 동일하게 서버측 sanitized ilike 로 통일(전 행 대상, 메타문자 제거).
    if search.strip():
        safe = _sanitize_ilike(search.strip())
        if safe:
            params["or"] = (
                f"(title.ilike.*{safe}*,content.ilike.*{safe}*,category.ilike.*{safe}*)"
            )

    res = _sb_get("inquiries", params, count=True)
    # 206 Partial Content도 정상 응답으로 처리 (PostgREST count=exact 시 발생 가능)
    rows  = res.json() if res.status_code in (200, 206) else []
    total = _count_header(res)
    if total == 0:
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
    _write_audit("admin", "inquiry.status", "inquiry", inquiry_id,
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
    now_iso = datetime.utcnow().isoformat()
    # answered_at: 답변 시각 기록 (문의 CSV "답변일시" 컬럼 채움 — 과거 프론트 동작 복원)
    res = _sb_patch("inquiries", {"id": f"eq.{inquiry_id}"},
                    {"answer": payload.answer, "status": "answered",
                     "answered_at": now_iso, "updated_at": now_iso})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="답변 등록 실패")
    _write_audit("admin", "inquiry.answer", "inquiry", inquiry_id,
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

    # 실패한 id를 모은다 (CPython list.append 는 GIL 하에서 스레드 안전)
    failed: list[str] = []

    def patch_one(id_):
        try:
            r = _sb_patch("inquiries", {"id": f"eq.{id_}"},
                          {"status": payload.status, "updated_at": now_iso})
            if r.status_code not in (200, 204):
                failed.append(id_)
        except Exception:
            failed.append(id_)

    with ThreadPoolExecutor(max_workers=min(len(payload.ids), 5)) as pool:
        list(pool.map(patch_one, payload.ids))

    _write_audit("admin", "inquiry.status", "inquiry",
                 ",".join(payload.ids[:5]),
                 after_val={"status": payload.status, "count": len(payload.ids),
                            "failed": len(failed)},
                 ip=request.client.host if request.client else None)
    # 부분 실패도 무음으로 삼키지 않고 실패 id를 반환 → 프론트가 사용자에게 표시
    return {"ok": len(failed) == 0,
            "updated": len(payload.ids) - len(failed),
            "failed_ids": failed}


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
    _write_audit("admin", "template.create", "template", None,
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
    _write_audit("admin", "template.delete", "template", template_id,
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
    res = _client.post(
        f"{SUPABASE_URL}/rest/v1/system_settings",
        headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
        json={"key": payload.key, "value": payload.value, "updated_at": datetime.utcnow().isoformat()},
        timeout=10,
    )
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="설정 저장 실패")
    # ⚠️ 과거엔 여기(및 감사기록 전반)에 x_admin_token(관리자 시크릿 원문)을 admin_email로
    #    기록해 감사로그 UI에 시크릿이 노출됐다(2026-07-04 전수조사 발견). 토큰은 공유값이라
    #    식별 정보도 아니므로 고정 문자열 "admin"으로 기록한다.
    _write_audit("admin", "settings.update", "settings", payload.key,
                 before_val={"value": old_val}, after_val={"value": payload.value},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# ── Legal Variables (법정 변수 — 계산기가 실제로 읽는 legal_variables 테이블 직접 관리) ──
# 배경(2026-07-04 어드민 연동 전수조사): 기존 어드민 "법정 변수 관리" 위젯은
# system_settings의 minimum_wage_* 키에 저장했지만, 4개 계산기(퇴직금/실업급여/주휴/연차)는
# legal_variables 테이블(key + effective_year)을 읽는다 → 어드민 편집이 사용자 계산에
# 전혀 반영되지 않는 "죽은 위젯"이었다. 이 엔드포인트로 실소비 테이블을 직접 관리한다.

@router.get("/admin/legal-variables")
def get_legal_variables(x_admin_token: Optional[str] = Header(default=None)):
    """법정 변수 전체 목록 (연도별) — 계산기 실소비 테이블"""
    _check_admin(x_admin_token)
    res = _sb_get("legal_variables", {
        "select": "id,key,value,effective_year,label,unit,notes,updated_at",
        "order": "key.asc,effective_year.desc",
    })
    if res.status_code != 200:
        # 가짜 빈 목록 금지 — 업스트림 장애는 명시적 502 (리뷰어 B 원칙과 동일)
        raise HTTPException(status_code=502, detail="법정 변수 조회 실패 (Supabase 응답 오류)")
    return {"variables": res.json()}


class LegalVarPayload(BaseModel):
    key: str                 # 예: min_hourly_wage
    effective_year: int      # 예: 2026
    value: float             # 새 값 (원 단위)
    admin_email: Optional[str] = None  # 감사기록 who (프론트 로그인 세션 이메일)


@router.patch("/admin/legal-variables")
def patch_legal_variable(
    payload: LegalVarPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    """법정 변수 값 수정 (key + effective_year 단위) — service-role이라 RLS 무관 실동작"""
    _check_admin(x_admin_token)
    params = {
        "key": f"eq.{payload.key}",
        "effective_year": f"eq.{payload.effective_year}",
    }
    # 변경 전 값 조회 (감사기록용 + 존재 검증)
    old_res = _sb_get("legal_variables", {"select": "value", **params})
    old_rows = old_res.json() if old_res.status_code == 200 else []
    if not old_rows:
        raise HTTPException(status_code=404, detail=f"{payload.effective_year}년 {payload.key} 항목이 없습니다")
    old_val = old_rows[0].get("value")

    # return=representation으로 실제 변경된 행을 돌려받아 0행 무음 성공을 차단
    res = _client.patch(
        f"{SUPABASE_URL}/rest/v1/legal_variables",
        headers={**_supabase_headers(), "Prefer": "return=representation"},
        params=params,
        json={
            # updated_by 컬럼은 uuid 타입(auth.users 참조)이라 이메일을 넣으면 400 —
            # "누가 바꿨는지"는 audit_logs(admin_email)가 담당하므로 여기선 값만 갱신한다.
            "value": payload.value,
            "updated_at": datetime.utcnow().isoformat(),
        },
        timeout=10,
    )
    rows = res.json() if res.status_code in (200, 201) else []
    if not rows:
        raise HTTPException(status_code=502, detail="법정 변수 저장 실패 (변경된 행 없음)")

    _write_audit(payload.admin_email or "admin", "legal_variable.update", "legal_variables",
                 f"{payload.key}:{payload.effective_year}",
                 before_val={"value": old_val}, after_val={"value": payload.value},
                 ip=request.client.host if request.client else None)
    return {"ok": True, "variable": rows[0]}


# ── 회원 관리 (서버측 마스킹 + 단건 평문 해제) ────────────
# 보안 재설계(🔴#4): 과거에는 프론트가 supabase.from('profiles').select('*')로
# 회원 PII(이름/이메일/전화/생년월일)를 평문으로 통째 수신한 뒤 화면에서만 가렸다
# (DevTools/Network로 무력화 가능 = 가짜 마스킹). 이제 서버가 마스킹된 형태만
# 내려보내고, 평문은 보안키 해시를 통과한 reveal 요청에만 "단건"으로 제공한다.

_UNMASK_KEY_NAME = "member_unmask_key"   # admin_secrets 테이블의 키 이름
_PBKDF2_ITER = 200_000                   # PBKDF2 반복 횟수 (해시 강도)


# ── PII 마스킹 (프론트 maskEmail 등과 동일 규칙, 서버측 수행) ──
def _mask_email(email: Optional[str]) -> str:
    if not email:
        return "이메일 미등록"
    at = email.find("@")
    if at <= 0:
        return "****"
    local, domain = email[:at], email[at:]
    visible = local[: min(2, len(local))]
    masked = "*" * max(3, len(local) - len(visible))
    return f"{visible}{masked}{domain}"


def _mask_name(name: Optional[str]) -> str:
    if not name:
        return "미등록"
    if len(name) <= 1:
        return name
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def _mask_birthdate(date: Optional[str]) -> str:
    if not date:
        return "미등록"
    parts = str(date).split("-")
    if len(parts) != 3:
        return "****-**-**"
    return f"{parts[0]}-**-**"


def _mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "미등록"
    parts = phone.split("-")
    if len(parts) != 3:
        return "***-****-****"
    return f"{parts[0]}-****-{parts[2]}"


# ── 보안키 해시 (PBKDF2-HMAC-SHA256, 외부 의존성 없음) ──
def _hash_key(raw: str) -> str:
    """원문 키 → 'pbkdf2_sha256$iter$salt$hash' 문자열. salt는 매번 랜덤."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, _PBKDF2_ITER)
    return (
        f"pbkdf2_sha256${_PBKDF2_ITER}$"
        f"{base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"
    )


def _verify_key(raw: str, stored: str) -> bool:
    """원문 키와 저장된 해시를 상수시간 비교. 형식이 깨졌으면 False."""
    try:
        algo, iter_s, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", raw.encode("utf-8"), salt, int(iter_s))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ── admin_secrets 테이블 접근 (service-role 전용, RLS deny-all) ──
def _get_secret_row(key: str) -> Optional[dict]:
    try:
        res = _sb_get("admin_secrets", {"select": "value_hash,updated_at", "key": f"eq.{key}"})
        if res.status_code in (200, 206):
            rows = res.json()
            return rows[0] if rows else None
    except Exception:
        return None
    return None


def _get_secret(key: str) -> Optional[str]:
    row = _get_secret_row(key)
    return row.get("value_hash") if row else None


def _set_secret(key: str, value_hash: str, who: str) -> bool:
    try:
        res = _client.post(
            f"{SUPABASE_URL}/rest/v1/admin_secrets",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={
                "key": key,
                "value_hash": value_hash,
                "algo": "pbkdf2_sha256",
                "updated_by": who,
                "updated_at": datetime.utcnow().isoformat(),
            },
            timeout=10,
        )
        return res.status_code in (200, 201, 204)
    except Exception:
        return False


def _sanitize_ilike(term: str) -> str:
    """PostgREST 메타문자 제거 — 와일드카드 오매칭/쿼리 깨짐 방지."""
    out = term
    for ch in ("*", ",", "(", ")", "%"):
        out = out.replace(ch, "")
    return out


@router.get("/admin/members")
def list_members(
    page: int = 1,
    limit: int = 20,
    search: str = "",
    marketing: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    """회원 목록 — 서버에서 PII를 마스킹해 반환. 평문은 절대 포함하지 않는다.
    검색/마케팅 필터/페이지네이션은 서버측에서 '원본 컬럼' 기준으로 수행하므로
    검색이 평문 노출 우회로가 되지 않는다."""
    _check_admin(x_admin_token)
    params: dict = {
        "select": "*",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str((page - 1) * limit),
    }
    if search.strip():
        safe = _sanitize_ilike(search.strip())
        if safe:
            params["email"] = f"ilike.*{safe}*"
    if marketing == "true":
        params["or"] = "(marketing_sms.eq.true,marketing_email.eq.true,marketing_phone.eq.true)"
    elif marketing == "false":
        params["marketing_sms"] = "eq.false"
        params["marketing_email"] = "eq.false"
        params["marketing_phone"] = "eq.false"

    res = _sb_get("profiles", params, count=True)
    rows = res.json() if res.status_code in (200, 206) else []
    total = _count_header(res)
    if total == 0:
        total = len(rows)

    members = [
        {
            # 내부 UUID — reveal 타깃팅에 필요. 이름·이메일·전화 같은 직접 식별 PII가
            # 아니며(기존에도 노출되던 DB 키), 표시할 때는 프론트에서 마스킹한다.
            "id": r.get("id"),
            "email": _mask_email(r.get("email")),
            "full_name": _mask_name(r.get("full_name")),
            "birthdate": _mask_birthdate(r.get("birthdate")),
            "phone_number": _mask_phone(r.get("phone_number")),
            "provider": r.get("provider"),
            "created_at": r.get("created_at"),
            "marketing_sms": bool(r.get("marketing_sms")),
            "marketing_email": bool(r.get("marketing_email")),
            "marketing_phone": bool(r.get("marketing_phone")),
            "onboarding_completed": bool(r.get("onboarding_completed")),
        }
        for r in rows
    ]
    return {"members": members, "total": total}


class RevealPayload(BaseModel):
    member_id: str
    key: str
    admin_email: Optional[str] = None


@router.post("/admin/members/reveal")
def reveal_member(
    payload: RevealPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    """단건 평문 해제 — 보안키 해시 검증 통과 시에만 1명의 원본 PII를 반환하고
    누가/언제/어느 회원을 해제했는지 서버측 감사로그(audit_logs)에 기록한다.
    대량 평문 일괄 반환은 제공하지 않는다(행마다 별도 reveal 호출)."""
    _check_admin(x_admin_token)
    ip = request.client.host if request.client else None
    who = payload.admin_email or "admin"

    stored = _get_secret(_UNMASK_KEY_NAME)
    if not stored:
        raise HTTPException(
            status_code=400,
            detail="보안키가 설정되지 않았습니다. Settings → 개인정보 보안키에서 먼저 설정하세요.",
        )
    if not _verify_key(payload.key, stored):
        # 실패한 해제 시도도 감사로그에 남긴다 (무단 접근 탐지)
        _write_audit(who, "member.unmask.denied", "profiles", payload.member_id,
                     after_val={"reason": "bad_key"}, ip=ip)
        raise HTTPException(status_code=403, detail="보안키가 일치하지 않습니다.")

    res = _sb_get("profiles", {
        "select": "id,email,full_name,birthdate,phone_number,display_name",
        "id": f"eq.{payload.member_id}",
    })
    rows = res.json() if res.status_code in (200, 206) else []
    if not rows:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    m = rows[0]
    _write_audit(who, "member.unmask", "profiles", payload.member_id,
                 after_val={"fields": ["email", "full_name", "birthdate", "phone_number"]},
                 ip=ip)
    return {
        "id": m.get("id"),
        "email": m.get("email"),
        "full_name": m.get("full_name"),
        "birthdate": m.get("birthdate"),
        "phone_number": m.get("phone_number"),
        "display_name": m.get("display_name"),
    }


class UnmaskKeyPayload(BaseModel):
    key: str
    admin_email: Optional[str] = None


@router.post("/admin/members/unmask-key")
def set_unmask_key(
    payload: UnmaskKeyPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    """보안키 설정/변경 — 원문은 저장하지 않고 PBKDF2 해시만 admin_secrets에 저장.
    해시는 공개 읽기가 막힌 테이블에 들어가 클라이언트로 절대 내려가지 않는다."""
    _check_admin(x_admin_token)
    if not payload.key.strip():
        raise HTTPException(status_code=400, detail="보안키를 입력하세요.")
    who = payload.admin_email or "admin"
    if not _set_secret(_UNMASK_KEY_NAME, _hash_key(payload.key.strip()), who):
        raise HTTPException(status_code=500, detail="보안키 저장 실패")
    _write_audit(who, "member.unmask_key.set", "admin_secrets", _UNMASK_KEY_NAME,
                 ip=request.client.host if request.client else None)
    return {"ok": True}


@router.get("/admin/members/unmask-key/status")
def unmask_key_status(x_admin_token: Optional[str] = Header(default=None)):
    """보안키 설정 여부만 반환 — 해시 값 자체는 절대 반환하지 않는다."""
    _check_admin(x_admin_token)
    row = _get_secret_row(_UNMASK_KEY_NAME)
    return {"configured": bool(row), "updated_at": (row or {}).get("updated_at")}


# ── 프로필 마스킹 조회 (방문자/지원자 화면의 회원명·이메일 표시용) ──────────
# 보안(🟡 V5): 과거 방문자탭은 프론트가 supabase.from('profiles').select('id,full_name,email')
# 로 평문 PII 를 받아와 화면에서만 보여줬다(Network 탭 평문 노출). 이제 user_id 목록을
# 보내면 서버가 "마스킹된 이름/이메일만" 돌려준다(평문은 절대 내려가지 않음).
# 평문이 필요하면 회원관리(MembersMenu)의 보안키 reveal 경로를 사용한다.

class ProfileLookupPayload(BaseModel):
    ids: list[str]


@router.post("/admin/profiles/masked-lookup")
def masked_profile_lookup(
    payload: ProfileLookupPayload,
    x_admin_token: Optional[str] = Header(default=None),
):
    """user_id 목록 → {id: {id, full_name(마스킹), email(마스킹)}} 매핑 반환.
    평문 PII 는 포함하지 않는다. id 는 UUID 이므로 PostgREST in.() 에 안전하게 들어간다."""
    _check_admin(x_admin_token)
    # UUID 형식만 통과 — 콤마/와일드카드 등 메타문자 주입 차단(쿼리 안전)
    safe_ids = [
        i for i in (payload.ids or [])
        if isinstance(i, str) and i and all(c in "0123456789abcdefABCDEF-" for c in i)
    ][:1000]  # 과도한 목록 방지(상한)
    if not safe_ids:
        return {"profiles": {}}

    res = _sb_get("profiles", {
        "select": "id,full_name,email",
        "id": f"in.({','.join(safe_ids)})",
    })
    rows = res.json() if res.status_code in (200, 206) else []
    profiles = {
        r["id"]: {
            "id": r["id"],
            "full_name": _mask_name(r.get("full_name")),
            "email": _mask_email(r.get("email")),
        }
        for r in rows if r.get("id")
    }
    return {"profiles": profiles}


# ── 지원자 관리 (서버측 마스킹 + 단건 평문 해제) ────────────
# 보안 재설계(🔴 지원자 PII): 과거 ApplicantsMenu 는 프론트가
#   supabase.from('job_applications').select('*') + profiles 를 직접 조회해
#   지원자 인적사항(이름/생년월일/전화) + 회원명/이메일을 평문 통째로 받아온 뒤
#   화면에서만 일부(전화)를 가렸다(DevTools/Network 평문 노출 = 가짜 마스킹).
#   이제 서버가 "마스킹된 형태만" 내려보내고, 평문은 회원관리와 '동일한 보안키'
#   (admin_secrets.member_unmask_key)를 통과한 reveal 요청에만 '단건'으로 제공한다.
#   상태변경/확정/알림 로직은 프론트(supabase)에 그대로 두고, PII 표시 경로만 바꾼다.

# 지원자 목록을 한 번에 너무 많이 끌어오지 않도록 상한(메모리/응답 보호)
_APPLICANTS_MAX = 1000


@router.get("/admin/applications")
def list_applications(
    status: str = "",
    company: str = "",
    job_posting_id: str = "",
    shift: str = "",
    task: str = "",
    name: str = "",
    phone: str = "",
    x_admin_token: Optional[str] = Header(default=None),
):
    """지원자 목록 — 서버에서 PII를 마스킹해 반환. 평문은 절대 포함하지 않는다.
    이름/전화 검색도 서버측에서 '원본 컬럼' 기준으로 수행하므로(applicant_name/phone),
    검색이 평문 노출 우회로가 되지 않는다(매칭된 결과도 마스킹되어 내려간다)."""
    _check_admin(x_admin_token)

    params: dict = {
        # job_postings 임베드(회사/센터명) — 프론트 기존 쿼리와 동일한 관계 사용
        "select": "id,user_id,job_posting_id,status,applied_at,work_date,"
                  "applicant_name,applicant_birth,applicant_gender,applicant_phone,"
                  "consent_collect,consent_third_party,preferred_shift,applied_task,"
                  "job_postings(company_name,center_name)",
        "order": "applied_at.desc",
        "limit": str(_APPLICANTS_MAX),
    }

    if status.strip() and status.strip() != "all":
        params["status"] = f"eq.{status.strip()}"

    # 사업장(회사) 필터 — 회사명으로 공고 id 목록을 먼저 구해 in.() 으로 좁힌다.
    if company.strip() and company.strip() != "all":
        jp = _sb_get("job_postings", {"select": "id", "company_name": f"eq.{company.strip()}"})
        job_ids = [r["id"] for r in (jp.json() if jp.status_code in (200, 206) else []) if r.get("id")]
        if not job_ids:
            return {"applications": [], "total": 0}  # 해당 회사 공고 없음 → 빈 목록
        params["job_posting_id"] = f"in.({','.join(job_ids)})"

    # 특정 공고 필터(회사 필터보다 구체적 — 단건이면 덮어쓴다)
    if job_posting_id.strip():
        params["job_posting_id"] = f"eq.{job_posting_id.strip()}"

    # 교대/업무 — 비(非)PII 텍스트 부분검색
    if shift.strip():
        safe = _sanitize_ilike(shift.strip())
        if safe:
            params["preferred_shift"] = f"ilike.*{safe}*"
    if task.strip():
        safe = _sanitize_ilike(task.strip())
        if safe:
            params["applied_task"] = f"ilike.*{safe}*"
    # 이름/전화 — PII. 원본 컬럼으로 서버측 검색(결과는 마스킹되어 반환)
    if name.strip():
        safe = _sanitize_ilike(name.strip())
        if safe:
            params["applicant_name"] = f"ilike.*{safe}*"
    if phone.strip():
        safe = _sanitize_ilike(phone.strip())
        if safe:
            params["applicant_phone"] = f"ilike.*{safe}*"

    res = _sb_get("job_applications", params, count=True)
    rows = res.json() if res.status_code in (200, 206) else []
    total = _count_header(res) or len(rows)

    # 회원 프로필(이름/이메일)도 마스킹해서 붙인다 — 평문은 서버를 떠나지 않는다.
    user_ids = list({r.get("user_id") for r in rows if r.get("user_id")})
    profile_map: dict = {}
    if user_ids:
        # UUID 형식만 통과(쿼리 안전) — masked-lookup 과 동일 규칙
        safe_ids = [
            i for i in user_ids
            if isinstance(i, str) and all(c in "0123456789abcdefABCDEF-" for c in i)
        ][:_APPLICANTS_MAX]
        if safe_ids:
            pr = _sb_get("profiles", {
                "select": "id,full_name,email",
                "id": f"in.({','.join(safe_ids)})",
            })
            for p in (pr.json() if pr.status_code in (200, 206) else []):
                if p.get("id"):
                    profile_map[p["id"]] = {
                        "full_name": _mask_name(p.get("full_name")) if p.get("full_name") else None,
                        "email": _mask_email(p.get("email")) if p.get("email") else None,
                    }

    applications = [
        {
            "id": r.get("id"),               # 지원 id — reveal 타깃팅용
            "user_id": r.get("user_id"),     # 알림 발송 등 기능용 내부 키(직접 식별 PII 아님)
            "job_posting_id": r.get("job_posting_id"),
            "status": r.get("status"),
            "applied_at": r.get("applied_at"),
            "work_date": r.get("work_date"),
            "applicant_gender": r.get("applicant_gender"),
            "preferred_shift": r.get("preferred_shift"),
            "applied_task": r.get("applied_task"),
            "consent_collect": bool(r.get("consent_collect")),
            "consent_third_party": bool(r.get("consent_third_party")),
            # 인적사항 입력 여부 — 프론트의 '미입력' 표시 판단용(평문 노출 아님)
            "has_applicant_info": bool(r.get("applicant_name")),
            # 마스킹된 인적사항 — 값이 없으면 null(프론트가 '미입력'으로 처리)
            "applicant_name": _mask_name(r.get("applicant_name")) if r.get("applicant_name") else None,
            "applicant_birth": _mask_birthdate(r.get("applicant_birth")) if r.get("applicant_birth") else None,
            "applicant_phone": _mask_phone(r.get("applicant_phone")) if r.get("applicant_phone") else None,
            # 마스킹된 회원 프로필(없으면 null)
            "profiles": profile_map.get(r.get("user_id")),
            "job_postings": r.get("job_postings"),
        }
        for r in rows
    ]
    return {"applications": applications, "total": total}


class ApplicantRevealPayload(BaseModel):
    application_id: str
    key: str
    admin_email: Optional[str] = None


@router.post("/admin/applications/reveal")
def reveal_applicant(
    payload: ApplicantRevealPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    """단건 평문 해제 — 회원관리와 '동일한 보안키'(member_unmask_key) 해시 검증 통과 시에만
    지원 1건의 원본 인적사항 + 회원 이름/이메일을 반환하고, 누가/언제/어느 지원을 해제했는지
    서버측 감사로그(audit_logs)에 기록한다. 대량 평문 일괄 반환은 제공하지 않는다."""
    _check_admin(x_admin_token)
    ip = request.client.host if request.client else None
    who = payload.admin_email or "admin"

    stored = _get_secret(_UNMASK_KEY_NAME)
    if not stored:
        raise HTTPException(
            status_code=400,
            detail="보안키가 설정되지 않았습니다. Settings → 개인정보 보안키에서 먼저 설정하세요.",
        )
    if not _verify_key(payload.key, stored):
        _write_audit(who, "applicant.unmask.denied", "job_applications", payload.application_id,
                     after_val={"reason": "bad_key"}, ip=ip)
        raise HTTPException(status_code=403, detail="보안키가 일치하지 않습니다.")

    res = _sb_get("job_applications", {
        "select": "id,user_id,applicant_name,applicant_birth,applicant_gender,applicant_phone",
        "id": f"eq.{payload.application_id}",
    })
    rows = res.json() if res.status_code in (200, 206) else []
    if not rows:
        raise HTTPException(status_code=404, detail="지원 내역을 찾을 수 없습니다.")
    a = rows[0]

    # 연결된 회원 프로필 평문(이름/이메일)도 함께 해제(같은 지원자 화면에 표시되던 값)
    prof = {"full_name": None, "email": None}
    if a.get("user_id"):
        pr = _sb_get("profiles", {"select": "full_name,email", "id": f"eq.{a['user_id']}"})
        prows = pr.json() if pr.status_code in (200, 206) else []
        if prows:
            prof = {"full_name": prows[0].get("full_name"), "email": prows[0].get("email")}

    _write_audit(who, "applicant.unmask", "job_applications", payload.application_id,
                 after_val={"fields": ["applicant_name", "applicant_birth", "applicant_phone",
                                       "profile_name", "profile_email"]},
                 ip=ip)
    return {
        "id": a.get("id"),
        "applicant_name": a.get("applicant_name"),
        "applicant_birth": a.get("applicant_birth"),
        "applicant_gender": a.get("applicant_gender"),
        "applicant_phone": a.get("applicant_phone"),
        "profile_name": prof.get("full_name"),
        "profile_email": prof.get("email"),
    }


# ── 지원자 상태 변경 (단건/일괄) ────────────────────────────
# 배경: ApplicantsMenu 가 job_applications 를 브라우저 세션으로 직접 update 했는데,
#   관리자 UPDATE RLS 정책이 깨져 있으면(20260629 fix 미적용 등) 0행 변경으로
#   기능 자체가 동작하지 않았다. service-role 로 통일해 RLS 상태와 무관하게
#   항상 반영되고, 확정/거절 알림(notifications)도 서버에서 함께 발송한다.

_APP_STATUSES = {"applied", "reviewing", "confirmed", "completed", "cancelled", "rejected"}


class ApplicationStatusPayload(BaseModel):
    status: str
    work_date: Optional[str] = None      # 출근 확정 시 예정일(YYYY-MM-DD)
    admin_email: Optional[str] = None    # 감사 기록용


class ApplicationBulkStatusPayload(BaseModel):
    ids: list[str]
    status: str
    admin_email: Optional[str] = None


def _is_uuid_like(v: str) -> bool:
    """쿼리 주입 방지 — UUID 문자셋만 통과"""
    return isinstance(v, str) and 0 < len(v) <= 40 and all(
        c in "0123456789abcdefABCDEF-" for c in v
    )


def _notify_applicants(rows: list[dict], status: str, work_date: Optional[str]) -> None:
    """확정/거절 시 지원자 알림 일괄 발송 — 실패해도 상태변경은 롤백하지 않는다."""
    if status not in ("confirmed", "rejected"):
        return
    notifications = []
    for r in rows:
        if not r.get("user_id"):
            continue
        notifications.append({
            "user_id": r["user_id"],
            "type": "application_confirmed" if status == "confirmed" else "application_rejected",
            "title": "출근이 확정됐어요! 🎉" if status == "confirmed" else "지원이 거절됐습니다",
            "body": (
                f"출근 예정일: {work_date or r.get('work_date') or '미정'} — 준비물을 챙기고 건강하게 출근하세요!"
                if status == "confirmed"
                else "아쉽지만 이번 공고는 어렵게 됐습니다. 다른 공고를 확인해보세요."
            ),
            "metadata": {"application_id": r.get("id"), "job_posting_id": r.get("job_posting_id")},
        })
    if not notifications:
        return
    try:
        res = _sb_post("notifications", notifications)  # PostgREST 는 배열로 일괄 insert 지원
        if res.status_code not in (200, 201, 204):
            _audit_logger.warning("지원자 알림 발송 실패 status=%s body=%s", res.status_code, res.text[:200])
    except Exception as e:
        _audit_logger.warning("지원자 알림 발송 예외 err=%s", e)


@router.patch("/admin/applications/{application_id}/status")
def update_application_status(
    application_id: str,
    payload: ApplicationStatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    if payload.status not in _APP_STATUSES:
        raise HTTPException(status_code=422, detail=f"허용되지 않는 상태값: {payload.status}")
    if not _is_uuid_like(application_id):
        raise HTTPException(status_code=422, detail="잘못된 지원 id 형식입니다.")

    body: dict = {"status": payload.status}
    if payload.status == "confirmed" and payload.work_date:
        body["work_date"] = payload.work_date

    res = _sb_patch("job_applications", {"id": f"eq.{application_id}"}, body)
    rows = res.json() if res.status_code in (200, 201, 206) else []
    if not rows:
        # 0행 = 해당 id 없음(또는 이미 삭제) — 프론트가 명확한 에러를 표시하도록 404
        raise HTTPException(status_code=404, detail="변경된 행이 없습니다 — 지원 내역을 확인하세요.")

    _notify_applicants(rows, payload.status, payload.work_date)
    _write_audit(payload.admin_email or "unknown", "application.status",
                 "job_applications", application_id,
                 after_val={"status": payload.status, "work_date": payload.work_date},
                 ip=request.client.host if request.client else None)
    return {"ok": True, "updated": len(rows)}


@router.post("/admin/applications/bulk-status")
def bulk_application_status(
    payload: ApplicationBulkStatusPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    if payload.status not in _APP_STATUSES:
        raise HTTPException(status_code=422, detail=f"허용되지 않는 상태값: {payload.status}")
    ids = [i for i in payload.ids if _is_uuid_like(i)][:500]  # 과도 요청 방지
    if not ids:
        raise HTTPException(status_code=422, detail="유효한 지원 id가 없습니다.")

    res = _sb_patch("job_applications", {"id": f"in.({','.join(ids)})"}, {"status": payload.status})
    rows = res.json() if res.status_code in (200, 201, 206) else []
    updated_ids = [r.get("id") for r in rows if r.get("id")]
    failed_ids = [i for i in ids if i not in set(updated_ids)]

    _notify_applicants(rows, payload.status, None)
    _write_audit(payload.admin_email or "unknown", "application.bulk_status",
                 "job_applications", None,
                 after_val={"status": payload.status, "requested": len(ids),
                            "updated": len(updated_ids), "failed": len(failed_ids)},
                 ip=request.client.host if request.client else None)
    return {"ok": True, "updated": len(updated_ids),
            "updated_ids": updated_ids, "failed_ids": failed_ids}


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
    _write_audit("admin", "ip.block", "ip", payload.ip_address,
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
    _write_audit("admin", "ip.unblock", "ip", ip_addr,
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# ── 감사 로그 ─────────────────────────────────────────────

@router.get("/admin/logs")
def list_audit_logs(
    page: int = 1,
    limit: int = 50,
    action: str = "",
    email: str = "",
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
    # 관리자 이메일 부분 검색 (AuditMenu email 필터 지원)
    # PostgREST 메타문자(* , ( ) %)를 제거해 와일드카드 오매칭/쿼리 깨짐 방지
    if email:
        safe_email = email
        for ch in ("*", ",", "(", ")", "%"):
            safe_email = safe_email.replace(ch, "")
        if safe_email:
            params["admin_email"] = f"ilike.*{safe_email}*"
    # created_at 범위 — start/end 둘 다 서버사이드 필터로 적용.
    # httpx 는 리스트 값을 같은 키의 반복 쿼리(created_at=gte.X&created_at=lte.Y)로
    # 인코딩하고, PostgREST 는 같은 컬럼의 다중 필터를 AND 로 결합한다.
    # → 과거 end in-memory 처리로 인한 total(=현재 페이지 길이) 왜곡을 제거.
    ca: list[str] = []
    if start:
        ca.append(f"gte.{start}T00:00:00Z")
    if end:
        ca.append(f"lte.{end}T23:59:59Z")
    if len(ca) == 1:
        params["created_at"] = ca[0]
    elif len(ca) == 2:
        params["created_at"] = ca  # 리스트 → 반복 쿼리 → AND

    res = _sb_get("audit_logs", params, count=True)
    rows  = res.json() if res.status_code in (200, 206) else []
    total = _count_header(res)

    return {"logs": rows, "total": total}


# ── Notices CMS (P4 백엔드 경로 이관) ─────────────────────
#   과거: NoticesMenu 가 supabase 직접 CRUD(RLS is_admin 의존) → 미등록/비-admin 세션은
#         쓰기 0행(RLS USING 이 행을 숨겨 "거짓 성공"). 조회도 anon RLS 라 비활성 공지 누락 가능.
#   현재: 지원자/문의/템플릿과 동일하게 X-Admin-Token 게이트 + service-role 로 통일.
#         RLS 와 무관하게 항상 반영되고, 실패는 HTTP 에러로 프론트에 표시된다.

@router.get("/admin/notices")
def list_notices(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    # 우선순위 내림차순 — 비활성 공지도 포함(관리 화면은 전량 노출)
    res = _sb_get("notices", {"select": "*", "order": "priority.desc"})
    rows = res.json() if res.status_code in (200, 206) else []
    return {"notices": rows}


class NoticeCreatePayload(BaseModel):
    title: str
    content: str
    priority: int = 0
    is_active: bool = True


class NoticeUpdatePayload(BaseModel):
    # 부분 수정 허용 — 전달된 필드만 반영(토글은 is_active 만 보냄)
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


@router.post("/admin/notices")
def create_notice(
    payload: NoticeCreatePayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_post("notices", {
        "title": payload.title.strip(),
        "content": payload.content.strip(),
        "priority": payload.priority,
        "is_active": payload.is_active,
    })
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=res.status_code, detail="공지 추가 실패")
    created = (res.json() or [{}])[0]
    _write_audit("admin", "notice.create", "notice", created.get("id"),
                 after_val={"title": payload.title, "priority": payload.priority,
                            "is_active": payload.is_active},
                 ip=request.client.host if request.client else None)
    return {"ok": True, "notice": created}


@router.patch("/admin/notices/{notice_id}")
def update_notice(
    notice_id: str,
    payload: NoticeUpdatePayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    # 전달된 필드만 부분 반영 + updated_at 갱신
    patch: dict = {"updated_at": datetime.utcnow().isoformat()}
    if payload.title is not None:     patch["title"] = payload.title.strip()
    if payload.content is not None:   patch["content"] = payload.content.strip()
    if payload.priority is not None:  patch["priority"] = payload.priority
    if payload.is_active is not None: patch["is_active"] = payload.is_active

    res = _sb_patch("notices", {"id": f"eq.{notice_id}"}, patch)
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="공지 수정 실패")
    # service-role 라 RLS 무관하게 반영되지만, 존재하지 않는 id 는 0행 → 명시적 실패
    updated = res.json() if res.status_code == 200 else []
    if not updated:
        raise HTTPException(status_code=404, detail="대상 공지를 찾을 수 없습니다.")
    _write_audit("admin", "notice.update", "notice", notice_id,
                 after_val={k: v for k, v in patch.items() if k != "updated_at"},
                 ip=request.client.host if request.client else None)
    return {"ok": True, "notice": updated[0]}


@router.delete("/admin/notices/{notice_id}")
def delete_notice(
    notice_id: str,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    res = _sb_delete("notices", {"id": f"eq.{notice_id}"})
    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="공지 삭제 실패")
    deleted = res.json() if res.status_code == 200 else []
    if not deleted:
        raise HTTPException(status_code=404, detail="대상 공지를 찾을 수 없습니다.")
    _write_audit("admin", "notice.delete", "notice", notice_id,
                 before_val={"title": (deleted[0] or {}).get("title")},
                 ip=request.client.host if request.client else None)
    return {"ok": True}


# 클라이언트(프론트)에서 발생하는 행동(접속/조회/공지·계정 CRUD 등)을 감사로그에 기록.
# 과거에는 프론트가 audit_logs 에 supabase 직접 INSERT(RLS is_admin 의존) 하여
# 미등록 관리자 행동이 누락될 수 있었다. 백엔드 service-role 로 기록하면
# RLS 와 무관하게 항상 남고, IP 도 서버에서 캡처한다.
class ClientAuditPayload(BaseModel):
    admin_email: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    # dict 뿐 아니라 배열/원시값도 허용 (강제 캐스팅 호출부의 422 무음 누락 방지).
    # _write_audit 는 어떤 JSON 값이든 직렬화하므로 안전.
    after_val: Optional[Any] = None
    before_val: Optional[Any] = None


@router.post("/admin/audit-log")
def write_client_audit(
    payload: ClientAuditPayload,
    request: Request,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    _write_audit(
        payload.admin_email, payload.action, payload.target_type, payload.target_id,
        before_val=payload.before_val, after_val=payload.after_val,
        ip=request.client.host if request.client else None,
    )
    return {"ok": True}
