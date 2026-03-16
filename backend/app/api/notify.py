# -*- coding: utf-8 -*-
"""
1:1 문의 관련 알림 API 엔드포인트입니다.

프론트엔드에서 문의를 Supabase `inquiries` 테이블에 저장한 직후,
이 엔드포인트로 한 번 더 호출해주면 Discord Webhook 등을 통해
관리자에게 "[CATCH] 새로운 문의가 접수되었습니다" 알림을 보낼 수 있습니다.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.notify import notify_new_inquiry


router = APIRouter()


class InquiryNotifyPayload(BaseModel):
  """프론트엔드에서 알림을 위해 전달하는 최소한의 정보입니다."""

  title: str
  content: str
  user_id: str | None = None
  user_name: str | None = None


@router.post("/inquiry/notify")
async def inquiry_notify(payload: InquiryNotifyPayload):
  """
  새 1:1 문의 알림을 전송하는 엔드포인트입니다.

  - 성공/실패 여부와 관계없이 항상 200 OK를 반환하여
    사용자 경험(문의 접수 플로우)을 방해하지 않는 것을 목표로 합니다.
  """

  await notify_new_inquiry(
    title=payload.title,
    content=payload.content,
    user_id=payload.user_id,
    user_name=payload.user_name,
  )

  return {"ok": True}

