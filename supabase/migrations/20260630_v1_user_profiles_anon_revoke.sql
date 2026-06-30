-- 20260630_v1_user_profiles_anon_revoke.sql
-- 🔴 V1 (치명): 비로그인(anon)도 전체 회원 이메일을 읽을 수 있던 user_profiles 뷰 차단
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나:
--   public.user_profiles 뷰가 auth.users 의 id/email/created_at/last_sign_in_at/
--   raw_app_meta_data 를 노출한다. 이 뷰는 ① 기본이 SECURITY DEFINER(뷰 소유자 권한
--   = postgres 으로 실행되어 auth.users 의 RLS 를 우회) 이고 ② anon/authenticated 에
--   SELECT 권한이 부여돼 있어, 비로그인자가 /rest/v1/user_profiles 한 번으로
--   가입자 전원의 이메일·가입일·로그인기록을 수집할 수 있었다.
--   (Supabase Advisor: auth_users_exposed + security_definer_view, 둘 다 ERROR)
--
-- 코드 영향 확인 결과 (적용 안전):
--   frontend/src + backend 전체 grep 결과 'user_profiles' 참조 0건.
--   회원 목록은 이미 백엔드 /admin/members (service-role + 서버측 마스킹) 로 대체됨
--   (MembersMenu.tsx → getAdminMembers). 즉 이 뷰는 현재 죽은(dead) 객체이므로
--   클라이언트 권한을 회수해도 로그인/프로필/어드민 어떤 기능도 끊기지 않는다.
--
-- 무엇을 하나 (2중 방어, 비파괴·가역):
--   1) anon/authenticated/PUBLIC 의 모든 권한 회수 → 클라이언트가 더는 못 읽음
--      (auth_users_exposed 해소). service-role 은 회수 대상이 아니라 백엔드 무관.
--   2) security_invoker=on 으로 전환 → 뷰가 호출자 권한으로 실행되어 auth.users RLS 를
--      더는 우회하지 않음 (security_definer_view 해소).
--   ※ 뷰를 DROP 하지 않고 남겨둠(가역성). 필요 시 롤백으로 즉시 원복 가능.
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration)

-- ── [적용 전 1회 확인] 현재 누가 이 뷰를 읽을 수 있는지 + 뷰 옵션 점검 ────────
--   -- (a) 현재 부여된 권한(여기서 anon/authenticated 가 보이면 노출 상태):
--   SELECT grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema='public' AND table_name='user_profiles';
--   -- (b) security_invoker 설정 여부(없으면 definer=취약):
--   SELECT c.relname, c.reloptions
--     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--    WHERE n.nspname='public' AND c.relname='user_profiles';
--   -- (c) anon 노출 실증(비로그인 키로 호출 시 행이 나오면 노출, 차단되면 0/권한오류):
--   --     curl "$SUPABASE_URL/rest/v1/user_profiles?select=email&limit=1" -H "apikey:$ANON_KEY"
-- ─────────────────────────────────────────────────────────────────────

-- 1) 클라이언트 권한 전면 회수 (anon 회원 이메일 노출 차단의 핵심)
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_profiles FROM authenticated;
REVOKE ALL ON public.user_profiles FROM PUBLIC;

-- 2) 뷰를 호출자 권한 실행으로 전환 (RLS 우회 제거 = security_definer_view 해소)
ALTER VIEW IF EXISTS public.user_profiles SET (security_invoker = on);

-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ V1 적용: user_profiles 뷰 anon/authenticated 권한 회수 + security_invoker=on';
  RAISE NOTICE '  - 회원 이메일은 더 이상 비로그인/일반 사용자에게 노출되지 않음';
  RAISE NOTICE '  - 어드민 회원 목록은 백엔드 /admin/members(서버측 마스킹) 경로로 정상 동작';
END $$;

-- ── [롤백] (원복이 필요할 때만) ────────────────────────────────────────
--   ALTER VIEW IF EXISTS public.user_profiles SET (security_invoker = off);
--   GRANT SELECT ON public.user_profiles TO authenticated;
--   -- (anon 에는 원래도 명시 GRANT 가 없었다면 다시 부여하지 말 것)
-- ─────────────────────────────────────────────────────────────────────
