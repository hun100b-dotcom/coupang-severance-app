-- profiles 테이블에 성별(gender)과 개인정보 동의 시점(consent_at) 컬럼 추가
-- 2026-04-11 | 온보딩 성별 필드 추가 + 동의 타임스탬프 저장

-- 성별 컬럼: 'male' 또는 'female' 만 허용 (NULL 가능 = 기존 회원)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- 개인정보 수집·이용 동의 시점 컬럼
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

-- 코멘트
COMMENT ON COLUMN profiles.gender IS '성별 (male/female). 온보딩 시 입력. NULL이면 기존 회원 미입력 상태.';
COMMENT ON COLUMN profiles.consent_at IS '개인정보 수집·이용 동의 시점 (ISO 8601). 온보딩 완료 시 기록.';
