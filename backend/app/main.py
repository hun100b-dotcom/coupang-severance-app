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


# API 문서 경로 — catch-all보다 먼저 등록해 항상 문서가 응답되도록
@app.get("/docs", include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(openapi_url="/openapi.json", title=f"{app.title} - API 문서")


@app.get("/redoc", include_in_schema=False)
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
