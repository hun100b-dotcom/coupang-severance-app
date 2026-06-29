-- 20260629_audit_logs_schema.sql
-- ─────────────────────────────────────────────────────────────────────
-- 목적: 코드가 실제로 사용하는 audit_logs 테이블의 스키마를 마이그레이션으로 고정(IaC).
--
-- 배경:
--   _write_audit(백엔드), AuditMenu/adminAuditLog(프론트)는 모두 public.audit_logs 를
--   사용하지만, 이 테이블은 마이그레이션에 정의가 없었다(대시보드 수동 생성 추정).
--   마이그레이션의 admin_audit_logs(002)는 컬럼이 target_table/detail 로 코드와 달라
--   실제로는 사용되지 않는 별개 테이블이다.
--   → audit_logs 의 컬럼이 코드와 하나라도 어긋나면 INSERT 가 조용히 실패(컬럼 없음)하여
--      감사 기록이 영구 누락될 수 있다. 스키마를 코드 기준으로 고정한다.
--
-- 안전성: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS 로 idempotent.
--         이미 존재하면 누락 컬럼만 보강한다(기존 데이터 보존).
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  before_val  jsonb,
  after_val   jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 이미 테이블이 존재하되 일부 컬럼이 빠졌을 수 있으니 idempotent 하게 보강
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id   text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS before_val  jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS after_val   jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address  text;

-- RLS: 조회는 관리자(is_admin)만. 기록(INSERT)은 백엔드 service-role 이 RLS 를 우회하므로
--      정책과 무관하게 항상 가능하다. 아래 정책은 혹시 모를 경로 A 접근에 대한 방어선.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 조회 성능 인덱스 (AuditMenu 필터/정렬 대응)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email ON public.audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs (action);

-- ─────────────────────────────────────────────────────────────────────
-- 적용 전 1회 확인(기존 audit_logs 의 실제 컬럼이 코드와 일치하는지):
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='audit_logs' ORDER BY ordinal_position;
-- ─────────────────────────────────────────────────────────────────────
