# -*- coding: utf-8 -*-
"""
1:1 문의가 접수되었을 때 Discord Webhook 등으로 관리자에게 알림을 보내는 모듈입니다.

Webhook URL 조회 순서:
  1. Supabase system_settings 테이블의 'discord_webhook_url' 값 (어드민 UI에서 설정 가능)
  2. 없으면 DISCORD_WEBHOOK_URL 환경변수 사용 (Render 배포 설정)

discord_notify_enabled = 'false'로 저장되어 있으면 알림을 전송하지 않습니다.

실패하더라도 사용자 플로우를 막지 않기 위해, 예외는 잡아서 로그만 남기고 조용히 넘어갑니다.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse
from typing import Optional, TypedDict

# Supabase REST API 접근용 설정 (system_settings 조회에 사용)
_DISCORD_WEBHOOK_URL_FALLBACK = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY", "")
)

# 시작 시 디버깅 로그
print("[notify.py 초기화]")
print(f"  DISCORD_WEBHOOK_URL 환경변수: {'✓ 설정됨' if _DISCORD_WEBHOOK_URL_FALLBACK else '✗ 미설정 (system_settings에서 조회 예정)'}")
print(f"  SUPABASE_URL: {'✓ 설정됨' if _SUPABASE_URL else '✗ 미설정 (settings 조회 불가)'}")


class NotifyResult(TypedDict):
    ok: bool
    reason: str
    status_code: int | None


async def _get_system_setting(key: str) -> Optional[str]:
    """
    Supabase system_settings 테이블에서 설정값을 조회합니다.
    실패 시 None을 반환하고 예외를 던지지 않습니다.
    """
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        return None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get(
                f"{_SUPABASE_URL}/rest/v1/system_settings",
                headers={
                    "apikey":        _SUPABASE_KEY,
                    "Authorization": f"Bearer {_SUPABASE_KEY}",
                },
                params={"key": f"eq.{key}", "select": "value", "limit": "1"},
            )
            if res.status_code == 200:
                rows = res.json()
                return rows[0]["value"] if rows else None
    except Exception as exc:
        print(f"[notify.py] system_settings 조회 실패: {exc}")
    return None


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

    # ── 1단계: discord_notify_enabled 확인 ────────────────────
    notify_enabled = await _get_system_setting("discord_notify_enabled")
    if notify_enabled == "false":
        print("[notify_new_inquiry] discord_notify_enabled=false: 알림 전송을 건너뜁니다.")
        return {"ok": False, "reason": "notifications_disabled", "status_code": None}

    # ── 2단계: Webhook URL 조회 (system_settings 우선 → env 폴백) ──
    webhook_url = await _get_system_setting("discord_webhook_url")
    if not webhook_url:
        webhook_url = _DISCORD_WEBHOOK_URL_FALLBACK

    if not webhook_url:
        print("[notify_new_inquiry] Discord Webhook URL 미설정: 알림 전송을 건너뜁니다.")
        print("  → 어드민 > 설정 > Discord 알림에서 URL을 입력하거나")
        print("  → Render 환경변수 DISCORD_WEBHOOK_URL에 추가하세요.")
        return {"ok": False, "reason": "webhook_not_configured", "status_code": None}

    # ── 3단계: Discord Embed 발송 ─────────────────────────────
    # 개인정보보호법 준수: 개인정보를 Discord로 전송하지 않음
    # 관리자는 Discord 알림을 클릭하여 관리자 페이지에서 문의 내용 확인
    admin_url = "https://coucatch.com/admin"

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
            res = await client.post(webhook_url, json=payload)
            # Discord가 4xx/5xx를 반환하면 예외를 발생시켜 로그로 원인을 남깁니다.
            res.raise_for_status()
            host = urlparse(webhook_url).netloc or "unknown-host"
            print(f"[notify_new_inquiry] 알림 전송 성공: host={host}, status={res.status_code}")
            return {"ok": True, "reason": "sent", "status_code": res.status_code}
    except Exception as exc:  # pragma: no cover - 알림 실패는 치명적이지 않으므로 조용히 로그만 남깁니다.
        print(f"[notify_new_inquiry] 알림 전송 실패: {exc}")
        return {"ok": False, "reason": str(exc), "status_code": None}
