import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ── axios 요청 설정 확장: 멱등(idempotent) 표시 플래그 ─────────────────────
// 배경(2026-07-05 정밀계산 장애): 콜드스타트 재시도가 GET 에만 적용돼, 정작 핵심인
//   계산 POST(퇴직금 정밀계산 등)는 Render 콜드스타트 502/네트워크 단절 한 번에
//   재시도 없이 "서버에 연결할 수 없어요"로 즉시 실패했다.
//   계산·PDF추출 엔드포인트는 서버에 아무 부작용(DB 쓰기 등)이 없는 '순수 계산'이라
//   여러 번 호출해도 결과가 같다(=멱등). 따라서 이 플래그가 true 인 POST 는
//   GET 과 동일하게 콜드스타트 재시도를 허용해도 안전하다(중복 실행 위험 없음).
//   반대로 문의 등록/지원 등 부작용 있는 POST 는 이 플래그를 붙이지 않아 재시도 대상에서 제외된다.
declare module 'axios' {
  interface AxiosRequestConfig {
    /** true 면 부작용 없는 순수 계산 요청 — POST 여도 콜드스타트 재시도 허용 */
    _idempotent?: boolean
  }
}

const baseURL = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // 끝 슬래시 제거
  : '/api'

// 관리자 페이지 등 다른 곳에서도 쓸 수 있도록 내보냅니다
export const api = axios.create({
  baseURL,
  timeout: 90000, // Render 무료 티어 콜드스타트 대기 (최대 50초+)
})

const _sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── 콜드스타트/일시장애 자동 재시도 + 우아한 에러 안내 ───────────────────────
// 배경: Render 무료 티어는 15분 이상 유휴 시 절전 → 첫 요청에 게이트웨이가 "즉시
//   503"을 반환하며 인스턴스를 깨운다. 재시도가 없으면 이 503/네트워크 단절이
//   그대로 화면에 "Network error"로 노출된다(어드민 백엔드 의존 메뉴 전역 폭주).
// 처치: 응답이 아예 없거나(네트워크/타임아웃) 502·503·504 인 경우에 한해 지수
//   백오프로 최대 5회 재시도한다. 503 은 즉시 반환되므로 재시도 비용이 작고,
//   슬립이 깨어나면 그 사이 200 으로 회복된다(콜드스타트 30~50초를 백오프로 흡수).
//   최종 실패 시에는 원시 영문 에러("Network Error") 대신 한국어 안내를 부착하고,
//   어드민 호출에 한해 error.message 자체도 한국어로 정규화한다(아래 _isAdminRequest 참조).
const _RETRY_MAX = 5
const _RETRY_STATUSES = new Set([502, 503, 504])
// 재시도 대기(백오프) 편성 — 누적 48초.
// 배경(2026-07-04 전수조사): 기존 1.5s→3s→4.5s(누적 9초)는 콜드스타트 소요
//   30~50초를 전혀 못 덮어, 서버가 깨어나기 전에 재시도가 소진돼
//   "백엔드 서버에 연결할 수 없습니다"가 그대로 노출됐다.
//   GET(멱등)만 재시도하므로 횟수를 늘려도 중복 실행 위험은 없다.
const _RETRY_DELAYS_MS = [2000, 4000, 8000, 14000, 20000]

function _isRetriable(error: AxiosError): boolean {
  // 쓰기(POST/PATCH/DELETE)는 서버가 이미 처리했을 수 있어(예: 504) 재시도 시 중복
  // 실행 위험 → 기본적으로 멱등 메서드(GET/HEAD/OPTIONS)만 재시도한다. 어드민 "메뉴
  // 로드 실패" 폭주는 거의 전부 GET 이므로 이 한정으로도 그 증상은 해소된다.
  // 예외: _idempotent 플래그가 붙은 POST(계산·PDF추출 등 부작용 없는 순수 계산)는
  //   재시도해도 안전하므로 GET 과 동일하게 콜드스타트 재시도를 허용한다.
  //   (2026-07-05 정밀계산 장애 수정 — 콜드스타트 502에 계산 POST 가 즉시 실패하던 공백 보완)
  const method = (error.config?.method ?? 'get').toLowerCase()
  const isIdempotentPost = Boolean(error.config?._idempotent)
  const retriableMethod = method === 'get' || method === 'head' || method === 'options'
  if (!retriableMethod && !isIdempotentPost) return false
  if (!error.response) return true // 응답 없음 = 네트워크/타임아웃/콜드스타트
  return _RETRY_STATUSES.has(error.response.status)
}

