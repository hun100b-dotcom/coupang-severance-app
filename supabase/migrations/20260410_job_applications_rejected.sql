-- 20260410_job_applications_rejected.sql
-- REQ7: job_applications 테이블 status 컬럼에 'rejected' 값 추가
-- 기존 CHECK 제약조건을 확장해 지원거절 상태를 지원합니다.
-- 기존 데이터(applied/confirmed/completed/cancelled)는 영향 없음.

-- 1) 기존 CHECK 제약조건 제거 (이름 확인 후 적용)
-- 제약조건 이름은 DB마다 다를 수 있으므로 먼저 조회 후 삭제합니다.
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- job_applications 테이블의 status 컬럼 CHECK 제약조건 이름 조회
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.job_applications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  -- 제약조건이 존재하면 제거
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.job_applications DROP CONSTRAINT ' || quote_ident(constraint_name);
    RAISE NOTICE '기존 status CHECK 제약조건 제거: %', constraint_name;
  END IF;
END $$;

-- 2) 새 CHECK 제약조건 추가 (rejected 포함)
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('applied', 'confirmed', 'completed', 'cancelled', 'rejected'));

-- 3) 인덱스 추가 (rejected 상태 조회 성능)
CREATE INDEX IF NOT EXISTS idx_job_applications_status_rejected
  ON public.job_applications (status)
  WHERE status = 'rejected';
