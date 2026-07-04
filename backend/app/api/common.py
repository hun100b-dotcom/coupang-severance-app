# -*- coding: utf-8 -*-
import os
import time

import httpx
from fastapi import APIRouter

from ..services.counter import get_click_count, increment_click_count

router = APIRouter()


@router.get("/click-count")
async def click_count():
    return get_click_count()


_VALID_SERVICES = {"severance", "unemployment", "weekly_allowance", "annual_leave", "benefits"}

@router.post("/click/{service}")
async def register_click(service: str):
    if service not in _VALID_SERVICES:
        return {"error": "invalid service"}
    return increment_click_count(service)


# ── CMS 배너 공개 조회 ─────────────────────────────────────────────────────────
# 어드민 "공지/배너 CMS"(system_settings의 announcement_*/popup_banner_* 키)를
# 사용자 홈이 소비하기 위한 공개 엔드포인트.
#
# 배경(2026-07-04 어드민 연동 전수조사): CMS 위젯은 "저장 즉시 홈 화면 반영"을
# 약속했지만 사용자 측 소비 코드가 전혀 없어 미연동 상태였다. 브라우저가
# system_settings를 직접 읽게 하면 anon 노출 범위가 넓어지므로(웹훅 URL 등 다른
# 키도 같은 테이블), 백엔드(service-role)가 배너 4개 키만 골라 내려준다.
#
# 인증 없음(공개) · 60초 인메모리 캐시(방문마다 DB 호출 방지) · 실패 시 배너 OFF
# 기본값으로 안전 저하(홈 렌더를 막지 않는다).

_CMS_SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hmjxrqhcwjyfkvlcejfc.supabase.co")
_CMS_SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY", "")
)
_CMS_KEYS = ("announcement_text", "announcement_enabled",
             "popup_banner_text", "popup_banner_enabled")
_CMS_TTL_SECONDS = 60          # 캐시 유효시간 (어드민 저장 후 최대 1분 내 반영)
_cms_cache: dict = {"ts": 0.0, "data": None}

_CMS_DEFAULT = {
    "announcement_text": "", "announcement_enabled": False,
    "popup_banner_text": "", "popup_banner_enabled": False,
}


@router.get("/cms/banners")
def cms_banners():
    """홈 긴급 공지 띠 + 진입 팝업 배너 설정 (공개, 60초 캐시)

    ⚠️ async가 아닌 sync def 유지 — 내부에서 동기 httpx.get을 쓰므로 async로 두면
    캐시 미스+Supabase 무응답 시 이벤트 루프가 최대 7초 잠긴다(리뷰어 B 지적).
    sync def는 FastAPI가 스레드풀에서 실행해 다른 요청을 막지 않는다."""
    now = time.time()
    if _cms_cache["data"] is not None and now - _cms_cache["ts"] < _CMS_TTL_SECONDS:
        return _cms_cache["data"]
    try:
        keys_csv = ",".join(_CMS_KEYS)
        r = httpx.get(
            f"{_CMS_SUPABASE_URL}/rest/v1/system_settings",
            headers={
                "apikey": _CMS_SUPABASE_KEY,
                "Authorization": f"Bearer {_CMS_SUPABASE_KEY}",
            },
            params={"select": "key,value", "key": f"in.({keys_csv})"},
            timeout=7,
        )
        if r.status_code == 200:
            kv = {row["key"]: row["value"] for row in r.json()}
            data = {
                "announcement_text": kv.get("announcement_text", "") or "",
                "announcement_enabled": kv.get("announcement_enabled") == "true",
                "popup_banner_text": kv.get("popup_banner_text", "") or "",
                "popup_banner_enabled": kv.get("popup_banner_enabled") == "true",
            }
            _cms_cache["ts"] = now
            _cms_cache["data"] = data
            return data
        print(f"[cms/banners] status={r.status_code} body={r.text[:150]}")
    except Exception as exc:
        print(f"[cms/banners] 예외={exc}")
    # 실패 시: 캐시가 있으면 만료됐어도 재사용(순단 흡수), 없으면 배너 OFF 기본값
    return _cms_cache["data"] or _CMS_DEFAULT
