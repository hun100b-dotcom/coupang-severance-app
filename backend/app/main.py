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

from .api import common, severance, unemployment, notify, admin

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

app.include_router(common.router,       prefix="/api",              tags=["공통"])
app.include_router(severance.router,    prefix="/api/severance",    tags=["퇴직금"])
app.include_router(unemployment.router, prefix="/api/unemployment", tags=["실업급여"])
app.include_router(notify.router,       prefix="/api",              tags=["알림"])
app.include_router(admin.router,        prefix="/api",              tags=["관리자"])


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
