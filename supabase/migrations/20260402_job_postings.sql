-- 채용정보 섹션: job_postings 테이블 + RLS + 인덱스
-- Phase 1 — 관리자가 입력한 공고를 사용자에게 피드로 노출

-- 1. job_postings 테이블
CREATE TABLE IF NOT EXISTS job_postings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,                          -- 쿠팡, CJ대한통운, 마켓컬리 등
  center_name   text DEFAULT '',                        -- XX물류센터
  region        text NOT NULL,                          -- 경기 이천, 경기 광주 등
  headcount     integer DEFAULT 0,                      -- 모집인원
  hourly_wage   integer DEFAULT 0,                      -- 시급 (원)
  work_hours    text DEFAULT '',                        -- "09:00~18:00"
  description   text DEFAULT '',                        -- 상세 내용
  contact_phone text DEFAULT '',                        -- 연락처
  external_link text DEFAULT '',                        -- 외부 지원 링크
  is_urgent     boolean DEFAULT false,                  -- 긴급 태그
  expires_at    date,                                   -- 마감일
  status        text DEFAULT 'active'                   -- active / expired / deleted
                CHECK (status IN ('active', 'expired', 'deleted')),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- 작성 관리자
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_job_postings_status    ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_region    ON job_postings(region);
CREATE INDEX IF NOT EXISTS idx_job_postings_expires   ON job_postings(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_urgent    ON job_postings(is_urgent) WHERE is_urgent = true;

-- 3. RLS 활성화
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자: active 공고만 조회 가능
CREATE POLICY "Authenticated users can view active jobs"
  ON job_postings FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

-- 관리자: 모든 공고 조회 (admin_accounts에 등록된 사용자)
CREATE POLICY "Admins can view all jobs"
  ON job_postings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );

-- 관리자: 공고 생성
CREATE POLICY "Admins can insert jobs"
  ON job_postings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );

-- 관리자: 공고 수정
CREATE POLICY "Admins can update jobs"
  ON job_postings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );

-- 관리자: 공고 삭제
CREATE POLICY "Admins can delete jobs"
  ON job_postings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts
      WHERE admin_accounts.id = auth.uid()
        AND admin_accounts.is_active = true
    )
  );

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_postings_updated_at();
