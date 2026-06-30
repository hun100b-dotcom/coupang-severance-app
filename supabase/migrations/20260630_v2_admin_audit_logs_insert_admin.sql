-- 20260630_v2_admin_audit_logs_insert_admin.sql
-- 🟠 V2 (높음): admin_audit_logs INSERT WITH CHECK true → 감사로그 위조 가능
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나:
--   002_admin_audit_logs.sql 의 INSERT 정책이 WITH CHECK (true) 라,
--   인증된 누구나(admin_accounts 미등록 일반 사용자 포함) admin_audit_logs 에
--   임의의 감사 기록을 삽입할 수 있다 → 흔적 위장/로그 오염.
--
-- 코드 영향 확인 결과 (적용 안전):
--   ⚠ 핵심: 실제로 코드가 쓰는 감사 테이블은 public.audit_logs 이며,
--   admin_audit_logs(002) 는 컬럼 구조(target_table/detail)가 코드와 달라
--   백엔드(_write_audit→audit_logs)·프론트(logAdminAction→audit_logs) 어디서도
--   사용되지 않는 별개의 미사용 테이블이다(20260629_audit_logs_schema.sql 주석 참고).
--   따라서 admin_audit_logs 의 INSERT 를 조여도 끊길 코드 경로가 없다.
--   (참고: 실사용 audit_logs 는 이미 is_admin() INSERT 정책 + 백엔드 service-role
--    우회로 정상 동작 — V2 와 무관.)
--
-- 무엇을 하나:
--   admin_audit_logs INSERT 정책을 is_admin() 전용으로 교체.
--   (백엔드 service-role 은 RLS 를 우회하므로 어떤 정책이든 영향 없음.)
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration)

-- ── [적용 전 1회 확인] 이 테이블의 현재 INSERT 정책 + 실제 사용 여부 ──────────
--   -- (a) 현재 정책(여기에 with_check='true' 가 보이면 취약 상태):
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public' AND tablename='admin_audit_logs';
--   -- (b) 미사용 테이블 확인(행이 0이거나 매우 적으면 dead 가능성↑):
--   SELECT count(*) FROM public.admin_audit_logs;
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 기존 무제한 INSERT 정책 제거 후 is_admin() 전용으로 재생성
DROP POLICY IF EXISTS "audit_logs_insert" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_insert_admin"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ V2 적용: admin_audit_logs INSERT 를 is_admin() 전용으로 제한 (위조 차단)';
  RAISE NOTICE '  - 실사용 audit_logs/백엔드 감사기록 경로는 영향 없음(service-role 우회)';
END $$;

-- ── [롤백] (원복이 필요할 때만 — 권장하지 않음) ────────────────────────
--   DROP POLICY IF EXISTS "admin_audit_logs_insert_admin" ON public.admin_audit_logs;
--   CREATE POLICY "audit_logs_insert" ON public.admin_audit_logs
--     FOR INSERT TO authenticated WITH CHECK (true);
-- ─────────────────────────────────────────────────────────────────────
