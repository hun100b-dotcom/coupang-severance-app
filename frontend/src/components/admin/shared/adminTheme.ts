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

// 공용 카드 스타일 — 흰 면 + 헤어라인 + 은은한 그림자
export const adminCard: CSSProperties = {
  background: UP.surface,
  border: `1px solid ${UP.hair}`,
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 14px rgba(16,24,40,0.05)',
}

// 표 헤더 셀 공통 스타일(라벨)
export const thLabel: CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: UP.sub,
  whiteSpace: 'nowrap',
}
