"""
Supabase PostgreSQL에 직접 연결하여 마이그레이션 실행
psycopg2 사용
"""

import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2-binary가 설치되지 않았습니다.")
    print("설치 중...")
    os.system("python -m pip install psycopg2-binary")
    import psycopg2

# Supabase 연결 정보
SUPABASE_URL = "https://hmjxrqhcwjyfkvlcejfc.supabase.co"
project_id = "hmjxrqhcwjyfkvlcejfc"

# PostgreSQL 연결 정보
# Supabase는 기본적으로 프로젝트별로 PostgreSQL 데이터베이스를 제공합니다.
# 연결 문자열 형식: postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

print("🔐 Supabase Database 비밀번호가 필요합니다.")
print("Supabase Dashboard → Settings → Database → Database Password")
print()

# 환경 변수에서 비밀번호 가져오기 시도
db_password = os.getenv("SUPABASE_DB_PASSWORD")

if not db_password:
    print("환경 변수 SUPABASE_DB_PASSWORD가 설정되지 않았습니다.")
    print("비밀번호를 직접 입력하거나, 다음 명령어로 환경 변수를 설정하세요:")
    print(f"set SUPABASE_DB_PASSWORD=your_password")
    print()

    # 사용자 입력 받기
    db_password = input("Database Password를 입력하세요 (입력하지 않으려면 Enter): ").strip()

    if not db_password:
        print("\n❌ 비밀번호 없이는 진행할 수 없습니다.")
        print("\n💡 해결 방법:")
        print("1. Supabase Dashboard → Settings → Database")
        print("2. 'Database Password' 섹션에서 비밀번호 확인 또는 재설정")
        print("3. 다음 명령어로 환경 변수 설정:")
        print("   set SUPABASE_DB_PASSWORD=복사한_비밀번호")
        print("4. 이 스크립트 다시 실행")
        sys.exit(1)

# PostgreSQL 연결 문자열
connection_string = f"postgresql://postgres.{project_id}:{db_password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# 마이그레이션 파일 경로
migrations_dir = Path(__file__).parent / "supabase" / "migrations"
migration_files = [
    "007_marketing_consent_separation.sql",
    "008_user_access_logs.sql",
]

print("\n🚀 CATCH 법적 준수 마이그레이션 실행 시작\n")
print(f"📡 연결 대상: db.{project_id}.supabase.co")

try:
    # PostgreSQL 연결
    print("🔗 Supabase PostgreSQL 연결 중...")
    conn = psycopg2.connect(connection_string)
    conn.autocommit = True
    cursor = conn.cursor()

    print("✅ Supabase PostgreSQL 연결 성공!\n")

    for migration_file in migration_files:
        file_path = migrations_dir / migration_file

        if not file_path.exists():
            print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
            continue

        print(f"📄 {migration_file} 실행 중...")

        # SQL 파일 읽기
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        try:
            # SQL 실행
            cursor.execute(sql_content)
            print(f"✅ {migration_file} 실행 완료!\n")

        except psycopg2.Error as e:
            print(f"❌ {migration_file} 실행 실패: {e}\n")
            if "already exists" in str(e) or "duplicate" in str(e):
                print("   (이미 존재하는 객체입니다. 무시하고 계속 진행합니다.)\n")
            else:
                print(f"   SQL 내용 일부:\n{sql_content[:300]}...\n")

    # 검증 쿼리 실행
    print("\n🔍 마이그레이션 검증 중...\n")

    # 1. profiles 테이블의 marketing 컬럼 확인
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name LIKE 'marketing%'
        ORDER BY column_name;
    """)
    marketing_columns = cursor.fetchall()

    print("📋 profiles 테이블의 마케팅 컬럼:")
    if marketing_columns:
        for col in marketing_columns:
            print(f"   ✓ {col[0]}: {col[1]} (nullable: {col[2]})")
    else:
        print("   ⚠️  마케팅 컬럼을 찾을 수 없습니다.")

    # 2. user_access_logs 테이블 존재 확인
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'user_access_logs'
        );
    """)
    table_exists = cursor.fetchone()[0]

    print(f"\n📋 user_access_logs 테이블: {'✅ 존재함' if table_exists else '❌ 없음'}")

    if table_exists:
        # user_access_logs 테이블 구조 확인
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'user_access_logs'
            ORDER BY ordinal_position;
        """)
        access_log_columns = cursor.fetchall()

        print("   컬럼 목록:")
        for col in access_log_columns:
            print(f"   ✓ {col[0]}: {col[1]}")

    # 연결 종료
    cursor.close()
    conn.close()

    print("\n" + "="*60)
    print("✅ 마이그레이션 실행 및 검증 완료!")
    print("="*60)
    print("\n📋 다음 단계:")
    print("1. 프론트엔드 코드에서 마케팅 동의 UI 확인")
    print("2. 접근 로그 기록 동작 테스트")
    print("3. git commit 및 push")

except psycopg2.OperationalError as e:
    print(f"\n❌ PostgreSQL 연결 실패: {e}")
    print("\n💡 해결 방법:")
    print("1. Supabase Dashboard → Settings → Database")
    print("2. Connection Info 섹션에서 연결 문자열 확인")
    print("3. Database Password가 올바른지 확인")
    print("4. Connection pooler를 사용하는 경우:")
    print(f"   postgresql://postgres.{project_id}:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres")
    print("5. Direct connection을 사용하는 경우:")
    print(f"   postgresql://postgres:[PASSWORD]@db.{project_id}.supabase.co:5432/postgres")

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
