#!/usr/bin/env python3
"""
setup_admin_account.py
CATCH 어드민 페이지 탭 정상화를 위한 DB 설정 스크립트

실행 방법:
  python setup_admin_account.py
"""

import os
import sys
import json
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests 모듈이 설치되지 않았습니다.")
    print("설치 명령: pip install requests")
    sys.exit(1)

# ── 환경변수 로드 ──────────────────────────────────────────────────────────
def load_env():
    """backend/.env 파일에서 환경변수 로드"""
    env_path = Path(__file__).parent / "backend" / ".env"
    if not env_path.exists():
        print(f"❌ {env_path} 파일을 찾을 수 없습니다.")
        sys.exit(1)

    env_vars = {}
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

    return env_vars

env = load_env()
SUPABASE_URL = env.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_SERVICE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
    print("backend/.env 파일을 확인하세요.")
    sys.exit(1)

# Supabase URL 교정 (프로젝트 ID 포함 여부 자동 처리)
if 'supabase.co' in SUPABASE_URL and 'hmjxrqhcwjyfkvlcejfc' not in SUPABASE_URL:
    SUPABASE_URL = 'https://hmjxrqhcwjyfkvlcejfc.supabase.co'

REST_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

print("=" * 70)
print("CATCH Admin Accounts Setup Script")
print("=" * 70)
print()

# ── 1. 현재 admin_accounts 확인 ────────────────────────────────────────────
print("[1/5] 현재 admin_accounts 테이블 확인...")
try:
    resp = requests.get(
        f"{REST_URL}/admin_accounts?select=*",
        headers=HEADERS,
        timeout=10
    )
    resp.raise_for_status()
    current_accounts = resp.json()
    print(f"  [OK] Current accounts: {len(current_accounts)}")
    for acc in current_accounts:
        print(f"     • {acc['email']} ({acc['role']}) - {'활성' if acc['is_active'] else '비활성'}")
except Exception as e:
    print(f"  ❌ 실패: {e}")
    sys.exit(1)

# ── 2. 슈퍼 관리자 계정 등록 ────────────────────────────────────────────────
SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'
print()
print(f"[2/5] 슈퍼 관리자 계정 등록: {SUPER_ADMIN_EMAIL}")

# 이미 존재하는지 확인
existing = next((acc for acc in current_accounts if acc['email'] == SUPER_ADMIN_EMAIL), None)
if existing:
    print(f"  ℹ️  이미 등록되어 있습니다: {existing['role']} (is_active={existing['is_active']})")
