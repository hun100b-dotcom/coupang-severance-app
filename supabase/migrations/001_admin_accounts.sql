-- 001_admin_accounts.sql
-- 관리자 계정 관리 테이블
-- 사용처: frontend/src/components/admin/menus/AccountsMenu.tsx
--
-- 권한 레벨:
--   super_admin: 계정 추가/삭제 포함 모든 권한
--   admin: 공지/문의/설정 등 일반 관리 권한
--   viewer: 읽기 전용

-- ── 관리자 계정 테이블 생성 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  role          text NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('super_admin', 'admin', 'viewer')),
  display_name  text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_accounts_updated_at ON public.admin_accounts;
CREATE TRIGGER admin_accounts_updated_at
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS 활성화 ────────────────────────────────────────────────────────
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 조회 가능 (추가 권한 체크는 004_security_rls.sql에서)
CREATE POLICY "admin_accounts_select"
  ON public.admin_accounts FOR SELECT
  TO authenticated
  USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON public.admin_accounts(email);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON public.admin_accounts(role);
