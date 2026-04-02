-- ============================================================
-- 채용정보 지원/스케줄/포인트 시스템 마이그레이션
-- 2026-04-02 생성
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. job_postings 테이블에 daily_wage 컬럼 추가
--    일급 금액을 직접 저장 (hourly_wage × 근무시간으로 계산 가능하지만
--    편의를 위해 별도 컬럼으로 관리)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS daily_wage integer DEFAULT 0;

COMMENT ON COLUMN public.job_postings.daily_wage IS '일급 금액 (원) — 예: 120000';


-- ──────────────────────────────────────────────────────────────
-- 2. job_applications 테이블 — 지원 내역
--    사용자가 공고에 지원하면 이 테이블에 기록됨
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 어떤 사용자가 지원했는지
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 어떤 공고에 지원했는지
  job_posting_id      uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,

  -- 지원 상태
  --   applied   : 지원 완료 (기본값)
  --   confirmed : 출근 확정 (채용측에서 연락 후 확정)
  --   completed : 출근 완료 (실제 근무 완료)
  --   cancelled : 취소
  status              text NOT NULL DEFAULT 'applied'
                        CHECK (status IN ('applied', 'confirmed', 'completed', 'cancelled')),

  applied_at          timestamptz NOT NULL DEFAULT now(),   -- 지원 시각
  work_date           date,                                 -- 출근 예정일
  work_confirmed_at   timestamptz,                          -- 출근 확정 시각
  note                text,                                 -- 메모 (내부용)
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 인덱스: 사용자별 조회 빠르게
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id
  ON public.job_applications(user_id);

-- 인덱스: 같은 공고에 중복 지원 여부 확인
CREATE INDEX IF NOT EXISTS idx_job_applications_user_job
  ON public.job_applications(user_id, job_posting_id);

-- 인덱스: 상태별 조회
CREATE INDEX IF NOT EXISTS idx_job_applications_status
  ON public.job_applications(status);

-- RLS 활성화 (Row Level Security — 내 데이터만 볼 수 있음)
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- 정책: 로그인한 사용자는 본인 지원 내역만 CRUD 가능
CREATE POLICY "applications_own" ON public.job_applications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.job_applications IS '채용 지원 내역 — 사용자별 RLS 적용';


-- ──────────────────────────────────────────────────────────────
-- 3. user_points 테이블 — 포인트 적립/사용 이력
--    포인트는 금액이 아니라 잔액을 SUM으로 계산함
--    양수(+): 적립 / 음수(-): 사용
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 포인트 변동량 (양수: 적립, 음수: 사용)
  amount      integer NOT NULL,

  -- 포인트 적립/사용 사유
  -- 예: '최초지원', '출근완료', '연속출근3일', '연속출근7일', '월5회출근', '쿠폰교환'
  reason      text NOT NULL,

  -- 연관된 지원 ID (출근 완료 보상 등에서 참조)
  ref_id      uuid,

  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id
  ON public.user_points(user_id);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_own" ON public.user_points
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_points IS '포인트 이력 — SUM(amount)이 현재 잔액';


-- ──────────────────────────────────────────────────────────────
-- 4. user_coupons 테이블 — 발급된 쿠폰 목록
--    포인트 교환이나 이벤트로 발급되는 쿠폰
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 쿠폰 종류
  --   coffee   : 커피쿠폰 (스타벅스/메가커피 1잔)
  --   discount : 할인쿠폰 (구독 결제 할인)
  --   cashback : 캐시백 (미래 기능 — 현금 전환)
  coupon_type  text NOT NULL
                 CHECK (coupon_type IN ('coffee', 'discount', 'cashback')),

  title        text NOT NULL,        -- 예: "스타벅스 아메리카노 1잔"
  description  text,                 -- 사용 방법 안내
  coupon_code  text,                 -- 쿠폰 코드 (선택)
  is_used      boolean NOT NULL DEFAULT false,   -- 사용 여부
  expires_at   timestamptz,          -- 만료일 (null이면 무기한)
  used_at      timestamptz,          -- 실제 사용 시각
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id
  ON public.user_coupons(user_id);

ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_own" ON public.user_coupons
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_coupons IS '발급 쿠폰 목록 — 커피/할인/캐시백';
