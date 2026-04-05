-- 20260405_fix_job_postings_rls.sql
-- job_postings RLS 정책 버그 수정
-- ─────────────────────────────────────────────────────────────────────
--
-- 버그 원인:
--   20260402_job_postings.sql의 UPDATE/DELETE/INSERT 정책이
--   `admin_accounts.id = auth.uid()` 로 비교했는데,
--   admin_accounts.id 는 자체 UUID(gen_random_uuid), auth.uid() 는 Supabase 인증 UID로 다름.
--   → 관리자 계정으로 로그인해도 공고 수정/삭제/추가가 항상 실패함.
--
-- 해결책:
--   다른 테이블(notices, inquiries 등)과 동일하게 is_admin() 함수 사용.
--   is_admin() = admin_accounts.email = auth.email() AND is_active = true

-- ── SELECT: 관리자 전체 조회 정책 교체 ──────────────────────────────
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.job_postings;
CREATE POLICY "Admins can view all jobs"
  ON public.job_postings FOR SELECT
  USING (public.is_admin());

-- ── INSERT: 관리자 공고 생성 정책 교체 ──────────────────────────────
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.job_postings;
CREATE POLICY "Admins can insert jobs"
  ON public.job_postings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ── UPDATE: 관리자 공고 수정 정책 교체 ──────────────────────────────
DROP POLICY IF EXISTS "Admins can update jobs" ON public.job_postings;
CREATE POLICY "Admins can update jobs"
  ON public.job_postings FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── DELETE: 관리자 공고 삭제 정책 교체 ──────────────────────────────
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.job_postings;
CREATE POLICY "Admins can delete jobs"
  ON public.job_postings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── 완료 메시지 ──────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ 20260405_fix_job_postings_rls.sql 마이그레이션 완료';
  RAISE NOTICE '  - job_postings UPDATE/DELETE/INSERT/SELECT 정책을 is_admin() 기반으로 교체';
  RAISE NOTICE '  - 이전: admin_accounts.id = auth.uid() (항상 실패)';
  RAISE NOTICE '  - 이후: is_admin() = admin_accounts.email = auth.email() (정상 작동)';
END $$;
