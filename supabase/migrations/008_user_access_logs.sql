-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 008_user_access_logs.sql
-- 개인정보의 안전성 확보조치 기준 제7조: 접속 기록의 보관
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. 사용자 접근 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,  -- 'view_profile', 'update_profile', 'view_report', 'create_inquiry', 'delete_account'
  target_id uuid,         -- 조회한 리소스 ID (reports.id, inquiries.id 등)
  ip_address inet,        -- IP 주소 (Supabase에서 수집 제한적)
  user_agent text,        -- User-Agent 헤더
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_access_logs_user ON public.user_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_created ON public.user_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_action ON public.user_access_logs(action);

-- 3. RLS 정책 (본인 로그만 조회 가능, 관리자는 모든 로그 조회 가능)
ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

-- 본인 로그 조회
CREATE POLICY "Users can view their own access logs"
  ON public.user_access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 로그 조회
CREATE POLICY "Admins can view all access logs"
  ON public.user_access_logs
  FOR SELECT
  USING (public.is_admin());

-- 로그 삽입은 인증된 사용자 누구나 가능 (본인 로그만)
CREATE POLICY "Users can insert their own access logs"
  ON public.user_access_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. 코멘트 추가
COMMENT ON TABLE public.user_access_logs IS '개인정보의 안전성 확보조치 기준 제7조: 사용자 접근 로그';
COMMENT ON COLUMN public.user_access_logs.action IS '행동 종류: view_profile, update_profile, view_report, create_inquiry, delete_account';
COMMENT ON COLUMN public.user_access_logs.target_id IS '조회한 리소스 ID (reports.id, inquiries.id 등)';
COMMENT ON COLUMN public.user_access_logs.ip_address IS 'IP 주소 (Supabase 제한으로 수집 어려움)';
