# Supabase SQL Editor — 직접 실행 필요

아래 SQL을 **Supabase 대시보드 → SQL Editor**에서 복붙하여 실행하세요.

---

## 1. admin_accounts 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  role        text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_accounts IS '관리자 계정 목록 — role: admin(일반), superadmin(슈퍼)';
```

---

## 2. admin_audit_logs 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  text NOT NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  before_val   jsonb,
  after_val    jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS '관리자 행동 감사 로그';
```

---

## 3. user_profiles 뷰 생성

```sql
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  p.id,
  p.email,
  p.display_name,
  p.full_name,
  p.birthdate,
  p.phone_number,
  p.provider,
  p.marketing_sms,
  p.marketing_email,
  p.marketing_phone,
  p.onboarding_completed,
  p.created_at,
  p.updated_at,
  (SELECT COUNT(*) FROM public.reports r WHERE r.user_id = p.id) AS report_count
FROM public.profiles p;

COMMENT ON VIEW public.user_profiles IS '회원 관리용 통합 뷰 — profiles + 계산서 수 집계';
```

---

## 4. RLS 정책

```sql
-- profiles 테이블 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 읽기/수정
CREATE POLICY IF NOT EXISTS "profiles_self_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- audit_logs 테이블 RLS (서버 사이드 insert만 허용, 읽기는 서비스 키로만)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- admin_accounts 테이블 RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_accounts_service_key_only"
  ON public.admin_accounts FOR ALL
  USING (false);
```

---

## 5. Realtime 활성화 SQL

어드민 메뉴에서 Supabase Realtime 구독이 동작하려면 각 테이블의 REPLICA IDENTITY를 FULL로 설정해야 합니다.

```sql
-- profiles 테이블 Realtime 활성화
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- audit_logs 테이블 Realtime 활성화
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- notices 테이블 Realtime 활성화
ALTER TABLE public.notices REPLICA IDENTITY FULL;

-- job_postings 테이블 Realtime 활성화
ALTER TABLE public.job_postings REPLICA IDENTITY FULL;

-- inquiries 테이블 Realtime 활성화 (대시보드 KPI용)
ALTER TABLE public.inquiries REPLICA IDENTITY FULL;

-- reports 테이블 Realtime 활성화 (대시보드 KPI용)
ALTER TABLE public.reports REPLICA IDENTITY FULL;
```

> **Supabase 대시보드 GUI로 활성화하는 방법:**
> Database → Replication → 각 테이블 옆 토글 ON

---

## 실행 순서 권장

1. 섹션 1 (admin_accounts) 실행
2. 섹션 2 (audit_logs) 실행
3. 섹션 3 (user_profiles 뷰) 실행
4. 섹션 4 (RLS 정책) 실행
5. 섹션 5 (Realtime 활성화) 실행

이미 존재하는 테이블/뷰는 `IF NOT EXISTS` / `CREATE OR REPLACE` 덕분에 에러 없이 넘어갑니다.
