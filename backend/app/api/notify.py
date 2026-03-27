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
  """프론트엔드에서 알림을 위해 전달하는 정보입니다.

  개인정보보호법 준수: Discord로 개인정보를 전송하지 않고 inquiry_id만 전송합니다.
  title, content, user_id, user_name은 하위 호환성을 위해 유지하지만 실제로는 사용하지 않습니다.
  """

  inquiry_id: str  # 필수: Supabase inquiries 테이블의 UUID
  title: str = ""  # 하위 호환성 유지
  content: str = ""  # 하위 호환성 유지
  user_id: str | None = None  # 하위 호환성 유지
  user_name: str | None = None  # 하위 호환성 유지


@router.post("/inquiry/notify")
async def inquiry_notify(payload: InquiryNotifyPayload):
  """
  새 1:1 문의 알림을 전송하는 엔드포인트입니다.

  개인정보보호법 제17조 준수: Discord Inc. (미국 법인)로의 제3자 제공 방지를 위해
  개인정보(이메일, 이름, 문의 내용)를 전송하지 않고, 문의 ID만 전송합니다.

  - 성공/실패 여부와 관계없이 항상 200 OK를 반환하여
    사용자 경험(문의 접수 플로우)을 방해하지 않는 것을 목표로 합니다.
  """

  print(f"[inquiry_notify 엔드포인트 호출]")
  print(f"  inquiry_id: {payload.inquiry_id}")
  print(f"  개인정보는 Discord로 전송하지 않음 (개인정보보호법 준수)")

  result = await notify_new_inquiry(
    inquiry_id=payload.inquiry_id,
    title=payload.title,  # 하위 호환성 유지 (실제로는 미사용)
    content=payload.content,
    user_id=payload.user_id,
    user_name=payload.user_name,
  )
  print(f"[notify_new_inquiry 결과] ok={result['ok']}, reason={result['reason']}")

  return {
    "ok": True,
    "notify_ok": result["ok"],
    "notify_reason": result["reason"],
    "notify_status_code": result["status_code"],
  }

