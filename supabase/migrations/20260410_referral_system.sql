-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 20260410_referral_system.sql
-- 추천인 시스템: profiles.referral_code 컬럼 + user_referrals 테이블 + RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── 1. profiles 테이블에 referral_code 컬럼 추가 ─────────────────────────
-- 사용자별 고유 6자리 영숫자 코드 (대문자+숫자)
-- UNIQUE 제약으로 중복 코드 방지
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- referral_code 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- ── 2. 6자리 랜덤 추천 코드 생성 함수 ────────────────────────────────────
-- 대문자(A-Z) + 숫자(0-9) 조합, 혼동하기 쉬운 문자(O, 0, I, 1) 제외
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  -- 혼동하기 쉬운 문자(O/0, I/1/l) 제외한 알파벳+숫자 풀
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code TEXT;
  max_attempts INTEGER := 10; -- 코드 충돌 시 최대 재시도 횟수
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- 6자리 랜덤 코드 생성
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    code := result;
    attempt := attempt + 1;

    -- profiles 테이블에 동일 코드가 없으면 반환
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = code
    ) THEN
      RETURN code;
    END IF;

    -- 최대 재시도 초과 시 타임스탬프 기반으로 생성 (최후 수단)
    IF attempt >= max_attempts THEN
      RETURN substr(md5(random()::TEXT || now()::TEXT), 1, 6);
    END IF;
  END LOOP;
END;
$$;

-- ── 3. user_referrals 테이블 생성 ────────────────────────────────────────
-- 추천인(referrer) → 피추천인(referred) 관계 저장
-- referred_id UNIQUE: 1명은 1번만 추천받을 수 있음
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id   UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT        NOT NULL,       -- 사용된 추천 코드 (기록용)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_referrals IS '추천인 시스템: 추천인(referrer) → 피추천인(referred) 관계';
COMMENT ON COLUMN public.user_referrals.referrer_id IS '추천한 사람의 user ID';
COMMENT ON COLUMN public.user_referrals.referred_id IS '추천받아 가입한 사람의 user ID (UNIQUE: 1인 1추천)';
COMMENT ON COLUMN public.user_referrals.referral_code IS '사용된 추천 코드 (이력 보존용)';

-- 인덱스: referrer_id 기준 추천 수 조회 (내가 추천한 사람 목록)
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer
  ON public.user_referrals (referrer_id);

-- 인덱스: referral_code 기준 조회 (코드 → 추천인 찾기)
CREATE INDEX IF NOT EXISTS idx_user_referrals_code
  ON public.user_referrals (referral_code);

-- ── 4. RLS(Row Level Security) 활성화 ────────────────────────────────────
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

-- 정책 1: SELECT — 자신이 추천한 기록만 조회 가능 (내 referrer_id 행만)
CREATE POLICY "user_referrals_select_own"
  ON public.user_referrals
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

-- 정책 2: INSERT — 자신의 referred_id(본인 가입 기록)만 삽입 가능
-- 추천 관계 저장 시 referred_id는 반드시 로그인한 본인이어야 함
CREATE POLICY "user_referrals_insert_self"
  ON public.user_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- ── 5. handle_new_user 트리거 업데이트 ───────────────────────────────────
-- 신규 가입 시 referral_code 자동 생성하여 profiles에 저장
-- 기존 트리거 함수(008_fix_handle_new_user_trigger.sql)를 대체
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- 추천 코드 자동 생성
  new_code := public.generate_referral_code();

  INSERT INTO public.profiles (id, email, provider, created_at, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_app_meta_data->>'provider',
    NEW.created_at,
    new_code
  )
  ON CONFLICT (id) DO UPDATE SET
    email         = COALESCE(EXCLUDED.email, profiles.email),
    provider      = COALESCE(EXCLUDED.provider, profiles.provider),
    -- 기존에 코드가 없는 경우에만 새 코드 할당 (기존 코드 보호)
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code);

  RETURN NEW;
END;
$$;

-- 트리거 재등록 (함수 교체 후 트리거 재생성 필요)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. 기존 사용자 일괄 코드 발급 ────────────────────────────────────────
-- referral_code가 NULL인 기존 사용자에게 코드 할당
-- (이 SQL은 마이그레이션 시 1회 실행)
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles WHERE referral_code IS NULL
  LOOP
    new_code := public.generate_referral_code();
    UPDATE public.profiles
      SET referral_code = new_code
      WHERE id = r.id AND referral_code IS NULL;
  END LOOP;
END;
$$;
