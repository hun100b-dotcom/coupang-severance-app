-- 006_add_user_identity.sql
-- 사용자 실명/생년월일/핸드폰 수집을 위한 스키마 확장
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── 1. profiles 테이블 컬럼 추가 ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name     text,           -- 실명
  ADD COLUMN IF NOT EXISTS birthdate     date,           -- 생년월일
  ADD COLUMN IF NOT EXISTS phone_number  text,           -- 핸드폰번호
  ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz,  -- 약관 동의 시각
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false; -- 온보딩 완료 여부

-- ── 2. 이메일 NULL 정리 및 NOT NULL 제약 추가 ────────────────────────
-- 기존 NULL 이메일을 임시값으로 변경
UPDATE public.profiles
SET email = 'unknown-' || id || '@catchapp.temp'
WHERE email IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

-- ── 3. display_name 기본값 설정 ──────────────────────────────────────
UPDATE public.profiles
SET display_name = COALESCE(full_name, split_part(email, '@', 1), '사용자')
WHERE display_name IS NULL OR display_name = '';

ALTER TABLE public.profiles
  ALTER COLUMN display_name SET DEFAULT '사용자';

-- ── 4. 유효성 제약 추가 ───────────────────────────────────────────────
-- 생년월일: 18세 이상만 가입 가능
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_birthdate_adult
  CHECK (birthdate IS NULL OR birthdate <= (CURRENT_DATE - INTERVAL '18 years'));

-- 핸드폰번호: 010-XXXX-XXXX 또는 01X-XXX-XXXX 또는 01X-XXXX-XXXX 형식
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format
  CHECK (phone_number IS NULL OR phone_number ~ '^01[016789]-\d{3,4}-\d{4}$');

-- ── 5. 인덱스 추가 (검색 성능 향상) ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_birthdate ON public.profiles(birthdate);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);

-- ── 6. RLS 정책은 이미 004_security_rls.sql에 있으므로 추가 작업 불필요 ──

-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ 006_add_user_identity.sql 마이그레이션 완료';
  RAISE NOTICE '  - full_name, birthdate, phone_number 컬럼 추가';
  RAISE NOTICE '  - 이메일 NOT NULL 제약 추가';
  RAISE NOTICE '  - 유효성 제약 및 인덱스 추가';
  RAISE NOTICE '  - 프론트엔드 OnboardingPage.tsx 구현 필요';
END $$;
