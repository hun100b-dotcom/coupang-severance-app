// 🔗 스케줄 필터 상태 ↔ URL 쿼리 동기화 훅
// react-router-dom 의 useSearchParams 를 사용해 search/status/company/period 4개 key를
// URL 쿼리파라미터로 읽고 쓴다.
//
// 정책:
// - 기본값('all' 또는 빈 문자열)이면 URL에서 해당 key를 제거 (깨끗한 URL 유지)
// - 필터 변경 시 setSearchParams { replace: true } 로 히스토리 낭비 방지
// - 초기 마운트 시 URL에 값이 있으면 그대로 초기 필터로 사용
//
// 기획서 §5-4 "URL 쿼리 sync" 조건 충족.
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_FILTERS, type ScheduleFilters } from '../FilterBar'

// URL 값 → 타입 안전한 status 로 복원 (유효하지 않으면 'all')
function parseStatus(v: string | null): ScheduleFilters['status'] {
  if (v === 'applied' || v === 'confirmed' || v === 'completed' || v === 'cancelled') return v
  return 'all'
}
function parseCompany(v: string | null): ScheduleFilters['company'] {
  if (v === 'coupang' || v === 'kurly' || v === 'cj' || v === 'other') return v
  return 'all'
}
function parsePeriod(v: string | null): ScheduleFilters['period'] {
  if (v === 'week' || v === 'month' || v === 'quarter') return v
  return 'all'
}

export function useScheduleFilterState() {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL → filters 복원 ──
  // useMemo로 감싸 searchParams 변화에만 재계산
  const filters: ScheduleFilters = useMemo(() => ({
    search:  searchParams.get('search')  ?? '',
    status:  parseStatus(searchParams.get('status')),
    company: parseCompany(searchParams.get('company')),
    period:  parsePeriod(searchParams.get('period')),
  }), [searchParams])

  // ── filters → URL 기록 ──
  // 기본값인 필드는 URL에서 제거(깨끗한 URL). view 등 다른 쿼리파라미터는 보존.
  const setFilters = useCallback((next: ScheduleFilters) => {
    setSearchParams(
      prev => {
        const sp = new URLSearchParams(prev)

        // search: 빈 문자열이면 제거
        if (next.search.trim()) sp.set('search', next.search)
        else sp.delete('search')

        // status/company/period: 'all'이면 제거
        if (next.status !== 'all') sp.set('status', next.status); else sp.delete('status')
        if (next.company !== 'all') sp.set('company', next.company); else sp.delete('company')
        if (next.period !== 'all') sp.set('period', next.period); else sp.delete('period')

        return sp
      },
      { replace: true },
    )
  }, [setSearchParams])

  // ── 초기화 ──
  // search/status/company/period 4개만 제거 (view 등은 보존)
  const resetFilters = useCallback(() => {
    setSearchParams(
      prev => {
        const sp = new URLSearchParams(prev)
        sp.delete('search')
        sp.delete('status')
        sp.delete('company')
        sp.delete('period')
        return sp
      },
      { replace: true },
    )
  }, [setSearchParams])

  return { filters, setFilters, resetFilters, DEFAULT_FILTERS }
}
