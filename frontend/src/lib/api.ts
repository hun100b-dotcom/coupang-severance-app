import axios from 'axios'

const baseURL = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // 끝 슬래시 제거
  : '/api'

// 관리자 페이지 등 다른 곳에서도 쓸 수 있도록 내보냅니다
export const api = axios.create({
  baseURL,
  timeout: 90000, // Render 무료 티어 콜드스타트 대기 (최대 50초+)
})

// ── 카운터 ──────────────────────────────────────
export const getClickCount = () =>
  api.get<{ total: number; severance: number; unemployment: number }>('/click-count').then(r => r.data)

export const registerClick = (service: 'severance' | 'unemployment' | 'weekly_allowance' | 'annual_leave' | 'benefits') =>
  api.post(`/click/${service}`).then(r => r.data)

// ── 1:1 문의 알림 (FastAPI 백엔드 → Discord Webhook) ─────────
// 개인정보보호법 제17조 준수: Discord Inc. (미국 법인)로 개인정보를 전송하지 않고,
// inquiry_id만 전송하여 관리자가 관리자 페이지에서 확인하도록 합니다.
export async function notifyNewInquiry(payload: {
  inquiryId: string  // 필수: Supabase inquiries 테이블의 UUID
  title?: string      // 하위 호환성 유지 (실제로는 미사용)
  content?: string
  userId?: string
  userName?: string
  category?: string
}) {
  try {
    // FastAPI 백엔드 /api/inquiry/notify 엔드포인트 호출
    await api.post('/inquiry/notify', {
      inquiry_id: payload.inquiryId,
      title: payload.title || '',
      content: payload.content || '',
      user_id: payload.userId || null,
      user_name: payload.userName || null,
    })

    return { success: true }
  } catch (err) {
    // 알림 실패는 문의 저장 자체를 막지 않음 — 콘솔 로그만 기록
    console.warn('[Discord 알림 실패] 문의는 정상 저장됩니다.', err)
    return { success: false }
  }
}

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

// ── 주휴수당 ─────────────────────────────────────────────
export const extractWeeklyAllowanceCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/weekly-allowance/extract-companies', fd).then(r => r.data)
}

export interface WeeklyAllowanceWeekItem {
  week_key: string
  week_start: string
  week_end: string
  work_days: number
  weekly_hours: number
  total_pay: number
  eligible: boolean
  allowance: number
}

export interface WeeklyAllowancePreciseResult {
  company: string
  hourly_wage: number
  daily_hours: number
  total_weeks: number
  eligible_weeks: number
  total_allowance: number
  weeks: WeeklyAllowanceWeekItem[]
  error?: string
}

export const calcWeeklyAllowancePrecise = (formData: FormData): Promise<WeeklyAllowancePreciseResult> =>
  api.post('/weekly-allowance/precise', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

// ── 연차수당 ─────────────────────────────────────────────
export const extractAnnualLeaveCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/annual-leave/extract-companies', fd).then(r => r.data)
}

export interface AnnualLeaveMonthItem {
  month: string
  work_days: number
  attended: boolean
}

export interface AnnualLeavePreciseResult {
  company: string
  hire_date: string
  ref_date: string
  years_worked: number
  months_worked: number
  attended_months: number
  first_year_days: number
  annual_days: number
  total_entitlement: number
  used_days: number
  remaining_days: number
  avg_daily_wage: number
  unpaid_allowance: number | null
  monthly_detail: AnnualLeaveMonthItem[]
  error?: string
}

export const calcAnnualLeavePrecise = (formData: FormData): Promise<AnnualLeavePreciseResult> =>
  api.post('/annual-leave/precise', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

// ── Admin OS API ──────────────────────────────────────────
// VITE_ADMIN_SECRET 미설정 시 VITE_SUPABASE_ANON_KEY 뒤 32자로 자동 파생 (백엔드와 동일 로직)
const _adminToken =
  (import.meta.env.VITE_ADMIN_SECRET as string | undefined) ||
  ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.slice(-32) ?? '')
const H = () => ({ 'X-Admin-Token': _adminToken })

// Dashboard
export const getAdminStats = () =>
  api.get('/admin/stats', { headers: H() }).then(r => r.data)
export const getAdminAnalytics = (start: string, end: string) =>
  api.get('/admin/analytics', { params: { start, end }, headers: H() }).then(r => r.data)

// Target
export const getTargetCompanies = () =>
  api.get('/admin/target/companies', { headers: H() }).then(r => r.data)
export const getTargetSegments = () =>
  api.get('/admin/target/segments', { headers: H() }).then(r => r.data)

// Inquiries
export const getAdminInquiries = (params: object) =>
  api.get('/admin/inquiries', { params, headers: H() }).then(r => r.data)
export const patchInquiryStatus = (id: string, status: string) =>
  api.patch(`/admin/inquiries/${id}/status`, { status }, { headers: H() }).then(r => r.data)
export const patchInquiryAnswer = (id: string, answer: string) =>
  api.patch(`/admin/inquiries/${id}/answer`, { answer }, { headers: H() }).then(r => r.data)
export const bulkInquiryStatus = (ids: string[], status: string) =>
  api.post('/admin/inquiries/bulk-status', { ids, status }, { headers: H() }).then(r => r.data)

// Templates
export const getTemplates = () =>
  api.get('/admin/templates', { headers: H() }).then(r => r.data)
export const createTemplate = (body: object) =>
  api.post('/admin/templates', body, { headers: H() }).then(r => r.data)
export const deleteTemplate = (id: string) =>
  api.delete(`/admin/templates/${id}`, { headers: H() }).then(r => r.data)

// Settings
export const getSettings = () =>
  api.get('/admin/settings', { headers: H() }).then(r => r.data)
export const patchSetting = (key: string, value: string) =>
  api.patch('/admin/settings', { key, value }, { headers: H() }).then(r => r.data)
export const getBlockedIps = () =>
  api.get('/admin/blocked-ips', { headers: H() }).then(r => r.data)
export const blockIp = (body: object) =>
  api.post('/admin/blocked-ips', body, { headers: H() }).then(r => r.data)
export const unblockIp = (id: string) =>
  api.delete(`/admin/blocked-ips/${id}`, { headers: H() }).then(r => r.data)

// Logs
export const getAuditLogs = (params: object) =>
  api.get('/admin/logs', { params, headers: H() }).then(r => r.data)
