-- ============================================================
-- visitor_logs: 페이지 방문 기록 테이블
-- 방문자 수, 유입 경로, 인기 페이지 분석에 사용됩니다.
-- 어드민 대시보드 [방문자 분석] 탭의 데이터 소스입니다.
-- ============================================================

CREATE TABLE IF NOT EXISTS visitor_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 로그인 사용자라면 user_id 연결 (비로그인이면 NULL)
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 브라우저 탭 단위 세션 ID (sessionStorage UUID)
  session_id text        NOT NULL,
  -- 방문한 페이지 경로 (예: /home, /severance)
  page_path  text        NOT NULL,
  -- 이전 페이지 URL (document.referrer)
  referrer   text,
  -- 브라우저/기기 정보
  user_agent text,
  -- 방문 시각
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 날짜 내림차순 인덱스: 기간별 방문자 수 집계에 사용
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created  ON visitor_logs(created_at DESC);
-- 세션 인덱스: 세션별 페이지뷰 집계에 사용
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session  ON visitor_logs(session_id);
-- 페이지 경로 인덱스: 인기 페이지 순위 집계에 사용
CREATE INDEX IF NOT EXISTS idx_visitor_logs_page     ON visitor_logs(page_path);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자(비로그인 포함)가 INSERT 가능 — 방문 기록 수집
CREATE POLICY "Anyone can insert visitor logs"
  ON visitor_logs
  FOR INSERT
  WITH CHECK (true);

-- SELECT는 로그인한 사용자(authenticated)만 허용합니다.
-- anon(비로그인) 유저는 visitor_logs를 조회할 수 없습니다.
-- 어드민은 반드시 로그인한 상태이므로 어드민 대시보드 기능에 영향 없습니다.
CREATE POLICY "Authenticated users can read visitor logs"
  ON visitor_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');
