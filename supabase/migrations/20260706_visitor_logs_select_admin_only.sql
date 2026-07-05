-- ============================================================
-- 20260706_visitor_logs_select_admin_only
-- visitor_logs SELECT 를 어드민 전용으로 축소(보안 드리프트 교정).
--
-- 배경(2026-07-06 RLS 실측): 라이브 SELECT 정책이 public 전체읽기(qual=true)라
--   anon 키로 누구나 방문 로그(session_id·user_id·referrer·utm)를 조회할 수 있었다
--   (마이그레이션 파일의 'authenticated only' 의도와 드리프트). 이제 방문자 분석은
--   백엔드 service-role 경로(RLS 우회)로만 읽으므로 클라이언트 SELECT 가 전혀 필요 없다
--   → anon/일반 사용자 읽기를 차단해 개인정보 노출을 막는다.
-- INSERT("Anyone can insert visitor logs" WITH CHECK true)는 비로그인 방문 기록 수집에
--   필요하므로 그대로 유지. 백엔드(service-role)는 RLS 를 우회하므로 어드민 집계 영향 없음.
-- ★ 이미 프로덕션에 적용됨(Supabase MCP). 이 파일은 IaC 정합을 위한 기록.
-- ============================================================

DROP POLICY IF EXISTS "Admins can read visitor logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Authenticated users can read visitor logs" ON public.visitor_logs;

CREATE POLICY "Admins can read visitor logs"
  ON public.visitor_logs
  FOR SELECT
  USING (public.is_admin());

-- 적용 확인:
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='visitor_logs';
--   → SELECT 정책 qual = is_admin() 이어야 함.
