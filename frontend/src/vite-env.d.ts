/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string

// ── Vite 환경변수 타입 확장 ─────────────────────────────────
// import.meta.env.VITE_* 변수를 TypeScript가 인식하도록 선언
interface ImportMetaEnv {
  /** 백엔드 API URL (빈 문자열이면 /api 프록시 사용) */
  readonly VITE_API_URL: string
  /** Supabase 프로젝트 URL */
  readonly VITE_SUPABASE_URL: string
  /** Supabase anon public key */
  readonly VITE_SUPABASE_ANON_KEY: string
  /** 카카오 JavaScript 앱 키 — 카카오톡 공유 기능 (미설정 시 클립보드 fallback) */
  readonly VITE_KAKAO_JS_KEY: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
