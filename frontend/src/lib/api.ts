import axios from 'axios'
import { supabase } from './supabase'

const baseURL = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // 끝 슬래시 제거
  : '/api'

// 관리자 페이지 등 다른 곳에서도 쓸 수 있도록 내보냅니다
export const api = axios.create({
  baseURL,
  timeout: 90000, // Render 무료 티어 콜드스타트 대기 (최대 50초+)
})

// ── Render 콜드스타트 사전 워밍업 ────────────────────────────────────────────
// Render 무료 티어는 15분 이상 유휴 시 서버가 절전 모드로 진입합니다.
// 앱이 처음 로드될 때 백그라운드에서 /health 엔드포인트에 ping을 날려
// 서버를 미리 깨워 둡니다. 사용자가 실제 계산 버튼을 누를 때쯤엔
// 서버가 이미 준비되어 있어 콜드스타트 대기 시간이 크게 줄어듭니다.
// 실패해도 오류를 무시합니다 — 워밍업 실패가 앱 동작을 막으면 안 됩니다.
;(async () => {
  try {
    await api.get('/health', { timeout: 10000 }) // 10초 안에 응답 없으면 그냥 포기
  } catch {
    // 워밍업 실패는 조용히 무시 (콘솔에도 출력하지 않습니다)
  }
})()

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

// ── 로컬 집계용 내부 타입 ─────────────────────────────────
interface _ReportPayload {
  eligible?: boolean
  severance?: number
  work_days?: number
  average_wage?: number
}
interface _ReportRow {
  user_id: string | null
  company_name: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: _ReportPayload | Record<string, any> | null
  created_at?: string
}

// Dashboard — FastAPI 대신 Supabase 직접 쿼리로 교체
export const getAdminStats = async () => {
  if (!supabase) throw new Error('Supabase 클라이언트 미초기화')

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)

  // 병렬로 9개 쿼리 실행
  const [
    { count: totalUsers },
    { count: newToday },
    { count: newThisWeek },
    { count: marketingAgreed },
    { data: reports },
    { data: inquiries },
    { data: clicksData },
    { count: totalJobs },
    { count: activeJobs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .or('marketing_sms.eq.true,marketing_email.eq.true,marketing_phone.eq.true'),
    supabase.from('reports').select('payload, company_name')
      .order('created_at', { ascending: false }).limit(1000),
    supabase.from('inquiries').select('status').limit(500),
    supabase.from('click_counter').select('total_cnt, severance_cnt, unemployment_cnt'),
    supabase.from('job_postings').select('*', { count: 'exact', head: true }),
    supabase.from('job_postings').select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
  ])

  // reports 로컬 집계 (payload는 JSONB)
  const reportsList = (reports ?? []) as _ReportRow[]
  const eligibleList = reportsList.filter(r => (r.payload as _ReportPayload)?.eligible)
  const avgSeverance = eligibleList.length > 0
    ? Math.round(eligibleList.reduce((s, r) =>
        s + ((r.payload as _ReportPayload)?.severance ?? 0), 0) / eligibleList.length)
    : 0
  const companyCounts: Record<string, number> = {}
  for (const r of reportsList) {
    const name = r.company_name || '기타'
    companyCounts[name] = (companyCounts[name] ?? 0) + 1
  }
  const byCompany = Object.entries(companyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  // inquiries 상태별 집계
  const inqList = (inquiries ?? []) as { status: string }[]

  // 클릭 카운터 (단일 행, 컬럼명: total_cnt / severance_cnt / unemployment_cnt)
  const clicks = ((clicksData ?? [])[0] ?? {}) as Record<string, number>

  return {
    users: {
      total: totalUsers ?? 0,
      marketing_agreed: marketingAgreed ?? 0,
      new_today: newToday ?? 0,
      new_this_week: newThisWeek ?? 0,
    },
    reports: {
      total: reportsList.length,
      eligible: eligibleList.length,
      ineligible: reportsList.length - eligibleList.length,
      avg_severance: avgSeverance,
      by_company: byCompany,
    },
    inquiries: {
      total: inqList.length,
      waiting: inqList.filter(i => i.status === 'waiting' || i.status === '대기중').length,
      reviewing: inqList.filter(i => i.status === 'reviewing').length,
      answered: inqList.filter(i => i.status === 'answered' || i.status === '답변완료').length,
      closed: inqList.filter(i => i.status === 'closed').length,
    },
    clicks: {
      total: clicks.total_cnt ?? 0,
      severance: clicks.severance_cnt ?? 0,
      unemployment: clicks.unemployment_cnt ?? 0,
    },
    jobs: {
      total: totalJobs ?? 0,
      active: activeJobs ?? 0,
    },
  }
}

