-- ============================================================
-- job_postings 테이블 확장: 섹션(section) + 복리후생(benefits)
-- 2026-04-10
-- ============================================================

-- ── 1. 섹션 컬럼 추가 ──
-- 공고를 3가지 섹션으로 분류:
--   today-urgent   : 오늘 추가모집 (오늘만 해당)
--   tomorrow-urgent: 내일 긴급모집 (내일 출근)
--   always         : 상시모집 (기간 관계없이 상시)
-- 기존 is_urgent=true 데이터 → today-urgent 마이그레이션
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS section text DEFAULT 'always'
    CHECK (section IN ('today-urgent', 'tomorrow-urgent', 'always'));

COMMENT ON COLUMN public.job_postings.section IS
  '공고 섹션: today-urgent(오늘추가모집) | tomorrow-urgent(내일긴급모집) | always(상시모집)';

-- 기존 긴급 공고를 today-urgent로 자동 변환
UPDATE public.job_postings
SET section = 'today-urgent'
WHERE is_urgent = true AND section = 'always';

-- ── 2. 복리후생 컬럼 추가 ──
-- 복리후생 항목을 문자열 배열로 저장
-- 예: ['식대제공', '교통비지원', '4대보험', '주휴수당']
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}';

COMMENT ON COLUMN public.job_postings.benefits IS
  '복리후생 목록 — 예: {식대제공, 교통비지원, 4대보험, 주휴수당}';

-- ── 3. 섹션별 인덱스 추가 ──
CREATE INDEX IF NOT EXISTS idx_job_postings_section
  ON public.job_postings(section);
