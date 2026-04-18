-- ============================================================
-- job_applications 스케줄 상세 관리 칼럼 추가
-- Phase 1 step 4 (기획서 tasks/schedule-manager-plan.md §3-1)
-- 2026-04-19
-- ============================================================

-- 근무 시간: 출근/퇴근 시각 (hh:mm:ss time 타입)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS work_start_time time;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS work_end_time time;

-- 차감 항목: 교통비/식비/기타 (원 단위 integer)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS transport_cost integer DEFAULT 0;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS meal_cost integer DEFAULT 0;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS other_deduction integer DEFAULT 0;

-- 지급 추적: 예상일 + 실제 지급 확인 시각
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS payment_expected_date date;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz;

-- 사용자 본인 메모 (어드민용 note와 분리)
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS user_memo text;

COMMENT ON COLUMN public.job_applications.work_start_time IS '출근 시각 (hh:mm:ss) — 주간뷰 타임라인 배치 기준';
COMMENT ON COLUMN public.job_applications.work_end_time IS '퇴근 시각 (hh:mm:ss) — 야간근무 22:00~06:00 같은 경우도 저장 가능';
COMMENT ON COLUMN public.job_applications.transport_cost IS '교통비 (원) — 실수령액 차감에 사용';
COMMENT ON COLUMN public.job_applications.meal_cost IS '식비 (원) — 실수령액 차감에 사용';
COMMENT ON COLUMN public.job_applications.other_deduction IS '기타 차감 (원)';
COMMENT ON COLUMN public.job_applications.payment_expected_date IS '지급 예상일 (date)';
COMMENT ON COLUMN public.job_applications.payment_received_at IS '실제 지급 확인 시각 (사용자가 체크했을 때)';
COMMENT ON COLUMN public.job_applications.user_memo IS '사용자 본인 메모 — 어드민용 note 칼럼과 분리';
