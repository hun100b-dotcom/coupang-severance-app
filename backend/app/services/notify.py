# -*- coding: utf-8 -*-
"""
1:1 문의가 접수되었을 때 Discord Webhook 등으로 관리자에게 알림을 보내는 모듈입니다.

- DISCORD_WEBHOOK_URL 환경변수가 설정되어 있으면 해당 URL로 POST 요청을 전송합니다.
- 실패하더라도 사용자 플로우를 막지 않기 위해, 예외는 잡아서 로그만 남기고 조용히 넘어갑니다.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse
from typing import Optional, TypedDict


DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "").strip()

# 시작 시 디버깅 로그
print("[notify.py 초기화]")
print(f"  DISCORD_WEBHOOK_URL 설정 여부: {'✓ 설정됨' if DISCORD_WEBHOOK_URL else '✗ 미설정'}")
if DISCORD_WEBHOOK_URL:
    # 보안상 일부만 표시
    masked = DISCORD_WEBHOOK_URL[:50] + "..." if len(DISCORD_WEBHOOK_URL) > 50 else DISCORD_WEBHOOK_URL
    print(f"  URL (마스킹): {masked}")


class NotifyResult(TypedDict):
    ok: bool
    reason: str
    status_code: int | None


async def notify_new_inquiry(
    *,
    inquiry_id: str,
    title: str = "",
    content: str = "",
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
) -> NotifyResult:
    """
    새 1:1 문의가 접수됐을 때 호출되는 비동기 함수입니다.

    개인정보보호법 제17조 준수: Discord Inc. (미국 법인)로의 개인정보 제3자 제공 방지를 위해
    이메일, 이름, 문의 내용을 전송하지 않고, 문의 ID만 전송합니다.

    inquiry_id: 문의 고유 ID (관리자 페이지 링크용)
    title, content, user_id, user_name: 하위 호환성 유지용 (실제로는 사용하지 않음)
    """

    # 웹훅 URL이 설정되어 있지 않으면 아무 것도 하지 않고 종료합니다.
    if not DISCORD_WEBHOOK_URL:
        print("[notify_new_inquiry] DISCORD_WEBHOOK_URL 미설정: 알림 전송을 건너뜁니다.")
        return {"ok": False, "reason": "webhook_not_configured", "status_code": None}

    # 개인정보보호법 준수: 개인정보를 Discord로 전송하지 않음
    # 관리자는 Discord 알림을 클릭하여 관리자 페이지에서 문의 내용 확인
    admin_url = f"https://coupang-severance-app.vercel.app/admin"  # 실제 프로덕션 URL

    payload = {
        "content": f"[CATCH] 새로운 문의가 접수되었습니다 (#{inquiry_id[:8]})",
        "embeds": [
            {
                "title": "🔔 신규 문의 알림",
                "description": "관리자 페이지에서 문의 내용을 확인하세요.",
                "color": 3447003,  # 파란색
                "fields": [
                    {"name": "문의 ID", "value": f"`{inquiry_id}`", "inline": False},
                    {"name": "확인 링크", "value": f"[관리자 페이지 열기]({admin_url})", "inline": False},
                ],
            }
        ],
    }

    try:
        import httpx

        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.post(DISCORD_WEBHOOK_URL, json=payload)
            # Discord가 4xx/5xx를 반환하면 예외를 발생시켜 로그로 원인을 남깁니다.
            res.raise_for_status()
            host = urlparse(DISCORD_WEBHOOK_URL).netloc or "unknown-host"
            print(f"[notify_new_inquiry] 알림 전송 성공: host={host}, status={res.status_code}")
            return {"ok": True, "reason": "sent", "status_code": res.status_code}
    except Exception as exc:  # pragma: no cover - 알림 실패는 치명적이지 않으므로 조용히 로그만 남깁니다.
        print(f"[notify_new_inquiry] 알림 전송 실패: {exc}")
        return {"ok": False, "reason": str(exc), "status_code": None}

