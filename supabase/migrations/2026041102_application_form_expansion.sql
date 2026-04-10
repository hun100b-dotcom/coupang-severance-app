-- ============================================================
-- 지원서 폼 전면 개편 마이그레이션
-- 2026-04-11 생성
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. job_postings 확장
--    task_options: 지원자가 선택할 업무 종류 배열
--    work_date: 공고의 근무 예정일 (중복 확정 차단 로직의 기준)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS task_options text[]
    DEFAULT ARRAY['상차','하차','분류','피킹','포장']::text[];

COMMENT ON COLUMN public.job_postings.task_options IS
  '지원자가 선택할 수 있는 업무 종류 배열 (예: {상차,하차,분류,피킹,포장})';

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS work_date date;

COMMENT ON COLUMN public.job_postings.work_date IS
  '공고 근무 예정일 — 중복 확정 차단 로직의 기준일. null이면 당일 출근 가능(상시)으로 간주';


-- ──────────────────────────────────────────────────────────────
-- 2. job_applications 확장
--    지원 시점에 수집하는 추가 근무 관련 정보
-- ──────────────────────────────────────────────────────────────

-- 지원 업무 (job_postings.task_options 에서 선택)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS applied_task text;

COMMENT ON COLUMN public.job_applications.applied_task IS
  '지원자가 선택한 업무 종류 (예: 상차, 분류 등)';

-- 90일 이내 해당 센터 근무 경험 여부 (산업안전보건법 제29조 신규 근로자 교육 판별용)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS prior_experience_90d boolean;

COMMENT ON COLUMN public.job_applications.prior_experience_90d IS
  '지난 90일 이내 해당 센터 근무 경험 여부 — 신규 근로자 안전보건교육 대상 판별 (산업안전보건법 제29조)';

-- 희망 출근 시간대
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS preferred_shift text
    CHECK (preferred_shift IS NULL OR preferred_shift IN ('morning','afternoon','night','any'));

COMMENT ON COLUMN public.job_applications.preferred_shift IS
  '희망 출근 시간대: morning(오전) | afternoon(오후) | night(야간) | any(무관)';

-- 교통 수단
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS transportation text
    CHECK (transportation IS NULL OR transportation IN ('car','public','shuttle'));

COMMENT ON COLUMN public.job_applications.transportation IS
  '출근 교통 수단: car(자차) | public(대중교통) | shuttle(셔틀 필요)';

-- 안전화 사이즈 (안전화 지급용)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS shoe_size text;

COMMENT ON COLUMN public.job_applications.shoe_size IS
  '안전화 사이즈 (mm 단위, 예: 270) — 안전화 사전 지급 배정용';

-- 특이사항/건강상 이슈 (작업 배치 고려)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.job_applications.notes IS
  '특이사항 또는 건강상 이슈 (최대 300자) — 작업 배치 참고용';

-- 비상 연락처 (산재 대비)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS emergency_contact text;

COMMENT ON COLUMN public.job_applications.emergency_contact IS
  '비상 연락처 (선택) — 산업재해 발생 시 통보용';


-- ──────────────────────────────────────────────────────────────
-- 3. 같은 날짜 확정 지원이 있으면 추가 지원을 DB 레벨에서 차단
--    프론트 우회 시도(직접 API 호출 등)를 막기 위한 2차 방어
-- ──────────────────────────────────────────────────────────────

-- 트리거 함수: BEFORE INSERT 시 같은 날짜 확정 지원이 있으면 예외 발생
CREATE OR REPLACE FUNCTION public.check_no_confirmed_same_day()
RETURNS trigger AS $$
BEGIN
  -- work_date 가 null이면 체크 불필요 (날짜 미지정 공고)
  IF NEW.work_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- 같은 사용자가 같은 날짜에 이미 confirmed 상태인 지원이 있는지 확인
  IF EXISTS (
    SELECT 1
    FROM public.job_applications
    WHERE user_id   = NEW.user_id
      AND work_date = NEW.work_date
      AND status    = 'confirmed'
      AND id <> NEW.id   -- UPDATE 시 자기 자신 제외
  ) THEN
    RAISE EXCEPTION '해당 날짜(%에 이미 출근 확정된 지원이 있어 추가 지원이 불가능합니다.', NEW.work_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 제거 후 재생성 (멱등성 보장)
DROP TRIGGER IF EXISTS trg_check_no_confirmed_same_day ON public.job_applications;

CREATE TRIGGER trg_check_no_confirmed_same_day
  BEFORE INSERT OR UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_no_confirmed_same_day();

COMMENT ON FUNCTION public.check_no_confirmed_same_day() IS
  '같은 날짜에 이미 confirmed 상태인 지원이 있으면 INSERT/UPDATE 차단 — 중복 출근 방지';
