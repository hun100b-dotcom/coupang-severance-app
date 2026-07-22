/**
 * OAuth 콜백 URL 유틸
 * - 코드 내 모든 redirectTo 는 config/site.ts 의 authCallbackUrl() 로 통일합니다.
 * - 도메인 기준값은 config/site.ts(SITE_URL) 한 곳에서만 관리합니다.
 */
import { SITE_URL, authCallbackUrl } from '../config/site'

// 소셜 로그인 후 되돌아올 콜백 주소(현재 접속 도메인 기준, window 없으면 정규 도메인 폴백)
export { authCallbackUrl }

// (하위호환) 고정 콜백 주소가 필요한 경우의 정규 도메인 기준값
export const AUTH_CALLBACK_URL = `${SITE_URL}/auth/callback`

/**
 * 현재 환경의 기준 URL (다른 용도)
 */
export function getURL(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}
