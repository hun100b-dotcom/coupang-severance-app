-- 005_super_admin_setup.sql
-- 슈퍼 관리자 초기 설정 및 권한 강화
-- ─────────────────────────────────────────────────────────────────────
--
-- 변경 사항:
--   1. is_super_admin() 함수 업데이트: catchmarsterdmin@gmail.com은 항상 슈퍼 관리자
--   2. admin_accounts role 체크 제약 완화 (커스텀 역할 지원)
--   3. system_settings에 permission_levels, member_unmask_key 키 추가
--   4. system_settings anon 읽기 허용 (CMS 배너 공개 조회)
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 붙여넣기 후 실행

-- ── 1. is_super_admin 함수 업데이트 ─────────────────────────────────
-- catchmarsterdmin@gmail.com은 admin_accounts 등록 없이도 슈퍼 관리자
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    auth.email() = 'catchmarsterdmin@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.admin_accounts
      WHERE email = auth.email()
        AND role = 'super_admin'
        AND is_active = true
    );
$$;

-- ── 2. admin_accounts role 제약 완화 (커스텀 역할 지원) ─────────────
ALTER TABLE public.admin_accounts
  DROP CONSTRAINT IF EXISTS admin_accounts_role_check;
-- 빈 역할 방지를 위한 최소 체크
ALTER TABLE public.admin_accounts
  ADD CONSTRAINT admin_accounts_role_notempty CHECK (char_length(trim(role)) > 0);

-- ── 3. system_settings에 신규 키 추가 ───────────────────────────────
INSERT INTO public.system_settings (key, value, description) VALUES
  (
    'permission_levels',
    '{"super_admin":{"label":"슈퍼 관리자","color":"#f04040","permissions":{"dashboard":true,"target":true,"inquiries":true,"notices":true,"members":true,"accounts":true,"settings":true,"audit_logs":true,"server_logs":true}},"admin":{"label":"관리자","color":"#3182f6","permissions":{"dashboard":true,"target":true,"inquiries":true,"notices":true,"members":true,"accounts":false,"settings":false,"audit_logs":false,"server_logs":false}},"viewer":{"label":"뷰어","color":"#6b7280","permissions":{"dashboard":true,"target":false,"inquiries":true,"notices":false,"members":false,"accounts":false,"settings":false,"audit_logs":false,"server_logs":false}}}',
    '관리자 권한 레벨 정의 (JSON) — SettingsMenu에서 관리'
  ),
  (
    'member_unmask_key',
    '',
    '회원 개인정보 마스킹 해제 보안키 — 슈퍼 관리자만 설정/조회 가능'
  )
ON CONFLICT (key) DO NOTHING;

-- ── 4. system_settings anon 읽기 허용 ───────────────────────────────
-- Home 화면에서 공지/팝업 배너를 anon 사용자도 읽을 수 있도록
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_public" ON public.system_settings;
CREATE POLICY "system_settings_select_public"
  ON public.system_settings FOR SELECT
  USING (true);  -- 모든 사용자 읽기 허용 (값은 공개 정보)

DROP POLICY IF EXISTS "system_settings_write_admin" ON public.system_settings;
CREATE POLICY "system_settings_write_admin"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. 최초 슈퍼 관리자 등록 (이미 존재하면 skip) ──────────────────
INSERT INTO public.admin_accounts (email, role, display_name, is_active)
VALUES ('catchmarsterdmin@gmail.com', 'super_admin', '최고 관리자', true)
ON CONFLICT (email) DO NOTHING;

-- ── 완료 메시지 ──────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ 005_super_admin_setup.sql 마이그레이션 완료';
  RAISE NOTICE '  - is_super_admin() 업데이트: catchmarsterdmin@gmail.com 강제 허용';
  RAISE NOTICE '  - admin_accounts role 제약 완화 (커스텀 역할 가능)';
  RAISE NOTICE '  - permission_levels, member_unmask_key 설정 키 추가';
  RAISE NOTICE '  - system_settings anon 읽기 허용';
  RAISE NOTICE '  - 최초 슈퍼 관리자 계정 등록';
END $$;
