-- 20260410_notifications.sql
-- REQ7+REQ8: notifications 테이블 신규 생성
-- 어드민이 지원자를 확정/거절할 때 해당 사용자에게 알림을 기록합니다.
-- MyApplicationsTab에서 Supabase Realtime으로 실시간 구독합니다.

-- 1) notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 알림 대상 사용자 (auth.users와 연결)
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- 알림 종류: 'application_confirmed' | 'application_rejected' | 기타
  type        text NOT NULL,
  -- 알림 제목 (예: "출근이 확정됐어요! 🎉")
  title       text NOT NULL,
  -- 알림 본문 (선택)
  body        text,
  -- 읽음 여부 (기본 false)
  is_read     boolean NOT NULL DEFAULT false,
  -- 추가 메타데이터 (application_id, job_posting_id 등)
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3) RLS 정책: 본인 알림만 조회 가능
CREATE POLICY "본인 알림만 조회"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4) RLS 정책: 서버(서비스 롤) 또는 어드민이 insert 가능
-- 어드민 페이지에서 supabase client로 insert할 수 있도록 authenticated 허용
CREATE POLICY "인증된 사용자 삽입 허용"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- 5) 읽음 처리: 본인만 is_read 업데이트 가능
CREATE POLICY "본인 알림 읽음 처리"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

-- 7) Realtime 활성화 (Supabase Dashboard에서도 활성화 필요)
-- Dashboard → Database → Replication → notifications 테이블 체크
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
