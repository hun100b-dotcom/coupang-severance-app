// ============================================================
// useAdminMutation — 어드민 공용 쓰기(mutation) 훅 (S0)
//   목적: 추가/수정/삭제 등 쓰기의 로딩·에러·성공을 표준화.
//   ⚠️ 무음 실패 방지의 핵심: run()은 실패 시 error를 세팅하고 throw도 재전파해
//         호출부가 반드시 실패를 인지·표시하게 한다. (AccountsMenu 표준을 훅으로 승격)
//   경로 원칙: 쓰기는 백엔드 api(service-role) 우선. supabase 직접이면 .select()로 0행을
//         명시적 실패 처리한 fn을 넘길 것(무음 거짓성공 금지).
// ============================================================
import { useCallback, useState } from 'react'

export interface AdminMutation<Args extends unknown[], R> {
  run: (...args: Args) => Promise<R>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useAdminMutation<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  handlers?: { onSuccess?: (result: R) => void; onError?: (message: string) => void },
): AdminMutation<Args, R> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (...args: Args): Promise<R> => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      handlers?.onSuccess?.(result)
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e) || '작업에 실패했습니다.'
      setError(msg)
      handlers?.onError?.(msg)
      throw e // 재전파 — 호출부 흐름 제어 유지
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn])

  return { run, loading, error, clearError: () => setError(null) }
}
