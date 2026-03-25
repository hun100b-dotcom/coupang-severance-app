// NoticesBanner.tsx — 홈 화면 공지사항 배너
// - 10초마다 공지사항 로테이션 (여러 개일 때)
// - 텍스트가 컨테이너 너비를 초과하면 seamless 마키 애니메이션 적용
// - 배너 클릭 시 /notices 페이지로 이동

import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [overflow, setOverflow] = useState(false)

  // 숨겨진 측정 span: overflow-hidden 밖에서 실제 텍스트 너비를 측정
  const measureRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 현재 텍스트가 컨테이너보다 길면 마키 필요
  const checkOverflow = useCallback(() => {
    if (!measureRef.current || !containerRef.current) return
    setOverflow(measureRef.current.offsetWidth > containerRef.current.offsetWidth)
  }, [])

  // currentIdx 또는 notices 변경 시 오버플로우 재측정
  useEffect(() => {
    const id = requestAnimationFrame(checkOverflow)
    window.addEventListener('resize', checkOverflow)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', checkOverflow) }
  }, [currentIdx, notices, checkOverflow])

  // 10초마다 다음 공지로 로테이션
  useEffect(() => {
    if (notices.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(i => (i + 1) % notices.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [notices.length])

  if (notices.length === 0) return null

  const current = notices[currentIdx]
  // 마키 속도: 텍스트 10자당 1초, 최소 6초 최대 20초
  const marqueeDuration = `${Math.min(20, Math.max(6, Math.ceil(current.content.length / 8)))}s`

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150">
        {/* 스피커 아이콘 */}
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* 텍스트 영역 */}
        <div ref={containerRef} className="flex-1 overflow-hidden min-w-0 relative">
          {/* 숨겨진 측정 span: 실제 텍스트 너비 측정용 */}
          <span
            ref={measureRef}
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              top: 0,
              left: 0,
            }}
            className="text-sm"
          >
            {current.content}
          </span>

          {overflow ? (
            // 마키 모드: 텍스트 2번 복사 후 translateX(-50%) seamless 순환
            <span
              key={`ticker-${currentIdx}`}
              style={{
                display: 'inline-flex',
                whiteSpace: 'nowrap',
                animation: `marquee-ticker ${marqueeDuration} linear infinite`,
                willChange: 'transform',
              }}
              className="text-sm text-gray-700"
            >
              {/* 첫 번째 복사 */}
              <span style={{ paddingRight: '3rem' }}>{current.content}</span>
              {/* 두 번째 복사 (seamless 연결) */}
              <span style={{ paddingRight: '3rem' }}>{current.content}</span>
            </span>
          ) : (
            // 정적 모드: truncate
            <span
              key={`static-${currentIdx}`}
              className="text-sm text-gray-700 block truncate"
            >
              {current.content}
            </span>
          )}
        </div>

        {/* 복수 공지 인디케이터 */}
        {notices.length > 1 && (
          <span className="text-xs text-blue-300 flex-shrink-0 font-medium tabular-nums">
            {currentIdx + 1}/{notices.length}
          </span>
        )}

        <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
      </div>
    </button>
  )
}
