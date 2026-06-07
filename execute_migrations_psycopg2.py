"""
마이그레이션 007, 008 자동 실행 스크립트 (psycopg2 사용)
PostgreSQL에 직접 연결하여 SQL 실행
"""

import os
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2가 설치되지 않았습니다.")
    print("다음 명령어로 설치하세요:")
    print("pip install psycopg2-binary")
    exit(1)

# Supabase 연결 정보
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hmjxrqhcwjyfkvlcejfc.supabase.co")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")

if not SUPABASE_DB_PASSWORD:
    print("❌ SUPABASE_DB_PASSWORD 환경 변수가 설정되지 않았습니다.")
    print()
    print("Supabase Dashboard → Settings → Database → Connection String에서 비밀번호를 확인하세요.")
    print("예시: set SUPABASE_DB_PASSWORD=your_db_password")
    exit(1)

# PostgreSQL 연결 문자열 생성
# Supabase URL에서 프로젝트 ID 추출
project_id = SUPABASE_URL.split("//")[1].split(".")[0]
db_host = f"db.{project_id}.supabase.co"
db_name = "postgres"
db_user = "postgres"
db_port = 5432

connection_string = f"postgresql://{db_user}:{SUPABASE_DB_PASSWORD}@{db_host}:{db_port}/{db_name}"

# 마이그레이션 파일 경로
migrations_dir = Path(__file__).parent / "supabase" / "migrations"
migration_files = [
    "007_marketing_consent_separation.sql",
    "008_user_access_logs.sql",
]

print("🚀 CATCH 법적 준수 마이그레이션 실행 시작\n")
print(f"📡 연결 정보: {db_host}")

try:
    # PostgreSQL 연결
    conn = psycopg2.connect(connection_string)
    conn.autocommit = True
    cursor = conn.cursor()

    print("✅ Supabase PostgreSQL 연결 성공\n")

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
            print(f"✅ {migration_file} 실행 완료\n")

        except Exception as e:
            print(f"❌ {migration_file} 실행 실패: {e}\n")
            print(f"   SQL 내용:\n{sql_content[:500]}...\n")

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
    for col in marketing_columns:
        print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

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
            print(f"   - {col[0]}: {col[1]}")

    # 연결 종료
    cursor.close()
    conn.close()

    print("\n✅ 마이그레이션 실행 및 검증 완료!")

except psycopg2.Error as e:
    print(f"❌ PostgreSQL 연결 실패: {e}")
    print("\n💡 해결 방법:")
    print("1. Supabase Dashboard → Settings → Database")
    print("2. 'Reset database password'로 새 비밀번호 생성")
    print("3. 환경 변수 설정: set SUPABASE_DB_PASSWORD=새_비밀번호")
    print("4. 다시 실행")
except Exception as e:
    print(f"❌ 오류 발생: {e}")
