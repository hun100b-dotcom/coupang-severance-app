// 채용 지원 CRUD 유틸리티 — Supabase DB (로그인 필수)
// job_applications 테이블을 다루는 모든 DB 함수 모음
import { supabase } from './supabase'
import type { JobApplication } from '../types/supabase'

// ── 지원 내역 조회 (공고 상세 JOIN 포함) ──
// job_postings 테이블과 함께 조회하여 회사명, 지역 등 한 번에 가져옴
export async function listApplications(userId: string): Promise<JobApplication[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('job_applications')
    .select(`
      *,
      job_postings (
        company_name,
        center_name,
        region,
        hourly_wage,
        daily_wage,
        work_hours
      )
    `)
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })
  if (error) { console.error('[지원내역 조회 오류]', error); return [] }
  return (data ?? []) as JobApplication[]
}

// ── 특정 공고에 지원했는지 확인 ──
// 같은 공고에 중복 지원 방지용
export async function hasApplied(userId: string, jobPostingId: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase
    .from('job_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('job_posting_id', jobPostingId)
    .limit(1)
  if (error) return false
  return (data ?? []).length > 0
}

// ── 같은 날짜에 이미 확정(confirmed)된 지원이 있는지 프론트 사전 체크 ──
// DB trigger(trg_check_no_confirmed_same_day)와 2중 방어 구조
// workDate: 공고의 근무 예정일 (job_postings.work_date)
// 반환: null이면 충돌 없음, string이면 충돌된 날짜
export async function checkConfirmedOnDate(
  userId: string,
  workDate: string | null
): Promise<string | null> {
  // work_date 가 없으면 중복 체크 불필요
  if (!supabase || !workDate) return null
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, work_date')
    .eq('user_id', userId)
    .eq('work_date', workDate)
    .eq('status', 'confirmed')
    .limit(1)
  if (error) return null
  // 충돌 건이 있으면 해당 날짜 문자열 반환 → 프론트에서 에러 토스트 표시
  return (data ?? []).length > 0 ? workDate : null
}

// ── 지원하기 (공고 지원) — 인적사항 + 근무 정보 포함 버전 ──
// 성공 시 생성된 application의 id 반환, 실패 시 null
export async function applyToJob(
  userId: string,
  jobPostingId: string,
  applicantInfo?: {
    // 섹션 1: 지원자 인적사항
    applicant_name: string
    applicant_birth: string       // YYYY-MM-DD
    applicant_gender: 'male' | 'female'
    applicant_phone: string
    // 섹션 2: 근무 관련
    applied_task: string          // 선택 업무
    prior_experience_90d: boolean // 90일 이내 근무 경험
    preferred_shift: 'morning' | 'afternoon' | 'night' | 'any'  // 희망 시간대
    transportation: 'car' | 'public' | 'shuttle'  // 교통 수단
    shoe_size: string             // 안전화 사이즈 (mm)
    notes?: string                // 특이사항 (선택)
    emergency_contact?: string    // 비상 연락처 (선택)
    // 섹션 3: 동의 (제3자 제공만, 수집·이용은 온보딩에서 포괄 동의)
    consent_third_party: boolean
    // 근무일 (공고의 work_date → 중복 확정 차단 기준)
    work_date?: string | null
  },
): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: userId,
      job_posting_id: jobPostingId,
      status: 'applied',
      // 인적사항 (없으면 null)
      ...(applicantInfo ?? {}),
      // 동의 시각: 제3자 제공 동의 시에만 기록
      consent_at: applicantInfo?.consent_third_party
        ? new Date().toISOString()
        : null,
      // 수집·이용 동의는 온보딩 시 이미 포괄 동의 받음 → true 고정 기록
      consent_collect: true,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[지원하기 오류]', error)
    return null
  }
  return data?.id ?? null
}

// ── 지원 취소 ──
export async function cancelApplication(applicationId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('job_applications')
    .update({ status: 'cancelled' })
    .eq('id', applicationId)
  if (error) { console.error('[지원취소 오류]', error); return false }
  return true
}

// ── 여러 공고에 대한 지원 여부를 한 번에 확인 ──
// key: job_posting_id, value: application id (지원한 경우)
export async function getAppliedJobIds(
  userId: string,
): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, job_posting_id')
    .eq('user_id', userId)
    .neq('status', 'cancelled')   // 취소된 건 제외
  if (error) return {}
  const map: Record<string, string> = {}
  for (const row of (data ?? [])) {
    map[row.job_posting_id as string] = row.id as string
  }
  return map
}

// ─────────────────────────────────────────────────────────────
// 스케줄 상세 관리 (Phase 1 step 4 — 20260419 추가)
// 근무 시간, 차감 항목, 지급 추적, 사용자 메모를 한 번에 수정
// ─────────────────────────────────────────────────────────────

/** 스케줄 상세 수정 입력 타입 — 모두 옵셔널 (부분 업데이트 지원) */
export interface ScheduleDetailUpdate {
  work_start_time?: string | null       // "HH:mm" 또는 "HH:mm:ss" (Postgres time 자동 파싱)
  work_end_time?: string | null
  transport_cost?: number | null        // 원
  meal_cost?: number | null
  other_deduction?: number | null
  payment_expected_date?: string | null // "YYYY-MM-DD"
  payment_received_at?: string | null   // ISO timestamp
  user_memo?: string | null
}

// ── 스케줄 상세 수정 (근무시간/차감/메모/지급) ──
// 주간뷰 타임라인이나 상세 팝업에서 사용
export async function updateScheduleDetail(
  applicationId: string,
  detail: ScheduleDetailUpdate,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('job_applications')
    .update(detail)
    .eq('id', applicationId)
  if (error) {
    console.error('[스케줄 상세 수정 오류]', error)
    return false
  }
  return true
}

// ── 실수령액 계산 헬퍼 (일급 - 차감 합계) ──
// 일급은 job_postings JOIN 데이터에서 가져옴 (listApplications 결과에 포함됨)
export function calculateNetIncome(app: JobApplication): number {
  const gross = app.job_postings?.daily_wage ?? 0
  const deduction =
    (app.transport_cost ?? 0) +
    (app.meal_cost ?? 0) +
    (app.other_deduction ?? 0)
  return Math.max(0, gross - deduction)
}