// 이 요청이 "어드민 백엔드 호출"인지 판별 — X-Admin-Token 헤더 유무로 구분한다.
// 어드민 호출(getSettings/getAdminMembers/getAdminApplications/getAuditLogs 등)만
// H() 로 X-Admin-Token 을 싣는다. 계산기(severance/precise 등)는 이 헤더가 없다.
// 이 구분으로 "에러 메시지 한국어 정규화"를 어드민 호출에만 적용해, 계산기 페이지가
// `err.message === 'Network Error'` 로 분기하는 기존 로직(SeveranceFlow 등)을 건드리지 않는다.
function _isAdminRequest(cfg?: InternalAxiosRequestConfig): boolean {
  const h = cfg?.headers as { has?: (k: string) => boolean; [k: string]: unknown } | undefined
  if (!h) return false
  // axios 1.x 는 AxiosHeaders(.has) — 평객체 fallback 까지 모두 안전하게 확인
  if (typeof h.has === 'function') return h.has('X-Admin-Token')
  return Boolean(h['X-Admin-Token'] || h['x-admin-token'])
}

// 백엔드 실패를 사람이 읽을 수 있는 한국어 메시지로 정규화 — 어드민 메뉴 catch 에서 재사용
export function adminErrorMessage(error: unknown): string {
  const e = error as AxiosError<{ detail?: string }>
  if (e?.response) {
    const s = e.response.status
    // 백엔드가 명시적 한국어 detail 을 보낸 경우(예: "변경된 행이 없습니다…") 그대로 표기
    //   — 404 를 "API 경로 점검"으로 뭉뚱그리면 원인을 오도할 수 있다(리뷰어 A 지적).
    const detail = e.response.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (s === 401) return '관리자 인증 실패 — 관리자 토큰(VITE_ADMIN_SECRET)을 확인하세요.'
    if (s === 403) return '권한이 없거나 차단된 요청입니다.'
    if (s === 404) return '요청 경로를 찾을 수 없습니다 (API 경로 점검 필요).'
    if (s >= 500) return '백엔드 서버 점검 중입니다. 잠시 후 다시 시도해주세요.'
    return `요청이 거부되었습니다 (HTTP ${s}).`
  }
  // 응답 자체가 없음 = 네트워크 단절/콜드스타트/CORS
  return '백엔드 서버에 연결할 수 없습니다 (콜드스타트 또는 점검 중). 잠시 후 다시 시도해주세요.'
}

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined
    if (cfg && _isRetriable(error)) {
      cfg._retryCount = cfg._retryCount ?? 0
      if (cfg._retryCount < _RETRY_MAX) {
        cfg._retryCount += 1
        // 재시도 호출은 짧은 타임아웃으로 캡 — 진짜 무응답(콜드스타트 행) 시 매 시도가
        // 기본 90s 를 곱해 분 단위로 늘어나는 것을 막는다(최초 1회만 긴 타임아웃 허용).
        // 단, 계산 POST(_idempotent)는 PDF 파싱이 무거워(웜 5~7초, 콜드 직후엔 더) 20초로는
        // 부족할 수 있으므로 45초 헤드룸을 준다. GET(어드민 메뉴)은 가벼우니 20초 유지.
        cfg.timeout = cfg._idempotent ? 45000 : 20000
        await _sleep(_RETRY_DELAYS_MS[cfg._retryCount - 1] ?? 20000) // 2→4→8→14→20s 백오프(5회)
        return api(cfg)
      }
    }
    // 최종 실패: 우아한 한국어 메시지를 error 에 부착(메뉴에서 표시용)
    const msg = adminErrorMessage(error)
    ;(error as AxiosError & { adminMessage?: string }).adminMessage = msg
    // 어드민 백엔드 호출이면 error.message 자체도 한국어로 정규화한다.
    // 배경: 어드민 메뉴 20여 곳이 catch 에서 `e.message` 를 그대로 화면/배너에 노출하지만
    //   adminMessage 는 아무도 읽지 않아 죽은 코드였다 → 콜드스타트/장애 시 영문
    //   "Network Error" 가 그대로 노출됐다. 여기서 메시지를 한국어로 바꿔 두면 개별 메뉴를
    //   수정하지 않고도 전역적으로 우아한 안내가 표시된다.
    // 안전: X-Admin-Token 이 실린 어드민 호출에만 적용 → 계산기/인증 등 `=== 'Network Error'`
    //   분기 로직은 토큰이 없어 영향받지 않는다.
    if (_isAdminRequest(cfg)) {
      ;(error as AxiosError).message = msg
    }
    return Promise.reject(error)
  },
)

