// NoticesBanner.tsx — 홈 화면 공지사항 배너 (완전 재작성 2026-04-05)
//
// 동작 스펙:
//   1. 한 번에 하나의 공지만 노출
//   2. 텍스트가 길면 (> 12자) → 우에서 좌로 마키(marquee) 애니메이션
//   3. 마키 완료 후 3초 대기 → 다음 공지로 전환
//   4. 짧으면 바로 3초 대기 → 다음 공지로 전환
//   5. 공지 전환: 현재 공지가 위로 사라지고, 다음 공지가 아래에서 올라옴
//   6. 공지 1개: 마키만 반복 (또는 정적 표시) — 전환 없음
//   7. 공지 0개: 배너 자체 숨김
//
// 마키 애니메이션 스펙:
//   keyframe: marquee-banner (index.css에 정의)
//   direction: 오른쪽 → 왼쪽 (translateX 0 → -50%)
//   텍스트 2번 이어붙여 seamless: [텍스트A][텍스트B] → A 위치까지 이동하면 B가 A 자리에 있음
//   duration: Math.max(4, 글자수 * 0.25) 초  (1회 실행, forwards)
//   마키가 끝나면 3초 후 다음 공지로 전환
//
// 공지 전환 애니메이션 스펙:
//   framer-motion AnimatePresence mode="wait"
//   퇴장: y 0 → -100% (위로 사라짐)
//   진입: y 100% → 0 (아래에서 올라옴)
//   duration: 0.35s, ease: easeInOut

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

// 마키 적용 기준: 12자 초과 시 마키 (모바일 한 줄에 들어오는 최대 글자 수 기준)
const MARQUEE_THRESHOLD = 12

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)

  // 타이머 ref: currentIdx 변경 시 이전 타이머 정리
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 공지 1개 이하: 타이머 불필요 (전환 없음)
    if (notices.length <= 1) return

    const current = notices[currentIdx]
    // title 있으면 title, 없으면 content 폴백
    const displayText = current.title?.trim() || current.content
    const isLong = displayText.length > MARQUEE_THRESHOLD

    // 마키 duration: Math.max(4, 글자수 * 0.25) 초
    const marqueeDuration = Math.max(4, displayText.length * 0.25)

    // 마키가 있으면: 마키 완료(marqueeDuration) + 3초 후 전환
    // 마키가 없으면: 바로 3초 후 전환
    const totalDelay = isLong ? (marqueeDuration + 3) * 1000 : 3000

    timerRef.current = setTimeout(() => {
      // 다음 공지 인덱스로 순환
      setCurrentIdx(i => (i + 1) % notices.length)
    }, totalDelay)

    // 클린업: 다음 effect 실행 전 이전 타이머 제거
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIdx, notices])

  // 공지 0개면 배너 렌더링 자체를 생략
  if (notices.length === 0) return null

  const current = notices[currentIdx]
  const displayText = current.title?.trim() || current.content
  const isLong = displayText.length > MARQUEE_THRESHOLD

  // 마키 애니메이션 시간 (CSS animation-duration에 직접 주입)
  const marqueeDuration = Math.max(4, displayText.length * 0.25)

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      {/*
       * 외부 컨테이너: overflow-hidden 필수!
       * - 위아래 슬라이드 전환 시 y 방향 클리핑
       * - 마키 텍스트가 배너 밖으로 흘러나오지 않도록 제한
       */}
      <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-indigo-100 transition-colors duration-150 overflow-hidden">
        {/* 메가폰 아이콘 */}
        <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/*
         * 텍스트 영역
         * - overflow-hidden: 위아래 슬라이드 클리핑
         * - min-w-0: flex 자식이 텍스트 넘침 없이 줄어들도록
         */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/*
           * AnimatePresence mode="wait":
           *   퇴장 애니메이션(위로 사라짐) 완료 후 진입 애니메이션(아래에서 올라옴) 시작
           * initial={false}: 첫 렌더 시 진입 애니메이션 생략 (자연스러운 첫 표시)
           */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIdx}
              initial={{ y: '100%' }}                       // 아래에서 시작
              animate={{ y: 0 }}                            // 제자리
              exit={{ y: '-100%' }}                         // 위로 사라짐
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="overflow-hidden"                   // 마키 텍스트 좌우 클리핑
            >
              {isLong ? (
                /*
                 * 마키(뉴스티커) 구현:
                 * - 텍스트를 2번 이어붙임: [텍스트][텍스트]
                 * - translateX(-50%) 이동하면 두 번째 텍스트가 첫 번째 자리로 이동 → seamless
                 * - animation: 1회(forwards) 실행 → 마키 끝나면 3초 후 다음 공지로 전환
                 * - willChange: 'transform' → GPU 레이어 활성화로 부드러운 애니메이션
                 * - keyframe marquee-banner → index.css에 정의
                 */
                <div
                  className="flex whitespace-nowrap"
                  style={{
                    animation: `marquee-banner ${marqueeDuration}s linear 1 forwards`,
                    willChange: 'transform',
                  }}
                >
                  {/* 텍스트 원본 */}
                  <span className="text-sm font-medium text-gray-700 pr-8">
                    {displayText}
                  </span>
                  {/* 텍스트 복사본 (seamless 루프를 위해 동일 텍스트 반복) */}
                  <span className="text-sm font-medium text-gray-700 pr-8">
                    {displayText}
                  </span>
                </div>
              ) : (
                /* 짧은 텍스트: 정적 표시, 넘치면 말줄임 */
                <span className="text-sm font-medium text-gray-700 block truncate">
                  {displayText}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 공지 번호 인디케이터 (공지 2개 이상일 때만 표시) */}
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
