-- 004_security_rls.sql
-- RLS(Row Level Security) 보안 정책 강화
-- ─────────────────────────────────────────────────────────────────────
--
-- 현재 취약점 분석:
--   1. 어드민 페이지 접근 제어가 프론트엔드(이메일 비교)에만 존재
--      → VITE_ADMIN_EMAIL 환경변수를 알면 우회 가능
--      → 백엔드/DB 레벨 권한 체크 없음 (중요 취약점)
--   2. notices, inquiries 테이블의 INSERT/UPDATE/DELETE가
--      인증된 모든 사용자에게 허용될 수 있음
--   3. user_profiles 뷰가 모든 회원 이메일을 노출할 수 있음
--
-- 해결책:
--   - admin_accounts 테이블에 등록된 이메일만 관리 권한 부여
--   - 각 테이블별 세밀한 RLS 정책 적용

-- ── 헬퍼 함수: 현재 사용자가 관리자인지 확인 ─────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_accounts
    WHERE email = auth.email()
      AND is_active = true
  );
$$;

-- 슈퍼 관리자 여부 확인
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_accounts
    WHERE email = auth.email()
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

-- ── notices 테이블 RLS ────────────────────────────────────────────────
-- 공개 조회: 누구나 활성 공지 조회 가능
-- 수정/삭제: 관리자만 가능

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "notices_select_public"  ON public.notices;
DROP POLICY IF EXISTS "notices_insert_admin"   ON public.notices;
DROP POLICY IF EXISTS "notices_update_admin"   ON public.notices;
DROP POLICY IF EXISTS "notices_delete_admin"   ON public.notices;

-- 공개 조회 (활성 공지만)
CREATE POLICY "notices_select_public"
  ON public.notices FOR SELECT
  USING (is_active = true OR public.is_admin());

-- 관리자만 INSERT/UPDATE/DELETE
CREATE POLICY "notices_insert_admin"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "notices_update_admin"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "notices_delete_admin"
  ON public.notices FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── inquiries 테이블 RLS ──────────────────────────────────────────────
-- 사용자는 자신의 문의만 조회/생성 가능
-- 관리자는 모든 문의 조회/수정 가능

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_select_own"    ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_select_admin"  ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_insert_auth"   ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_update_admin"  ON public.inquiries;

-- 자신의 문의 또는 관리자
CREATE POLICY "inquiries_select_own"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- 인증된 사용자는 문의 생성 가능
CREATE POLICY "inquiries_insert_auth"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 관리자만 상태 업데이트 가능
CREATE POLICY "inquiries_update_admin"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── reports 테이블 RLS ────────────────────────────────────────────────
-- 사용자는 자신의 리포트만 접근 가능
-- 관리자는 모든 리포트 조회 가능

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own"   ON public.reports;
DROP POLICY IF EXISTS "reports_insert_own"   ON public.reports;
DROP POLICY IF EXISTS "reports_delete_own"   ON public.reports;

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_delete_own"
  ON public.reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

-- ── profiles 테이블 RLS ───────────────────────────────────────────────
-- 사용자는 자신의 프로필만 조회/수정 가능
-- 관리자는 모든 프로필 조회 가능

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ── user_profiles 뷰 접근 제한 ───────────────────────────────────────
-- user_profiles 뷰는 관리자만 조회 가능하도록 뷰를 재정의
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.raw_app_meta_data
FROM auth.users u
WHERE public.is_admin();  -- 관리자만 조회 가능

-- ── admin_accounts 강화 RLS ───────────────────────────────────────────
-- super_admin만 계정 추가/수정/삭제 가능

DROP POLICY IF EXISTS "admin_accounts_insert"  ON public.admin_accounts;
DROP POLICY IF EXISTS "admin_accounts_update"  ON public.admin_accounts;
DROP POLICY IF EXISTS "admin_accounts_delete"  ON public.admin_accounts;

CREATE POLICY "admin_accounts_insert"
  ON public.admin_accounts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "admin_accounts_update"
  ON public.admin_accounts FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "admin_accounts_delete"
  ON public.admin_accounts FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ── 보안 취약점 문서화 (주석) ─────────────────────────────────────────
-- [취약점 1] 프론트엔드 전용 어드민 체크 (AdminPage.tsx)
--   현재: user.email === VITE_ADMIN_EMAIL 비교만으로 접근 제어
--   위험: 클라이언트 코드 수정으로 우회 가능
--   해결: is_admin() 함수 + RLS 정책으로 DB 레벨에서 차단 (이 파일에서 적용)
--
-- [취약점 2] VITE_ADMIN_EMAIL 환경변수 노출
--   현재: Vercel 빌드 시 번들에 포함되어 브라우저에서 확인 가능
--   해결: 어드민 인증을 DB 기반(admin_accounts 테이블)으로 전환 권장
--
-- [취약점 3] user_profiles 뷰가 모든 회원 이메일 노출
--   해결: 뷰에 is_admin() 조건 추가 (이 파일 상단에서 적용)
