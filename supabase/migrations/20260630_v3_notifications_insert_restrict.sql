-- 20260630_v3_notifications_insert_restrict.sql
-- 🟠 V3 (높음): notifications INSERT WITH CHECK true → 아무나 타인에게 알림 생성(피싱/스팸)
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나:
--   20260410_notifications.sql 의 INSERT 정책이 WITH CHECK (true) 라,
--   인증된 누구나 임의의 user_id 로 알림을 생성할 수 있다 → 타인에게 가짜 알림
--   (피싱 링크/스팸) 주입 가능.
--
-- 코드 영향 확인 결과 (적용 안전 — 단, 정책 설계 주의):
--   notifications 에 INSERT 하는 코드 경로는 단 하나:
--     frontend ApplicantsMenu.tsx (출근확정/거절 시) — 로그인한 "관리자"가
--     "지원자(타인)" 의 user_id 로 알림을 INSERT 한다.
--   → 즉 어드민은 auth.uid() ≠ user_id 인 행을 넣어야 하므로,
--     단순히 auth.uid()=user_id 로만 막으면 이 기능이 깨진다.
--   → 따라서 (auth.uid()=user_id) OR public.is_admin() 으로 허용.
--     이는 같은 화면의 job_applications UPDATE 가 이미 is_admin() 을 요구하는
--     기존 RLS 모델과 동일한 권한 수준이라 동작 정합성이 유지된다.
--   백엔드는 notifications 에 직접 INSERT 하지 않으며(notify.py 는 Discord 웹훅),
--   만약 향후 백엔드가 넣더라도 service-role 은 RLS 를 우회하므로 무관.
--
-- 무엇을 하나:
--   INSERT 정책을 본인 알림 또는 관리자만 가능하도록 교체.
--   (SELECT/UPDATE 정책은 본인 한정으로 이미 안전 → 변경하지 않음.)
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration)

-- ── [적용 전 1회 확인] 현재 INSERT 정책 점검 ──────────────────────────────
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public' AND tablename='notifications';
--   -- with_check='true' 인 INSERT 정책이 보이면 취약 상태.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 기존 무제한 INSERT 정책 제거 (한글 정책명 — 20260410 에서 생성됨)
DROP POLICY IF EXISTS "인증된 사용자 삽입 허용" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;

CREATE POLICY "notifications_insert_self_or_admin"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ V3 적용: notifications INSERT 를 본인 또는 is_admin() 전용으로 제한';
  RAISE NOTICE '  - 어드민 지원자 확정/거절 알림 발송은 is_admin() 경로로 계속 동작';
  RAISE NOTICE '  ⚠ 단, 알림 발송 관리자가 admin_accounts(is_active=true)에 등록돼 있어야 함';
END $$;

-- ── [롤백] (원복이 필요할 때만 — 권장하지 않음) ────────────────────────
--   DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;
--   CREATE POLICY "인증된 사용자 삽입 허용" ON public.notifications
--     FOR INSERT WITH CHECK (true);
-- ─────────────────────────────────────────────────────────────────────