// ── Render 콜드스타트 사전 워밍업 ────────────────────────────────────────────
// 앱 로드 시 백그라운드로 실제 GET(/api/click-count)을 호출해 잠든 인스턴스를 깨운다.
// (기존 워밍업은 백엔드에 존재하지 않는 /api/health 를 쳐서 404 — 실효성이 낮았다.
//  click-count 는 dev 프록시·prod 절대경로 양쪽에서 동일하게 도달하는 공개 GET 이다.)
// 위 인터셉터가 503 을 자동 재시도하므로, 슬립 상태여도 이 한 번의 호출이 깨운다.
// 실패해도 조용히 무시 — 워밍업 실패가 앱 동작을 막으면 안 된다.
;(async () => {
  try {
    await api.get('/click-count', { timeout: 12000 })
  } catch {
    // 워밍업 실패는 조용히 무시 (콘솔 출력 없음)
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
  return api.post<{ companies: string[] }>('/severance/extract-companies', fd, { _idempotent: true }).then(r => r.data)
}

/** PDF에서 사업장 고유 리스트 추출 (실업급여 정밀 계산용) */
export const extractUnemploymentCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/unemployment/extract-companies', fd, { _idempotent: true }).then(r => r.data)
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
    _idempotent: true, // 순수 계산(DB 부작용 없음) → 콜드스타트 재시도 허용
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
  api.post('/severance/simple', { work_days, avg_daily_wage }, { _idempotent: true }).then(r => r.data)

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
  // 2026 상·하한 적용 투명성 (하한/상한 적용 여부 + 적용 전 원값)
  daily_benefit_raw?: number
  bound_applied?: 'lower' | 'upper' | null
}

export const calcUBPrecise = (formData: FormData): Promise<UBResult> =>
  api.post('/unemployment/precise', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    _idempotent: true, // 순수 계산(DB 부작용 없음) → 콜드스타트 재시도 허용
  }).then(r => r.data)

export const calcUBSimple = (
  insured_days: number,
  avg_daily_wage: number,
  age_50: boolean,
  daily_hours = 8, // 1일 소정근로시간(하한액 산정용, 기본 8시간)
): Promise<UBResult> =>
  api.post('/unemployment/simple', { insured_days, avg_daily_wage, age_50, daily_hours }, { _idempotent: true }).then(r => r.data)

// ── 주휴수당 ─────────────────────────────────────────────
export const extractWeeklyAllowanceCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/weekly-allowance/extract-companies', fd, { _idempotent: true }).then(r => r.data)
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
    _idempotent: true, // 순수 계산(DB 부작용 없음) → 콜드스타트 재시도 허용
  }).then(r => r.data)

// ── 연차수당 ─────────────────────────────────────────────
export const extractAnnualLeaveCompanies = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<{ companies: string[] }>('/annual-leave/extract-companies', fd, { _idempotent: true }).then(r => r.data)
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
    _idempotent: true, // 순수 계산(DB 부작용 없음) → 콜드스타트 재시도 허용
  }).then(r => r.data)

// ── Admin OS API ──────────────────────────────────────────
// VITE_ADMIN_SECRET 미설정 시 VITE_SUPABASE_ANON_KEY 뒤 32자로 자동 파생 (백엔드와 동일 로직)
const _adminToken =
  (import.meta.env.VITE_ADMIN_SECRET as string | undefined) ||
  ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.slice(-32) ?? '')
const H = () => ({ 'X-Admin-Token': _adminToken })

