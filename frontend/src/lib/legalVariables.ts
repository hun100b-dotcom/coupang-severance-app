// ============================================================
// legalVariables.ts — 법정 변수 (최저시급 등) Supabase 캐시 조회
// DB에서 5분 캐시로 fetch, 실패 시 2026년 하드코딩 fallback
// ============================================================

import { supabase } from './supabase'

// 같은 key(예: min_hourly_wage)에 연도별 행이 여러 개 존재할 수 있음
// 현재 연도 행만 조회해야 .single()이 안전하게 동작함
const CURRENT_YEAR = new Date().getFullYear()

// 캐시 구조
interface CacheEntry {
  value: number
  expiresAt: number  // Date.now() + 5분
}
const cache: Record<string, CacheEntry> = {}

// 2026년 법정 최저 기본값 (DB 로드 실패 시 fallback)
export const FALLBACK_WAGE: Record<string, number> = {
  min_hourly_wage: 10320,  // 2026년 최저시급
}

/**
 * DB에서 법정 변수를 가져옵니다.
 * 5분 캐시 적용 — 반복 호출 시 DB 재조회 없음.
 * @param key  legal_variables.key (예: 'min_hourly_wage')
 * @returns 해당 값 (숫자). 실패 시 FALLBACK_WAGE[key] 반환
 */
export async function getLegalVariable(key: string): Promise<number> {
  // 캐시 키에 연도를 포함 — 연도가 바뀌면 자동으로 새 값 조회
  const cacheKey = `${key}_${CURRENT_YEAR}`
  const cached = cache[cacheKey]
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    if (!supabase) throw new Error('supabase 미초기화')

    // .single()은 1행만 허용하는 함수.
    // 같은 key에 2025년 행과 2026년 행이 둘 다 존재하면 2행 반환 에러가 발생하므로
    // effective_year 필터로 현재 연도 행만 조회해야 안전.
    const { data, error } = await supabase
      .from('legal_variables')
      .select('value')
      .eq('key', key)
      .eq('effective_year', CURRENT_YEAR)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'no data')

    const value = Number(data.value)
    // 5분 캐시 저장 (키: key_연도)
    cache[cacheKey] = { value, expiresAt: Date.now() + 5 * 60 * 1000 }
    return value
  } catch {
    // DB 오류 시 fallback 사용
    return FALLBACK_WAGE[key] ?? 10320
  }
}

/**
 * 모든 법정 변수를 한 번에 프리로드합니다.
 * 앱 시작 시 호출하면 이후 getLegalVariable은 캐시에서 즉시 반환.
 */
export async function preloadLegalVariables(): Promise<void> {
  try {
    if (!supabase) return

    // 현재 연도 행만 조회 — 과거 연도 행이 캐시를 덮어쓰는 문제 방지
    const { data, error } = await supabase
      .from('legal_variables')
      .select('key, value')
      .eq('effective_year', CURRENT_YEAR)

    if (error || !data) return

    const expiresAt = Date.now() + 5 * 60 * 1000
    for (const row of data) {
      // 캐시 키에 연도 포함 (getLegalVariable과 동일한 키 형식 유지)
      cache[`${row.key}_${CURRENT_YEAR}`] = { value: Number(row.value), expiresAt }
    }
  } catch {
    // 실패해도 fallback이 있으므로 무시
  }
}
