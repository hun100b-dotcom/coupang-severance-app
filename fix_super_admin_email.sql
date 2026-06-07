-- ✅ 슈퍼 관리자 이메일 오타 수정 (catchmarsterdmin → catchmasterdmin)
-- Supabase Dashboard → SQL Editor에서 실행

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

-- 2. admin_accounts 테이블 이메일 업데이트 (기존 데이터 있으면)
UPDATE public.admin_accounts
SET email = 'catchmasterdmin@gmail.com'
WHERE email = 'catchmarsterdmin@gmail.com';

-- 3. 슈퍼 관리자 계정 등록 (없으면 추가)
INSERT INTO public.admin_accounts (email, role, display_name, is_active)
VALUES ('catchmasterdmin@gmail.com', 'super_admin', '최고 관리자', true)
ON CONFLICT (email) DO NOTHING;

-- 완료
SELECT '✅ 슈퍼 관리자 이메일 수정 완료' AS status;
