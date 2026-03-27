-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 007_marketing_consent_separation.sql
-- 정보통신망법 제50조 준수: 마케팅 수신 동의 구분 (전화/SMS/이메일 각각 별도)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. 기존 marketing_agreement 컬럼 제거하고 개별 컬럼으로 분리
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS marketing_agreement,
  ADD COLUMN IF NOT EXISTS marketing_sms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_phone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_agreed_at timestamptz;

-- 2. 인덱스 추가 (마케팅 대상자 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_sms ON public.profiles(marketing_sms) WHERE marketing_sms = true;
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_email ON public.profiles(marketing_email) WHERE marketing_email = true;
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_phone ON public.profiles(marketing_phone) WHERE marketing_phone = true;

-- 3. 코멘트 추가
COMMENT ON COLUMN public.profiles.marketing_sms IS '정보통신망법 제50조: SMS/문자 마케팅 수신 동의';
COMMENT ON COLUMN public.profiles.marketing_email IS '정보통신망법 제50조: 이메일 마케팅 수신 동의';
COMMENT ON COLUMN public.profiles.marketing_phone IS '정보통신망법 제50조: 전화(음성) 마케팅 수신 동의';
COMMENT ON COLUMN public.profiles.marketing_agreed_at IS '마케팅 동의 일시 (최초 동의 시각)';
