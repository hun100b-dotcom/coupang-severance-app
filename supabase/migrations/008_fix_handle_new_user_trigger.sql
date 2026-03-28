-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 008_fix_handle_new_user_trigger.sql
-- handle_new_user 트리거 수정: 삭제된 marketing_agreement 컬럼 참조 제거
-- 007에서 marketing_agreement를 DROP 후 marketing_sms/email/phone으로 분리했으나
-- 트리거 함수가 업데이트되지 않아 신규 가입 시 INSERT 실패 발생
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, provider, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_app_meta_data->>'provider',
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = COALESCE(EXCLUDED.email, profiles.email),
    provider = COALESCE(EXCLUDED.provider, profiles.provider);
  RETURN NEW;
END;
$$;
