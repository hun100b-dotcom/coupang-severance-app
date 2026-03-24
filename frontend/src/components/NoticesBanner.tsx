// NoticesBanner.tsx — 홈 화면 상단 공지사항 배너 (마키 ticker 방식)
// - 공지사항 텍스트가 오른쪽에서 왼쪽으로 부드럽게 흘러가는 마키 애니메이션
// - 공지가 여러 개일 경우 "공지1 내용  ·  공지2 내용  ·  공지3 내용 ..." 형식으로 연속 반복
// - 공지 전환 주기: 10초/공지 (notices.length * 10초 동안 전체 텍스트 순환)
// - 배너 클릭 시 /notices 페이지(공지사항 전체 목록)로 이동
// - 1개일 때도 마키 효과 적용

import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()

  // 공지가 없으면 아무것도 렌더링하지 않음
  if (notices.length === 0) return null

  // 모든 공지를 "  ·  " 구분자로 연결하여 하나의 연속 텍스트로 만들기
  const combinedText = notices.map(n => n.content).join('   ·   ')

  // 공지 개수 × 10초 (최소 10초) — 각 공지가 약 10초에 걸쳐 지나가도록
  const durationSec = Math.max(10, notices.length * 10)

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      {/* 배너 카드: 그라디언트 배경 + 파란 왼쪽 보더 */}
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 overflow-hidden hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150">
        {/* 스피커 아이콘 */}
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* 마키 컨테이너: overflow-hidden으로 텍스트 잘리게 */}
        <div className="flex-1 overflow-hidden min-w-0">
          {/*
            마키 텍스트:
            - display: inline-block — translateX 애니메이션이 정상 동작하도록
            - white-space: nowrap — 줄바꿈 없이 한 줄로 흘러가도록
            - animation: marquee-scroll 키프레임 (tailwind.config.js에 정의됨)
            - duration: 공지 개수에 비례 (각 공지 약 10초)
          */}
          <span
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              animation: `marquee-scroll ${durationSec}s linear infinite`,
              willChange: 'transform',
            }}
            className="text-sm text-gray-700"
          >
            {combinedText}
          </span>
        </div>

        {/* 오른쪽 화살표: 클릭 가능함을 시각적으로 표시 */}
        <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
      </div>
    </button>
  )
}
