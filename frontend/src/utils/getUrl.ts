/**
 * OAuth 콜백 URL (Supabase URL Configuration과 동일하게 고정)
 * - 코드 내 모든 redirectTo는 이 주소로 통일합니다.
 */
export const AUTH_CALLBACK_URL = 'https://coupang-severance-app.vercel.app/auth/callback'

/**
 * 현재 환경의 기준 URL (다른 용도)
 */
export function getURL(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
