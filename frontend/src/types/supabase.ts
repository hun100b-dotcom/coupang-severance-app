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
  content: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
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
