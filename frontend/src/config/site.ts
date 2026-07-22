// ──────────────────────────────────────────────────────────────────────────
// site.ts — 사이트 기준 도메인(정규 URL) 단일 관리 파일
//
// 도메인이 바뀔 때 이 파일 한 곳만 고치면 되도록 상수로 모아둡니다.
//   - SITE_URL   : 정규(canonical) 기준 도메인. apex(www 없는) 주소를 정규로 씁니다.
//   - OG_IMAGE   : SNS 공유 썸네일 절대경로 (1200×630)
//   - authCallbackUrl(): 소셜 로그인 후 되돌아올 콜백 주소
//
// ⚠️ 정규 도메인 원칙: apex(https://coucatch.com)를 정규로, www 는 apex 로 301 리다이렉트.
//    (Vercel 도메인 설정 + 가비아 DNS 에서 www → apex 리다이렉트 지정)
// ──────────────────────────────────────────────────────────────────────────

/** 사이트 정규 기준 도메인 (끝에 슬래시 없음) */
export const SITE_URL = 'https://coucatch.com'

/** SNS 공유 기본 썸네일 절대경로 */
export const OG_IMAGE = `${SITE_URL}/og-image.png`

/**
 * 소셜 로그인(카카오/구글) 완료 후 되돌아올 콜백 주소.
 *
 * ★전환기 대응: 사용자가 접속해 있는 "현재 도메인"으로 되돌려보냅니다.
 *   - coucatch.com 에서 로그인 → coucatch.com/auth/callback 으로 복귀
 *   - (구) catch-daily-worker.vercel.app 에서 로그인 → 그 도메인으로 복귀
 *   - localhost 개발 → localhost 로 복귀
 *   이렇게 하면 신·구 도메인 어디서 로그인해도 깨지지 않습니다.
 *   단, Supabase 대시보드의 "Redirect URLs" 허용목록에 두 도메인이 모두 등록돼 있어야 합니다.
 *
 * SSR/프리렌더처럼 window 가 없는 환경에서는 정규 도메인(SITE_URL)을 폴백으로 사용합니다.
 */
export function authCallbackUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/callback`
  }
  return `${SITE_URL}/auth/callback`
}
