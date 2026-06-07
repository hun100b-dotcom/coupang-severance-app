#!/usr/bin/env python3
import os
import sys
import json
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests module not found. Install: pip install requests")
    sys.exit(1)

def load_env():
    env_path = Path(__file__).parent / "backend" / ".env"
    if not env_path.exists():
        print(f"ERROR: {env_path} not found")
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
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in backend/.env")
    sys.exit(1)

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
print("CATCH Admin Accounts Setup")
print("=" * 70)
print()

# Check current accounts
print("[1/5] Checking admin_accounts table...")
try:
    resp = requests.get(f"{REST_URL}/admin_accounts?select=*", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    current_accounts = resp.json()
    print(f"  [OK] Current accounts: {len(current_accounts)}")
    for acc in current_accounts:
        print(f"     - {acc['email']} ({acc['role']}) - active={acc['is_active']}")
except Exception as e:
    print(f"  [ERROR] {e}")
    sys.exit(1)

# Insert super admin
SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'
print()
print(f"[2/5] Inserting super admin: {SUPER_ADMIN_EMAIL}")

existing = next((acc for acc in current_accounts if acc['email'] == SUPER_ADMIN_EMAIL), None)
if existing:
    print(f"  [INFO] Account already exists: {existing['role']} (active={existing['is_active']})")
else:
    try:
        resp = requests.post(
            f"{REST_URL}/admin_accounts",
            headers=HEADERS,
            json={
                'email': SUPER_ADMIN_EMAIL,
                'role': 'super_admin',
                'display_name': 'Super Admin',
                'is_active': True
            },
            timeout=10
        )
        resp.raise_for_status()
        print(f"  [OK] Super admin account created")
    except Exception as e:
        print(f"  [ERROR] {e}")
        if hasattr(e, 'response') and e.response:
            print(f"     Response: {e.response.text}")
        sys.exit(1)

# Add permission_levels
print()
print("[3/5] Setting permission_levels...")

permission_levels = {
    "super_admin": {
        "label": "Super Admin",
        "color": "#f04040",
        "permissions": {
            "dashboard": True, "target": True, "inquiries": True, "notices": True,
            "members": True, "accounts": True, "settings": True, "audit_logs": True, "server_logs": True
        }
    },
    "admin": {
        "label": "Admin",
        "color": "#3182f6",
        "permissions": {
            "dashboard": True, "target": True, "inquiries": True, "notices": True, "members": True,
            "accounts": False, "settings": False, "audit_logs": False, "server_logs": False
        }
    },
    "viewer": {
        "label": "Viewer",
        "color": "#6b7280",
        "permissions": {
            "dashboard": True, "target": False, "inquiries": True, "notices": False,
            "members": False, "accounts": False, "settings": False, "audit_logs": False, "server_logs": False
        }
    }
}

try:
    resp = requests.get(f"{REST_URL}/system_settings?key=eq.permission_levels", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    existing_setting = resp.json()

    if existing_setting:
        print(f"  [INFO] permission_levels already exists, updating...")
        resp = requests.patch(
            f"{REST_URL}/system_settings?key=eq.permission_levels",
            headers=HEADERS,
            json={'value': json.dumps(permission_levels, ensure_ascii=False), 'description': 'Admin permission levels'},
            timeout=10
        )
        resp.raise_for_status()
        print(f"  [OK] permission_levels updated")
    else:
        resp = requests.post(
            f"{REST_URL}/system_settings",
            headers=HEADERS,
            json={'key': 'permission_levels', 'value': json.dumps(permission_levels, ensure_ascii=False), 'description': 'Admin permission levels'},
            timeout=10
        )
        resp.raise_for_status()
        print(f"  [OK] permission_levels created")
except Exception as e:
    print(f"  [ERROR] {e}")
    if hasattr(e, 'response') and e.response:
        print(f"     Response: {e.response.text}")

# Add member_unmask_key
print()
print("[4/5] Setting member_unmask_key...")

try:
    resp = requests.get(f"{REST_URL}/system_settings?key=eq.member_unmask_key", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    existing_unmask = resp.json()

    if existing_unmask:
        print(f"  [INFO] member_unmask_key already exists")
    else:
        resp = requests.post(
            f"{REST_URL}/system_settings",
            headers=HEADERS,
            json={'key': 'member_unmask_key', 'value': '', 'description': 'Member unmask security key'},
            timeout=10
        )
        resp.raise_for_status()
        print(f"  [OK] member_unmask_key created")
except Exception as e:
    print(f"  [WARN] {e}")

# Final verification
print()
print("[5/5] Final verification...")
try:
    resp = requests.get(f"{REST_URL}/admin_accounts?select=*&email=eq.{SUPER_ADMIN_EMAIL}", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    final_account = resp.json()

    if final_account and len(final_account) > 0:
        acc = final_account[0]
        print(f"  [OK] Super admin account verified:")
        print(f"     - Email: {acc['email']}")
        print(f"     - Role: {acc['role']}")
        print(f"     - Display Name: {acc.get('display_name', 'N/A')}")
        print(f"     - Active: {acc['is_active']}")
        print(f"     - Created: {acc['created_at']}")
    else:
        print(f"  [ERROR] Super admin account not found")
        sys.exit(1)
except Exception as e:
    print(f"  [ERROR] {e}")
    sys.exit(1)

print()
print("=" * 70)
print("SUCCESS! All setup complete.")
print("=" * 70)
print()
print("Next steps:")
print(f"1. Login with: {SUPER_ADMIN_EMAIL}")
print("2. Visit: https://catch-daily-worker.vercel.app/admin")
print("3. Verify all tabs are visible:")
print("   - Dashboard, Target, Inquiries, Notices, Members")
print("   - Accounts (super admin only)")
print("   - Settings (super admin only)")
print("   - Audit Logs (super admin only)")
print("   - Server Logs (super admin only)")
print()
