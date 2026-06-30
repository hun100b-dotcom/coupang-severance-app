-- 20260630_v6_function_search_path.sql
-- 🟡 V6 (중간): 함수 search_path 미설정 → search_path 하이재킹 위험 (특히 SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나:
--   is_admin() 등 다수 함수가 search_path 를 고정하지 않았다. SECURITY DEFINER 함수가
--   search_path 를 고정하지 않으면, 공격자가 자신의 세션 search_path 에 악성 스키마를
--   끼워 함수 내부의 unqualified 객체 참조를 가로챌 수 있다(권한 상승 표면).
--   (Supabase Advisor: function_search_path_mutable, 다수 WARN)
--
-- 코드 영향 확인 결과 (적용 안전):
--   search_path 를 public, pg_temp 로 고정하는 것은 동작을 바꾸지 않는다.
--   이 프로젝트의 함수들은 모두 public 스키마의 객체(admin_accounts, profiles 등)만
--   참조하므로, public 을 검색 경로에 두면 기존과 동일하게 해석된다. pg_temp 를
--   마지막에 둬 임시객체 가로채기를 차단한다(권장 패턴).
--   CREATE OR REPLACE 로 본문을 다시 쓰지 않고 ALTER FUNCTION ... SET 만 사용하므로
--   함수 로직/시그니처는 일절 변경되지 않는다.
--
-- 무엇을 하나:
--   public 스키마의 모든 함수 중 search_path 가 아직 설정되지 않은 것만 골라
--   ALTER FUNCTION ... SET search_path = public, pg_temp 적용(멱등).
--   대시보드 수동 생성으로 시그니처를 모르는 함수도 regprocedure 로 안전 처리.
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration)

-- ── [적용 전 1회 확인] search_path 미설정 함수 목록 ────────────────────────
--   SELECT p.proname, p.oid::regprocedure AS signature, p.prosecdef AS security_definer,
--          p.proconfig
--     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prokind='f'
--      AND NOT EXISTS (
--        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
--         WHERE c LIKE 'search_path=%')
--    ORDER BY p.proname;
--   -- 여기에 나오는 함수들이 이번에 search_path 가 고정될 대상이다.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'   -- 일반 함수만 (집계/프로시저 제외)
       AND NOT EXISTS (
         SELECT 1
           FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
          WHERE c LIKE 'search_path=%'
       )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
    RAISE NOTICE '  - search_path 고정: %', r.sig;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ V6 적용: public 함수들의 search_path = public, pg_temp 고정 완료';
  RAISE NOTICE '  - 함수 본문/시그니처 무변경(ALTER SET 만), 동작 동일';
END $$;

-- ── [롤백] (개별 함수 한정, 필요할 때만) ───────────────────────────────
--   ALTER FUNCTION public.<함수명>(<인자타입...>) RESET search_path;
-- ─────────────────────────────────────────────────────────────────────
