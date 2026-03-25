// NoticesBanner.tsx — 홈 화면 공지사항 배너
// - 10초마다 공지 로테이션
// - 텍스트가 길면(25자 초과) 우→좌 뉴스티커 슬라이드 애니메이션 적용
// - 짧으면 정적 표시 (truncate)
// - 배너 클릭 시 /notices 이동

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

// 텍스트가 25자를 초과하면 마키 적용 (모바일 기준 한 줄 약 20~25자)
const MARQUEE_THRESHOLD = 25

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)

  // 10초마다 다음 공지로 전환
  useEffect(() => {
    if (notices.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(i => (i + 1) % notices.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [notices.length])

  if (notices.length === 0) return null

  const current = notices[currentIdx]
  const isLong = current.content.length > MARQUEE_THRESHOLD

  // 슬라이드 속도: 10자당 1.2초, 최소 8초 최대 25초
  const durationSec = isLong
    ? Math.min(25, Math.max(8, Math.ceil(current.content.length * 1.2 / 10)))
    : 0

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150">
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* 텍스트 영역 — overflow hidden 컨테이너 */}
        <div className="flex-1 overflow-hidden min-w-0" style={{ position: 'relative', height: '1.3rem' }}>
          {isLong ? (
            /*
              뉴스티커 슬라이드:
              - paddingLeft: '100%' → 텍스트가 컨테이너 오른쪽 끝에서 시작
              - animation translateX(0 → -100%) → 왼쪽으로 슬라이드
              - key를 currentIdx로 설정해 공지 전환 시 애니메이션 재시작
            */
            <span
              key={`ticker-${currentIdx}`}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                paddingLeft: '100%',
                animation: `news-ticker ${durationSec}s linear infinite`,
                willChange: 'transform',
                lineHeight: '1.3rem',
              }}
              className="text-sm text-gray-700"
            >
              {current.content}
            </span>
          ) : (
            /* 짧은 텍스트: 정적 표시 */
            <span
              key={`static-${currentIdx}`}
              style={{ lineHeight: '1.3rem' }}
              className="text-sm text-gray-700 block truncate absolute inset-0"
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
