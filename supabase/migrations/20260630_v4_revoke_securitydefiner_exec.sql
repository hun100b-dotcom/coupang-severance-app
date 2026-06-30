-- 20260630_v4_revoke_securitydefiner_exec.sql
-- 🟠 V4 (높음): anon 이 호출 가능한 SECURITY DEFINER / 트리거 함수의 EXECUTE 회수
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나:
--   write_system_log(로그 위조), handle_inquiry_answer, touch_session,
--   on_* 트리거 함수가 PUBLIC EXECUTE(기본값) 라서 anon/authenticated 가 RPC
--   (/rest/v1/rpc/<함수명>) 로 직접 호출 가능하다. 트리거 전용/내부 전용 함수가
--   외부에서 호출되면 로그 위조·부수효과 유발 등의 표면이 된다.
--
-- 코드 영향 확인 결과 (적용 안전):
--   frontend/src 전체에서 supabase .rpc( 호출 0건, /rpc/ 0건.
--   backend 도 PostgREST 테이블 경로만 사용하고 rpc 호출 없음.
--   → 이 함수들은 트리거(테이블 이벤트)로만 실행되거나 내부 전용이므로,
--     anon/authenticated 의 직접 EXECUTE 를 회수해도 끊길 외부 호출 경로가 없다.
--   ※ 트리거 함수는 트리거 발화 시 테이블 소유자 권한으로 실행되므로,
--     호출자(anon/authenticated)의 EXECUTE 회수와 무관하게 정상 동작한다.
--   ※ is_admin()/is_super_admin() 은 RLS 정책 평가에 쓰이므로 EXECUTE 를
--     회수하지 않는다(회수하면 정책 평가가 깨질 수 있음). 여기 대상에서 제외.
--
-- 무엇을 하나:
--   대상 함수(이름 목록 + on_* 패턴)의 EXECUTE 를 anon, authenticated 에서 회수.
--   대시보드에서 수동 생성돼 인자 시그니처를 알 수 없는 함수도 안전하게 처리하도록
--   pg_proc 를 순회하며 regprocedure 시그니처로 동적 REVOKE 한다(존재하는 것만).
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration)

-- ── [적용 전 1회 확인] 대상 함수 존재/현재 권한 확인 ──────────────────────
--   SELECT p.proname, p.oid::regprocedure AS signature, p.prosecdef AS security_definer,
--          pg_catalog.array_to_string(p.proacl, E'\n') AS current_acl
--     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public'
--      AND (p.proname IN ('write_system_log','handle_inquiry_answer','touch_session')
--           OR p.proname LIKE 'on\_%')
--    ORDER BY p.proname;
--   -- current_acl 에 anon=X / authenticated=X 또는 비어있음(=PUBLIC 상속)이면 호출 가능 상태.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND (
         p.proname IN ('write_system_log', 'handle_inquiry_answer', 'touch_session')
         OR p.proname LIKE 'on\_%'   -- on_auth_user_created 등 트리거 함수
       )
  LOOP
    -- PUBLIC 상속 EXECUTE 도 함께 끊어 확실히 차단
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    RAISE NOTICE '  - EXECUTE 회수: %', r.sig;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ V4 적용: 트리거/내부 전용 함수의 anon·authenticated EXECUTE 회수 완료';
  RAISE NOTICE '  - 트리거 발화/내부 호출은 영향 없음, 외부 RPC 직접 호출만 차단';
END $$;

-- ── [롤백] (특정 함수의 직접 호출이 필요해질 때만, 시그니처 지정) ─────────
--   GRANT EXECUTE ON FUNCTION public.<함수명>(<인자타입...>) TO authenticated;
-- ─────────────────────────────────────────────────────────────────────
