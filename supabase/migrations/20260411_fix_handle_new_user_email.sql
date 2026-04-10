-- handle_new_user 트리거 버그 수정 (2026-04-11)
-- 문제: 세션5 추천인 시스템 추가 시 handle_new_user 트리거가 email 컬럼을 누락
--       profiles.email = NOT NULL이므로 신규 유저 Google/카카오 로그인 시
--       "Database error saving new user" 오류 발생
-- 해결: INSERT에 new.email 추가, ON CONFLICT 시에도 email 보완

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    new.id,
    new.email,
    public.generate_referral_code()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      -- 기존에 email이 있으면 유지, 없으면 새 값으로 보완
      email         = COALESCE(profiles.email, EXCLUDED.email),
      -- 기존에 referral_code가 있으면 유지, 없으면 새로 생성
      referral_code = COALESCE(profiles.referral_code, public.generate_referral_code());
  RETURN new;
END;
$$;
