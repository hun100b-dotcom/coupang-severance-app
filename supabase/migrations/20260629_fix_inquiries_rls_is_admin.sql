-- 20260629_fix_inquiries_rls_is_admin.sql
-- ─────────────────────────────────────────────────────────────────────
-- 목적: inquiries 테이블 RLS를 "하드코딩 UUID" 정책에서
--       시스템 표준 public.is_admin() 기반 정책으로 정상화한다.
--
-- 배경(라이브 DB 확인됨, 2026-06-29):
--   운영 DB에 특정 UUID('82a3fb2c-6456-4f74-8ee4-d94d83d7372d' = catchmasterdmin)를
--   직접 비교하는 정책 2개가 수동 생성되어 있었다:
--     - "Admin can read all inquiries"   (SELECT, auth.uid() = '82a3fb2c…')
--     - "Admin can update all inquiries" (UPDATE, auth.uid() = '82a3fb2c…')
--   이 때문에 catchmasterdmin 외의 활성 관리자(admin_accounts에 is_active=true로 등록된
--   계정, 예: 카카오 로그인 dfc5238 / uid 66a7a58b…)는 문의 상태/답변 UPDATE가
--   RLS에 막혀 "성공 토스트는 떠도 DB는 안 바뀌는" 무음 실패가 발생했다.
--
-- 해결: 다른 admin 테이블(notices, admin_accounts 등)과 동일하게
--       public.is_admin() (= admin_accounts에 auth.email()이 is_active=true) 기반으로 통일.
--       이렇게 하면 admin_accounts에 등록된 모든 활성 관리자가 동일하게 동작한다.
--
-- 안전성: 모든 정책을 DROP IF EXISTS 후 재생성하므로 몇 번 실행해도(idempotent) 안전.
--         is_admin() / is_super_admin() 함수는 004_security_rls.sql에서 이미 정의됨.
-- ─────────────────────────────────────────────────────────────────────

-- ⚠️ 적용 전 1회 확인 (정책명 정확 일치 검증):
--   DROP POLICY IF EXISTS 는 이름이 1글자라도 다르면 조용히 통과하므로,
--   적용 전에 라이브 정책명을 먼저 캡처해 아래 DROP 문자열과 정확히 같은지 확인할 것.
--     SELECT policyname, cmd FROM pg_policies
--     WHERE schemaname='public' AND tablename='inquiries' ORDER BY cmd;
--   (만약 하드코딩 정책명이 아래와 다르면, 그 실제 이름으로 DROP 문을 교체.)

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 1) 하드코딩 UUID 정책 제거 (대시보드에서 수동 생성된 것)
DROP POLICY IF EXISTS "Admin can read all inquiries"   ON public.inquiries;
DROP POLICY IF EXISTS "Admin can update all inquiries" ON public.inquiries;

-- 2) 004 표준 정책도 안전하게 재정의 (이름 중복/구버전 정리)
DROP POLICY IF EXISTS "inquiries_select_own"   ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_select_admin" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_insert_auth"  ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_update_admin" ON public.inquiries;

-- 3) SELECT: 본인 문의 또는 관리자
CREATE POLICY "inquiries_select_own"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 4) INSERT: 인증 사용자는 본인 문의 생성
CREATE POLICY "inquiries_insert_auth"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5) UPDATE: 관리자만
--    USING       = 어떤 행을 수정 대상으로 "볼" 수 있는가
--    WITH CHECK  = 수정 후 행이 정책을 만족하는가
--    둘 다 public.is_admin() 으로 명시 (USING만 있으면 WITH CHECK가 USING을 따라가지만,
--    의도를 분명히 하기 위해 양쪽 모두 기재 — 종훈님 지시 사항)
CREATE POLICY "inquiries_update_admin"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────
-- 적용 후 검증 SQL (Supabase SQL Editor / MCP에서 실행):
--
--   -- (a) 정책이 is_admin() 기반인지 확인 (qual/with_check에 is_admin 포함, UUID 없음)
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'inquiries'
--   ORDER BY cmd, policyname;
--
--   -- (b) 카카오 계정(dfc5238@naver.com)이 is_admin 대상인지 확인
--   SELECT email, role, is_active
--   FROM public.admin_accounts
--   WHERE email = 'dfc5238@naver.com';
--   -- → is_active=true 이면 is_admin()=true → UPDATE 통과
-- ─────────────────────────────────────────────────────────────────────