else:
    try:
        resp = requests.post(
            f"{REST_URL}/admin_accounts",
            headers=HEADERS,
            json={
                'email': SUPER_ADMIN_EMAIL,
                'role': 'super_admin',
                'display_name': '최고 관리자',
                'is_active': True
            },
            timeout=10
        )
        resp.raise_for_status()
        print(f"  ✅ 슈퍼 관리자 계정 등록 완료")
    except Exception as e:
        print(f"  ❌ 실패: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"     Response: {e.response.text}")
        sys.exit(1)

# ── 3. system_settings에 permission_levels 추가 ────────────────────────────
print()
print("[3/5] system_settings에 permission_levels 설정...")

permission_levels = {
    "super_admin": {
        "label": "슈퍼 관리자",
        "color": "#f04040",
        "permissions": {
            "dashboard": True,
            "target": True,
            "inquiries": True,
            "notices": True,
            "members": True,
            "accounts": True,
            "settings": True,
            "audit_logs": True,
            "server_logs": True
        }
    },
    "admin": {
        "label": "관리자",
        "color": "#3182f6",
        "permissions": {
            "dashboard": True,
            "target": True,
            "inquiries": True,
            "notices": True,
            "members": True,
            "accounts": False,
            "settings": False,
            "audit_logs": False,
            "server_logs": False
        }
    },
    "viewer": {
        "label": "뷰어",
        "color": "#6b7280",
        "permissions": {
            "dashboard": True,
            "target": False,
            "inquiries": True,
            "notices": False,
            "members": False,
            "accounts": False,
            "settings": False,
            "audit_logs": False,
            "server_logs": False
        }
    }
}

try:
    # 기존 설정 확인
    resp = requests.get(
        f"{REST_URL}/system_settings?key=eq.permission_levels",
        headers=HEADERS,
        timeout=10
    )
    resp.raise_for_status()
    existing_setting = resp.json()

    if existing_setting:
        print(f"  ℹ️  permission_levels가 이미 존재합니다.")
        # 업데이트
        resp = requests.patch(
            f"{REST_URL}/system_settings?key=eq.permission_levels",
            headers=HEADERS,
            json={
                'value': json.dumps(permission_levels, ensure_ascii=False),
                'description': '관리자 권한 레벨 정의 (JSON)',
                'updated_at': 'now()'
            },
            timeout=10
        )
        resp.raise_for_status()
        print(f"  ✅ permission_levels 업데이트 완료")
    else:
        # 신규 등록
        resp = requests.post(
            f"{REST_URL}/system_settings",
            headers=HEADERS,
            json={
                'key': 'permission_levels',
                'value': json.dumps(permission_levels, ensure_ascii=False),
                'description': '관리자 권한 레벨 정의 (JSON)'
            },
            timeout=10
        )
        resp.raise_for_status()
        print(f"  ✅ permission_levels 등록 완료")
except Exception as e:
    print(f"  ❌ 실패: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"     Response: {e.response.text}")

# ── 4. member_unmask_key 설정 추가 ──────────────────────────────────────────
print()
print("[4/5] system_settings에 member_unmask_key 설정...")

try:
    resp = requests.get(
        f"{REST_URL}/system_settings?key=eq.member_unmask_key",
        headers=HEADERS,
        timeout=10
    )
    resp.raise_for_status()
    existing_unmask = resp.json()

    if existing_unmask:
        print(f"  ℹ️  member_unmask_key가 이미 존재합니다.")
    else:
        resp = requests.post(
            f"{REST_URL}/system_settings",
            headers=HEADERS,
            json={
                'key': 'member_unmask_key',
                'value': '',
                'description': '회원 개인정보 마스킹 해제 보안키 — 슈퍼 관리자만 설정/조회 가능'
            },
            timeout=10
        )
        resp.raise_for_status()
        print(f"  ✅ member_unmask_key 등록 완료")
except Exception as e:
    print(f"  ⚠️  실패 (무시 가능): {e}")

# ── 5. 최종 확인 ───────────────────────────────────────────────────────────
print()
print("[5/5] 최종 확인...")
try:
    resp = requests.get(
        f"{REST_URL}/admin_accounts?select=*&email=eq.{SUPER_ADMIN_EMAIL}",
        headers=HEADERS,
        timeout=10
    )
    resp.raise_for_status()
    final_account = resp.json()

    if final_account and len(final_account) > 0:
        acc = final_account[0]
        print(f"  ✅ 슈퍼 관리자 계정 확인:")
        print(f"     • 이메일: {acc['email']}")
        print(f"     • 역할: {acc['role']}")
        print(f"     • 표시 이름: {acc.get('display_name', 'N/A')}")
        print(f"     • 활성화: {acc['is_active']}")
        print(f"     • 생성일: {acc['created_at']}")
    else:
        print(f"  ❌ 슈퍼 관리자 계정을 찾을 수 없습니다.")
        sys.exit(1)
except Exception as e:
    print(f"  ❌ 실패: {e}")
    sys.exit(1)

print()
print("=" * 70)
print("✅ 모든 설정 완료!")
print("=" * 70)
print()
print("다음 단계:")
print(f"1. {SUPER_ADMIN_EMAIL} 계정으로 로그인")
print("2. https://catch-daily-worker.vercel.app/admin 접속")
print("3. 모든 관리자 탭이 정상적으로 표시되는지 확인")
print()
print("표시되어야 할 탭:")
print("  • Dashboard")
print("  • Target")
print("  • Inquiries")
print("  • 공지사항 (Notices)")
print("  • 회원 관리 (Members)")
print("  • 관리자 계정 (Accounts) ← 슈퍼어드민 전용")
print("  • Settings ← 슈퍼어드민 전용")
print("  • Audit Logs ← 슈퍼어드민 전용")
print("  • Server Logs ← 슈퍼어드민 전용")
print()
