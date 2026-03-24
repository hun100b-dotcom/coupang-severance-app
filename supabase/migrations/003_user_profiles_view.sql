-- 003_user_profiles_view.sql
-- auth.users 기반 회원 정보 조회 뷰
-- 사용처: frontend/src/components/admin/menus/MembersMenu.tsx
--
-- auth.users 테이블은 직접 노출 불가(보안)이므로
-- 필요한 컬럼만 선택하여 public 뷰로 노출합니다.
--
-- 주의: 이 뷰는 SECURITY DEFINER 함수를 통해서만 접근해야 합니다.
--       RLS는 뷰에 직접 적용되지 않으므로 아래의 접근 제어를 반드시 적용하세요.

-- ── user_profiles 뷰 생성 ────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.raw_app_meta_data   -- provider 정보 포함 (예: {"provider": "kakao"})
FROM auth.users u;

-- ── 뷰 접근 권한: 인증된 사용자만 조회 가능 ──────────────────────────
-- 프론트엔드 어드민만 쿼리하도록 004_security_rls.sql에서 추가 제한
GRANT SELECT ON public.user_profiles TO authenticated;

-- ── profiles 테이블에 email/provider 컬럼 추가 (선택) ─────────────────
-- MembersMenu가 profiles 테이블을 조회하는 경우, 아래 컬럼을 추가합니다.
-- (auth.users에서 자동 복사하는 트리거는 별도로 구현하세요)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email     text,
  ADD COLUMN IF NOT EXISTS provider  text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- created_at 인덱스 (최신 가입자 정렬용)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- ── auth.users INSERT 시 profiles 자동 동기화 트리거 ─────────────────
-- 신규 사용자 가입 시 profiles 테이블에 email/provider 자동 저장
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, provider, created_at, marketing_agreement)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_app_meta_data->>'provider',
    NEW.created_at,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    provider = EXCLUDED.provider;
  RETURN NEW;
END;
$$;

-- 기존 트리거가 있으면 교체
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
