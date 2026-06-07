# -*- coding: utf-8 -*-
"""
Supabase PostgreSQL Migration Runner
psycopg2를 사용한 직접 연결
"""

import os
import sys
from pathlib import Path

# UTF-8 출력 강제
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    import psycopg2
except ImportError:
    print("[ERROR] psycopg2-binary not installed")
    sys.exit(1)

# Supabase Connection Info
SUPABASE_URL = "https://hmjxrqhcwjyfkvlcejfc.supabase.co"
project_id = "hmjxrqhcwjyfkvlcejfc"

print("="*60)
print("CATCH Migration Runner")
print("="*60)
print("")

# Get database password
db_password = os.getenv("SUPABASE_DB_PASSWORD")

if not db_password:
    print("[INFO] SUPABASE_DB_PASSWORD environment variable not set")
    print("[INFO] Please enter your Supabase database password:")
    print("[INFO] (Supabase Dashboard -> Settings -> Database)")
    print("")

    db_password = input("Password: ").strip()

    if not db_password:
        print("")
        print("[ERROR] Password is required")
        print("")
        print("[TIP] Set environment variable to skip manual input:")
        print("  set SUPABASE_DB_PASSWORD=your_password")
        sys.exit(1)

# PostgreSQL connection string (Connection Pooler)
connection_string = f"postgresql://postgres.{project_id}:{db_password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Migration files
migrations_dir = Path(__file__).parent / "supabase" / "migrations"
migration_files = [
    "007_marketing_consent_separation.sql",
    "008_user_access_logs.sql",
]

print("")
print("="*60)
print("Starting Migration")
print("="*60)
print(f"Target: db.{project_id}.supabase.co")
print("")

try:
    # Connect to PostgreSQL
    print("[1/4] Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(connection_string)
    conn.autocommit = True
    cursor = conn.cursor()

    print("[OK] Connected successfully")
    print("")

    # Execute migrations
    print("[2/4] Executing migrations...")
    for migration_file in migration_files:
        file_path = migrations_dir / migration_file

        if not file_path.exists():
            print(f"[SKIP] File not found: {file_path}")
            continue

        print(f"  -> {migration_file}")

        # Read SQL file
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        try:
            # Execute SQL
            cursor.execute(sql_content)
            print(f"  [OK] {migration_file}")

        except psycopg2.Error as e:
            error_msg = str(e)
            if "already exists" in error_msg or "duplicate" in error_msg:
                print(f"  [SKIP] {migration_file} (already exists)")
            else:
                print(f"  [ERROR] {migration_file}: {e}")

    print("")

    # Verify migrations
    print("[3/4] Verifying migrations...")

    # Check marketing columns in profiles table
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name LIKE 'marketing%'
        ORDER BY column_name;
    """)
    marketing_columns = cursor.fetchall()

    print("  profiles table marketing columns:")
    if marketing_columns:
        for col in marketing_columns:
            print(f"    - {col[0]}: {col[1]} (nullable: {col[2]})")
    else:
        print("    [WARNING] No marketing columns found")

    # Check user_access_logs table
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'user_access_logs'
        );
    """)
    table_exists = cursor.fetchone()[0]

    print("")
    print(f"  user_access_logs table: {'[OK] EXISTS' if table_exists else '[ERROR] NOT FOUND'}")

    if table_exists:
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'user_access_logs'
            ORDER BY ordinal_position;
        """)
        access_log_columns = cursor.fetchall()

        print("    Columns:")
        for col in access_log_columns:
            print(f"      - {col[0]}: {col[1]}")

    # Close connection
    cursor.close()
    conn.close()

    print("")
    print("="*60)
    print("[4/4] Migration completed successfully!")
    print("="*60)
    print("")
    print("Next steps:")
    print("  1. Check frontend code for marketing consent UI")
    print("  2. Test access log recording")
    print("  3. git commit and push")

except psycopg2.OperationalError as e:
    print("")
    print("="*60)
    print("[ERROR] PostgreSQL connection failed")
    print("="*60)
    print(f"  {e}")
    print("")
    print("[TIP] Check the following:")
    print("  1. Database password is correct")
    print("  2. Network connection is stable")
    print("  3. Supabase project is active")
    print("")
    print("[TIP] Connection string format:")
    print(f"  Pooler: postgresql://postgres.{project_id}:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres")
    print(f"  Direct: postgresql://postgres:[PASSWORD]@db.{project_id}.supabase.co:5432/postgres")
    sys.exit(1)

except Exception as e:
    print("")
    print("="*60)
    print("[ERROR] Unexpected error")
    print("="*60)
    print(f"  {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
