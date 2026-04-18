// 🔎 스케줄 필터링 로직 훅
// FilterBar로 입력받은 ScheduleFilters 를 JobApplication[] 에 적용해 필터된 배열을 반환한다.
// 각 필터는 독립적으로 AND 결합 — 하나라도 불일치면 제외된다.
//
// 기획서 tasks/schedule-manager-plan.md §2-1 / §5-4 준수.
import { useMemo } from 'react'
import type { JobApplication } from '../../../../types/supabase'
import type { ScheduleFilters } from '../FilterBar'

// 회사 그룹 판정 — 회사명 문자열로부터 coupang/kurly/cj/other 분류
// JobApplication.job_postings.company_name 이 null 일 수도 있어 null 방어
function companyGroup(name: string | null | undefined): 'coupang' | 'kurly' | 'cj' | 'other' {
  if (!name) return 'other'
  const s = name.toLowerCase()
  if (name.includes('쿠팡') || s.includes('coupang')) return 'coupang'
  if (name.includes('컬리') || s.includes('kurly')) return 'kurly'
  if (name.includes('CJ') || name.includes('씨제이') || s.includes('cj')) return 'cj'
  return 'other'
}

// "YYYY-MM-DD" 문자열을 Date(KST 0시)로 변환 — 파싱 실패 시 null
function parseYmd(ymd: string | null | undefined): Date | null {
  if (!ymd) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// period 필터 판정 — work_date가 기간 범위 안에 들어가는지
// - all : 전부 통과
// - week : 오늘부터 ±7일 이내
// - month : 오늘과 같은 YYYY-MM
// - quarter : 오늘부터 -90일 이내 (과거 쪽)
// 기획서 방침: work_date가 null이면 기간 필터링 대상에서 제외 (period='all' 외에는 포함 안 함)
function matchPeriod(app: JobApplication, period: ScheduleFilters['period']): boolean {
  if (period === 'all') return true

  const workDate = parseYmd(app.work_date)
  if (!workDate) return false // work_date 없으면 기간 필터에서 제외

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (period === 'week') {
    // 오늘 기준 ±7일
    const lower = new Date(today); lower.setDate(today.getDate() - 7)
    const upper = new Date(today); upper.setDate(today.getDate() + 7)
    return workDate >= lower && workDate <= upper
  }
  if (period === 'month') {
    // 이번 달 (연/월 모두 일치)
    return workDate.getFullYear() === today.getFullYear() && workDate.getMonth() === today.getMonth()
  }
  if (period === 'quarter') {
    // 오늘 기준 -90일 ~ 오늘 이후(미래 포함)
    // "3개월" = 지난 90일 데이터 조회 의미 — 미래 건은 포함하는 게 자연스러움
    const lower = new Date(today); lower.setDate(today.getDate() - 90)
    return workDate >= lower
  }
  return true
}

// ── 메인 훅 ──
// applications 와 filters 중 하나라도 바뀌면 다시 계산
export function useScheduleFilter(
  applications: JobApplication[],
  filters: ScheduleFilters,
): JobApplication[] {
  return useMemo(() => {
    // 검색어 소문자 정규화 (부분일치 비교용)
    const q = filters.search.trim().toLowerCase()

    return applications.filter(app => {
      // 1) 회사명/센터명 부분일치 (검색어 있을 때만 적용)
      if (q) {
        const companyName = (app.job_postings?.company_name ?? '').toLowerCase()
        const centerName = (app.job_postings?.center_name ?? '').toLowerCase()
        if (!companyName.includes(q) && !centerName.includes(q)) return false
      }

      // 2) 상태 필터 — all이 아니면 완전일치
      if (filters.status !== 'all' && app.status !== filters.status) return false

      // 3) 회사 그룹 필터
      if (filters.company !== 'all') {
        const group = companyGroup(app.job_postings?.company_name)
        if (group !== filters.company) return false
      }

      // 4) 기간 필터 (work_date 기반)
      if (!matchPeriod(app, filters.period)) return false

      return true
    })
  }, [applications, filters])
}
