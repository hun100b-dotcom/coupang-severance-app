// NoticesBanner.tsx — 홈 화면 공지사항 배너
// - 10초마다 공지 로테이션
// - 텍스트 25자 초과: 좌측에서 즉시 보이며 우→좌 seamless 슬라이드
// - 텍스트 25자 이하: 정적 표시 (truncate)
// - 배너 클릭 시 /notices 이동

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

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
  // 텍스트 6자당 1초, 최소 8초 최대 20초
  const duration = Math.min(20, Math.max(8, Math.ceil(current.content.length / 6)))

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150">
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* 텍스트 컨테이너 */}
        <div className="flex-1 overflow-hidden min-w-0">
          {isLong ? (
            /*
             * seamless 뉴스티커:
             * - translateX(0) 시작 → 텍스트 즉시 보임
             * - 텍스트 2번 복사 후 translateX(-50%) 이동 → seamless 반복
             * - key 변경 시 애니메이션 리셋
             */
            <span
              key={`ticker-${currentIdx}`}
              style={{
                display: 'inline-flex',
                whiteSpace: 'nowrap',
                animation: `marquee-ticker ${duration}s linear infinite`,
                willChange: 'transform',
              }}
            >
              <span className="text-sm text-gray-700" style={{ paddingRight: '3rem' }}>
                {current.content}
              </span>
              <span className="text-sm text-gray-700" style={{ paddingRight: '3rem' }}>
                {current.content}
              </span>
            </span>
          ) : (
            /* 짧은 텍스트: 정적 표시 */
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