// ── Dashboard / Target — 백엔드(service-role) 경로로 일원화 ────────────────
// 배경(2026-07-04 어드민 전수조사): 과거 이 세 함수는 supabase 를 "관리자 브라우저
//   세션"으로 직접 조회해 로컬 집계했다. 그런데 reports/profiles/inquiries 의 RLS
//   (행 수준 보안)는 owner-only(본인 행만 SELECT 허용)라서, 관리자 화면에 "관리자
//   본인" 데이터만 집계됐다(예: 실제 전체 유저 56명 → 화면 1명 수준의 과소집계).
//   겉보기엔 실데이터 같지만 사실상 가짜 숫자였던 셈.
//   또 click_counter 를 존재하지 않는 컬럼명(total_cnt/severance_cnt/…)으로 읽어
//   클릭 KPI 가 항상 0으로 표시됐다(실제 컬럼명: total/severance/unemployment).
// 백엔드 /admin/stats·/admin/analytics·/admin/target/insights 는 service-role 키로
//   전 행을 집계해 진실값을 반환하며, 브라우저 병렬 쿼리 9개가 HTTP 1회로 줄어
//   대시보드 로딩도 빨라진다. (백엔드 응답 형태는 기존 로컬 집계 결과와 동일 계약)
export const getAdminStats = () =>
  api.get('/admin/stats', { headers: H() }).then(r => r.data)

export const getAdminAnalytics = (start: string, end: string) =>
  api.get('/admin/analytics', { params: { start, end }, headers: H() }).then(r => r.data)

// ── 방문자 정확 집계 (visitor_logs service-role 전수) ─────────────────────
// 배경(2026-07-06): 기존 VisitorTab 은 브라우저 세션으로 visitor_logs 를 직접 조회하며
//   `.limit(1000)` 이 걸려 있어, 방문이 1000건을 넘으면 총페이지뷰·순방문자·오늘방문·
//   로그인방문이 전부 1000 부근에서 멈춰 '허수'처럼 보였다. 또 '오늘'을 UTC 기준으로
//   판정해 한국시간과 최대 9시간 어긋났다. 백엔드가 count=exact(정확 총량) + KST(한국시간)
//   경계로 진실값을 계산해 준다.
export interface VisitorStatsResponse {
  range_days: number
  total_pageviews: number       // 총 페이지뷰(전 행 정확)
  unique_visitors: number       // 순 방문자(distinct 세션)
  today_pageviews: number       // 오늘 방문(KST 자정 기준)
  logged_in_pageviews: number   // 회원 페이지뷰(방문 횟수)
  logged_in_unique: number      // 회원 순 인원(중복 제거)
  top_pages: { path: string; count: number }[]
  referrers: { channel: string; count: number }[]
  utm_sources: { source: string; count: number }[]      // 캠페인 유입원 TOP
  campaigns: { campaign: string; count: number }[]       // 캠페인(유입원/캠페인명) TOP
  utm_total: number                                      // 캠페인 유입 총 페이지뷰
  funnel: {
    visitors: number
    signups: number
    calculations: number
    signups_known: boolean
    calculations_known: boolean
  }
  recent: { created_at: string; page_path: string; channel: string; session_id: string; user_id: string | null }[]
  fetched: number
  truncated: boolean            // true면 순방문자/회원수는 표시상한 기준(총량은 정확)
  generated_at: string
}
// recentLimit: 표 표시는 50(기본), 엑셀 전체 내보내기 시 크게(최대 5000) 요청 가능
export const getVisitorStats = (days: number, recentLimit?: number) =>
  api.get<VisitorStatsResponse>('/admin/visitor-stats', {
    params: recentLimit ? { days, recent_limit: recentLimit } : { days },
    headers: H(),
  }).then(r => r.data)

export const getTargetInsights = () =>
  api.get('/admin/target/insights', { headers: H() }).then(r => r.data)

// ── 계산 리포트 원본 (대시보드 계산통계 탭용) ────────────────────────────
// reports RLS(owner-only) 우회 — 백엔드(service-role)에서 전체 리포트를 받아
// 진짜 전체 통계를 집계한다. PII 없는 컬럼(id/title/created_at/payload)만 수신.
export interface AdminReportRow {
  id: string
  title: string | null
  created_at: string
  payload: Record<string, unknown> | null
}
export const getAdminReports = (days: number) =>
  api.get<{ reports: AdminReportRow[] }>('/admin/reports', {
    params: { days }, headers: H(),
  }).then(r => r.data.reports)

