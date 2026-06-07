-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CATCH Admin Accounts Setup (Error-Safe Version)
-- 어드민 페이지 탭 정상화를 위한 DB 설정 (제약 조건 에러 해결)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. is_super_admin() 함수 업데이트
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    auth.email() = 'catchmasterdmin@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.admin_accounts
      WHERE email = auth.email()
        AND role = 'super_admin'
        AND is_active = true
    );
$$;

-- 2. 기존 오타 데이터 삭제 (있다면)
DELETE FROM public.admin_accounts WHERE email = 'catchmarsterdmin@gmail.com';

-- 3. 슈퍼 관리자 계정 강제 등록
INSERT INTO public.admin_accounts (email, role, display_name, is_active, created_at, updated_at)
VALUES (
  'catchmasterdmin@gmail.com',
  'super_admin',
  '최고 관리자',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email)
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 4. permission_levels 설정 업데이트 (슈퍼어드민 모든 권한 부여)
INSERT INTO public.system_settings (key, value, description, updated_at) VALUES (
  'permission_levels',
  '{
    "super_admin": {
      "label": "슈퍼 관리자",
      "color": "#f04040",
      "permissions": {
        "dashboard": true,
        "target": true,
        "inquiries": true,
        "notices": true,
        "members": true,
        "accounts": true,
        "settings": true,
        "audit_logs": true,
        "server_logs": true
      }
    },
    "admin": {
      "label": "관리자",
      "color": "#3182f6",
      "permissions": {
        "dashboard": true,
        "target": true,
        "inquiries": true,
        "notices": true,
        "members": true,
        "accounts": false,
        "settings": false,
        "audit_logs": false,
        "server_logs": false
      }
    },
    "viewer": {
      "label": "뷰어",
      "color": "#6b7280",
      "permissions": {
        "dashboard": true,
        "target": false,
        "inquiries": true,
        "notices": false,
        "members": false,
        "accounts": false,
        "settings": false,
        "audit_logs": false,
        "server_logs": false
      }
    }
  }',
  '관리자 권한 레벨 정의 (슈퍼어드민 모든 권한)',
  NOW()
)
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 5. admin_accounts role 제약 조건 안전 처리
DO $$
BEGIN
  -- 기존 role_check 제약 조건 제거
  ALTER TABLE public.admin_accounts DROP CONSTRAINT IF EXISTS admin_accounts_role_check;

  -- role_notempty 제약이 없을 때만 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_accounts_role_notempty'
    AND conrelid = 'public.admin_accounts'::regclass
  ) THEN
    ALTER TABLE public.admin_accounts
      ADD CONSTRAINT admin_accounts_role_notempty CHECK (char_length(trim(role)) > 0);
  END IF;
END $$;

-- 6. system_settings RLS 정책 설정
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_public" ON public.system_settings;
CREATE POLICY "system_settings_select_public"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_settings_write_admin" ON public.system_settings;
CREATE POLICY "system_settings_write_admin"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. member_unmask_key 설정
INSERT INTO public.system_settings (key, value, description)
VALUES ('member_unmask_key', '', '회원 개인정보 마스킹 해제 보안키')
ON CONFLICT (key) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 완료 확인
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '✅ Setup Complete!' AS status;

SELECT
  email,
  role,
  display_name,
  is_active,
  created_at
FROM public.admin_accounts
WHERE email = 'catchmasterdmin@gmail.com';
