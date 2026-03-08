# -*- coding: utf-8 -*-
"""FastAPI 메인 애플리케이션 — React 빌드 정적 파일 서빙 포함"""
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from .api import common, severance, unemployment

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

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

app.include_router(common.router,       prefix="/api",             tags=["공통"])
app.include_router(severance.router,    prefix="/api/severance",   tags=["퇴직금"])
app.include_router(unemployment.router, prefix="/api/unemployment", tags=["실업급여"])


# React 빌드 정적 에셋 서빙 (JS/CSS/이미지)
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(str(STATIC_DIR / "favicon.svg"))

    # /api 가 아닌 모든 경로 → React index.html (SPA 라우팅)
    # /docs, /redoc, /openapi.json 은 catch-all에 걸리지 않도록 여기서 직접 응답
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path in ("docs", "docs/") or full_path.startswith("docs/"):
            return get_swagger_ui_html(openapi_url="/openapi.json", title=f"{app.title} - API 문서")
        if full_path in ("redoc", "redoc/") or full_path.startswith("redoc/"):
            return get_redoc_html(openapi_url="/openapi.json", title=f"{app.title} - API 문서")
        if full_path == "openapi.json":
            return JSONResponse(content=app.openapi())
        return FileResponse(str(STATIC_DIR / "index.html"))
