// NoticesBanner.tsx — 홈 화면 공지사항 배너
// - 배너에는 title 필드만 표시 (content는 상세 페이지에서 확인)
// - 10초마다 공지 로테이션 (공지가 2개 이상일 때)
// - 제목이 20자 초과 → 오른쪽에서 왼쪽으로 흐르는 seamless 마키(marquee) 애니메이션
// - 제목이 20자 이하 → 정적 표시 (truncate)
// - 배너 클릭 시 /notices(공지사항 전체 목록) 페이지로 이동
//
// 마키 애니메이션 스펙:
//   방향: 오른쪽 → 왼쪽 (translateX 0 → -50%)
//   속도: 제목 글자 수에 따라 조절 (8~20초), 약 30~40px/s
//   반복: 텍스트를 2번 이어붙여 seamless 무한 루프

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

// 마키 애니메이션을 적용할 제목 길이 기준 (글자 수)
const MARQUEE_THRESHOLD = 20

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)

  // 10초마다 다음 공지로 자동 전환 (공지가 2개 이상일 때만)
  useEffect(() => {
    if (notices.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(i => (i + 1) % notices.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [notices.length])

  // 공지가 없으면 배너 자체를 렌더링하지 않음
  if (notices.length === 0) return null

  const current = notices[currentIdx]

  // 배너에 표시할 텍스트: title이 있으면 title, 없으면 content로 폴백
  // (기존 공지는 title 컬럼이 비어있을 수 있으므로 폴백 처리)
  const displayText = current.title?.trim() || current.content

  // 글자 수 기준으로 마키 여부 결정
  const isLong = displayText.length > MARQUEE_THRESHOLD

  // 마키 애니메이션 속도 계산:
  // 글자 수가 많을수록 더 오래 걸림 (1글자당 약 0.4초, 최소 8초 ~ 최대 20초)
  // → 약 30~40px/s 속도가 되도록 조정
  const duration = Math.min(20, Math.max(8, Math.ceil(displayText.length * 0.4)))

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150">
        {/* 메가폰 아이콘 */}
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* 텍스트 컨테이너 — 텍스트가 넘치면 마키 애니메이션 적용 */}
        <div className="flex-1 overflow-hidden min-w-0">
          {isLong ? (
            /*
             * seamless 마키(뉴스티커) 구현 방법:
             * - 같은 텍스트를 2번 이어붙임: [텍스트A][텍스트B]
             * - translateX(0) → translateX(-50%) 로 이동하면
             *   텍스트B가 텍스트A 자리로 오면서 seamless 반복됨
             * - key={currentIdx} 로 공지 전환 시 애니메이션 리셋
             * - CSS 키프레임은 index.css의 @keyframes marquee-ticker 에 정의
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
              {/* 텍스트 첫 번째 복사 */}
              <span className="text-sm font-medium text-gray-700" style={{ paddingRight: '3rem' }}>
                {displayText}
              </span>
              {/* 텍스트 두 번째 복사 (seamless 루프를 위해 동일 텍스트 반복) */}
              <span className="text-sm font-medium text-gray-700" style={{ paddingRight: '3rem' }}>
                {displayText}
              </span>
            </span>
          ) : (
            /* 짧은 제목: 정적 표시, 넘치면 말줄임 처리 */
            <span
              key={`static-${currentIdx}`}
              className="text-sm font-medium text-gray-700 block truncate"
            >
              {displayText}
            </span>
          )}
        </div>

        {/* 복수 공지 인디케이터 (공지 2개 이상일 때만 표시) */}
        {notices.length > 1 && (
          <span className="text-xs text-blue-300 flex-shrink-0 font-medium tabular-nums">
            {currentIdx + 1}/{notices.length}
          </span>
        )}

        {/* 오른쪽 화살표 (상세 페이지 이동 힌트) */}
        <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
      </div>
    </button>
  )
}
