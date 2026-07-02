// ============================================================
// adminDS.ts — CATCH 어드민 원점 재설계 "새 디자인 언어" 단일 토큰 (2026-07-02, S0)
//   컨셉: "Aurora Light Workspace" — 딥네이비 레일 폐기, 상단 프라이머리 탭 IA +
//         밝은 에디토리얼 캔버스 + 크리스프 헤어라인 + 데이터 밀도(업비트 시세판) 지향.
//   ★색은 사용자앱 up.* 계열(블루/그린/회색)만 — 무지개 금지.
//   ★폰트 크기는 어드민 전용 text-a*(index.css 전역 override 무수정) 사용.
//   ⚠️ 이전 adminUI(딥네이비)는 대시보드 셸에서만 쓰였고, 재설계에서 이 DS로 대체된다.
// ============================================================
import type { CSSProperties } from 'react'

// ── 표면(Surface) ──
export const DS = {
  canvas:   '#F5F6F9', // 앱 캔버스(옅은 쿨그레이)
  panel:    '#FFFFFF', // 카드/패널
  raise:    '#FBFCFE', // 살짝 뜬 영역(툴바/헤더)
  sunken:   '#F1F3F7', // 표 헤더·인셋

  // ── 라인 ──
  line:     '#E6E9EF', // 기본 헤어라인
  lineSoft: '#EEF1F5', // 더 옅은 행 구분

  // ── 잉크(위계 5단) — 헤딩은 새 딥잉크 #0B1220 ──
  ink:      '#0B1220', // 헤딩(강한 딥 잉크·신규)
  body:     '#333D4B', // 본문
  sub:      '#565D6A', // 보조(AA)
  faint:    '#8E929B', // 캡션(비필수)

  // ── 액센트(브랜드 블루 1색) ──
  accent:      '#3182F6',
  accentStrong:'#1B64DA', // 금액·활성 텍스트(AA)
  accentSoft:  '#EAF2FE', // 옅은 배경(활성 칩)
  accentLine:  '#C7DDFC',

  // ── 의미색 ──
  ok:    '#047857', okSoft:  '#E6F8F1', okLine:  '#BCEBD9', okChart: '#06BE7B',
  warn:  '#B45309', warnSoft:'#FEF6E7', warnLine:'#F6D9A6', warnChart:'#E08600',
  bad:   '#D32F3A', badSoft: '#FEECEC', badLine: '#F7C9CC', badChart:'#F04452',
} as const

// ── 라운드/간격/엘리베이션 ──
export const RAD = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 9999 } as const
export const GAP = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 } as const
export const SHADOW = {
  sm:  '0 1px 2px rgba(11,18,32,0.05)',
  md:  '0 2px 8px rgba(11,18,32,0.06), 0 1px 2px rgba(11,18,32,0.04)',
  pop: '0 12px 32px rgba(11,18,32,0.12), 0 2px 8px rgba(11,18,32,0.06)',
} as const

// 앱 캔버스 배경 — 옅은 브랜드 오로라 틴트(우상단)
export const CANVAS_BG =
  `radial-gradient(760px 380px at 100% -8%, rgba(49,130,246,0.06) 0%, transparent 60%), ${DS.canvas}`

// 프로스트 상단바(반투명+블러) — 새 IA의 시그니처
export const FROST_BAR: CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(14px)',
  borderBottom: `1px solid ${DS.line}`,
}

// 프로 패널(흰 카드) 기본형
export const panel: CSSProperties = {
  background: DS.panel,
  border: `1px solid ${DS.line}`,
  borderRadius: RAD.lg,
  boxShadow: SHADOW.md,
}

// 숫자(mono tabular) — 업비트 시세판 톤
export const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }

// 진입 모션 — ★framer variants 금지. CSS .animate-staggered-fade(forwards, 항상 visible)만 사용.
export const ENTER = 'animate-staggered-fade'
