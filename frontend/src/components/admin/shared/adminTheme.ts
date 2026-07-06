// ============================================================
// 어드민 업비트풍 디자인 토큰 (Admin Upbit Tokens)
//   - 사용자 화면의 tailwind `up.*` 토큰과 값을 1:1로 맞춘 단일 출처입니다.
//   - 어드민은 인라인 style 기반 + 데이터밀도 화면이라, 흩어진 hex 대신
//     이 UP 객체를 참조해 "정돈·일관·가독"을 유지합니다.
//   - ⚠️ 전역 index.css 의 `.text-*` !important 폰트 override 영향을 피하기 위해
//     크기(fontSize)는 Tailwind 텍스트 클래스가 아닌 인라인 rem/px 로 둡니다.
//   - 숫자(금액/통계)는 `numeric` 헬퍼로 tabular-nums 정렬을 적용합니다.
// ============================================================

import type { CSSProperties } from 'react'

export const UP = {
  // ── 면(surface) ──
  page:     '#EEF1F5', // 페이지 배경(옅은 청회색)
  surface:  '#FFFFFF', // 카드/면
  sunken:   '#F2F5FA', // 표 헤더·구획 배경

  // ── 잉크(텍스트 위계) ──
  navy:     '#1A2434', // 헤딩(남색 잉크)
  body:     '#333D4B', // 본문
  sub:      '#565D6A', // 보조 텍스트 (흰 위 AA 6.7:1)
  caption:  '#8E929B', // 캡션/날짜 (비필수만)

  // ── 라인(헤어라인) ──
  hair:     '#E1E4EA', // 헤어라인 보더(기본)
  hairSoft: '#EDEFF3', // 더 옅은 내부 구분선·행 스트라이프

  // ── 브랜드 블루 ──
  brand:    '#3182F6', // 포인트 블루
  strong:   '#1B64DA', // 활성 텍스트·금액·강조 (AA 5.4:1)
  brandBg:  '#EAF2FE', // 옅은 블루 배경(칩/활성 탭)
  brandLine:'#C7DDFC', // 블루 보더(활성 배지 테두리)

  // ── 상태색 (텍스트는 흰 배경 AA 고려, bg/line은 옅은 톤) ──
  green:     '#047857', // 성공/적격 텍스트 (AA)
  greenChart:'#06BE7B', // 차트 시리즈용 그린
  greenBg:   '#E6F8F1',
  greenLine: '#BCEBD9',

  amber:     '#B45309', // 경고/대기 텍스트 (AA, 기존 #d97706 대체)
  amberChart:'#E08600', // 차트 시리즈용 앰버
  amberBg:   '#FEF6E7',
  amberLine: '#F6D9A6',

  danger:    '#D32F3A', // 위험/이상 텍스트 (AA)
  dangerChart:'#F04452', // 차트/포인트용
  dangerBg:  '#FEECEC',
  dangerLine:'#F7C9CC',
} as const

// 차트 시리즈 팔레트 — 무지개 대신 브랜드/그린/앰버/네이비 계열로 절제
//   (TargetMenu 등 다색 차트는 다음 묶음에서 별도 정돈)
export const CHART_SERIES = [UP.brand, UP.greenChart, UP.amberChart, UP.strong, UP.navy, UP.sub] as const

// 숫자(금액·통계)용 인라인 스타일 — tabular-nums 자릿수 정렬
export const numeric: CSSProperties = { fontVariantNumeric: 'tabular-nums' }

// ── 형태(form) 토큰 — 사용자앱(tailwind.config·index.css)과 1:1 일치 ──
//   라운드: 사용자앱 카드 radius-xl(20)·btn(12)·content(16)·pill 과 동일.
//   그림자: tailwind boxShadow.card / .float, index.css .glass-card 와 동일.
//   → 어드민 카드·버튼이 사용자 화면과 "한 몸"으로 보이게 하는 단일 출처.
export const RADIUS = { sm: 8, btn: 12, content: 16, card: 20, pill: 9999 } as const
export const SHADOW = {
  card:  '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)',
  float: '0 8px 24px rgba(49,130,246,0.10), 0 20px 48px rgba(16,24,40,0.10)',
} as const

// 사용자앱이 쓰는 진입 모션 클래스(index.css 정의) — 어드민 메뉴 전환에 동일 적용.
//   page-enter 는 가로 이동이라 좁은 화면에서 가로 스크롤 유발 가능 → 세로 페이드인
//   slideUpFade(.animate-staggered-fade)를 써 사용자 화면과 같은 톤이되 안전하게.
export const ENTER_CLASS = 'animate-staggered-fade'

// 공용 카드 스타일 — 사용자앱 .glass-card / ui<Card variant="solid"> 와 동일한 폼
//   (솔리드 흰 면 + 헤어라인 보더 + radius 20 + shadow-card). 2026 리디자인에서
//   사용자앱 글래스가 솔리드 흰 카드로 바뀌었으므로 어드민도 동일하게 솔리드.
export const adminCard: CSSProperties = {
  background: UP.surface,
  border: `1px solid ${UP.hair}`,
  borderRadius: RADIUS.card,
  boxShadow: SHADOW.card,
}
// 깊이감 강조 카드(ui<Card variant="float">) — 히어로/모달성 카드용
export const adminCardFloat: CSSProperties = { ...adminCard, boxShadow: SHADOW.float }

// (P3-b) 공용 카드 박스 — 대시보드 탭/타겟 등에서 각자 정의하던 로컬 CARD 상수(5파일) 중복 대체.
//   radius 16(승인: 20/12 혼재 → 16 통일) + flat 소프트섀도우. 사용자앱 업비트풍 카드 톤과 일치.
export const cardBox: CSSProperties = {
  background: UP.surface,
  border: `1px solid ${UP.hair}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
}

// ── 버튼 헬퍼 — 사용자앱 ui<Button> primary/secondary/ghost 와 동일 톤 ──
export const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '9px 16px', borderRadius: RADIUS.btn, border: 'none',
  background: UP.brand, color: '#fff', fontSize: 13, fontWeight: 700,
  letterSpacing: '-0.01em', cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(49,130,246,0.30)',
}
export const btnSecondary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '9px 16px', borderRadius: RADIUS.btn,
  background: UP.surface, color: UP.strong, border: `1px solid ${UP.brandLine}`,
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
export const btnGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '9px 14px', borderRadius: RADIUS.btn,
  background: 'transparent', color: UP.body, border: `1px solid ${UP.hair}`,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

// ── 배지 헬퍼 — 사용자앱 ui<Badge> 와 동일(알약형 + 옅은 배경 + 진한 텍스트) ──
type BadgeTone = 'brand' | 'green' | 'neutral' | 'danger' | 'amber'
export function badge(tone: BadgeTone = 'brand'): CSSProperties {
  const map: Record<BadgeTone, { background: string; color: string }> = {
    brand:   { background: UP.brandBg,  color: UP.strong },
    green:   { background: UP.greenBg,  color: UP.green },
    neutral: { background: UP.sunken,   color: UP.sub },
    danger:  { background: UP.dangerBg, color: UP.danger },
    amber:   { background: UP.amberBg,  color: UP.amber },
  }
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: RADIUS.pill,
    fontSize: 10, fontWeight: 700, lineHeight: 1.4, ...map[tone],
  }
}

// (P1) dead export였던 thLabel 제거 — 전 코드 사용 0건. 표 헤더는 shared/AdminTable 의 <Th> 사용.
