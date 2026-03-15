/**
 * 현재 환경의 기준 URL (배포/로컬 자동 인식)
 * - OAuth redirectTo 등에서 사용. window.location.origin을 반환합니다.
 */
export function getURL(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
