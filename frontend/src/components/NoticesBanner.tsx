// NoticesBanner.tsx — 홈 화면 공지사항 배너
//
// 동작 스펙 (재작성 v2 — 일회성 freeze 제거, 연속 루프 + 독립 타이머 회전):
//   1. 한 번에 하나의 공지만 노출
//   2. 텍스트가 컨테이너보다 "실제로 넘칠 때만" → 우에서 좌로 끊김 없는(seamless) 무한 마키
//   3. 공지 전환은 마키 애니메이션과 "완전히 분리된" 고정 타이머로 처리
//      (overflow면 한 바퀴 충분히 돌 시간 + 여유, 아니면 짧게 읽을 시간 후 전환)
//   4. 공지 1개: 마키만 무한 반복 (전환 없음) — 멈추지 않음
//   5. 공지 전환: 현재 공지가 위로 사라지고, 다음 공지가 아래에서 올라옴
//   6. 공지 0개: 배너 자체 숨김
//
// ⚠️ 과거 버그(왜 재작성했나):
//   - 구버전은 `animation: marquee-banner Xs linear 1 forwards`로 "딱 한 번" 흐르고
//     -50%에서 영구 정지(freeze)했음 → 느린 스크롤 뒤 멈춰버려 "동작이 이상함"으로 보임.
//   - 회전을 onAnimationEnd에 의존 → 공지 1개일 땐 goNext가 같은 인덱스((0+1)%1=0)를
//     반환해 key가 안 바뀌어 애니메이션이 재시작되지 않고 영원히 멈췄음(스펙 위반).
//   - isLong을 글자수(>12)로만 판정 → 넓은 화면에선 안 넘치는데도 무의미하게 스크롤.
//   해결: 무한 루프(infinite) + 독립 setTimeout 회전 + 실제 폭 측정으로 overflow 판정.
//
// 마키 애니메이션 (index.css의 @keyframes marquee-banner):
//   translateX(0) → translateX(-50%). 텍스트를 [원본][복사본] 2벌로 깔고 w-max를 주면
//   트랙 폭 = 두 벌 합. -50% = 정확히 한 벌 이동 → 복사본이 원본 자리에 딱 맞아 seamless.
//   `infinite`라 -50% 도달 후 0으로 점프해도 두 벌이 동일 텍스트라 점프가 보이지 않음.

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

