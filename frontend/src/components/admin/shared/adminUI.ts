// ============================================================
// adminUI.ts — 어드민 "월드클래스 리디자인" 전용 새 비주얼 언어 토큰 (2026-07-02)
//   목적: 기존 adminTheme(UP: 콘텐츠 라이트 토큰)은 그대로 두고, 셸(사이드바/상단바)과
//         대시보드 히어로 등 "확 달라 보이는" 새 프레젠테이션에 필요한 토큰만 추가한다.
//   컨셉: 딥 네이비 프리미엄 레일(사이드바) + 라이트 업비트 콘텐츠(UP) 하이브리드
//         = Linear/Stripe/Vercel 류 프로 대시보드 톤. 무지개 금지(블루+그린+회색+의미색).
//   ⚠️ 어드민 전용. 사용자앱/전역 index.css 무영향. 폰트 크기는 text-a* 유틸 사용.
// ============================================================
import type { CSSProperties } from 'react'
import { UP } from './adminTheme'

// ── 딥 잉크(사이드바 레일) — UP.navy(#1A2434)에서 파생한 프리미엄 다크 ──
export const INK = {
  deepest: '#0B1020', // 레일 최하단
  base:    '#0F1628', // 레일 기본 면
  soft:    '#18213A', // 호버/선택 배경
  line:    'rgba(255,255,255,0.08)', // 레일 내 헤어라인
  text:    '#C9D2E3', // 레일 기본 텍스트(뮤트 라이트)
  textDim: '#8A94AC', // 레일 보조 텍스트
  textBright: '#F4F7FC', // 레일 강조 텍스트
} as const

// 레일 배경 그라디언트(위→아래로 살짝 밝아지는 네이비)
export const RAIL_BG = `linear-gradient(180deg, ${INK.deepest} 0%, ${INK.base} 46%, #111A30 100%)`

// 브랜드 블루 글로우(활성 메뉴·포인트)
export const BRAND = UP.brand      // #3182F6
export const BRAND_STRONG = UP.strong // #1B64DA

// ── 히어로 바(대시보드 상단 큰 요약) — 네이비 그라디언트 + 블루 글로우 ──
export const HERO_BG =
  `radial-gradient(1200px 400px at 12% -40%, rgba(49,130,246,0.35) 0%, transparent 60%),` +
  `radial-gradient(900px 380px at 92% 120%, rgba(27,100,218,0.28) 0%, transparent 55%),` +
  `linear-gradient(135deg, #0F1628 0%, #16233F 52%, #1B2C4E 100%)`

// ── 엘리베이션(소프트섀도우 3단) ──
export const ELEV = {
  sm:   '0 1px 2px rgba(16,24,40,0.05)',
  card: '0 2px 8px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
  lift: '0 12px 32px rgba(16,24,40,0.12), 0 2px 8px rgba(16,24,40,0.06)',
  hero: '0 24px 60px rgba(15,22,40,0.35)',
} as const

// ── 반경(라운드) — 프리미엄 감을 위해 기존보다 크게 ──
export const R = { chip: 10, card: 18, panel: 22, hero: 26, pill: 9999 } as const

// ── 콘텐츠 프로 카드(라이트) — 흰 면 + 헤어라인 + 큰 라운드 + 소프트섀도우 ──
export const proCard: CSSProperties = {
  background: UP.surface,
  border: `1px solid ${UP.hair}`,
  borderRadius: R.card,
  boxShadow: ELEV.card,
}

// ── 섹션 헤더(큰 위계) 좌측 액센트 바 스타일 헬퍼는 컴포넌트에서 조합 ──

// ── Framer Motion 진입 프리셋 (staggered fade-up) ──
//   reduced-motion 은 framer-motion 이 자동 존중(useReducedMotion 미사용 시에도 CSS 매체쿼리 반영).
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}
export const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
