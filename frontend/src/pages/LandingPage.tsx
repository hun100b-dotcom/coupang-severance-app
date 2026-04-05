// CATCH 랜딩페이지 — /landing 라우트로 접근하는 독립 풀페이지 컴포넌트
// Layout(TopNav/BottomNav) 없이 독립 렌더링. 다크 테마, 7개 섹션 구성.

import { useEffect, useRef, type ReactNode } from 'react'
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

export default function LandingPage() {
  const navigate = useNavigate()

  // ── 커스텀 마우스 커서 & 글로우 오브 ────────────────────────────────────────
  const orbRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 마우스 이동 시 커서와 글로우 오브 위치 업데이트
    const handleMouseMove = (e: MouseEvent) => {
      if (orbRef.current) {
        orbRef.current.style.left = `${e.clientX}px`
        orbRef.current.style.top = `${e.clientY}px`
      }
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`
        cursorRef.current.style.top = `${e.clientY}px`
      }
    }

    // 링크·버튼 호버 시 커서 확대
    const handleEnter = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%, -50%) scale(2.5)'
        cursorRef.current.style.background = 'rgba(49,130,246,0.5)'
      }
    }
    const handleLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%, -50%) scale(1)'
        cursorRef.current.style.background = '#3182f6'
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    // 현재 DOM에 있는 링크/버튼에 이벤트 부착
    const interactiveEls = document.querySelectorAll('a, button')
    interactiveEls.forEach((el) => {
      el.addEventListener('mouseenter', handleEnter)
      el.addEventListener('mouseleave', handleLeave)
    })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      interactiveEls.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter)
        el.removeEventListener('mouseleave', handleLeave)
      })
    }
  }, [])

  // ── 스크롤 시 NAV 배경 강화 ──────────────────────────────────────────────
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.style.background =
          window.scrollY > 80
            ? 'rgba(13,13,13,0.95)'
            : 'rgba(13,13,13,0.80)'
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── 로그인 페이지로 이동 (CTA 버튼 공통 핸들러) ─────────────────────────
  const goLogin = () => navigate('/login')

  return (
    // 랜딩페이지 전체 래퍼 — 다크 테마, 커스텀 커서, 가로 스크롤 방지
    // position: relative + zIndex: 1 로 스태킹 컨텍스트 생성 → AnimatedBackground(fixed z-0)를 덮어야 배경이 올바르게 표시됨
    <div
      className="min-h-screen overflow-x-hidden text-white"
      style={{ fontFamily: "'Noto Sans KR', sans-serif", background: '#0d0d0d', cursor: 'none', position: 'relative', zIndex: 1 }}
    >
      {/* ── 마우스 글로우 오브 ── */}
      <div
        ref={orbRef}
        className="fixed pointer-events-none z-0 rounded-full"
        style={{
          width: 500,
          height: 500,
          background:
            'radial-gradient(circle, rgba(49,130,246,0.12) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.08s ease, top 0.08s ease',
        }}
      />
      {/* ── 커스텀 커서 도트 ── */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[9999] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: '#3182f6',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.04s ease, top 0.04s ease, transform 0.15s ease',
        }}
      />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-6 py-[18px]"
        style={{
          background: 'rgba(13,13,13,0.80)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: 'background 0.3s',
        }}
      >
        {/* 로고 */}
        <span className="text-[22px] font-black tracking-tight" style={{ color: '#3182f6' }}>
          CATCH
        </span>
        {/* CTA 버튼 */}
        <button
          onClick={goLogin}
          className="px-[22px] py-[10px] rounded-[12px] text-sm font-bold text-white transition-all hover:scale-[1.04]"
          style={{ background: '#3182f6' }}
        >
          지금 시작하기 →
        </button>
      </nav>

      {/* ① HERO ─────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex items-center overflow-hidden"
        style={{ minHeight: '100vh', padding: '120px 0 80px' }}
      >
        {/* 배경 그리드 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(49,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(49,130,246,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />

        <div className="relative z-[1] w-full max-w-[1100px] mx-auto px-6">
          <Reveal>
            <p
              className="text-sm font-bold tracking-[2px] uppercase mb-6"
              style={{ color: '#3182f6' }}
            >
              For 긱워커 · 일용직 · 단기알바
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {/* 메인 대제목 — 임팩트 강조 */}
            <h1
              className="font-black leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: 'rgb(15, 15, 15)' }}
            >
              당신이 받아야 할 돈,
              <br />
              아직 거기 있습니다.
            </h1>
            {/* 서브 카피 — 파란색 강조 */}
            <p
              className="font-bold mb-8"
              style={{ fontSize: 'clamp(18px, 3vw, 28px)', color: '#3182f6' }}
            >
              CATCH와 함께 찾아보세요
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <p
              className="leading-[1.7] mb-12 max-w-[540px]"
              style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#aaa' }}
            >
              퇴직금·실업급여·주휴수당·연차수당—
              <br />
              몰라서 못 받는 돈, CATCH가 정확히 계산해드립니다.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 flex-wrap">
              {/* 기본 CTA 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-2 font-bold text-white rounded-[16px] transition-all hover:-translate-y-0.5"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  background: '#3182f6',
                  boxShadow: '0 8px 32px rgba(49,130,246,0.35)',
                }}
              >
                ✦ 무료로 계산하기
              </button>
              {/* 보조 버튼 (섹션 스크롤) */}
              <a
                href="#solution"
                className="inline-flex items-center gap-2 font-semibold rounded-[16px] transition-all hover:-translate-y-0.5 hover:border-[#3182f6]"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  color: '#aaa',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  textDecoration: 'none',
                }}
              >
                기능 살펴보기 ↓
              </a>
            </div>
          </Reveal>

          {/* 뱃지 목록 */}
          <Reveal delay={0.4}>
            <div className="flex gap-5 flex-wrap mt-[60px]">
              {['퇴직금 계산기', '실업급여 계산기', '단기알바 채용정보', '100% 무료'].map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm" style={{ color: '#888' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3182f6' }} />
                  {label}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ② PAIN ─────────────────────────────────────────────────────────── */}
      <section id="pain" className="relative z-[1]" style={{ padding: '120px 0', background: '#161616' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <span
              className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
              style={{
                background: 'rgba(49,130,246,0.15)',
                border: '1px solid rgba(49,130,246,0.3)',
                color: '#5fa0f8',
              }}
            >
              문제 인식
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              className="font-black leading-[1.25] mb-4"
              style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}
            >
              정보의 소외,
              <br />
              <span style={{ color: '#3182f6' }}>당신만의 문제가 아닙니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[17px] leading-[1.7] max-w-[600px] mb-8" style={{ color: '#aaa' }}>
              대한민국 일용직·단기근로자의 80%는 자신이 받을 수 있는 급여를 정확히 모릅니다.
              복잡한 법 조항과 어려운 계산식 때문에 매년 수천억 원의 권리가 증발하고 있습니다.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote
              className="text-[16px] leading-[1.7] italic mb-12 rounded-r-[12px]"
              style={{
                color: '#aaa',
                background: 'rgba(49,130,246,0.15)',
                borderLeft: '3px solid #3182f6',
                padding: '24px 28px',
              }}
            >
              "1년 이상 쿠팡 물류센터에서 일했는데 퇴직금이 있는지도 몰랐어요.
              CATCH로 계산해보니 200만 원이 나왔습니다."
            </blockquote>
          </Reveal>

          {/* 통계 카드 3개 */}
          <div className="flex flex-col gap-4 max-w-[480px]">
            {[
              { num: '800만', label: '국내 일용직·긱워커 추정 인원' },
              { num: '68%', label: '퇴직금 수급 자격을 모르는 비율' },
              { num: '3,200억', label: '연간 미수령 노동 급여 추정액' },
            ].map((item, i) => (
              <Reveal key={item.num} delay={0.1 + i * 0.1}>
                <div
                  className="flex items-center gap-6 rounded-[20px] transition-all hover:translate-x-2"
                  style={{
                    background: '#1e1e1e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '28px 32px',
                  }}
                >
                  <div
                    className="font-black tracking-tight whitespace-nowrap"
                    style={{ fontSize: 42, color: '#3182f6', letterSpacing: '-1px' }}
                  >
                    {item.num}
                  </div>
                  <div className="text-[15px] leading-[1.5]" style={{ color: '#aaa' }}>
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ③ SOLUTION ──────────────────────────────────────────────────────── */}
      <section id="solution" className="relative z-[1]" style={{ padding: '120px 0' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          {/* 섹션 헤더 */}
          <Reveal>
            <div className="text-center max-w-[600px] mx-auto mb-[70px]">
              <span
                className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
                style={{
                  background: 'rgba(49,130,246,0.15)',
                  border: '1px solid rgba(49,130,246,0.3)',
                  color: '#5fa0f8',
                }}
              >
                솔루션
              </span>
              <h2
                className="font-black leading-[1.25] mb-4"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}
              >
                CATCH가 해결합니다
              </h2>
              <p className="text-[17px] leading-[1.7]" style={{ color: '#aaa' }}>
                복잡한 노동법을 몰라도 됩니다. PDF 한 장이면 충분합니다.
              </p>
            </div>
          </Reveal>

          {/* 솔루션 카드 3개 */}
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: '📄',
                title: '정밀 PDF 계산',
                desc: '근무 내역 PDF를 업로드하면 28일 블록 알고리즘으로 퇴직금·실업급여를 자동 분석합니다.',
                badge: '퇴직금 · 실업급여',
              },
              {
                icon: '🧮',
                title: '간편 수동 계산',
                desc: '시급, 근무일수만 입력하면 주휴수당·연차수당을 즉시 계산합니다. PDF 없이도 OK.',
                badge: '주휴수당 · 연차수당',
              },
              {
                icon: '💼',
                title: '단기알바 채용피드',
                desc: '쿠팡, 컬리, CJ 등 실제 일용직 채용공고를 오늘긴급·내일긴급·상시 섹션으로 확인합니다.',
                badge: '채용정보 · 즐겨찾기',
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={0.1 + i * 0.1}>
                <div
                  className="relative overflow-hidden rounded-[20px] transition-all group hover:-translate-y-2"
                  style={{
                    background: '#161616',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '36px 32px',
                  }}
                >
                  {/* 호버 시 상단 그라데이션 바 */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg, #3182f6, #7c3aed)' }}
                  />
                  {/* 아이콘 */}
                  <div
                    className="flex items-center justify-center rounded-[14px] text-2xl mb-6"
                    style={{
                      width: 52,
                      height: 52,
                      background: 'rgba(49,130,246,0.15)',
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-[20px] font-bold mb-3">{card.title}</h3>
                  <p className="text-[15px] leading-[1.65]" style={{ color: '#aaa' }}>
                    {card.desc}
                  </p>
                  {/* 뱃지 */}
                  <span
                    className="inline-block mt-5 px-3 py-1 rounded-[8px] text-xs font-semibold"
                    style={{ background: 'rgba(49,130,246,0.15)', color: '#5fa0f8' }}
                  >
                    {card.badge}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ④ HOW ──────────────────────────────────────────────────────────── */}
      <section id="how" className="relative z-[1]" style={{ padding: '120px 0', background: '#161616' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          {/* 섹션 헤더 */}
          <Reveal>
            <div className="text-center mb-[70px]">
              <span
                className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
                style={{
                  background: 'rgba(49,130,246,0.15)',
                  border: '1px solid rgba(49,130,246,0.3)',
                  color: '#5fa0f8',
                }}
              >
                사용 방법
              </span>
              <h2
                className="font-black leading-[1.25]"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}
              >
                3단계로 끝납니다
              </h2>
            </div>
          </Reveal>

          {/* 3단계 */}
          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* 단계 연결선 (md 이상에서만 표시) */}
            <div
              className="hidden md:block absolute h-[2px]"
              style={{
                top: 44,
                left: 'calc(100% / 6)',
                right: 'calc(100% / 6)',
                background: 'linear-gradient(90deg, transparent, #3182f6, transparent)',
              }}
            />
            {[
              { num: 1, title: '로그인', desc: '카카오 또는 구글 계정으로\n5초 만에 가입·로그인' },
              { num: 2, title: 'PDF 업로드 또는 직접 입력', desc: '근무 내역 PDF 파일을 올리거나\n시급·일수를 직접 입력' },
              { num: 3, title: '결과 확인', desc: '받을 수 있는 금액과\n신청 방법을 즉시 확인' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={0.1 + i * 0.1}>
                <div className="text-center px-6 py-10 relative">
                  {/* 단계 번호 원 */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-black text-white mx-auto mb-7 relative z-[1]"
                    style={{
                      background: '#3182f6',
                      boxShadow: '0 0 0 8px rgba(49,130,246,0.15)',
                    }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-[18px] font-bold mb-3">{step.title}</h3>
                  <p className="text-[14px] leading-[1.65] whitespace-pre-line" style={{ color: '#aaa' }}>
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ WHY CATCH ─────────────────────────────────────────────────────── */}
      <section id="why" className="relative z-[1]" style={{ padding: '120px 0' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-[80px] items-center">
            {/* 왼쪽 텍스트 영역 */}
            <div>
              <Reveal>
                <span
                  className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-5"
                  style={{
                    background: 'rgba(49,130,246,0.15)',
                    border: '1px solid rgba(49,130,246,0.3)',
                    color: '#5fa0f8',
                  }}
                >
                  왜 CATCH인가
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h2
                  className="font-black leading-[1.25] mb-10"
                  style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}
                >
                  우리는 일용직 근로자
                  <br />
                  편입니다
                </h2>
              </Reveal>

              {/* 체크리스트 */}
              <ul className="flex flex-col gap-5">
                {[
                  {
                    title: '법정 알고리즘 적용',
                    desc: '고용노동부 기준 28일 블록 역산 방식으로 정확히 계산합니다.',
                    delay: 0.1,
                  },
                  {
                    title: '완전 무료, 회원가입 불필요',
                    desc: '숨겨진 비용 없음. 소셜 로그인만으로 바로 사용 가능.',
                    delay: 0.2,
                  },
                  {
                    title: '실제 채용정보 연동',
                    desc: '계산 후 바로 채용공고까지—한 앱에서 모두 해결.',
                    delay: 0.3,
                  },
                  {
                    title: '계산 이력 저장',
                    desc: '매번 다시 계산할 필요 없이 이전 결과를 불러올 수 있습니다.',
                    delay: 0.4,
                  },
                ].map((item) => (
                  <Reveal key={item.title} delay={item.delay}>
                    <li className="flex gap-4 items-start">
                      {/* 체크 아이콘 */}
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[14px] flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(49,130,246,0.15)', color: '#3182f6' }}
                      >
                        ✓
                      </div>
                      <div>
                        <strong className="block text-[16px] font-bold mb-1">{item.title}</strong>
                        <span className="text-[14px] leading-[1.6]" style={{ color: '#aaa' }}>
                          {item.desc}
                        </span>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            {/* 오른쪽 시각 카드 */}
            <Reveal delay={0.2}>
              <div
                className="rounded-[20px] text-center"
                style={{
                  background: '#161616',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '48px 40px',
                }}
              >
                {/* 큰 숫자 */}
                <div
                  className="font-black leading-none mb-3"
                  style={{ fontSize: 80, color: '#3182f6', letterSpacing: '-3px' }}
                >
                  365+
                </div>
                <p className="text-[18px] mb-10" style={{ color: '#aaa' }}>
                  근무일 이상이면 퇴직금 수령 가능
                </p>
                {/* 구분선 */}
                <div
                  className="mx-auto mb-9 rounded-full"
                  style={{ width: 40, height: 3, background: '#3182f6' }}
                />
                {/* 미니 통계 4개 */}
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
                      style={{ background: '#1e1e1e', padding: '20px' }}
                    >
                      <div className="text-[28px] font-black mb-1">{stat.num}</div>
                      <div className="text-[12px]" style={{ color: '#888' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ⑥ STATS ─────────────────────────────────────────────────────────── */}
      <section
        id="stats"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #1a2f5e 0%, #0f1f3d 50%, #0d0d0d 100%)',
        }}
      >
        {/* 배경 글로우 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(49,130,246,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-[1] max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: '800만+', label: '잠재 사용자\n(국내 긱워커)', delay: 0.1 },
              { num: '4가지', label: '수당 계산기\n(퇴직·실업·주휴·연차)', delay: 0.2 },
              { num: '28일', label: '블록 알고리즘\n(법정 기준 정밀계산)', delay: 0.3 },
              { num: '100%', label: '무료 서비스\n(광고·유료 없음)', delay: 0.4 },
            ].map((item) => (
              <Reveal key={item.num} delay={item.delay}>
                <div className="text-center">
                  <div
                    className="font-black text-white mb-2"
                    style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1px' }}
                  >
                    {item.num}
                  </div>
                  <div
                    className="text-[14px] leading-[1.5] whitespace-pre-line"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑦ CTA ──────────────────────────────────────────────────────────── */}
      <section id="cta" className="relative z-[1] text-center" style={{ padding: '120px 0' }}>
        <div className="max-w-[700px] mx-auto px-6">
          <Reveal>
            <span
              className="inline-block px-[14px] py-[6px] rounded-full text-[13px] font-medium mb-8"
              style={{
                background: 'rgba(49,130,246,0.15)',
                border: '1px solid rgba(49,130,246,0.3)',
                color: '#5fa0f8',
              }}
            >
              지금 시작하기
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              className="font-black leading-[1.2] mb-5"
              style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#3182f6' }}>CATCH가 찾아드립니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[18px] leading-[1.7] mb-12" style={{ color: '#aaa' }}>
              무료로, 지금 바로. 5초 로그인 후 계산 시작.
            </p>
          </Reveal>

          {/* 카카오 / 구글 로그인 버튼 — /login 페이지로 이동 */}
          <Reveal delay={0.3}>
            <div className="flex gap-4 justify-center flex-wrap">
              {/* 카카오 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] rounded-[16px] text-[16px] font-bold transition-all hover:-translate-y-0.5"
                style={{
                  padding: '18px 36px',
                  background: '#fee500',
                  color: '#191919',
                  boxShadow: '0 8px 24px rgba(254,229,0,0.25)',
                }}
              >
                {/* 카카오 아이콘 */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.56 1.522 4.817 3.828 6.213-.167.606-.625 2.193-.715 2.534-.11.42.154.414.324.302.133-.088 2.107-1.43 2.96-2.013.496.073 1.006.11 1.603.11 5.523 0 10-3.477 10-7.646C22 6.477 17.523 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>

              {/* 구글 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] rounded-[16px] text-[16px] font-bold transition-all hover:-translate-y-0.5"
                style={{
                  padding: '18px 36px',
                  background: '#fff',
                  color: '#333',
                  boxShadow: '0 8px 24px rgba(255,255,255,0.1)',
                }}
              >
                {/* 구글 아이콘 */}
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

          <Reveal delay={0.4}>
            <p className="mt-7 text-[13px]" style={{ color: '#888' }}>
              신용카드 불필요 · 개인정보 최소 수집 · 언제든지 탈퇴 가능
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-[1] text-center"
        style={{
          padding: '40px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-[20px] font-black mb-3" style={{ color: '#3182f6' }}>
            CATCH
          </div>
          <div className="text-[13px]" style={{ color: '#888' }}>
            © 2026 CATCH — 퇴직금 한번에. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
