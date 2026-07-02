// ============================================================
// useAdminResource — 어드민 공용 조회 훅 (4상태 표준: 로딩/성공/실패/빈) (S0)
//   목적: 각 메뉴가 제각각 fetch/useState/에러처리를 산발적으로 짜던 것을 통일.
//         어떤 fetcher(백엔드 api 우선)든 감싸 { data, loading, error, isEmpty, refetch } 제공.
//   ⚠️ 무음 실패 방지: fetcher가 throw하면 error에 담아 화면이 반드시 표시하게 한다.
// ============================================================
import { useCallback, useEffect, useState } from 'react'

interface Options {
  /** false면 자동 로드 안 함(수동 refetch 전용) */
  auto?: boolean
}

export interface AdminResource<T> {
  data: T | null
  loading: boolean
  error: string | null
  isEmpty: boolean
  refetch: () => Promise<void>
  setData: (updater: T | ((prev: T | null) => T)) => void
}

// 빈 상태 판정 — 배열이면 length 0, 객체면 null만 빈으로 본다.
function computeEmpty(data: unknown): boolean {
  if (data == null) return true
  if (Array.isArray(data)) return data.length === 0
  return false
}

export function useAdminResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: Options = {},
): AdminResource<T> {
  const { auto = true } = options
  const [data, setDataState] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(auto)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setDataState(result)
    } catch (e: unknown) {
      // 무음 금지 — 실패는 반드시 error로 노출
      setError(e instanceof Error ? e.message : String(e) || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (auto) refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, auto])

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState(prev => (typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater))
  }, [])

  return { data, loading, error, isEmpty: !loading && !error && computeEmpty(data), refetch, setData }
}
