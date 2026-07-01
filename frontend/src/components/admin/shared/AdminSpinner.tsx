// ─────────────────────────────────────────────────────────────
// AdminSpinner — 공통 로더 스피너
//   목적: 어드민 여러 파일(DashboardMenu/TargetMenu/ServerLogs/각 Tab 등 7곳)에 흩어진
//         인라인 `<style>@keyframes spin` 중복을 제거하기 위한 단일 컴포넌트.
//   구현: Tailwind 빌트인 `animate-spin` 사용(별도 keyframes 불필요).
//   토큰: 테두리=hair, 회전부=brand (사용자앱 업비트풍 톤).
// ─────────────────────────────────────────────────────────────
import { UP } from './adminTheme'

interface Props {
  /** 지름(px). 기본 28 */
  size?: number
  /** 테두리 두께(px). 기본 3 */
  thickness?: number
  className?: string
}

export default function AdminSpinner({ size = 28, thickness = 3, className = '' }: Props) {
  return (
    <div
      className={`animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: `${thickness}px solid ${UP.hair}`,
        borderTopColor: UP.brand, // 한쪽만 브랜드색 → 회전 시 진행 표시
      }}
      role="status"
      aria-label="로딩 중"
    />
  )
}
