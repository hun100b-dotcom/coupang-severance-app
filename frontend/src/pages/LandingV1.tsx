// LandingV1 — 밝은 파스텔 테마 (전면 업그레이드 v2)
// 색상: Primary #2563eb (깊은 파랑), Accent #7c3aed (보라), BG #f0f7ff→#f5f0ff

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// ── 스크롤 reveal 애니메이션 공통 variants ──────────────────────────────────
const revealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut', delay },
  }),
}

// ── 섹션별 motion.div 래퍼 (whileInView 기반 스크롤 reveal) ─────────────────
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger 컨테이너 & 아이템 variants ────────────────────────────────────
// stagger container variants — 자식 요소들을 순차적으로 나타냄
const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

// stagger item variants — 기본 (위로 슬라이드 + fade)
const staggerItemUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

// stagger item — 왼쪽에서 슬라이드
const staggerItemLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

// stagger item — 스케일 애니메이션
const staggerItemScale = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

// ── 섹션 간 유도 컴포넌트 (SectionBridge) ────────────────────────────────────
function SectionBridge({
  text,
  subText,
  targetId,
  isDark = false,
  scrollTo: scrollToFn,
}: {
  text: string
  subText: string
  targetId: string
  isDark?: boolean
  scrollTo?: (id: string) => void
}) {
  const handleClick = () => {
    if (scrollToFn) {
      scrollToFn(targetId)
    } else {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // 다크 배경에서는 흰색, 밝은 배경에서는 강한 파랑으로 화살표 강조
  const arrowColor = isDark ? '#ffffff' : '#2563eb'
  // 텍스트 pill 배경: 배경색에 무관하게 가독성 확보
  // isDark=true(어두운 배경)이면 반투명 흰색 pill, 밝은 배경이면 반투명 파랑 pill
  const pillBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)'
  const pillBorder = isDark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(37,99,235,0.15)'
  const textColor = isDark ? '#ffffff' : '#1e3a5f'
  const subTextColor = isDark ? 'rgba(255,255,255,0.75)' : '#475569'

  return (
    <motion.div
      className="flex flex-col items-center py-12 mt-16 cursor-pointer group"
      onClick={handleClick}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* 서브텍스트 — pill 배경으로 어떤 섹션 배경에서도 읽힘 */}
      <span
        className="text-[12px] font-semibold mb-1 px-3 py-1 rounded-full"
        style={{ color: subTextColor, background: pillBg, border: pillBorder, backdropFilter: 'blur(8px)' }}
      >
        {subText}
      </span>
      {/* 메인 텍스트 — pill 배경 적용 */}
      <span
        className="text-[15px] font-bold mb-3 mt-1 px-4 py-1.5 rounded-full group-hover:opacity-80 transition-opacity"
        style={{ color: textColor, background: pillBg, border: pillBorder, backdropFilter: 'blur(8px)' }}
      >
        {text}
      </span>
      {/* 화살표 — 크기 키우고 색상 강화 */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        style={{ color: arrowColor, fontSize: 28, filter: isDark ? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'drop-shadow(0 0 4px rgba(37,99,235,0.4))' }}
      >
        ↓
      </motion.div>
    </motion.div>
  )
}

export default function LandingV1() {
  const navigate = useNavigate()

  // ── 스크롤 감지 — NAV 배경 전환 ─────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── 모바일 감지 — HOW 섹션 세로/가로 타임라인 전환 ──────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── 커스텀 마우스 커서 & 글로우 오브 ────────────────────────────────────────
  const orbRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  // RAF 핸들러 — 마우스 이동 렉 방지
  const rafRef = useRef<number | null>(null)

  const handleMouseMoveCursor = useCallback((e: MouseEvent) => {
    // 이전 RAF 취소 후 다음 프레임에 위치 업데이트 (렉 방지)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (orbRef.current) {
        orbRef.current.style.left = `${e.clientX}px`
        orbRef.current.style.top = `${e.clientY}px`
      }
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`
        cursorRef.current.style.top = `${e.clientY}px`
      }
    })
  }, [])

  useEffect(() => {
    // 링크·버튼 호버 시 커서 확대
    const handleEnter = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%, -50%) scale(2.5)'
        cursorRef.current.style.background = 'rgba(37,99,235,0.4)'
      }
    }
    const handleLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%, -50%) scale(1)'
        cursorRef.current.style.background = '#2563eb'
      }
    }

    document.addEventListener('mousemove', handleMouseMoveCursor)

    const interactiveEls = document.querySelectorAll('a, button')
    interactiveEls.forEach((el) => {
      el.addEventListener('mouseenter', handleEnter)
      el.addEventListener('mouseleave', handleLeave)
    })

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveCursor)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      interactiveEls.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter)
        el.removeEventListener('mouseleave', handleLeave)
      })
    }
  }, [handleMouseMoveCursor])

  // ── 로그인 페이지로 이동 ─────────────────────────────────────────────────
  const goLogin = () => navigate('/login')

  // ── Smooth scroll 헬퍼 함수 ───────────────────────────────────────────────
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    // 전체 래퍼 — 밝은 파스텔 배경, 커스텀 커서, 가로 스크롤 방지
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        color: '#0f172a',
        cursor: 'none',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* ── 마우스 글로우 오브 ── */}
      <div
        ref={orbRef}
        className="fixed pointer-events-none z-0 rounded-full"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'none', // RAF로 직접 제어하므로 CSS transition 불필요
        }}
      />
      {/* ── 커스텀 커서 도트 ── */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9999] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: '#2563eb',
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.15s ease', // 위치는 RAF 직접 제어, transform만 transition 유지
        }}
      />

      {/* ── NAV — 스크롤 전: 투명, 스크롤 후: 흰 블러 배경 ──────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-6 py-[18px]"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(37,99,235,0.08)' : '1px solid transparent',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.08)' : 'none',
          transition: 'background 0.3s, box-shadow 0.3s, backdrop-filter 0.3s, border-color 0.3s',
        }}
      >
        <span className="text-[22px] font-black tracking-tight" style={{ color: '#2563eb' }}>
          CATCH
        </span>
        <button
          onClick={goLogin}
          className="px-[22px] py-[10px] rounded-[12px] text-sm font-bold text-white transition-all hover:scale-[1.04] hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
          }}
        >
          지금 시작하기 →
        </button>
      </nav>

      {/* ① HERO — 업그레이드: 헤드라인 강약 분리 + 신뢰 배지 + 통계 카드 ──────── */}
      <section
        id="hero"
        className="relative flex items-center overflow-hidden"
        style={{
          minHeight: '100vh',
          padding: '120px 0 80px',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        {/* 좌측 상단 블롭 */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-120px',
            left: '-120px',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          }}
        />
        {/* 우측 하단 블롭 */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-100px',
            right: '-100px',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
          }}
        />

        {/* 배경 그리드 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />

        {/* 콘텐츠 */}
        <div className="relative w-full max-w-[1100px] mx-auto px-6" style={{ zIndex: 1 }}>
          <Reveal>
            <p
              className="text-sm font-bold tracking-[2px] uppercase mb-6"
              style={{ color: '#2563eb', letterSpacing: '3px' }}
            >
              For 긱워커 · 일용직 · 단기알바
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {/* 헤드라인 — 첫 줄 약(소), 둘째 줄 강(대) */}
            <h1 className="leading-[1.12] tracking-tight mb-4">
              <span
                className="block"
                style={{
                  fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                당신이 받아야 할 돈,
              </span>
              <span
                className="block"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                아직 거기 있습니다.
              </span>
            </h1>
            {/* 서브타이틀 */}
            <p
              className="font-bold mb-6"
              style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: '#2563eb' }}
            >
              CATCH와 함께 찾아보세요
            </p>
          </Reveal>

          {/* 신뢰 배지 3개 */}
          <Reveal delay={0.15}>
            <div className="flex gap-3 flex-wrap mb-8">
              {['✓ 완전 무료', '✓ 1분 계산', '✓ 보안 안전'].map((badge) => (
                <span
                  key={badge}
                  style={{
                    background: 'rgba(37,99,235,0.08)',
                    borderRadius: '999px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    color: '#2563eb',
                    fontWeight: 600,
                    border: '1px solid rgba(37,99,235,0.15)',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            {/* 설명 텍스트 */}
            <p
              className="leading-[1.7] mb-10 max-w-[540px]"
              style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#475569' }}
            >
              퇴직금·실업급여·주휴수당·연차수당—
              <br />
              몰라서 못 받는 돈, CATCH가 정확히 계산해드립니다.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 flex-wrap items-center">
              {/* 메인 CTA 1 — pain 섹션으로 스크롤, 파랑-보라 그래디언트 */}
              <button
                onClick={() => scrollTo('pain')}
                className="inline-flex items-center gap-2 font-bold text-white rounded-[16px] transition-all hover:-translate-y-1"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  boxShadow: '0 8px 32px rgba(37,99,235,0.30)',
                }}
              >
                ✦ 내 권리 확인하기
              </button>
              {/* 메인 CTA 2 — 마지막 로그인 CTA 섹션으로 스크롤 (에메랄드-청록 그래디언트로 구분) */}
              {/* 기존 "빠르게 시작하기" 플레인 텍스트 → 카드 스타일로 승격 */}
              <button
                onClick={() => scrollTo('cta')}
                className="inline-flex items-center gap-2 font-bold text-white rounded-[16px] transition-all hover:-translate-y-1"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  background: 'linear-gradient(135deg, #059669, #0891b2)',
                  boxShadow: '0 8px 32px rgba(5,150,105,0.28)',
                }}
              >
                빠르게 시작하기 →
              </button>
            </div>
          </Reveal>

          {/* HERO 하단 통계 카드 3개 */}
          <Reveal delay={0.4}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-[60px] max-w-[680px]">
              {[
                // 실제 고용노동부 2023 통계 기반
                { icon: '💰', stat: '연 28만 명', desc: '임금체불 피해 근로자', source: '(고용노동부 2023)' },
                { icon: '📋', stat: '40%', desc: '체불액 중 퇴직금 비중', source: '(고용노동부 2023)' },
                { icon: '⏱', stat: '1분', desc: '내 권리 확인까지', source: '' },
              ].map((card) => (
                <div
                  key={card.stat}
                  className="rounded-[16px] text-center"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(37,99,235,0.12)',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.10)',
                    padding: '20px 16px',
                  }}
                >
                  <div className="text-2xl mb-1">{card.icon}</div>
                  <div className="text-[22px] font-black" style={{ color: '#0f172a', letterSpacing: '-0.5px' }}>
                    {card.stat}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: '#64748b' }}>{card.desc}</div>
                  {/* 출처 표기 (공식 통계에만 표시) */}
                  {card.source && (
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: 2 }}>{card.source}</div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          {/* SectionBridge: HERO → PAIN */}
          <SectionBridge
            text="지금 당신의 상황을 확인하세요"
            subText="알고 계셨나요?"
            targetId="pain"
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ② PAIN — 업그레이드: 빨간 경고 배지 + 숫자 강조 + 레드 왼쪽 라인 ───── */}
      <section
        id="pain"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        <div className="relative z-[1] max-w-[1100px] mx-auto px-6">
          <Reveal>
            {/* 빨간 경고 배지 */}
            <span
              className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-bold mb-5"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
              }}
            >
              ⚠️ 지금 이 순간에도
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              className="font-extrabold leading-[1.25] mb-4"
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#0f172a' }}
            >
              정보의 소외,
              <br />
              <span style={{ color: '#2563eb' }}>당신만의 문제가 아닙니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[17px] leading-[1.7] max-w-[600px] mb-8" style={{ color: '#475569' }}>
              대한민국 일용직·단기근로자의 80%는 자신이 받을 수 있는 급여를 정확히 모릅니다.
              복잡한 법 조항과 어려운 계산식 때문에 매년 수천억 원의 권리가 증발하고 있습니다.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote
              className="relative mb-12 rounded-[16px] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #ede9fe 100%)',
                borderLeft: '5px solid #2563eb',
                boxShadow: '0 4px 24px rgba(37,99,235,0.12)',
                padding: '32px 36px 32px 40px',
              }}
            >
              {/* 큰 따옴표 장식 — 배경에 크게 깔리는 인용부호 */}
              <span
                className="absolute select-none pointer-events-none font-black"
                style={{
                  top: -8,
                  left: 16,
                  fontSize: 80,
                  color: 'rgba(37,99,235,0.12)',
                  lineHeight: 1,
                  fontFamily: 'Georgia, serif',
                }}
              >
                &ldquo;
              </span>
              {/* 인용 본문 — 200만 원 강조 */}
              <p
                className="relative z-[1] text-[18px] leading-[1.8] font-medium"
                style={{ color: '#1e293b' }}
              >
                1년 이상 쿠팡 물류센터에서 일했는데 퇴직금이 있는지도 몰랐어요.
                <br />
                CATCH로 계산해보니{' '}
                <span className="font-black text-[22px]" style={{ color: '#2563eb' }}>
                  200만 원
                </span>
                이 나왔습니다.
              </p>
              {/* 출처 표기 */}
              <p className="mt-3 text-[13px] font-semibold" style={{ color: '#64748b' }}>
                — 쿠팡 물류센터 근무 경험자
              </p>
            </blockquote>
          </Reveal>

          {/* 통계 카드 — 레드 왼쪽 라인 + 숫자 강조 + Stagger 애니메이션 */}
          <motion.div
            className="flex flex-col gap-4 max-w-[560px]"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {/* 카드 1: 실제 고용노동부 2023 수치 */}
            <motion.div variants={staggerItemLeft}>
              <div
                className="flex items-center gap-6 rounded-[20px] transition-all hover:-translate-y-1"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderLeft: '4px solid #ef4444',
                  boxShadow: '0 4px 24px rgba(239,68,68,0.06)',
                  padding: '28px 32px',
                }}
              >
                <div
                  className="font-black tracking-tight whitespace-nowrap"
                  style={{ fontSize: 20, color: '#ef4444', letterSpacing: '-1px', minWidth: 70 }}
                >
                  1조 7,845억
                </div>
                <div>
                  <div className="text-[15px] leading-[1.5]" style={{ color: '#475569' }}>
                    2023년 임금체불 총액
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: '#6b7280' }}>
                    이 중 40%가 퇴직급여 미지급
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 카드 2: 실업급여 관련 — 통계청 2023 */}
            <motion.div variants={staggerItemLeft}>
              <div
                className="rounded-[20px] transition-all hover:-translate-y-1"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderLeft: '4px solid #ef4444',
                  boxShadow: '0 4px 24px rgba(239,68,68,0.06)',
                  padding: '28px 32px',
                }}
              >
                {/* 카드 제목 */}
                <div className="text-[14px] font-bold mb-3" style={{ color: '#ef4444' }}>
                  ⚠️ 실업급여, 아는 사람만 받는다
                </div>
                {/* 수치 + 서브텍스트 */}
                <div className="flex items-baseline gap-3 mb-2">
                  <div
                    className="font-black tracking-tight"
                    style={{ fontSize: 26, color: '#ef4444', letterSpacing: '-1px' }}
                  >
                    525만 명+
                  </div>
                  <div className="text-[12px]" style={{ color: '#6b7280' }}>
                    임시·일용직 근로자 규모 (통계청 2023)
                  </div>
                </div>
                {/* 설명 */}
                <div className="text-[13px] leading-[1.65]" style={{ color: '#64748b' }}>
                  복잡한 수급 조건과 신청 방법을 몰라 포기하는 일용직 근로자가 많습니다.
                  CATCH가 내 자격 여부를 1분 안에 알려드립니다.
                </div>
              </div>
            </motion.div>

            {/* 카드 3: 퇴직금 소멸시효 */}
            <motion.div variants={staggerItemLeft}>
              <div
                className="rounded-[20px] transition-all hover:-translate-y-1"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderLeft: '4px solid #ef4444',
                  boxShadow: '0 4px 24px rgba(239,68,68,0.06)',
                  padding: '28px 32px',
                }}
              >
                {/* 카드 제목 */}
                <div className="text-[14px] font-bold mb-3" style={{ color: '#ef4444' }}>
                  ⚠️ 잘못 계산하면 내 돈이 줄어든다
                </div>
                {/* 수치 + 서브텍스트 */}
                <div className="flex items-baseline gap-3 mb-2">
                  <div
                    className="font-black tracking-tight"
                    style={{ fontSize: 26, color: '#ef4444', letterSpacing: '-1px' }}
                  >
                    3년
                  </div>
                  <div className="text-[12px]" style={{ color: '#6b7280' }}>
                    퇴직금 청구권 소멸시효
                  </div>
                </div>
                {/* 설명 */}
                <div className="text-[13px] leading-[1.65]" style={{ color: '#64748b' }}>
                  퇴직금은 퇴직 후 3년 이내 청구하지 않으면 소멸합니다.
                  몰라서 못 받은 퇴직금, CATCH로 지금 바로 확인하세요.
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* SectionBridge: PAIN → SOLUTION */}
          <SectionBridge
            text="CATCH가 해결합니다"
            subText="해결책이 있습니다"
            targetId="solution"
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ③ SOLUTION — 업그레이드: 좌우 분리 레이아웃 ───────────────────────── */}
      <section
        id="solution"
        className="relative z-[1]"
        style={{ padding: '100px 0', background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)' }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-[60px] items-center">
            {/* 왼쪽: 설명 텍스트 — bg-white/90 카드로 blob 차단 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-8">
              <Reveal>
                <span
                  className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
                  style={{
                    background: 'rgba(37,99,235,0.08)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    color: '#2563eb',
                  }}
                >
                  솔루션
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <h2
                  className="font-extrabold leading-[1.25] mb-5 text-gray-900"
                  style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#0f172a' }}
                >
                  CATCH가 해결합니다
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-[17px] leading-[1.7] mb-8 text-gray-700" style={{ color: '#374151' }}>
                  복잡한 노동법을 몰라도 됩니다. PDF 한 장이면 충분합니다.
                  <br />
                  4가지 수당을 하나의 앱에서 모두 계산하세요.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <button
                  onClick={goLogin}
                  className="inline-flex items-center gap-2 font-bold text-white rounded-[14px] transition-all hover:-translate-y-1"
                  style={{
                    padding: '16px 32px',
                    fontSize: 16,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    boxShadow: '0 6px 24px rgba(37,99,235,0.25)',
                  }}
                >
                  지금 무료로 시작 →
                </button>
              </Reveal>
            </div>

            {/* 오른쪽: 기능 카드 세로 스택 + Stagger 애니메이션 */}
            <motion.div
              className="flex flex-col"
              style={{ gap: 12 }}
              variants={staggerContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
            >
              {[
                {
                  icon: '📄',
                  title: '정밀 PDF 계산',
                  desc: '근무 내역 PDF 업로드 → 28일 블록 알고리즘 자동 분석',
                  badge: '퇴직금 · 실업급여',
                },
                {
                  icon: '🧮',
                  title: '간편 수동 계산',
                  desc: '시급·근무일수 입력만으로 즉시 계산. PDF 없어도 OK',
                  badge: '주휴수당 · 연차수당',
                },
                {
                  icon: '💼',
                  title: '단기알바 채용피드',
                  desc: '쿠팡·컬리·CJ 실제 공고, 오늘긴급/내일긴급/상시 분류',
                  badge: '채용정보 · 즐겨찾기',
                },
                {
                  icon: '📊',
                  title: '계산 이력 저장',
                  desc: '이전 결과를 PDF로 저장·재사용. 매번 다시 계산 불필요',
                  badge: '히스토리 · 재사용',
                },
              ].map((card) => (
                <motion.div key={card.title} variants={staggerItemUp}>
                  <div
                    className="relative overflow-hidden rounded-[16px] flex items-start gap-4 transition-all group hover:-translate-y-[2px]"
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(37,99,235,0.12)',
                      boxShadow: '0 4px 20px rgba(37,99,235,0.07)',
                      padding: '20px 24px',
                    }}
                  >
                    {/* 상단 hover 라인 */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)' }}
                    />
                    {/* 아이콘 */}
                    <div
                      className="flex items-center justify-center rounded-[10px] text-xl flex-shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,58,237,0.08))',
                      }}
                    >
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-white text-[11px] font-bold"
                          style={{ color: '#2563eb', fontSize: 13, fontWeight: 700 }}
                        >
                          ✓
                        </span>
                        <h3 className="text-[15px] font-bold" style={{ color: '#0f172a' }}>{card.title}</h3>
                        <span
                          className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold"
                          style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                        >
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: '#64748b' }}>
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* SectionBridge: SOLUTION → HOW */}
          <SectionBridge
            text="3단계로 시작하세요"
            subText="사용 방법"
            targetId="how"
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ④ HOW — 업그레이드: 가로 타임라인 (번호 원 → 화살표) ─────────────────── */}
      <section
        id="how"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        {/* bg-white/90 카드: HOW 섹션 전체 내용을 불투명 카드로 감싸 blob 차단 */}
        <div className="relative z-[1] max-w-[1100px] mx-auto px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10">
          <Reveal>
            <div className="text-center mb-[70px]">
              <span
                className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  color: '#2563eb',
                }}
              >
                사용 방법
              </span>
              <h2
                className="font-extrabold leading-[1.25]"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#0f172a' }}
              >
                3단계로 끝납니다
              </h2>
            </div>
          </Reveal>

          {/* 타임라인: 모바일=세로, 데스크탑=가로 */}
          {isMobile ? (
            /* 모바일: 세로 스택 + ↓ 화살표 */
            <div className="flex flex-col items-center gap-0 text-center">
              {[
                { num: 1, title: '로그인', desc: '카카오 또는 구글 계정으로\n5초 만에 가입·로그인' },
                { num: 2, title: 'PDF 업로드 또는 직접 입력', desc: '근무 내역 PDF 파일을 올리거나\n시급·일수를 직접 입력' },
                { num: 3, title: '결과 확인', desc: '받을 수 있는 금액과\n신청 방법을 즉시 확인' },
              ].map((step, i) => (
                <div key={step.num} className="flex flex-col items-center w-full max-w-[280px]">
                  <Reveal delay={0.1 + i * 0.15}>
                    <div className="flex flex-col items-center text-center px-4 py-6">
                      {/* 번호 원 + Scale 애니메이션 */}
                      <motion.div variants={staggerItemScale}>
                        <div
                          className="flex items-center justify-center rounded-full text-[20px] font-black text-white mb-4"
                          style={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            boxShadow: '0 0 0 8px rgba(37,99,235,0.10)',
                          }}
                        >
                          {step.num}
                        </div>
                      </motion.div>
                      <h3 className="text-[17px] font-bold mb-2" style={{ color: '#0f172a' }}>{step.title}</h3>
                      <p className="text-[14px] leading-[1.65] whitespace-pre-line" style={{ color: '#475569' }}>
                        {step.desc}
                      </p>
                    </div>
                  </Reveal>
                  {/* 세로 연결 화살표 — 마지막 단계 이후엔 숨김 */}
                  {/* color #6b7280: 밝은 배경에서도 읽히는 gray-500 */}
                  {i < 2 && (
                    <div style={{ color: '#6b7280', fontSize: 24, lineHeight: 1, marginBottom: 4 }}>↓</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 데스크탑: 기존 가로 타임라인 유지 */
            <div className="flex flex-row items-start justify-center gap-0">
              {[
                { num: 1, title: '로그인', desc: '카카오 또는 구글 계정으로\n5초 만에 가입·로그인' },
                { num: 2, title: 'PDF 업로드 또는 직접 입력', desc: '근무 내역 PDF 파일을 올리거나\n시급·일수를 직접 입력' },
                { num: 3, title: '결과 확인', desc: '받을 수 있는 금액과\n신청 방법을 즉시 확인' },
              ].map((step, i) => (
                <div key={step.num} className="flex flex-row items-start flex-1">
                  {/* 각 단계 */}
                  <Reveal delay={0.1 + i * 0.15} className="flex-1">
                    <div className="text-center px-4 py-6">
                      {/* 번호 원 + Scale 애니메이션 */}
                      <motion.div variants={staggerItemScale}>
                        <div
                          className="flex items-center justify-center rounded-full text-[20px] font-black text-white mx-auto mb-5"
                          style={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            boxShadow: '0 0 0 8px rgba(37,99,235,0.10)',
                          }}
                        >
                          {step.num}
                        </div>
                      </motion.div>
                      <h3 className="text-[17px] font-bold mb-2" style={{ color: '#0f172a' }}>{step.title}</h3>
                      <p className="text-[14px] leading-[1.65] whitespace-pre-line" style={{ color: '#475569' }}>
                        {step.desc}
                      </p>
                    </div>
                  </Reveal>

                  {/* 화살표 — 마지막 단계 이후엔 숨김 */}
                  {/* color #6b7280: 밝은 배경에서도 읽히는 gray-500 */}
                  {i < 2 && (
                    <div
                      className="flex items-start pt-[38px] px-1 flex-shrink-0"
                      style={{ color: '#6b7280', fontSize: 28, fontWeight: 300 }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          </div>{/* /bg-white/90 카드 닫기 */}

          {/* SectionBridge: HOW → WHY */}
          <SectionBridge
            text="왜 CATCH를 선택할까요?"
            subText="더 알아보기"
            targetId="why"
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ⑤ WHY CATCH — 업그레이드: 소셜 프루프 + 강화 shadow ──────────────────── */}
      <section
        id="why"
        className="relative z-[1]"
        style={{ padding: '100px 0', background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)' }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          {/* 소셜 프루프 배너 */}
          <Reveal>
            <div className="text-center mb-[60px]">
              <span
                className="inline-block px-[16px] py-[8px] rounded-full text-[14px] font-bold mb-5"
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  color: '#2563eb',
                }}
              >
                왜 CATCH인가
              </span>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-[80px] items-center">
            <div>
              <Reveal delay={0.1}>
                {/* 타이틀 */}
                <h2
                  className="font-extrabold leading-[1.25] mb-10"
                  style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#0f172a' }}
                >
                  일용직 근로의 동반자,
                  <br />
                  <span style={{ color: '#2563eb' }}>CATCH</span>
                </h2>
              </Reveal>

              <ul className="flex flex-col gap-5">
                {[
                  { title: '법정 알고리즘 적용', desc: '고용노동부 기준 28일 블록 역산 방식으로 정확히 계산합니다.', delay: 0.1 },
                  { title: '완전 무료, 회원가입 불필요', desc: '숨겨진 비용 없음. 소셜 로그인만으로 바로 사용 가능.', delay: 0.2 },
                  { title: '실제 채용정보 연동', desc: '계산 후 바로 채용공고까지—한 앱에서 모두 해결.', delay: 0.3 },
                  { title: '계산 이력 저장', desc: '매번 다시 계산할 필요 없이 이전 결과를 불러올 수 있습니다.', delay: 0.4 },
                ].map((item) => (
                  <Reveal key={item.title} delay={item.delay}>
                    <li className="flex gap-4 items-start">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[14px] flex-shrink-0 mt-0.5 text-white"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                      >
                        ✓
                      </div>
                      <div>
                        <strong className="block text-[16px] font-bold mb-1" style={{ color: '#0f172a' }}>{item.title}</strong>
                        <span className="text-[14px] leading-[1.6]" style={{ color: '#475569' }}>
                          {item.desc}
                        </span>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            {/* 오른쪽 통계 카드 — shadow 강화 */}
            <Reveal delay={0.2}>
              <div
                className="rounded-[20px] text-center"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(37,99,235,0.12)',
                  boxShadow: '0 8px 32px rgba(37,99,235,0.1)',
                  padding: '48px 40px',
                }}
              >
                {/* 대형 숫자 강조 */}
                <div
                  className="font-black leading-none mb-3"
                  style={{ fontSize: 80, color: '#2563eb', letterSpacing: '-3px' }}
                >
                  365+
                </div>
                <p className="text-[18px] mb-10" style={{ color: '#475569' }}>
                  근무일 이상이면 퇴직금 수령 가능
                </p>
                <div className="mx-auto mb-9 rounded-full" style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #2563eb, #7c3aed)' }} />
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { num: '4개', label: '계산 서비스' },
                    { num: '무료', label: '모든 기능' },
                    { num: 'PDF', label: '정밀 분석' },
                    { num: '즉시', label: '결과 확인' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[14px] text-left"
                      style={{
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(124,58,237,0.04))',
                        border: '1px solid rgba(37,99,235,0.10)',
                        padding: '20px',
                      }}
                    >
                      <div className="text-[28px] font-black mb-1" style={{ color: '#0f172a' }}>{stat.num}</div>
                      <div className="text-[12px]" style={{ color: '#64748b' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* SectionBridge: WHY → SCHEDULE */}
          <SectionBridge
            text="스케줄 관리까지 한번에"
            subText="NEW 기능"
            targetId="schedule"
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ⑥ SCHEDULE — 스케줄 관리 & 채용정보 (WHY CATCH와 STATS 사이) ──────── */}
      <section
        id="schedule"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        {/* 배경 그리드 — HERO와 동일 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />

        <div className="relative z-[1] max-w-[1100px] mx-auto px-6">
          {/* 상단 뱃지 */}
          <Reveal>
            <div className="text-center mb-3">
              <span
                className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-bold"
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.20)',
                  color: '#2563eb',
                }}
              >
                📅 NEW
              </span>
            </div>
          </Reveal>

          {/* 섹션 제목 */}
          <Reveal delay={0.05}>
            <div className="text-center mb-4">
              <p
                className="text-[12px] font-bold tracking-[2px] uppercase mb-3"
                style={{ color: '#2563eb', letterSpacing: '3px' }}
              >
                스케줄 관리 서비스
              </p>
              <h2 className="font-extrabold leading-[1.2]" style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: '#0f172a' }}>
                근무 일정 관리하고
                <br />
                <span style={{ color: '#2563eb' }}>채용정보</span>까지 한번에
              </h2>
            </div>
          </Reveal>

          {/* 서브타이틀 */}
          <Reveal delay={0.1}>
            <p className="text-center text-[17px] leading-[1.7] mb-[60px]" style={{ color: '#475569' }}>
              출근 스케줄 확정, 근무지원, 긴급·추가모집 알림까지 CATCH 하나로
            </p>
          </Reveal>

          {/* 4개 기능 카드 — 모바일 1열, 데스크탑 2x2 그리드 + Stagger 애니메이션 */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {[
              {
                iconBg: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                emoji: '📋',
                title: '근무 스케줄 확정',
                desc: '예정된 근무 일정을 한눈에 확인하고 출근 여부를 빠르게 확정하세요',
              },
              {
                iconBg: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                emoji: '✅',
                title: '근무지원 관리',
                desc: '새로운 근무지 지원 현황과 결과를 실시간으로 확인하세요',
              },
              {
                iconBg: 'linear-gradient(135deg, #059669, #10b981)',
                emoji: '🔔',
                title: '채용 알림',
                desc: '쿠팡·컬리 등 주요 물류센터 채용공고를 한눈에 확인하고 바로 지원하세요',
              },
              {
                iconBg: 'linear-gradient(135deg, #ef4444, #f97316)',
                emoji: '🔥',
                title: '긴급·추가 모집 알림',
                desc: '오늘 긴급모집, 추가모집, 내일 긴급모집 등 실시간 채용 정보를 놓치지 마세요',
              },
            ].map((card) => (
              <motion.div key={card.title} variants={staggerItemScale}>
                <div
                  className="rounded-[20px] text-center transition-all hover:-translate-y-1"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(37,99,235,0.12)',
                    boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
                    padding: '36px 28px',
                  }}
                >
                  {/* 아이콘 원형 배경 */}
                  <div
                    className="flex items-center justify-center rounded-full text-3xl mx-auto mb-5"
                    style={{
                      width: 64,
                      height: 64,
                      background: card.iconBg,
                    }}
                  >
                    {card.emoji}
                  </div>
                  <h3 className="text-[17px] font-bold mb-3" style={{ color: '#0f172a' }}>
                    {card.title}
                  </h3>
                  <p className="text-[14px] leading-[1.65]" style={{ color: '#64748b' }}>
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 하단 안내 배너 */}
          <Reveal delay={0.35}>
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[16px]"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                padding: '24px 32px',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <p className="text-[15px] font-medium text-white leading-[1.6]">
                  지금 가입하면 스케줄 관리 + 퇴직금·실업급여 계산까지 무료로 이용하세요
                </p>
              </div>
              <button
                onClick={goLogin}
                className="flex-shrink-0 px-5 py-2.5 rounded-[10px] text-[14px] font-bold transition-all hover:scale-[1.04]"
                style={{
                  background: '#ffffff',
                  color: '#2563eb',
                  whiteSpace: 'nowrap',
                }}
              >
                무료 시작하기
              </button>
            </div>
          </Reveal>

          {/* SectionBridge: SCHEDULE → STATS (다크 배경용) */}
          <SectionBridge
            text="숫자로 보는 CATCH"
            subText="실적 데이터"
            targetId="stats"
            isDark={false}
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ⑦ STATS — 업그레이드: progress bar + 더 큰 숫자 ─────────────────────── */}
      <section
        id="stats"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative z-[1] max-w-[1100px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-10"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            {[
              // 실제 고용노동부 2023 통계로 교체 (허수 '800만+' 제거)
              { num: '28만 3천', label: '임금체불 피해자\n(고용노동부 2023)', barWidth: '82%' },
              { num: '4가지', label: '수당 계산기\n(퇴직·실업·주휴·연차)', barWidth: '100%' },
              { num: '28일', label: '블록 알고리즘\n(법정 기준 정밀계산)', barWidth: '75%' },
              { num: '100%', label: '무료 서비스\n(광고·유료 없음)', barWidth: '100%' },
            ].map((item) => (
              <motion.div key={item.num} variants={staggerItemUp}>
                <div className="text-center">
                  <div
                    className="font-black text-white mb-2"
                    style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)', letterSpacing: '-1px', whiteSpace: 'nowrap' }}
                  >
                    {item.num}
                  </div>
                  <div className="text-[14px] leading-[1.5] whitespace-pre-line mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {item.label}
                  </div>
                  {/* progress bar */}
                  <div
                    style={{
                      height: 4,
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: 'white',
                        borderRadius: 2,
                        width: item.barWidth,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* SectionBridge: STATS → CTA (다크 배경용) */}
          <SectionBridge
            text="무료로 지금 시작하세요"
            subText="준비 되셨나요?"
            targetId="cta"
            isDark={true}
            scrollTo={scrollTo}
          />
        </div>
      </section>

      {/* ⑦ CTA — 업그레이드: 헤드라인 + 서브 + 버튼 + 안심 문구 ─────────────── */}
      <section
        id="cta"
        className="relative z-[1] text-center overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        {/* bg-white/90 카드: CTA 섹션 텍스트 영역을 불투명 카드로 감싸 blob 차단 */}
        <div className="relative z-[1] max-w-[700px] mx-auto px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 md:p-12">
          <Reveal>
            <span
              className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-8"
              style={{
                background: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.15)',
                color: '#2563eb',
              }}
            >
              지금 시작하기
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              className="font-extrabold leading-[1.2] mb-5 text-gray-900"
              style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#111827' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#2563eb' }}>CATCH가 찾아드립니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[18px] leading-[1.7] mb-12 text-gray-700" style={{ color: '#374151' }}>
              무료로, 지금 바로. 5초 로그인 후 계산 시작.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 justify-center flex-wrap">
              {/* 카카오 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] rounded-[16px] text-[16px] font-bold transition-all hover:-translate-y-1"
                style={{ padding: '18px 36px', background: '#fee500', color: '#191919', boxShadow: '0 8px 24px rgba(254,229,0,0.30)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.56 1.522 4.817 3.828 6.213-.167.606-.625 2.193-.715 2.534-.11.42.154.414.324.302.133-.088 2.107-1.43 2.96-2.013.496.073 1.006.11 1.603.11 5.523 0 10-3.477 10-7.646C22 6.477 17.523 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>

              {/* 구글 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] rounded-[16px] text-[16px] font-bold transition-all hover:-translate-y-1"
                style={{
                  padding: '18px 36px',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid rgba(37,99,235,0.15)',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                구글로 시작하기
              </button>
            </div>
          </Reveal>

          {/* 안심 문구 */}
          <Reveal delay={0.4}>
            {/* color #6b7280: 밝은 배경에서도 읽히는 gray-500 (기존 #94a3b8 은 대비 부족) */}
            <p className="mt-7 text-[13px]" style={{ color: '#6b7280' }}>
              신용카드 불필요 · 즉시 시작 · 언제든 탈퇴 가능
            </p>
          </Reveal>
          </div>{/* /bg-white/90 카드 닫기 */}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-[1] text-center"
        style={{
          padding: '40px 0',
          borderTop: '1px solid rgba(37,99,235,0.10)',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
        }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-[20px] font-black mb-3" style={{ color: '#2563eb' }}>CATCH</div>
          <div className="text-[13px]" style={{ color: '#94a3b8' }}>© 2026 CATCH — 퇴직금 한번에. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