export const getAdminAnalytics = async (start: string, end: string) => {
  if (!supabase) throw new Error('Supabase 클라이언트 미초기화')

  // 3개 테이블에서 날짜 범위 내 created_at 가져오기
  const [
    { data: profiles },
    { data: reports },
    { data: inquiries },
  ] = await Promise.all([
    supabase.from('profiles').select('created_at')
      .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59Z`),
    supabase.from('reports').select('created_at')
      .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59Z`),
    supabase.from('inquiries').select('created_at')
      .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59Z`),
  ])

  // 날짜별 건수 집계 헬퍼
  const toDateCounts = (rows: { created_at: string }[] | null): Record<string, number> => {
    const c: Record<string, number> = {}
    for (const r of rows ?? []) {
      const d = (r.created_at ?? '').slice(0, 10)
      if (d) c[d] = (c[d] ?? 0) + 1
    }
    return c
  }

  const usersByDate    = toDateCounts(profiles as { created_at: string }[])
  const reportsByDate  = toDateCounts(reports  as { created_at: string }[])
  const inqByDate      = toDateCounts(inquiries as { created_at: string }[])

  // start~end 전 날짜 배열 생성
  const daily = []
  const cur = new Date(`${start}T00:00:00Z`)
  const endDt = new Date(`${end}T00:00:00Z`)
  while (cur <= endDt) {
    const d = cur.toISOString().slice(0, 10)
    daily.push({
      date: d,
      new_users:     usersByDate[d]   ?? 0,
      new_reports:   reportsByDate[d] ?? 0,
      new_inquiries: inqByDate[d]     ?? 0,
      clicks: 0,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return { daily }
}

// Target — FastAPI 대신 Supabase 직접 쿼리로 교체
export const getTargetInsights = async () => {
  if (!supabase) throw new Error('Supabase 클라이언트 미초기화')

  // 4개 테이블 병렬 조회
  const [
    { data: profiles, count: totalUsersCount },
    { data: reports },
    { data: inquiries },
    { data: clicksData },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('id, provider, created_at, marketing_sms, marketing_email, marketing_phone', { count: 'exact' })
      .limit(5000),
    supabase.from('reports')
      .select('user_id, company_name, payload, created_at')
      .order('created_at', { ascending: false }).limit(5000),
    supabase.from('inquiries')
      .select('category, status, created_at, updated_at, answer').limit(3000),
    supabase.from('click_counter').select('total_cnt, severance_cnt, unemployment_cnt'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileList = (profiles ?? []) as Record<string, any>[]
  const reportList  = (reports  ?? []) as _ReportRow[]
  const inqList     = (inquiries ?? []) as Record<string, string | null>[]
  const totalUsers  = totalUsersCount ?? profileList.length

  // ── Overview ──────────────────────────────────────────
  const uniqueReporters = new Set(reportList.map(r => r.user_id).filter(Boolean))
  const eligibleReports = reportList.filter(r => (r.payload as _ReportPayload)?.eligible)
  const totalSeverance  = eligibleReports.reduce((s, r) =>
    s + ((r.payload as _ReportPayload)?.severance ?? 0), 0)
  const avgSeverance    = eligibleReports.length > 0
    ? Math.round(totalSeverance / eligibleReports.length) : 0
  const activeUsers     = uniqueReporters.size
  const conversionRate  = Math.round(activeUsers / Math.max(totalUsers, 1) * 1000) / 10
  const eligibleRate    = Math.round(eligibleReports.length / Math.max(reportList.length, 1) * 1000) / 10
  const marketingCount  = profileList.filter(
    p => p.marketing_sms || p.marketing_email || p.marketing_phone).length
  const marketingRate   = Math.round(marketingCount / Math.max(totalUsers, 1) * 1000) / 10
  const onboarded       = profileList.filter(p => p.onboarding_completed).length
  const onboardingRate  = Math.round(onboarded / Math.max(totalUsers, 1) * 1000) / 10

  // ── Clicks ────────────────────────────────────────────
  const clickRow     = ((clicksData ?? [])[0] ?? {}) as Record<string, number>
  const clickTotal   = clickRow.total_cnt ?? 0
  const clickSev     = clickRow.severance_cnt ?? 0
  const clickUnemp   = clickRow.unemployment_cnt ?? 0

  // ── Companies ─────────────────────────────────────────
  const companyCounts: Record<string, number> = {}
  for (const r of reportList) {
    const name = r.company_name || '기타'
    companyCounts[name] = (companyCounts[name] ?? 0) + 1
  }
  const totalReportCnt = Math.max(Object.values(companyCounts).reduce((a, b) => a + b, 0), 1)
  const companies = Object.entries(companyCounts)
    .map(([name, count]) => ({ name, count, pct: Math.round(count / totalReportCnt * 1000) / 10 }))
    .sort((a, b) => b.count - a.count)

  // ── Segments + Heatmap ────────────────────────────────
  const durLabels  = ['3개월 미만', '3~6개월', '6개월~1년', '1년 이상']
  const wageLabels = ['5만원 미만', '5~8만원', '8~12만원', '12만원 이상']
  const durBins:  Record<string, number> = { '3개월 미만': 0, '3~6개월': 0, '6개월~1년': 0, '1년 이상': 0 }
  const wageBins: Record<string, number> = { '5만원 미만': 0, '5~8만원': 0, '8~12만원': 0, '12만원 이상': 0 }
  const heatmap = Array.from({ length: 4 }, () => Array(4).fill(0) as number[])
  for (const r of reportList) {
    const wd = (r.payload as _ReportPayload)?.work_days   ?? 0
    const aw = (r.payload as _ReportPayload)?.average_wage ?? 0
    const di = wd < 90 ? 0 : wd < 180 ? 1 : wd < 365 ? 2 : 3
    const wi = aw < 50000 ? 0 : aw < 80000 ? 1 : aw < 120000 ? 2 : 3
    durBins[durLabels[di]]++; wageBins[wageLabels[wi]]++; heatmap[di][wi]++
  }

  // ── Revenue ───────────────────────────────────────────
  const revKeys = ['100만원 미만', '100~300만원', '300~500만원', '500만~1000만원', '1000만원 이상']
  const revBins: Record<string, { count: number; total: number }> = {}
  for (const k of revKeys) revBins[k] = { count: 0, total: 0 }
  let highValue = 0
  for (const r of eligibleReports) {
    const sev = (r.payload as _ReportPayload)?.severance ?? 0
    const idx = sev < 1_000_000 ? 0 : sev < 3_000_000 ? 1 : sev < 5_000_000 ? 2 : sev < 10_000_000 ? 3 : 4
    revBins[revKeys[idx]].count++; revBins[revKeys[idx]].total += sev
    if (sev >= 3_000_000) highValue++
  }

  // ── Demographics ──────────────────────────────────────
  const providerCounts: Record<string, number> = {}
  const monthlySignups: Record<string, number> = {}
  for (const p of profileList) {
    const prov  = (p.provider as string) || 'unknown'
    providerCounts[prov] = (providerCounts[prov] ?? 0) + 1
    const month = ((p.created_at as string) ?? '').slice(0, 7)
    if (month) monthlySignups[month] = (monthlySignups[month] ?? 0) + 1
  }
  const mktDetail = {
    sms:   profileList.filter(p => p.marketing_sms).length,
    email: profileList.filter(p => p.marketing_email).length,
    phone: profileList.filter(p => p.marketing_phone).length,
    none:  profileList.filter(p => !p.marketing_sms && !p.marketing_email && !p.marketing_phone).length,
  }

  // ── Inquiry Analysis ──────────────────────────────────
  const inqCat:  Record<string, number> = {}
  const inqStat: Record<string, number> = {}
  const respTimes: number[] = []
  for (const i of inqList) {
    const cat = i.category || '기타'
    inqCat[cat]  = (inqCat[cat]  ?? 0) + 1
    const st = i.status || 'unknown'
    inqStat[st]  = (inqStat[st]  ?? 0) + 1
    if (i.answer && i.created_at && i.updated_at) {
      try {
        const h = (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 3_600_000
        if (h > 0) respTimes.push(h)
      } catch { /* 무시 */ }
    }
  }
  const avgResp = respTimes.length > 0
    ? Math.round(respTimes.reduce((a, b) => a + b) / respTimes.length * 10) / 10 : 0

  // ── Computed Tags ─────────────────────────────────────
  const userMap: Record<string, _ReportRow[]> = {}
  for (const r of reportList) {
    if (r.user_id) userMap[r.user_id] = [...(userMap[r.user_id] ?? []), r]
  }
  const tags: Record<string, number> = {
    '퇴직금_적격자': 0, '고액_수급자': 0, '장기근속자': 0,
    '분쟁_위험군': 0, '다중_사업장': 0, '반복_이용자': 0,
  }
  for (const urs of Object.values(userMap)) {
    const cos = new Set<string>()
    let elig = false, hv = false, lt = false, disp = false
    for (const r of urs) {
      cos.add(r.company_name || '')
      const pl = r.payload as _ReportPayload
      if (pl?.eligible) { elig = true; if ((pl.severance ?? 0) >= 3_000_000) hv = true }
      if ((pl?.work_days ?? 0) >= 365) { lt = true; if (!pl?.eligible) disp = true }
    }
    if (elig)      tags['퇴직금_적격자']++
    if (hv)        tags['고액_수급자']++
    if (lt)        tags['장기근속자']++
    if (disp)      tags['분쟁_위험군']++
    if (cos.size > 1)  tags['다중_사업장']++
    if (urs.length > 1) tags['반복_이용자']++
  }
  const weekAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const newW = profileList.filter(p => ((p.created_at as string) ?? '') > weekAgoIso).length
  if (newW > 0) tags['신규_유저'] = newW

  return {
    overview: {
      total_users: totalUsers, active_users: activeUsers,
      total_reports: reportList.length, total_inquiries: inqList.length,
      conversion_rate: conversionRate, eligible_rate: eligibleRate,
      avg_severance: avgSeverance, total_severance: totalSeverance,
      marketing_rate: marketingRate, onboarding_rate: onboardingRate,
    },
    funnel: {
      visitors: clickTotal, signups: totalUsers,
      calculations: reportList.length, eligible: eligibleReports.length,
    },
    companies,
    segments: {
      by_duration: durLabels.map(l => ({ label: l, count: durBins[l] })),
      by_wage:     wageLabels.map(l => ({ label: l, count: wageBins[l] })),
      heatmap, duration_labels: durLabels, wage_labels: wageLabels,
    },
    revenue: {
      total_eligible_severance: totalSeverance, avg_severance: avgSeverance,
      high_value_count: highValue,
      segments: revKeys.map(k => ({ label: k, count: revBins[k].count, total: revBins[k].total })),
    },
    demographics: {
      by_provider: Object.entries(providerCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      marketing: mktDetail,
      onboarding_completed: onboarded,
      onboarding_pending: totalUsers - onboarded,
    },
    service_usage: { total: clickTotal, severance: clickSev, unemployment: clickUnemp },
    inquiry_analysis: {
      by_category: Object.entries(inqCat).map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      by_status: Object.entries(inqStat).map(([label, count]) => ({ label, count })),
      avg_response_hours: avgResp, total: inqList.length,
    },
    tags: Object.entries(tags).filter(([, v]) => v > 0).map(([tag, count]) => ({ tag, count })),
    growth: Object.entries(monthlySignups).sort().map(([month, count]) => ({ month, count })),
  }
}

// Inquiries — FastAPI 대신 Supabase 직접 쿼리 (백엔드 의존 제거)
export const getAdminInquiries = async (params: {
  page?: number; limit?: number; status?: string; category?: string; search?: string
}) => {
  const { page = 1, limit = 20, status = '', category = '', search = '' } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase!
    .from('inquiries')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  // 내용·제목·카테고리 중 하나라도 검색어를 포함하면 반환
  if (search)   query = query.or(
    `content.ilike.%${search}%,title.ilike.%${search}%,category.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { inquiries: data ?? [], total: count ?? 0 }
}

// ── 문의 상태/답변 변경 — 백엔드 정상 경로(경로 B) 사용 ─────────────────
// 과거: Supabase 직접 update(.select() 없음) → RLS가 0행을 막아도 error=null로
//       조용히 통과(거짓 성공)했고, inquiries RLS가 특정 UUID로 하드코딩되어
//       다른 활성 관리자 계정에서는 무음 실패가 발생했다.
// 현재: FastAPI /admin/inquiries/* 엔드포인트는 service-role 키로 동작하여
//       RLS와 무관하게 항상 쓰기가 반영되고, 실패 시 HTTP 에러를 던져
//       프론트에서 catch로 잡아 사용자에게 알릴 수 있다.
export const patchInquiryStatus = (id: string | number, status: string) =>
  api.patch(`/admin/inquiries/${id}/status`, { status }, { headers: H() }).then(r => r.data)

export const patchInquiryAnswer = (id: string | number, answer: string) =>
  api.patch(`/admin/inquiries/${id}/answer`, { answer }, { headers: H() }).then(r => r.data)

// 백엔드 BulkStatusPayload.ids 는 list[str] 이므로 문자열로 변환해 전송
export const bulkInquiryStatus = (ids: Array<string | number>, status: string) =>
  api.post('/admin/inquiries/bulk-status', { ids: ids.map(String), status }, { headers: H() }).then(r => r.data)

// Templates — 백엔드 경로(경로 B)로 통일.
// 조회/생성/삭제를 모두 백엔드(service-role)로 맞춰, inquiry_templates RLS(is_admin)
// 상태와 무관하게 "생성은 됐는데 목록엔 안 뜨는" 불일치를 방지한다.
export const getTemplates = () =>
  api.get('/admin/templates', { headers: H() }).then(r => r.data)

// 템플릿 생성/삭제도 백엔드 정상 경로(경로 B, service-role)로 통일.
// 과거 Supabase 직접 호출은 .select() 없이 delete 해서 RLS 0행 차단을 무음으로
// 흘렸다. 백엔드는 status_code 검사로 실패 시 HTTP 에러를 던진다.
export const createTemplate = (body: { title: string; content: string; category?: string }) =>
  api.post('/admin/templates',
    { title: body.title, content: body.content, category: body.category ?? '기타' },
    { headers: H() }).then(r => r.data)

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

// 클라이언트 행동 감사 기록 — 백엔드 service-role 경로(RLS 무관, IP 서버 캡처)
export const postAuditLog = (body: {
  admin_email: string
  action: string
  target_type?: string | null
  target_id?: string | null
  after_val?: Record<string, unknown> | null
  before_val?: Record<string, unknown> | null
}) => api.post('/admin/audit-log', body, { headers: H() }).then(r => r.data)

// ── 회원 관리 (서버측 마스킹 + 단건 평문 해제) ────────────────────────
// 보안 재설계(🔴#4): 과거 프론트는 supabase.from('profiles').select('*')로 PII를
// 평문 통째 수신했다(네트워크 탭 노출 = 가짜 마스킹). 이제 백엔드(service-role)가
// 마스킹된 데이터만 내려보내고, 평문은 보안키를 통과한 reveal 단건 호출로만 받는다.

// 서버측 마스킹된 회원 한 행 (평문 PII 없음 / id는 reveal 타깃팅용 내부 UUID)
export interface MaskedMember {
  id: string
  email: string            // 마스킹됨: ab***@gmail.com
  full_name: string        // 마스킹됨: 김**
  birthdate: string        // 마스킹됨: 1990-**-**
  phone_number: string     // 마스킹됨: 010-****-5678
  provider: string | null
  created_at: string
  marketing_sms: boolean
  marketing_email: boolean
  marketing_phone: boolean
  onboarding_completed: boolean
}

// reveal 응답 (단건 평문 — 보기 클릭 시에만 수신)
export interface RevealedMember {
  id: string
  email: string | null
  full_name: string | null
  birthdate: string | null
  phone_number: string | null
  display_name: string | null
}

export const getAdminMembers = (params: {
  page?: number; limit?: number; search?: string; marketing?: '' | 'true' | 'false'
}) =>
  api.get<{ members: MaskedMember[]; total: number }>('/admin/members', {
    params, headers: H(),
  }).then(r => r.data)

// 단건 평문 해제 — 보안키 + 회원 id 전송. 서버가 해시 검증 후 1명 원본 반환 + 감사기록.
export const revealMember = (memberId: string, key: string, adminEmail: string) =>
  api.post<RevealedMember>('/admin/members/reveal',
    { member_id: memberId, key, admin_email: adminEmail },
    { headers: H() }).then(r => r.data)

// 보안키 설정/변경 — 원문은 저장 안 되고 서버가 해시만 보관
export const setUnmaskKey = (key: string, adminEmail: string) =>
  api.post('/admin/members/unmask-key', { key, admin_email: adminEmail }, { headers: H() }).then(r => r.data)

// 마스킹된 프로필 한 행 (평문 PII 없음) — 방문자/지원자 화면의 회원명·이메일 표시용
export interface MaskedProfileLite {
  id: string
  full_name: string   // 마스킹됨: 김**
  email: string       // 마스킹됨: ab***@gmail.com
}

// user_id 목록 → 마스킹된 프로필 매핑(id→{full_name,email}).
// 보안(🟡 V5): 평문 profiles 직접 조회를 대체. 평문은 서버를 떠나지 않는다.
export const lookupMaskedProfiles = (ids: string[]) =>
  api.post<{ profiles: Record<string, MaskedProfileLite> }>(
    '/admin/profiles/masked-lookup', { ids }, { headers: H() },
  ).then(r => r.data.profiles)

// 보안키 설정 여부 (해시 값은 절대 반환되지 않음)
export const getUnmaskKeyStatus = () =>
  api.get<{ configured: boolean; updated_at: string | null }>('/admin/members/unmask-key/status', {
    headers: H(),
  }).then(r => r.data)