// ── 채용 운영 통계 (채용현황·채용Summary 메뉴 공용) ──────────────────────
// job_applications 관리자 SELECT RLS 상태와 무관하게 항상 전체 데이터를 집계하도록
// 백엔드(service-role) 경로로 통일. 공고+지원 원본을 한 번의 호출로 받는다.
export interface RecruitPostingRow {
  id: string
  company_name: string
  center_name: string
  status: string
  headcount: number | null
  section: string | null
  created_at: string
  expires_at: string | null
  view_count: number | null
}
export interface RecruitApplicationRow {
  id: string
  job_posting_id: string
  status: string
  applied_at: string
  work_date: string | null
  work_confirmed_at: string | null
  preferred_shift: string | null
  applied_task: string | null
  job_postings: { company_name: string; center_name: string; headcount: number | null } | null
}
export const getRecruitStats = () =>
  api.get<{ postings: RecruitPostingRow[]; applications: RecruitApplicationRow[] }>(
    '/admin/recruit-stats', { headers: H() },
  ).then(r => r.data)

// ── 지원자 상태 변경 (단건/일괄) — service-role 경로 ─────────────────────
// 과거 ApplicantsMenu 의 supabase 직접 update 는 관리자 UPDATE RLS 가 깨져 있으면
// 0행 변경(기능 불능)이었다. 백엔드는 RLS 무관하게 항상 반영되고, 확정/거절 시
// 지원자 알림(notifications)도 서버에서 함께 발송한다. 상태변경 0행이면 404 를
// 던지지만, 알림 발송 실패는 상태변경을 막지 않고 서버 로그로만 남긴다(기존 동작 동일).
export const patchApplicationStatus = (
  id: string,
  status: 'applied' | 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected',
  workDate?: string,
  adminEmail?: string,
) =>
  api.patch(`/admin/applications/${id}/status`,
    { status, work_date: workDate ?? null, admin_email: adminEmail ?? null },
    { headers: H() }).then(r => r.data)

export const bulkApplicationStatus = (
  ids: string[],
  status: 'reviewing' | 'confirmed' | 'rejected',
  adminEmail?: string,
) =>
  api.post<{ ok: boolean; updated: number; updated_ids: string[]; failed_ids: string[] }>(
    '/admin/applications/bulk-status',
    { ids, status, admin_email: adminEmail ?? null },
    { headers: H() }).then(r => r.data)

