-- ============================================================
-- job_postings 테이블에 shift_options 컬럼 추가
-- 2026-04-12 생성
-- 원인: 어드민 공고 등록 시 shift_options를 저장하려 하나
--       해당 컬럼이 DB에 없어 INSERT/UPDATE 오류 발생
-- ============================================================

-- 모집 근무조 배열 추가
-- 빈 배열(기본값)이면 지원 폼에서 오전/오후/야간/무관 전체 표시
-- 값이 있으면 해당 근무조만 지원 폼에 표시
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS shift_options text[] DEFAULT '{}';

COMMENT ON COLUMN public.job_postings.shift_options IS
  '모집 근무조 배열 — 예: {morning,afternoon}. 빈 배열이면 지원 폼에서 전체 표시';

-- 인덱스 (특정 근무조 포함 공고 조회 성능용 — GIN 인덱스)
CREATE INDEX IF NOT EXISTS idx_job_postings_shift_options
  ON public.job_postings USING GIN(shift_options);

DO $$
BEGIN
  RAISE NOTICE '✅ 20260412_add_shift_options_to_job_postings.sql 마이그레이션 완료';
  RAISE NOTICE '  - job_postings.shift_options text[] DEFAULT {} 컬럼 추가';
  RAISE NOTICE '  - 어드민 공고 등록 오류 해결';
END $$;
