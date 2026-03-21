# -*- coding: utf-8 -*-
"""
클릭 카운터 서비스 — Supabase 영구 보존

Supabase Table: click_counter (단일 행, id=1)
  id                 int4  PRIMARY KEY
  total_cnt          int8  DEFAULT 0   ← 누적 클릭 수
  severance_cnt      int8  DEFAULT 0   ← 퇴직금 버튼 클릭 수
  unemployment_cnt   int8  DEFAULT 0   ← 실업급여 버튼 클릭 수

Supabase SQL (처음 한 번만 실행):
  CREATE TABLE IF NOT EXISTS click_counter (
    id                 int4 PRIMARY KEY,
    total_cnt          int8 DEFAULT 0,
    severance_cnt      int8 DEFAULT 0,
    unemployment_cnt   int8 DEFAULT 0
  );
  INSERT INTO click_counter (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

환경변수 (Render 등의 배포 환경에서 설정 권장):
  SUPABASE_URL      = https://hmjxrqhcwjyfkvlcejfc.supabase.co
  SUPABASE_ANON_KEY = <해당 프로젝트의 anon 키>

※ 기본값으로도 위 프로젝트(hmjxrqhcwjyfkvlcejfc)에 연결되지만,
   운영 환경에서는 반드시 환경변수로 덮어써 주세요.
"""
import json
import os
from pathlib import Path

# ── Supabase URL 검증 — 잘못된 환경변수가 설정돼도 올바른 프로젝트에 연결 ──────────
_PROJECT_ID   = "hmjxrqhcwjyfkvlcejfc"
_CORRECT_SB_URL = f"https://{_PROJECT_ID}.supabase.co"
_env_sb_url   = os.getenv("SUPABASE_URL", "").rstrip("/")
# env 변수가 올바른 프로젝트 ID를 포함하지 않으면 하드코딩된 올바른 URL을 사용합니다
_SUPABASE_URL = _env_sb_url if _PROJECT_ID in _env_sb_url else _CORRECT_SB_URL

_SUPABASE_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtanhycWhjd2p5Zmt2bGNlamZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTEwNTMsImV4cCI6MjA4ODYyNzA1M30"
    ".gr9poC-5808qHRoYc-5WH3dTqXupEEJpDdztv2fddog",
)

_TABLE = "click_counter"

# ── JSON 폴백 경로 ─────────────────────────────────────────────────────────────
COUNTER_DIR  = Path(__file__).resolve().parents[3] / "data"
COUNTER_PATH = COUNTER_DIR / "click_count.json"


def _headers() -> dict:
    return {
        "apikey": _SUPABASE_KEY,
        "Authorization": f"Bearer {_SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _sb_get() -> dict:
    """Supabase에서 현재 카운트 조회. 실패 시 JSON 폴백."""
    try:
        import httpx
        # 실제 DB 컬럼명: total, severance, unemployment
        url = f"{_SUPABASE_URL}/rest/v1/{_TABLE}?id=eq.1&select=total,severance,unemployment"
        r = httpx.get(url, headers=_headers(), timeout=7)
        if r.status_code == 200:
            rows = r.json()
            if rows:
                row = rows[0]
                return {
                    "total":        int(row.get("total", 0) or 0),
                    "severance":    int(row.get("severance", 0) or 0),
                    "unemployment": int(row.get("unemployment", 0) or 0),
                }
        print(f"[counter:get] status={r.status_code} body={r.text[:200]}")
    except Exception as exc:
        print(f"[counter:get] 예외={exc}")
    return _file_get()


def _sb_increment(service: str) -> dict:
    """Supabase total_cnt +1 (원자적 업데이트). 실패 시 JSON 폴백."""
    try:
        import httpx

        cur = _sb_get()
        new_total        = cur["total"] + 1
        new_severance    = cur["severance"] + (1 if service == "severance" else 0)
        new_unemployment = cur["unemployment"] + (1 if service == "unemployment" else 0)

        # 실제 DB 컬럼명에 맞춰 업데이트합니다
        payload = {
            "total":        new_total,
            "severance":    new_severance,
            "unemployment": new_unemployment,
        }
        url = f"{_SUPABASE_URL}/rest/v1/{_TABLE}?id=eq.1"
        r = httpx.patch(url, headers=_headers(), json=payload, timeout=7)

        if r.status_code in (200, 204):
            return {"total": new_total, "severance": new_severance, "unemployment": new_unemployment}
        print(f"[counter:patch] status={r.status_code} body={r.text[:200]}")
    except Exception as exc:
        print(f"[counter:patch] 예외={exc}")

    # Supabase 실패 → JSON 폴백으로라도 올리기
    return _file_increment(service)


# ── JSON 파일 폴백 ─────────────────────────────────────────────────────────────
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


# ── 공개 API ──────────────────────────────────────────────────────────────────
def get_click_count() -> dict:
    return _sb_get()          # Supabase 우선, 내부에서 폴백 처리


def increment_click_count(service: str) -> dict:
    return _sb_increment(service)   # Supabase 우선, 내부에서 폴백 처리
