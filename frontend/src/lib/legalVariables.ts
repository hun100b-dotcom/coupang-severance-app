// ============================================================
// legalVariables.ts — 법정 변수 (최저시급 등) Supabase 캐시 조회
// DB에서 5분 캐시로 fetch, 실패 시 2026년 하드코딩 fallback
// ============================================================

import { supabase } from './supabase'

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
  // 캐시 유효하면 즉시 반환
  const cached = cache[key]
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    if (!supabase) throw new Error('supabase 미초기화')

    const { data, error } = await supabase
      .from('legal_variables')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'no data')

    const value = Number(data.value)
    // 5분 캐시 저장
    cache[key] = { value, expiresAt: Date.now() + 5 * 60 * 1000 }
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

    const { data, error } = await supabase
      .from('legal_variables')
      .select('key, value')

    if (error || !data) return

    const expiresAt = Date.now() + 5 * 60 * 1000
    for (const row of data) {
      cache[row.key] = { value: Number(row.value), expiresAt }
    }
  } catch {
    // 실패해도 fallback이 있으므로 무시
  }
}
