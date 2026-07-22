# -*- coding: utf-8 -*-
"""FastAPI 메인 애플리케이션 — React 빌드 정적 파일 서빙 포함"""
import os
import time
from pathlib import Path

from dotenv import load_dotenv

# backend/.env 로드 (프로젝트 루트에서 uvicorn 실행 시에도 동작)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from .api import common, severance, unemployment, notify, admin, weekly_allowance, annual_leave

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── IP 차단 캐시 (60초 갱신) ──────────────────────────────
_blocked_ip_cache: set[str] = set()
_cache_updated_at: float = 0.0


async def _refresh_blocked_ips() -> None:
    """Supabase blocked_ips 테이블에서 차단 IP 목록을 가져와 메모리 캐시를 갱신합니다."""
    global _blocked_ip_cache, _cache_updated_at
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    try:
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        }
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get(
                f"{SUPABASE_URL}/rest/v1/blocked_ips",
                headers=headers,
                params={"select": "ip_address,expires_at"},
            )
        if res.status_code == 200:
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%S")
            _blocked_ip_cache = {
                r["ip_address"]
                for r in res.json()
                if not r.get("expires_at") or r["expires_at"] > now_iso
            }
    except Exception:
        pass
    finally:
        _cache_updated_at = time.time()


app = FastAPI(
    title="퇴직금 한번에 API",
    description="일용직 퇴직금·실업급여 계산 API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # ── CORS 허용 도메인 명시 (보안 필수) ────────────────────────────────────
    # allow_origins=["*"]와 allow_credentials=True를 동시에 사용하면
    # 브라우저가 보안 정책(CORS)을 위반으로 판단해 요청을 거부할 수 있습니다.
    # 따라서 실제 서비스 도메인과 개발 서버 주소를 명시적으로 지정해야 합니다.
    allow_origins=[
        "https://coucatch.com",                       # 정식 도메인(정규/apex)
        "https://www.coucatch.com",                   # www 서브도메인(apex 로 리다이렉트되나 병행 허용)
        "https://catch-daily-worker.vercel.app",      # (구) Vercel 프로덕션 배포 도메인 — 전환기 병행 유지
        "https://coupang-severance-app.vercel.app",   # 같은 배포의 별칭 도메인(2026-07-06 CORS 차단 사고 원인)
        "http://localhost:5173",                      # Vite 개발 서버 기본 포트
        "http://localhost:3000",                      # 대안 개발 서버 포트
    ],
    # ⚠️ 2026-07-06 어드민 "백엔드 연결 실패" 근본원인: 허용목록에 catch-daily-worker 만 있어
    #    같은 앱의 별칭 도메인 coupang-severance-app.vercel.app 에서 접속 시 브라우저가 CORS 로
    #    차단(프리플라이트 400, allow-origin 헤더 없음) → 프론트는 "연결 실패"로 표시.
    #    재발 방지: 정식 도메인(coucatch.com·www)과 두 Vercel 프로젝트(별칭·프리뷰 배포 포함)를 정규식으로도 허용한다.
    #    (allow_origin_regex 는 allow_credentials=True 와 함께 사용 가능 — "*" 와 달리 안전)
    allow_origin_regex=r"^https://(www\.)?coucatch\.com$|^https://(catch-daily-worker|coupang-severance-app)[a-z0-9-]*\.vercel\.app$",
    allow_credentials=True,   # 쿠키/인증 헤더 전달 허용 (Supabase 세션 쿠키에 필요)
    allow_methods=["*"],      # GET, POST, PATCH, DELETE 등 모든 HTTP 메서드 허용
    allow_headers=["*"],      # Authorization, Content-Type 등 모든 헤더 허용
)


@app.middleware("http")
async def block_ips_middleware(request: Request, call_next):
    """차단된 IP의 요청을 403으로 거부합니다. 캐시는 60초마다 갱신됩니다."""
    global _cache_updated_at
    if time.time() - _cache_updated_at > 60:
        await _refresh_blocked_ips()
    if request.client and request.client.host in _blocked_ip_cache:
        return JSONResponse({"detail": "접근이 차단되었습니다."}, status_code=403)
    return await call_next(request)

app.include_router(common.router,            prefix="/api",                  tags=["공통"])
app.include_router(severance.router,         prefix="/api/severance",        tags=["퇴직금"])
app.include_router(unemployment.router,      prefix="/api/unemployment",     tags=["실업급여"])
app.include_router(weekly_allowance.router,  prefix="/api/weekly-allowance", tags=["주휴수당"])
app.include_router(annual_leave.router,      prefix="/api/annual-leave",     tags=["연차수당"])
app.include_router(notify.router,            prefix="/api",                  tags=["알림"])
app.include_router(admin.router,             prefix="/api",                  tags=["관리자"])


# ── 헬스체크 엔드포인트 (Render 콜드스타트 대응) ──────────────────────────
# Render 무료 티어는 15분 이상 트래픽이 없으면 서버가 잠들어 최초 요청에
# 30~50초의 '콜드스타트' 지연이 발생합니다.
# 프론트엔드 앱 시작 시 이 엔드포인트로 미리 ping을 날려 서버를 깨워 둡니다.
# 또한 외부 모니터링 도구(UptimeRobot 등)에서도 이 경로로 헬스체크를 수행할 수 있습니다.
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "CATCH API"}


# 루트: API 안내 + /docs 로 이동 링크 (404 대신)
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    return """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>퇴직금 한번에 API</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem;">
  <h1>퇴직금 한번에 API</h1>
  <p>일용직 퇴직금·실업급여 계산 API가 동작 중입니다.</p>
  <p><a href="/docs">API 문서 (Swagger)</a> · <a href="/redoc">ReDoc</a></p>
  <p><a href="/openapi.json">openapi.json</a></p>
</body></html>"""


# API 문서 경로 — catch-all보다 먼저 등록해 항상 문서가 응답되도록
@app.get("/docs", response_class=HTMLResponse, include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(openapi_url="/openapi.json", title=f"{app.title} - API 문서")


@app.get("/redoc", response_class=HTMLResponse, include_in_schema=False)
async def redoc_ui():
    return get_redoc_html(openapi_url="/openapi.json", title=f"{app.title} - API 문서")


@app.get("/openapi.json", include_in_schema=False)
async def openapi_schema():
    return JSONResponse(content=app.openapi())


# React 빌드 정적 에셋 서빙 (JS/CSS/이미지)
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(str(STATIC_DIR / "favicon.svg"))

    # /api, /docs, /redoc, /openapi.json 가 아닌 모든 경로 → React index.html (SPA 라우팅)
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        return FileResponse(str(STATIC_DIR / "index.html"))
