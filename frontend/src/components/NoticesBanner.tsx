// NoticesBanner.tsx — 홈 화면 공지사항 배너
//
// 동작 스펙:
//   1. 한 번에 하나의 공지만 노출
//   2. 텍스트가 길면 (> 12자) → 우에서 좌로 마키(marquee) 애니메이션
//   3. 마키 onAnimationEnd 발화(= 정확히 한 바퀴 완주) 후 3초 대기 → 다음 공지로 전환
//   4. 짧으면 바로 3초 대기 → 다음 공지로 전환
//   5. 공지 전환: 현재 공지가 위로 사라지고, 다음 공지가 아래에서 올라옴
//   6. 공지 1개: 마키만 반복 (또는 정적 표시) — 전환 없음
//   7. 공지 0개: 배너 자체 숨김
//
// 마키 애니메이션 스펙:
//   keyframe: marquee-banner (index.css에 정의)
//   direction: 오른쪽 → 왼쪽 (translateX 0 → -50%)
//   텍스트 구조: [원본][복사본] → translateX(-50%) = 정확히 한 바퀴
//   onAnimationEnd = 한 바퀴 완주 시점 → 이때부터 3초 후 전환 (텍스트 잘림 없음)
//   duration: Math.max(4, 글자수 * 0.3) 초  (1회 실행, forwards)
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
  // 타이머 ref: 마키 완료 후 또는 짧은 텍스트 표시 후 전환 타이머를 관리
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // notices가 비어도 안전하게 파생값 계산 (early return은 hooks 이후에 위치)
  const current = notices[currentIdx] ?? notices[0]
  // title 있으면 title, 없으면 content 폴백. notices 비어있으면 빈 문자열
  const displayText = current ? (current.title?.trim() || current.content) : ''
  const isLong = displayText.length > MARQUEE_THRESHOLD

  // 마키 애니메이션 시간: 글자 수에 비례, 최소 4초
  const marqueeDuration = Math.max(4, displayText.length * 0.3)

  // ── 다음 공지로 전환 ─────────────────────────────
  const goNext = () => {
    setCurrentIdx((prev: number) => (prev + 1) % notices.length)
  }

  // ── 마키 애니메이션 완료 핸들러 ──────────────────
  // CSS onAnimationEnd = translateX(-50%) 도달 = 정확히 한 바퀴 완주
  // 이 시점이 첫 글자가 좌측 맨앞으로 돌아온 순간 → 3초 후 전환하면 텍스트 잘림 없음
  const handleMarqueeEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(goNext, 3000)
  }

  // ── 짧은 텍스트 타이머 ───────────────────────────
  // 마키가 없는 짧은 텍스트: 3초 표시 후 다음 공지로 전환
  // isLong이면 onAnimationEnd가 처리하므로 여기서는 skip
  // ⚠️ hooks 규칙: early return 이전에 위치해야 함 (React error #310 방지)
  useEffect(() => {
    if (notices.length === 0) return // 공지 없음: 타이머 불필요
    if (isLong) return // 긴 텍스트는 onAnimationEnd가 처리
    if (notices.length <= 1) return // 공지 1개: 전환 불필요
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(goNext, 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // currentIdx 바뀔 때마다 새로 3초 카운트
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, isLong, notices.length])

  // 공지 0개면 배너 렌더링 자체를 생략 (모든 hooks 이후에 early return)
  if (notices.length === 0) return null

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
      {/* 홈의 다른 카드와 좌우 정렬을 맞추기 위해 mx-3 my-2(자체 여백) 제거 — 컨테이너 폭 그대로 사용
          색: 인디고 그라데이션(무지개) → 브랜드 블루 단색 + 좌측 액센트 바 */}
      <div className="rounded-xl bg-brand-bg border border-brand-100 border-l-4 border-l-brand px-4 py-3 flex items-center gap-3 hover:bg-brand-50 transition-colors duration-150 overflow-hidden">
        {/* 메가폰 아이콘 */}
        <Megaphone className="w-[18px] h-[18px] text-brand flex-shrink-0" />

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
                 * - 원본 + 복사본 2개 이어붙임: [텍스트][텍스트]
                 * - translateX(-50%) = 정확히 한 바퀴 이동
                 * - animation: 1회(forwards) → onAnimationEnd 발화
                 * - onAnimationEnd 시점 = 한 바퀴 완주 → 3초 후 다음 공지로 전환
                 * - key={`marquee-${currentIdx}`}: 공지 바뀌면 애니메이션 리셋
                 * - willChange: 'transform' → GPU 레이어 활성화로 부드러운 애니메이션
                 */
                <div
                  key={`marquee-${currentIdx}`}
                  // ⚠️ w-max(width:max-content) 필수!
                  //   translateX(-50%)는 "이 컨테이너 자기 폭"을 기준으로 계산된다.
                  //   w-max가 없으면 컨테이너 폭이 부모(좁은 창)에 묶여(예: 205px),
                  //   -50%가 텍스트 한 벌(예: 493px)이 아니라 창 절반(102px)만 이동 →
                  //   공지 뒷부분이 영원히 안 보이고 텍스트가 까딱대다 멈추는 버그 발생.
                  //   w-max로 컨테이너가 [원본][복사본] 콘텐츠 폭(986px)을 갖게 하면
                  //   -50% = 정확히 한 벌(493px) 이동 → 전체 텍스트 노출 + seamless 루프.
                  className="flex w-max whitespace-nowrap"
                  style={{
                    animation: `marquee-banner ${marqueeDuration}s linear 1 forwards`,
                    willChange: 'transform',
                  }}
                  onAnimationEnd={handleMarqueeEnd}
                >
                  {/* 텍스트 원본 */}
                  <span className="text-sm font-semibold text-ink-800 pr-8">
                    {displayText}
                  </span>
                  {/* 텍스트 복사본 (seamless 루프를 위해 동일 텍스트 반복) */}
                  <span className="text-sm font-semibold text-ink-800 pr-8">
                    {displayText}
                  </span>
                </div>
              ) : (
                /* 짧은 텍스트: 정적 표시, 넘치면 말줄임 */
                <span className="text-sm font-semibold text-ink-800 block truncate">
                  {displayText}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 공지 번호 인디케이터 (공지 2개 이상일 때만 표시) */}
        {notices.length > 1 && (
          <span className="text-xs text-brand-strong flex-shrink-0 font-bold tabular-nums">
            {currentIdx + 1}/{notices.length}
          </span>
        )}

        {/* 오른쪽 화살표 (상세 페이지 이동 힌트) */}
        <ChevronRight className="w-[18px] h-[18px] text-brand flex-shrink-0" />
      </div>
    </button>
  )
}
