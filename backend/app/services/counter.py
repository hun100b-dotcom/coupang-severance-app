# -*- coding: utf-8 -*-
"""
클릭 카운터 서비스

영구 보존 우선순위:
  1. SUPABASE_URL + SUPABASE_ANON_KEY 환경변수 설정 시 → Supabase(외부 DB) 사용
  2. 미설정 시 → 로컬 JSON 파일 (배포 환경에서는 재시작/재배포 시 초기화 위험)

Supabase 설정 방법 (Render 환경변수에 추가):
  SUPABASE_URL  = https://<project>.supabase.co
  SUPABASE_ANON_KEY = <anon key>
  
  그리고 Supabase Table: click_counter
    id        int4   PRIMARY KEY  (값: 1, 단일 행)
    total     int8   DEFAULT 0
    severance int8   DEFAULT 0
    unemployment int8 DEFAULT 0
"""
import json
import os
from pathlib import Path

COUNTER_DIR  = Path(__file__).resolve().parents[3] / "data"
COUNTER_PATH = COUNTER_DIR / "click_count.json"

_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")
_USE_SUPABASE = bool(_SUPABASE_URL and _SUPABASE_KEY)

# ── Supabase helpers ────────────────────────────────────────────────────────
def _sb_headers() -> dict:
    return {
        "apikey": _SUPABASE_KEY,
        "Authorization": f"Bearer {_SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _sb_get() -> dict:
    try:
        import httpx
        url = f"{_SUPABASE_URL}/rest/v1/click_counter?id=eq.1&select=total,severance,unemployment"
        r = httpx.get(url, headers=_sb_headers(), timeout=5)
        if r.status_code == 200:
            rows = r.json()
            if rows:
                return {k: int(rows[0].get(k, 0)) for k in ("total", "severance", "unemployment")}
    except Exception:
        pass
    return {"total": 0, "severance": 0, "unemployment": 0}


def _sb_increment(service: str) -> dict:
    try:
        import httpx
        current = _sb_get()
        current["total"] += 1
        if service in ("severance", "unemployment"):
            current[service] += 1
        url = f"{_SUPABASE_URL}/rest/v1/click_counter?id=eq.1"
        r = httpx.patch(url, headers=_sb_headers(), json=current, timeout=5)
        if r.status_code in (200, 204):
            return current
    except Exception:
        pass
    return _sb_get()


# ── JSON 파일 폴백 ───────────────────────────────────────────────────────────
def _file_get() -> dict:
    try:
        if COUNTER_PATH.exists():
            with open(COUNTER_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "total":        int(data.get("total", 0)),
                    "severance":    int(data.get("severance", 0)),
                    "unemployment": int(data.get("unemployment", 0)),
                }
    except (json.JSONDecodeError, IOError):
        pass
    return {"total": 0, "severance": 0, "unemployment": 0}


def _file_increment(service: str) -> dict:
    try:
        COUNTER_DIR.mkdir(parents=True, exist_ok=True)
        data = _file_get()
        data["total"] += 1
        if service in ("severance", "unemployment"):
            data[service] += 1
        with open(COUNTER_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return data
    except IOError:
        return _file_get()


# ── 공개 API ────────────────────────────────────────────────────────────────
def get_click_count() -> dict:
    return _sb_get() if _USE_SUPABASE else _file_get()


def increment_click_count(service: str) -> dict:
    return _sb_increment(service) if _USE_SUPABASE else _file_increment(service)
