-- 20260630_p1b_legal_variables_writer.sql
-- 🟠 P1 후속 (높음): legal_variables 쓰기 과도권한 → is_admin_writer() 로 축소
-- ─────────────────────────────────────────────────────────────────────
--
-- 배경 (감사/추가 발견):
--   P1 본 마이그레이션(20260630_p1_role_enforcement.sql, 커밋 46d7f1f)은 "is_admin() →
--   is_admin_writer() 교체" 를 7개 테이블에 적용했다. 그런데 legal_variables 의 쓰기 정책은
--   원래부터 is_admin() 이 아니라 더 느슨한
--       "legal_variables 수정 허용"  FOR ALL  USING (auth.role() = 'authenticated')
--   (20260603_legal_variables.sql:25-26) 였다. 즉 is_admin() 교체 스코프 밖이라 7테이블
--   작업에서 빠졌고, 결과적으로 "로그인한 아무 일반 회원" 이 최저시급 등 법정변수를
--   INSERT/UPDATE/DELETE 할 수 있는 상태로 남아 있다.
--
-- 위험:
--   legal_variables(min_hourly_wage 등)는 4개 계산기(퇴직금·실업급여·주휴·연차)의 입력값으로
--   쓰인다. 임의 회원이 이 값을 바꾸면 전 사용자의 계산 결과가 오염된다(데이터 무결성 훼손).
--   읽기(SELECT)는 공개가 맞지만, 쓰기는 운영 관리자(super_admin·admin)로 좁혀야 한다.
--
-- 무엇을 하나:
--   "legal_variables 수정 허용"(FOR ALL authenticated) 제거 →
--   INSERT/UPDATE/DELETE 를 is_admin_writer() 전용으로 재생성. SELECT(조회 허용=true)는 유지.
--   → P1 의 3단계 권한 모델(viewer 읽기 / admin·super 쓰기)과 정합.
--
-- 의존성:
--   public.is_admin_writer() 가 먼저 존재해야 한다(20260630_p1_role_enforcement.sql 에서 생성).
--   안전을 위해 함수가 없으면 즉시 중단하는 가드를 둔다(아래 §0).
--
-- 안전성:
--   - 멱등(idempotent): 정책 DROP IF EXISTS 후 재생성.
--   - 가역(reversible): 파일 끝 [롤백] 섹션 참조.
--   - 동작 영향: 운영 관리자 전원 super_admin → is_admin_writer()=true → 정상 동작.
--     (단, 그동안 일반 회원이 직접 이 테이블을 쓰던 비공식 경로가 있었다면 차단됨 = 의도된 보안 강화.)
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration).
--           ※ 파일만 작성. 실제 적용은 Dispatch 가 MCP 로 수행.
-- ─────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════
-- [적용 전 1회 확인] 현재 legal_variables 쓰기 정책이 과도권한인지 캡처
-- ═════════════════════════════════════════════════════════════════════
--   SELECT policyname, cmd, roles, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public' AND tablename='legal_variables'
--    ORDER BY cmd, policyname;
--   -- → "legal_variables 수정 허용" 의 cmd=ALL, qual 에 auth.role()='authenticated' 가
--   --   보이면 과도권한 상태(이 마이그레이션 대상).
-- ─────────────────────────────────────────────────────────────────────


-- ── §0. 선행 함수 존재 가드 ─────────────────────────────────────────────
-- is_admin_writer() 가 없으면(=P1 본 마이그레이션 미적용) 잘못된 정책이 생기지 않도록 중단.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'is_admin_writer'
  ) THEN
    RAISE EXCEPTION 'public.is_admin_writer() 가 없습니다. 먼저 20260630_p1_role_enforcement.sql 을 적용하세요.';
  END IF;
END $$;


-- ── §1. 과도권한 쓰기 정책 제거 + writer 전용 재생성 ──────────────────────
ALTER TABLE public.legal_variables ENABLE ROW LEVEL SECURITY;

-- SELECT("legal_variables 조회 허용" = USING(true)) 은 건드리지 않음 → 공개 조회 유지.
DROP POLICY IF EXISTS "legal_variables 수정 허용"     ON public.legal_variables;
DROP POLICY IF EXISTS "legal_variables_insert_writer" ON public.legal_variables;
DROP POLICY IF EXISTS "legal_variables_update_writer" ON public.legal_variables;
DROP POLICY IF EXISTS "legal_variables_delete_writer" ON public.legal_variables;

CREATE POLICY "legal_variables_insert_writer"
  ON public.legal_variables FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "legal_variables_update_writer"
  ON public.legal_variables FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "legal_variables_delete_writer"
  ON public.legal_variables FOR DELETE
  TO authenticated
  USING (public.is_admin_writer());


-- ═════════════════════════════════════════════════════════════════════
-- [적용 후 검증 SQL]
-- ═════════════════════════════════════════════════════════════════════
--   -- (1) 쓰기 3종이 writer 기반인지 + authenticated 전체 쓰기 정책이 사라졌는지
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public' AND tablename='legal_variables'
--    ORDER BY cmd, policyname;
--   -- → INSERT/UPDATE/DELETE 정책의 qual/with_check 에 is_admin_writer() 포함,
--   --   "auth.role() = 'authenticated'" 쓰기 정책은 없어야 정상. SELECT 는 USING(true) 유지.
--
--   -- (2) viewer 쓰기 차단 이론 검증 (admin_accounts 판정식 재현)
--   SELECT email, role, is_active,
--          (role IN ('super_admin','admin') AND is_active) AS pass_is_admin_writer
--     FROM public.admin_accounts ORDER BY role, email;
--   -- → viewer 행: pass_is_admin_writer=false → legal_variables 쓰기 차단.
--
--   -- (3) 실제 세션 검증: 일반 회원(비관리자) 세션에서
--   --     UPDATE public.legal_variables SET value=value WHERE key='min_hourly_wage';
--   --     → 0 rows (RLS 차단). super/admin 세션에서는 정상 통과.
-- ─────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════
-- [롤백] 원복이 필요할 때만 — 원래의 과도권한으로 되돌림(권장하지 않음)
-- ═════════════════════════════════════════════════════════════════════
--   DROP POLICY IF EXISTS "legal_variables_insert_writer" ON public.legal_variables;
--   DROP POLICY IF EXISTS "legal_variables_update_writer" ON public.legal_variables;
--   DROP POLICY IF EXISTS "legal_variables_delete_writer" ON public.legal_variables;
--   CREATE POLICY "legal_variables 수정 허용" ON public.legal_variables
--     FOR ALL USING (auth.role() = 'authenticated');
-- ─────────────────────────────────────────────────────────────────────


DO $$
BEGIN
  RAISE NOTICE '✅ P1b 적용: legal_variables 쓰기를 is_admin_writer() 전용으로 축소';
  RAISE NOTICE '  - 이전: FOR ALL authenticated(로그인 회원 누구나 법정변수 수정 가능)';
  RAISE NOTICE '  - 이후: INSERT/UPDATE/DELETE = is_admin_writer (super_admin·admin), SELECT 공개 유지';
END $$;