export default function NoticesBanner({ notices }: Props) {
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)

  // overflow: 현재 공지 텍스트 한 벌이 보이는 영역(clip)보다 실제로 넓은지 여부
  // false면 정적 표시, true면 무한 마키
  const [overflow, setOverflow] = useState(false)

  // clipRef: 텍스트가 잘리는 보이는 영역(뷰포트). clientWidth = 실제 가용 폭
  const clipRef = useRef<HTMLDivElement>(null)
  // measureRef: 화면에 영향 없는(absolute+invisible) 측정 전용 span. 텍스트 진짜 폭 측정
  const measureRef = useRef<HTMLSpanElement>(null)

  // notices가 비어도 안전하게 파생값 계산 (early return은 hooks 이후)
  const current = notices[currentIdx] ?? notices[0]
  // title 우선, 없으면 content 폴백. 공지 없으면 빈 문자열
  const displayText = current ? (current.title?.trim() || current.content) : ''

  // 마키 한 바퀴(한 벌 이동) 시간: 글자 수 비례, 최소 6초 — 너무 빠르지 않게
  const loopSec = Math.max(6, displayText.length * 0.3)

  // ── 실제 overflow 측정 ───────────────────────────────────────────────
  // 측정 전용 span(measureRef)의 자연 폭과 보이는 영역(clipRef) 폭을 비교.
  // 레이아웃에 영향을 주지 않는 invisible/absolute 요소라 truncate·마키 구조와 무관하게
  // 항상 "텍스트가 실제로 넘치는지"를 정확히 판정한다.
  useLayoutEffect(() => {
    const clip = clipRef.current
    if (!clip) return
    const measure = () => {
      const m = measureRef.current
      if (!m || !clip) return
      // +1: 소수점 반올림으로 인한 1px 오차로 불필요한 마키가 켜지는 것 방지
      setOverflow(m.offsetWidth > clip.clientWidth + 1)
    }
    measure()
    // ResizeObserver: 보이는 영역(clip)의 폭 변화를 직접 관찰해 재측정.
    //   window resize뿐 아니라 (1) 0폭으로 숨겨졌다 표시되는 경우, (2) 폰트(Pretendard)
    //   늦은 로드로 reflow되는 경우, (3) 부모 레이아웃 변동까지 모두 감지 → 마키 미동작 고착 방지.
    const ro = new ResizeObserver(measure)
    ro.observe(clip)
    return () => ro.disconnect()
  }, [displayText])

  // ── 공지 전환 타이머 (마키와 독립) ────────────────────────────────────
  // overflow면 한 바퀴(loopSec) 충분히 돈 뒤 1.5초 여유를 두고 전환,
  // 아니면 3.5초 읽을 시간 후 전환. 공지 1개면 전환 자체를 생략(무한 마키만).
  // ⚠️ hooks 규칙: early return 이전에 위치 (React error #310 방지)
  useEffect(() => {
    if (notices.length <= 1) return // 공지 1개 이하: 전환 불필요
    const displayMs = overflow ? loopSec * 1000 + 1500 : 3500
    const timer = setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % notices.length)
    }, displayMs)
    return () => clearTimeout(timer)
    // currentIdx·overflow·displayText 바뀔 때마다 새 카운트
  }, [currentIdx, overflow, notices.length, displayText, loopSec])

  // 공지 0개면 배너 렌더링 자체 생략 (모든 hooks 이후 early return)
  if (notices.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => navigate('/notices')}
      className="w-full text-left"
      aria-label="공지사항 전체 보기"
    >
      {/* 외부 컨테이너: overflow-hidden 필수 (위아래 슬라이드 클리핑 + 마키 좌우 클리핑)
          색: 브랜드 블루 단색 + 좌측 액센트 바 */}
      <div className="rounded-xl bg-brand-bg border border-brand-100 border-l-4 border-l-brand px-4 py-3 flex items-center gap-3 hover:bg-brand-50 transition-colors duration-150 overflow-hidden">
        {/* 메가폰 아이콘 */}
        <Megaphone className="w-[18px] h-[18px] text-brand flex-shrink-0" />

        {/* 텍스트 영역(clip 뷰포트) — overflow-hidden + min-w-0로 flex 자식이 넘침 없이 줄어듦 */}
        <div ref={clipRef} className="relative flex-1 min-w-0 overflow-hidden">
          {/* 측정 전용 span — 화면에 안 보이고 레이아웃에도 영향 없음(absolute+invisible).
              현재 텍스트의 진짜 자연 폭을 재서 overflow 여부를 판정한다. */}
          <span
            ref={measureRef}
            aria-hidden
            className="invisible absolute left-0 top-0 whitespace-nowrap text-sm font-semibold pointer-events-none"
          >
            {displayText}
          </span>

          {/* AnimatePresence mode="wait": 퇴장(위로) 완료 후 진입(아래에서) 시작.
              initial={false}: 첫 렌더 시 진입 애니메이션 생략 */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIdx}
              initial={{ y: '100%' }} // 아래에서 시작
              animate={{ y: 0 }} // 제자리
              exit={{ y: '-100%' }} // 위로 사라짐
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {overflow ? (
                /* 무한 마키: [원본][복사본] 2벌 + w-max + infinite.
                   key={`mq-${currentIdx}`}로 공지 바뀌면 애니메이션 리셋(처음부터 흐름). */
                <div
                  key={`mq-${currentIdx}`}
                  className="flex w-max whitespace-nowrap"
                  style={{
                    animation: `marquee-banner ${loopSec}s linear infinite`,
                    willChange: 'transform',
                  }}
                >
                  {/* 원본 — pr-8(우측 여백)이 복사본과의 간격. 두 벌 동일해야 seamless */}
                  <span className="text-sm font-semibold text-ink-800 pr-8">
                    {displayText}
                  </span>
                  {/* 복사본 — 동일 텍스트·동일 여백 (seamless 루프용) */}
                  <span className="text-sm font-semibold text-ink-800 pr-8" aria-hidden>
                    {displayText}
                  </span>
                </div>
              ) : (
                /* 안 넘침: 정적 표시, 혹시 모를 미세 넘침은 말줄임 */
                <span className="text-sm font-semibold text-ink-800 block truncate">
                  {displayText}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 공지 번호 인디케이터 (2개 이상일 때만) */}
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
