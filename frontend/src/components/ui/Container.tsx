// 반응형 컨테이너 — 모든 화면의 가로 폭 토대
// - 모바일: 풀폭 1열 (좌우 16px 여백)
// - 태블릿/데스크톱: 넓은 max-width(1080px) 가운데 정렬 + 좌우 여백 확대
// 기존 페이지의 max-w-[460px] 고정 모바일 폭을 대체하기 위한 공통 래퍼입니다.
import type { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** 좁은 단일 컬럼용(읽기 흐름) — 폼/리포트 등에 사용. 기본은 넓은 컨테이너 */
  size?: 'wide' | 'narrow'
}

export default function Container({ children, className = '', style, size = 'wide' }: Props) {
  // wide: 데스크톱에서 1080px (다단 그리드 구성용)
  // narrow: 데스크톱에서도 본문 가독성 위해 640px 유지 (계산기 폼 등)
  const maxW = size === 'narrow' ? 'max-w-[640px]' : 'max-w-[1080px]'
  return (
    <div className={`w-full ${maxW} mx-auto px-4 md:px-6 ${className}`} style={style}>
      {children}
    </div>
  )
}
