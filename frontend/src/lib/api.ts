import axios from 'axios'

const baseURL = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // 끝 슬래시 제거
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 90000, // Render 무료 티어 콜드스타트 대기 (최대 50초+)
})

// ── 카운터 ──────────────────────────────────────
export const getClickCount = () =>
  api.get<{ total: number; severance: number; unemployment: number }>('/click-count').then(r => r.data)

export const registerClick = (service: 'severance' | 'unemployment') =>
  api.post(`/click/${service}`).then(r => r.data)

// ── 1:1 문의 알림 (Discord Webhook 등) ─────────────
export const notifyNewInquiry = (payload: {
  title: string
  content: string
  userId?: string
  userName?: string
}) =>
  api
    .post('/inquiry/notify', {
      // 백엔드 스키마에 맞춰 필드명을 매핑합니다.
      title: payload.title,
      content: payload.content,
      user_id: payload.userId ?? null,
      user_name: payload.userName ?? null,
    })
    .then(r => r.data)
    .catch(() => undefined) // 알림 실패는 사용자 플로우를 막지 않도록 조용히 무시합니다.

/** PDF에서 사업장 고유 리스트 추출 (퇴직금 정밀 계산용) */
export const extractSeveranceCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/severance/extract-companies', fd).then(r => r.data)
}

/** PDF에서 사업장 고유 리스트 추출 (실업급여 정밀 계산용) */
export const extractUnemploymentCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/unemployment/extract-companies', fd).then(r => r.data)
}

// ── 퇴직금 리포트 세부 타입 ───────────────────────
export interface WeeklyDetailItem {
  week: string
  days: number
  hours: number
  qualifies: boolean
  month: string
  total_pay: number
}

export interface MonthlySummaryItem {
  month: string
  total_weeks: number
  qualifying_weeks: number
  non_qualifying: number
  total_days: number
}

export interface WorkGap {
  from_date: string
  to_date: string
  gap_weeks: number
  gap_days: number
}

/** 28일 역산 블록 하나의 분석 결과 */
export interface BlockItem {
  seg_idx: number
  start: string
  end: string
  block_days: number
  work_days: number
  total_hours: number
  avg_weekly_hours: number
  qualifies: boolean
}

/** 근로 단절(3개월 이상 미근무)로 분리된 구간 */
export interface SegmentItem {
  seg_idx: number
  first_date: string
  last_date: string
  qualifying_days: number
  eligible: boolean
  block_count: number
}

export interface EmploymentReport {
  first_work_date: string
  last_work_date: string
  total_calendar_days: number
  excluded_days: number
  effective_days: number
  /** 28일 블록 기준 인정 근속일수 (핵심 판단 지표) */
  qualifying_days: number
  segments: SegmentItem[]
  blocks: BlockItem[]
  total_weeks: number
  qualifying_weeks: number
  non_qualifying_weeks: number
  avg_period_start: string
  avg_period_end: string
  avg_total_days_in_period: number
  avg_total_pay_in_period: number
  weekly_detail: WeeklyDetailItem[]
  monthly_summary: MonthlySummaryItem[]
  work_gaps: WorkGap[]
  attorney_comment: string
}

export interface SeverancePreciseResult {
  eligible: boolean
  qualifying_days: number
  weeks_15h_plus: number
  eligibility_message: string
  average_wage: number
  total_pay: number
  total_days_3m: number
  severance: number
  work_days: number
   // 평균임금이 통상임금 하한선보다 낮아 통상임금을 적용했는지 여부 및 적용된 통상임금
  is_ordinary_wage_applied?: boolean
  applied_ordinary_wage?: number
  weekly_data: { week: string; days: number }[]
  pay_data: { date: string; pay: number }[]
  company_found: boolean
  report?: EmploymentReport
}

export const calcSeverancePrecise = (
  formData: FormData
): Promise<SeverancePreciseResult> =>
  api.post('/severance/precise', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export interface SeveranceSimpleResult {
  // 정밀계산과 동일하게 자격 판단 필드 추가
  eligible: boolean
  eligibility_message: string
  severance: number
  work_days: number
  average_wage: number
}

export const calcSeveranceSimple = (
  work_days: number,
  avg_daily_wage: number
): Promise<SeveranceSimpleResult> =>
  api.post('/severance/simple', { work_days, avg_daily_wage }).then(r => r.data)

// ── 실업급여 ─────────────────────────────────────
export interface UBResult {
  eligible_180: boolean
  insured_days_in_18m: number
  avg_daily_wage: number
  daily_benefit: number
  days: number
  total_estimate: number
  days_last_month?: number
  company_found?: boolean
}

export const calcUBPrecise = (formData: FormData): Promise<UBResult> =>
  api.post('/unemployment/precise', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

export const calcUBSimple = (
  insured_days: number,
  avg_daily_wage: number,
  age_50: boolean
): Promise<UBResult> =>
  api.post('/unemployment/simple', { insured_days, avg_daily_wage, age_50 }).then(r => r.data)
