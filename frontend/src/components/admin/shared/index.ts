// ─────────────────────────────────────────────────────────────
// 어드민 공통 프리미티브 배럴 — 단일 import 지점
//   import { AdminCard, AdminButton, AdminTable, Th, Td, AdminLoading } from '../shared'
//   ※ 기존 PageHeader는 중복 신설 없이 AdminPageHeader 이름으로 재수출.
//   ※ adminTheme(UP 토큰·헬퍼)도 함께 재수출해 한 곳에서 가져오게 함.
// ─────────────────────────────────────────────────────────────
export { default as AdminCard } from './AdminCard'
export { default as AdminButton } from './AdminButton'
export { default as AdminBadge } from './AdminBadge'
export { default as AdminSpinner } from './AdminSpinner'
export { default as AdminPageHeader } from './PageHeader'
export { AdminTable, Th, Td } from './AdminTable'
export { AdminLoading, AdminEmpty, AdminError } from './AdminState'
export * from './adminTheme'
