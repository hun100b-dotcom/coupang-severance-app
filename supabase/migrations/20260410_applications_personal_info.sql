-- ============================================================
-- job_applications 테이블 확장: 지원 시점 인적사항 + 개인정보 동의
-- 2026-04-10
-- ============================================================
-- 요구사항 D-NEW-3: 회원가입 시 인적사항 미수집 → 지원 버튼 클릭 시 직접 입력
-- 개인정보보호법 제15조 (수집·이용 동의) + 제17조 (제3자 제공 동의) 준수
-- 주민번호 뒤 1자리(성별코드) 절대 미수집 — applicant_gender로 대체

-- ── 인적사항 컬럼 추가 ──
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS applicant_name text,           -- 성명
  ADD COLUMN IF NOT EXISTS applicant_birth date,          -- 생년월일 (YYYY-MM-DD, 6자리)
  ADD COLUMN IF NOT EXISTS applicant_gender text          -- 성별 (주민번호 뒤 1자리 ≠)
    CHECK (applicant_gender IS NULL OR applicant_gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS applicant_phone text,          -- 휴대폰번호 (마스킹 저장 권장)
  ADD COLUMN IF NOT EXISTS consent_collect boolean DEFAULT false,      -- 개인정보 수집·이용 동의
  ADD COLUMN IF NOT EXISTS consent_third_party boolean DEFAULT false,  -- 제3자 제공 동의
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;        -- 동의 시각

COMMENT ON COLUMN public.job_applications.applicant_name IS '지원자 성명';
COMMENT ON COLUMN public.job_applications.applicant_birth IS '생년월일 (YYYY-MM-DD) — 6자리만, 주민번호 아님';
COMMENT ON COLUMN public.job_applications.applicant_gender IS '성별: male(남) | female(여) — 주민번호 뒤 1자리 미수집';
COMMENT ON COLUMN public.job_applications.applicant_phone IS '휴대폰번호';
COMMENT ON COLUMN public.job_applications.consent_collect IS '개인정보 수집·이용 동의 여부';
COMMENT ON COLUMN public.job_applications.consent_third_party IS '개인정보 제3자 제공 동의 여부';
COMMENT ON COLUMN public.job_applications.consent_at IS '동의 일시';

-- ── 어드민 조회 정책 추가 (기존 RLS에 어드민 허용 추가) ──
-- 기존: 본인만 조회 가능 (applications_own 정책)
-- 추가: 어드민은 전체 조회/업데이트 가능 (지원자 관리 탭용)
CREATE POLICY IF NOT EXISTS "Admins can view all applications"
  ON public.job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update applications"
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );
