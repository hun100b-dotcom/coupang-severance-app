/**
 * Supabase 테이블 타입 정의
 * - profiles: 유저 프로필 (입사일, 마케팅 수신 동의 등)
 * - reports: 진단 리포트 목록
 */

/** profiles 테이블 한 행 (RLS로 본인만 조회/수정 가능 권장) */
export interface Profile {
  id: string
  joined_at: string | null
  marketing_agreement: boolean
  updated_at?: string
}

/** 퇴직금 계산 결과 payload 구조 */
export interface SeverancePayload {
  severance: number
  work_days: number
  average_wage: number
  eligible: boolean
  eligibility_message: string
  qualifying_days: number
}

/** 주휴수당 계산 결과 payload 구조 */
export interface WeeklyAllowancePayload {
  type: 'weekly_allowance'
  hourly_wage: number
  work_days_per_week: number
  work_hours_per_day: number
  is_full_attendance: boolean
  weekly_allowance: number
  is_eligible: boolean
}

/** 연차수당 계산 결과 payload 구조 */
export interface AnnualLeavePayload {
  type: 'annual_leave'
  hire_date: string
  resign_date?: string
  is_employed: boolean
  used_days: number
  annual_leave_days: number
  annual_leave_allowance: number
}

/** 실업급여 계산 결과 payload 구조 */
export interface UnemploymentPayload {
  type: 'unemployment'
  eligible: boolean
  insured_days: number
  avg_daily_wage: number
  daily_benefit: number
  benefit_days: number
  total_estimate: number
}

/** 퇴직금 payload에 type 필드 추가 (하위 호환) */
export interface SeverancePayloadV2 extends SeverancePayload {
  type: 'severance'
}

/** reports 테이블에 저장 가능한 모든 payload 유형 */
export type AnyPayload =
  | SeverancePayload
  | SeverancePayloadV2
  | WeeklyAllowancePayload
  | AnnualLeavePayload
  | UnemploymentPayload

/** notices 테이블 한 행 */
export interface Notice {
  id: string
  title: string    // 공지 제목 (배너에 표시, 짧게 작성)
  content: string  // 공지 본문 (상세 페이지에서 전체 표시)
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

/** saved_pdfs 테이블 한 행 — 저장된 PDF 메타데이터 */
export interface SavedPdf {
  id: string
  user_id: string
  file_name: string
  storage_path: string
  file_size: number
  created_at: string
}

/** job_postings 테이블 한 행 — 채용공고 */
export interface JobPosting {
  id: string
  company_name: string
  center_name: string
  region: string
  headcount: number
  hourly_wage: number
  daily_wage: number        // 일급 금액 (원) — 20260402 추가
  work_hours: string
  description: string
  contact_phone: string
  external_link: string
  is_urgent: boolean
  // 공고 섹션 — 20260410 추가
  section: 'today-urgent' | 'tomorrow-urgent' | 'always'
  // 복리후생 목록 — 20260410 추가
  benefits: string[]
  // 지원자 선택 업무 종류 — 20260411 추가 (지원서 폼 드롭다운 옵션)
  task_options: string[]
  // 모집 근무조 배열 — 20260411 추가 (빈 배열이면 지원 폼에서 전체 표시)
  shift_options: string[]
  // 공고 근무 예정일 — 20260411 추가 (중복 확정 차단 기준일)
  work_date: string | null
  expires_at: string | null
  status: 'active' | 'draft' | 'expired' | 'deleted'
  // 조회수 — 2026-04-18 DB 컬럼 추가 (DEFAULT 0)
  view_count?: number
  // 근무일자 타입 — 20260419 추가 (always: 상시모집 / date: 일자지정)
  work_type?: 'always' | 'date'
  // 근무 예정일 복수 배열 — 20260419 추가 (일자지정 시 사용)
  work_dates?: string[]
  // 근무조별 시급/일급 — 20260419 추가 { morning: { hourly, daily }, night: { hourly, daily } }
  shift_wages?: Record<string, { hourly: number; daily: number }>
  // 업무별 시급 — 20260419 추가 { 피킹: 10320, 패킹: 10500 }
  task_wages?: Record<string, number>
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 지원자 인적사항 — 지원 시점 직접 입력 */
export interface ApplicantInfo {
  applicant_name: string        // 성명
  applicant_birth: string       // 생년월일 YYYY-MM-DD (6자리)
  applicant_gender: 'male' | 'female'  // 성별 (주민번호 뒤 1자리 아님)
  applicant_phone: string       // 휴대폰번호
  consent_collect: boolean      // 개인정보 수집·이용 동의
  consent_third_party: boolean  // 제3자 제공 동의
  consent_at: string            // 동의 일시 (ISO string)
}

/** job_applications 테이블 한 행 — 채용 지원 내역 */
export interface JobApplication {
  id: string
  user_id: string
  job_posting_id: string
  // 지원 상태: applied(지원완료) | reviewing(검토중) | confirmed(출근확정) | completed(출근완료) | cancelled(취소) | rejected(거절)
  // reviewing 은 2026-04-18 DB CHECK 제약에 추가됨
  status: 'applied' | 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  applied_at: string
  work_date: string | null          // 출근 예정일 (YYYY-MM-DD)
  work_confirmed_at: string | null  // 출근 확정 시각
  note: string | null
  created_at: string
  // 인적사항 (지원 시점 직접 입력) — 20260410 추가
  applicant_name: string | null
  applicant_birth: string | null    // YYYY-MM-DD
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  consent_collect: boolean | null
  consent_third_party: boolean | null
  consent_at: string | null
  // 근무 관련 추가 정보 — 20260411 추가 (지원서 폼 전면 개편)
  applied_task: string | null               // 선택 업무 (예: 상차, 분류)
  prior_experience_90d: boolean | null      // 90일 이내 근무 경험 여부
  preferred_shift: 'morning' | 'afternoon' | 'night' | 'any' | null  // 희망 시간대
  transportation: 'car' | 'public' | 'shuttle' | null  // 교통 수단
  shoe_size: string | null                  // 안전화 사이즈 (mm)
  notes: string | null                      // 특이사항/건강상 이슈
  emergency_contact: string | null          // 비상 연락처
  // Supabase JOIN 시 포함되는 공고 상세 (선택)
  job_postings?: Pick<JobPosting, 'company_name' | 'center_name' | 'region' | 'hourly_wage' | 'daily_wage' | 'work_hours'> | null
}

/** user_points 테이블 한 행 — 포인트 이력 */
export interface UserPoint {
  id: string
  user_id: string
  amount: number     // 양수: 적립 / 음수: 사용
  reason: string     // '최초지원' | '출근완료' | '연속출근3일' | ... 등
  ref_id: string | null
  created_at: string
}

/** user_coupons 테이블 한 행 — 보유 쿠폰 */
export interface UserCoupon {
  id: string
  user_id: string
  coupon_type: 'coffee' | 'discount' | 'cashback'
  title: string
  description: string | null
  coupon_code: string | null
  is_used: boolean
  expires_at: string | null
  used_at: string | null
  created_at: string
}

/** job_favorites 테이블 한 행 — 즐겨찾기 (회사/센터) */
export interface JobFavorite {
  id: string
  user_id: string
  favorite_type: 'company' | 'center'
  favorite_value: string
  created_at: string
}

/** reports 테이블 한 행 - 리스트/상세 공통 */
export interface ReportRow {
  id: string
  user_id: string
  title: string
  company_name: string | null
  created_at: string
  /** 상세 데이터(JSON) - 각종 계산 결과 */
  payload?: AnyPayload | null
}
