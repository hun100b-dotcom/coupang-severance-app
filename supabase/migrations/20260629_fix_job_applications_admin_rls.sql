-- 20260629_fix_job_applications_admin_rls.sql
-- ─────────────────────────────────────────────────────────────────────
-- 목적: job_applications(지원 내역)의 관리자 SELECT/UPDATE 정책을
--       시스템 표준 public.is_admin() 기반으로 교정한다.
--
-- 배경(버그 확정):
--   20260410_applications_personal_info.sql 의 관리자 정책 2개가
--     EXISTS (SELECT 1 FROM admin_accounts
--             WHERE admin_accounts.id = auth.uid() AND is_active = true)
--   형태로 되어 있다. 그런데 admin_accounts.id 는 001에서 gen_random_uuid()
--   로 생성되는 "테이블 자체 PK"이고, 사용자의 auth.uid()(로그인 사용자 UUID)와
--   전혀 무관하다. 즉 'admin_accounts.id = auth.uid()' 는 사실상 항상 거짓 →
--   관리자(예: 카카오 dfc5238)가 지원자 상태를 변경(UPDATE)해도 RLS가 0행으로
--   막았고, 프론트가 .select() 없이 update 해서 그 0행 차단이 error=null 로
--   조용히 통과(거짓 성공)했다.
--
-- 표준: is_admin() = (admin_accounts.email = auth.email() AND is_active=true)
--       → admin_accounts 에 등록된 모든 활성 관리자가 동일하게 동작.
--
-- 안전성: 사용자 본인 정책("applications_own", FOR ALL)은 그대로 둔다.
--         관리자 정책만 추가(OR 결합)되므로 일반 사용자 권한에는 영향 없음.
--         DROP IF EXISTS 후 재생성 → idempotent.
-- ─────────────────────────────────────────────────────────────────────

-- ⚠️ 적용 전 1회 확인(정책명 정확 일치):
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='job_applications' ORDER BY cmd;
--   (아래 DROP 대상명과 라이브 정책명이 정확히 같은지 확인 후 적용.)

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- 1) 깨진 admin_accounts.id = auth.uid() 기반 정책 제거
DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can update applications"   ON public.job_applications;

-- 2) is_admin() 표준 정책으로 재생성 (재실행 대비 신규 이름도 먼저 DROP → 완전 idempotent)
DROP POLICY IF EXISTS "applications_select_admin" ON public.job_applications;
DROP POLICY IF EXISTS "applications_update_admin" ON public.job_applications;

CREATE POLICY "applications_select_admin"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "applications_update_admin"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3) status CHECK 제약에 'reviewing' 추가
--    배경: 20260410_job_applications_rejected.sql 에서 CHECK 가
--      ('applied','confirmed','completed','cancelled','rejected') 로 정의돼
--      'reviewing' 이 빠져 있다. 그런데 프론트(ApplicantsMenu)에는 "검토중" 버튼이
--      있어, status='reviewing' UPDATE 가 CHECK 위반(23514)으로 실패한다.
--      RLS 를 고쳐도 검토중 전환은 이 제약 때문에 계속 깨지므로 함께 교정.
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('applied', 'reviewing', 'confirmed', 'completed', 'cancelled', 'rejected'));

-- ─────────────────────────────────────────────────────────────────────
-- 적용 후 검증:
--   SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='job_applications' ORDER BY cmd;
--   → admin 정책의 qual/with_check 에 is_admin() 포함, admin_accounts.id 비교 없음.
-- ─────────────────────────────────────────────────────────────────────
