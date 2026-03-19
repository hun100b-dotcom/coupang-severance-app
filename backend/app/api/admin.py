# -*- coding: utf-8 -*-
"""
관리자 전용 1:1 문의 관리 API

【처음 사용 전 필수 설정】 backend/.env 파일에 아래 두 줄을 추가하세요:
  SUPABASE_SERVICE_ROLE_KEY = ...   ← Supabase 대시보드 > Settings > API > service_role key
  ADMIN_SECRET = ...                ← 본인이 정한 비밀 문자열 (예: catch-admin-2024)

보안 방식:
  - 프론트에서 X-Admin-Token 헤더로 ADMIN_SECRET을 전달 → 백엔드가 검증
  - Supabase service_role 키로 RLS를 우회하여 모든 사용자 문의를 조회
"""

from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 환경 변수에서 Supabase 설정을 읽어옵니다
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


def _check_admin(x_admin_token: Optional[str]) -> None:
    """요청 헤더의 관리자 토큰이 환경 변수와 일치하는지 검증합니다."""
    if not ADMIN_SECRET:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_SECRET 환경 변수가 설정되지 않았습니다. backend/.env를 확인하세요.",
        )
    if x_admin_token != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="관리자 권한이 없습니다.")


def _supabase_headers() -> dict:
    """Supabase REST API 호출에 사용할 서비스 롤 헤더를 반환합니다."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.",
        )
    return {
        # service_role 키는 RLS를 우회하여 모든 사용자 데이터에 접근할 수 있습니다
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


@router.get("/admin/inquiries")
async def list_inquiries(
    x_admin_token: Optional[str] = Header(default=None),
):
    """모든 사용자의 1:1 문의 목록을 최신순으로 반환합니다."""
    _check_admin(x_admin_token)

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/inquiries",
            headers=_supabase_headers(),
            params={"select": "*", "order": "created_at.desc"},
        )

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="문의 목록 조회에 실패했습니다.")

    return {"inquiries": res.json()}


class AnswerPayload(BaseModel):
    """답변 등록 요청 데이터 형식입니다."""
    answer: str


@router.patch("/admin/inquiries/{inquiry_id}/answer")
async def answer_inquiry(
    inquiry_id: str,
    payload: AnswerPayload,
    x_admin_token: Optional[str] = Header(default=None),
):
    """특정 문의에 답변을 등록하고 상태를 '답변완료'로 변경합니다."""
    _check_admin(x_admin_token)

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.patch(
            f"{SUPABASE_URL}/rest/v1/inquiries",
            headers={
                **_supabase_headers(),
                # 업데이트 후 변경된 데이터를 응답으로 받습니다
                "Prefer": "return=representation",
            },
            params={"id": f"eq.{inquiry_id}"},
            json={
                "answer": payload.answer,
                "status": "answered",  # 답변 등록 시 상태를 '답변완료'로 자동 변경
            },
        )

    if res.status_code not in (200, 204):
        raise HTTPException(status_code=res.status_code, detail="답변 등록에 실패했습니다.")

    return {"ok": True}