// Inquiries — 백엔드 경로(경로 B)로 일원화 (P4)
//   과거: 여기서 supabase 직접 ilike(검색어 원형 주입 + RLS 의존)로 조회했고, 쓰기(patch/bulk)만
//         백엔드였다 → 읽기·쓰기 경로 이원화 + 검색어 미새니타이즈.
//   현재: 백엔드 /admin/inquiries 가 X-Admin-Token 게이트 + service-role 로
//         status/category/search(서버측 sanitized ilike, 전 행 대상)를 처리 → 경로 단일화.
export const getAdminInquiries = async (params: {
  page?: number; limit?: number; status?: string; category?: string; search?: string
}) => {
  const { page = 1, limit = 20, status = '', category = '', search = '' } = params
  const res = await api.get('/admin/inquiries', {
    params: { page, limit, status, category, search },
    headers: H(),
  })
  return { inquiries: res.data?.inquiries ?? [], total: res.data?.total ?? 0 }
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

// ── Notices — 백엔드 경로(경로 B)로 이관 (P4) ─────────────────────────
//   과거: NoticesMenu 가 supabase 직접 CRUD(RLS is_admin 의존) → 미등록/비-admin 은 쓰기 0행,
//         비활성 공지 조회 누락 가능. 현재: X-Admin-Token 게이트 + service-role 로 통일.
//   조회는 관리 화면 전용(비활성 포함). 공개 배너(useNotices)는 별개로 supabase 유지.
export const getAdminNotices = () =>
  api.get('/admin/notices', { headers: H() }).then(r => r.data?.notices ?? [])

export const createNotice = (body: { title: string; content: string; priority: number; is_active: boolean }) =>
  api.post('/admin/notices', body, { headers: H() }).then(r => r.data)

// 부분 수정 — 전달한 필드만 반영(토글은 { is_active } 만 전송)
export const updateNotice = (
  id: string | number,
  patch: Partial<{ title: string; content: string; priority: number; is_active: boolean }>,
) => api.patch(`/admin/notices/${id}`, patch, { headers: H() }).then(r => r.data)

export const deleteNotice = (id: string | number) =>
  api.delete(`/admin/notices/${id}`, { headers: H() }).then(r => r.data)

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

// 템플릿 사용수 +1 — 백엔드 라우트는 이전부터 있었지만 프론트가 호출하지 않아
// use_count가 항상 0이던 미연동(2026-07-04 전수조사). 답변에 템플릿 적용 시 호출.
export const markTemplateUsed = (id: string) =>
  api.post(`/admin/templates/${id}/use`, {}, { headers: H() }).then(r => r.data)

// ── CMS 배너 (공개 — 인증 불필요, 사용자 홈 소비) ──
// 어드민 "공지/배너 CMS" 저장값을 홈 긴급공지 띠 + 진입 팝업이 읽는다.
export interface CmsBannersData {
  announcement_text: string
  announcement_enabled: boolean
  popup_banner_text: string
  popup_banner_enabled: boolean
}
export const getCmsBanners = (): Promise<CmsBannersData> =>
  api.get('/cms/banners').then(r => r.data)

// Settings
export const getSettings = () =>
  api.get('/admin/settings', { headers: H() }).then(r => r.data)
export const patchSetting = (key: string, value: string) =>
  api.patch('/admin/settings', { key, value }, { headers: H() }).then(r => r.data)

// 법정 변수 (legal_variables 테이블 — 계산기가 실제로 읽는 값)
// ⚠️ 과거 어드민 위젯은 system_settings의 minimum_wage_* 키에 저장해 계산기에 반영되지
//    않는 미연동 상태였다(2026-07-04 전수조사). 이제 실소비 테이블을 직접 편집한다.
export interface LegalVariable {
  id: string
  key: string
  value: number
  effective_year: number
  label: string | null
  unit: string | null
  notes: string | null
  updated_at: string | null
}
export const getLegalVariables = (): Promise<{ variables: LegalVariable[] }> =>
  api.get('/admin/legal-variables', { headers: H() }).then(r => r.data)
export const patchLegalVariable = (
  key: string, effectiveYear: number, value: number, adminEmail?: string,
) =>
  api.patch('/admin/legal-variables',
    { key, effective_year: effectiveYear, value, admin_email: adminEmail || undefined },
    { headers: H() }).then(r => r.data)

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

// ── 지원자 관리 (서버측 마스킹 + 단건 평문 해제) ────────────────────────
// 보안 재설계(🔴 지원자 PII): 과거 ApplicantsMenu 는 supabase 로 job_applications +
// profiles 를 직접 조회해 지원자 인적사항·회원명·이메일을 평문 통째 수신했다(Network 노출).
// 이제 백엔드(service-role)가 마스킹된 데이터만 내려보내고, 평문은 회원관리와 '동일한
// 보안키'를 통과한 reveal 단건 호출로만 받는다(감사로그 기록).

// 서버측 마스킹된 지원 한 행 (평문 PII 없음 / id·user_id 는 내부 키)
export interface MaskedApplication {
  id: string
  user_id: string
  job_posting_id: string
  status: 'applied' | 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  applied_at: string
  work_date: string | null
  applicant_gender: 'male' | 'female' | null
  preferred_shift: string | null
  applied_task: string | null
  consent_collect: boolean
  consent_third_party: boolean
  has_applicant_info: boolean      // 인적사항 입력 여부('미입력' 표시 판단용)
  applicant_name: string | null    // 마스킹됨: 김** (미입력이면 null)
  applicant_birth: string | null   // 마스킹됨: 1990-**-**
  applicant_phone: string | null   // 마스킹됨: 010-****-5678
  profiles: { full_name: string | null; email: string | null } | null  // 마스킹됨
  job_postings: { company_name: string; center_name: string } | null
}

// reveal 응답 (단건 평문 — 보기 클릭 시에만 수신)
export interface RevealedApplicant {
  id: string
  applicant_name: string | null
  applicant_birth: string | null
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  profile_name: string | null
  profile_email: string | null
}

// 지원자 목록 — 모든 필터를 서버측에서 '원본 컬럼' 기준으로 적용(평문 우회 차단)
export const getAdminApplications = (params: {
  status?: string; company?: string; job_posting_id?: string
  shift?: string; task?: string; name?: string; phone?: string
}) =>
  api.get<{ applications: MaskedApplication[]; total: number }>('/admin/applications', {
    params, headers: H(),
  }).then(r => r.data)

// 단건 평문 해제 — 보안키 + 지원 id 전송. 서버가 해시 검증 후 1건 원본 반환 + 감사기록.
export const revealApplicant = (applicationId: string, key: string, adminEmail: string) =>
  api.post<RevealedApplicant>('/admin/applications/reveal',
    { application_id: applicationId, key, admin_email: adminEmail },
    { headers: H() }).then(r => r.data)
