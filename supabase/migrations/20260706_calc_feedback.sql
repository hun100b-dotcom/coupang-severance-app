-- ============================================================
-- 20260706_calc_feedback: 계산기 결과 화면 피드백/문의 수집 테이블
-- 4개 계산기(퇴직금·실업급여·주휴수당·연차수당) 결과 하단 폼에서 제출됨.
-- 어드민 [소통] 영역에서 조회.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calc_feedback (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 계산기 종류: severance/unemployment/weekly/annual
  calc_type    text        NOT NULL,
  -- 도움이 됐나요? (true=예, false=아니오, null=미응답)
  helpful      boolean,
  -- 오류가 있었나요? (true=예)
  has_error    boolean     DEFAULT false NOT NULL,
  -- 오류 상세(있었다면 어디서)
  error_detail text,
  -- 자유 의견/문의
  message      text,
  -- (선택) 연락받을 이메일
  email        text,
  -- 로그인 사용자면 연결(비로그인이면 NULL)
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 브라우저 세션(중복 제출 방지·분석용)
  session_id   text,
  -- 어드민 처리 상태(신규/확인/완료)
  status       text        DEFAULT 'new' NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calc_feedback_created ON public.calc_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_feedback_type    ON public.calc_feedback(calc_type);

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE public.calc_feedback ENABLE ROW LEVEL SECURITY;

-- 누구나(비로그인 포함) 제출 가능 — 방문자 피드백 수집
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.calc_feedback;
CREATE POLICY "Anyone can submit feedback"
  ON public.calc_feedback FOR INSERT
  WITH CHECK (true);

-- 조회는 어드민만(백엔드는 service-role 로 RLS 우회하므로 별도 영향 없음)
DROP POLICY IF EXISTS "Admins can read feedback" ON public.calc_feedback;
CREATE POLICY "Admins can read feedback"
  ON public.calc_feedback FOR SELECT
  USING (public.is_admin());

-- ⚠️ RLS 정책과 별개로 테이블 GRANT 필요: anon/authenticated 에 INSERT 권한을 줘야
--   비로그인/로그인 사용자가 폼을 제출할 수 있다(없으면 42501 RLS 위반).
--   SELECT 는 부여하지 않음(백엔드 service-role 로만 조회 → 이중 차단).
GRANT INSERT ON public.calc_feedback TO anon, authenticated;
