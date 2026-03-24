-- 002_admin_audit_logs.sql
-- 관리자 행동 감사 로그 테이블
-- 사용처: frontend/src/components/admin/menus/AuditMenu.tsx
--
-- 모든 관리자 CRUD 행동을 기록합니다.
-- action 예시: 'create_notice', 'update_inquiry', 'delete_member', 'login', 'logout'

-- ── 감사 로그 테이블 생성 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email   text NOT NULL,                -- 행동을 수행한 관리자 이메일
  action        text NOT NULL,                -- 수행한 액션 (예: 'create_notice')
  target_table  text,                         -- 대상 테이블 (예: 'notices', 'inquiries')
  target_id     text,                         -- 대상 레코드 ID
  detail        jsonb,                        -- 변경 전/후 데이터 등 상세 정보
  ip_address    text,                         -- 클라이언트 IP (선택)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── RLS 활성화 ────────────────────────────────────────────────────────
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 조회 가능
CREATE POLICY "audit_logs_select"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- INSERT는 서비스 역할만 가능 (직접 삽입 방지)
CREATE POLICY "audit_logs_insert"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 인덱스 ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email ON public.admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target      ON public.admin_audit_logs(target_table, target_id);
