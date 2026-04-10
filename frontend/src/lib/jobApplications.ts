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

// ── 지원하기 (공고 지원) — 인적사항 포함 버전 ──
// 성공 시 생성된 application의 id 반환, 실패 시 null
// applicantInfo: 지원 시점 직접 입력한 인적사항 (D-NEW-3)
export async function applyToJob(
  userId: string,
  jobPostingId: string,
  applicantInfo?: {
    applicant_name: string
    applicant_birth: string       // YYYY-MM-DD
    applicant_gender: 'male' | 'female'
    applicant_phone: string
    consent_collect: boolean
    consent_third_party: boolean
  },
): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: userId,
      job_posting_id: jobPostingId,
      status: 'applied',
      // 인적사항 포함 (없으면 null로 저장)
      ...(applicantInfo ?? {}),
      // 동의 시각: 동의한 경우에만 기록
      consent_at: applicantInfo?.consent_collect && applicantInfo?.consent_third_party
        ? new Date().toISOString()
        : null,
    })
    .select('id')
    .single()
  if (error) { console.error('[지원하기 오류]', error); return null }
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
