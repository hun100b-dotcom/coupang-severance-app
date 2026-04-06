// LandingV5 — 순수 화이트 + 에메랄드 (깔끔/모던) (/v5 라우트)
// V1 섹션 구조 그대로, 색상·디테일만 노션/리멤버 스타일 SaaS로 변경

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

// ── 에메랄드 섹션 뱃지 (알약형) ──────────────────────────────────────────
function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5"
      style={{
        color: '#059669',
        background: 'rgba(5,150,105,0.08)',
        border: '1px solid rgba(5,150,105,0.2)',
        borderRadius: 100,
        padding: '5px 14px',
      }}
    >
      {children}
    </span>
  )
}

export default function LandingV5() {
  const navigate = useNavigate()

  // ── 스크롤 시 NAV 하단 보더 강화 ─────────────────────────────────────────
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.style.boxShadow =
          window.scrollY > 80
            ? '0 1px 0 #e5e7eb, 0 2px 8px rgba(0,0,0,0.04)'
            : 'none'
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── 로그인 페이지로 이동 ─────────────────────────────────────────────────
  const goLogin = () => navigate('/login')

  return (
    // 전체 래퍼 — 화이트 배경
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: '#ffffff',
        color: '#111827',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* ── NAV — 흰 배경 + 하단 보더 ──────────────────────────────────── */}
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-6 py-[18px]"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #f3f4f6',
          transition: 'box-shadow 0.3s',
        }}
      >
        {/* 로고 — 에메랄드 */}
        <span className="text-[22px] font-black tracking-tight" style={{ color: '#059669' }}>
          CATCH
        </span>
        <button
          onClick={goLogin}
          className="px-[22px] py-[10px] text-sm font-bold text-white transition-all hover:scale-[1.04] hover:brightness-110"
          style={{
            background: '#059669',
            borderRadius: 8,
          }}
        >
          지금 시작하기 →
        </button>
      </nav>

      {/* ① HERO — 흰 배경 + 우측 에메랄드 블롭 ────────────────────────────── */}
      <section
        id="hero"
        className="relative flex items-center overflow-hidden"
        style={{
          minHeight: '100vh',
          padding: '120px 0 80px',
          background: '#ffffff',
        }}
      >
        {/* 우측 큰 에메랄드 블롭 */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-100px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 65%)',
          }}
        />

        {/* 콘텐츠 */}
        <div className="relative w-full max-w-[1100px] mx-auto px-6" style={{ zIndex: 1 }}>
          <Reveal>
            <SectionBadge>For 긱워커 · 일용직 · 단기알바</SectionBadge>
          </Reveal>

          <Reveal delay={0.1}>
            {/* H1 */}
            <h1
              className="leading-[1.15] tracking-tight mb-4"
              style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 700, color: '#111827' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#059669' }}>아직 거기 있습니다.</span>
            </h1>
            {/* 서브 카피 */}
            <p
              className="mb-8"
              style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 600, color: '#6b7280' }}
            >
              일용직 근로의 동반자, CATCH
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <p
              className="leading-[1.7] mb-12 max-w-[540px]"
              style={{ fontSize: 'clamp(16px, 2.5vw, 18px)', color: '#6b7280' }}
            >
              퇴직금·실업급여·주휴수당·연차수당—
              <br />
              몰라서 못 받는 돈, CATCH가 정확히 계산해드립니다.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 flex-wrap">
              {/* 기본 CTA 버튼 — 에메랄드 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-2 font-bold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  background: '#059669',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(5,150,105,0.2)',
                }}
              >
                ✦ 무료로 계산하기
              </button>
              {/* 보조 버튼 */}
              <a
                href="#solution"
                className="inline-flex items-center gap-2 font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  color: '#374151',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 8,
                  textDecoration: 'none',
                  background: '#ffffff',
                }}
              >
                기능 살펴보기 ↓
              </a>
            </div>
          </Reveal>

          {/* bullet 목록 */}
          <Reveal delay={0.4}>
            <div className="flex gap-5 flex-wrap mt-[60px]">
              {['퇴직금 계산기', '실업급여 계산기', '단기알바 채용정보', '100% 무료'].map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm" style={{ color: '#9ca3af' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />
                  {label}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ② PAIN — 아주 연한 에메랄드 틴트 배경 ─────────────────────────────── */}
      <section id="pain" className="relative z-[1]" style={{ padding: '120px 0', background: '#f8fffe' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <SectionBadge>문제 인식</SectionBadge>
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              className="leading-[1.25] mb-4"
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#111827' }}
            >
              정보의 소외,
              <br />
              <span style={{ color: '#059669' }}>당신만의 문제가 아닙니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[17px] leading-[1.7] max-w-[600px] mb-8" style={{ color: '#6b7280' }}>
              대한민국 일용직·단기근로자의 80%는 자신이 받을 수 있는 급여를 정확히 모릅니다.
              복잡한 법 조항과 어려운 계산식 때문에 매년 수천억 원의 권리가 증발하고 있습니다.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {/* 인용문 — 에메랄드 왼쪽 보더 */}
            <blockquote
              className="text-[16px] leading-[1.7] italic mb-12"
              style={{
                color: '#374151',
                background: '#ffffff',
                borderLeft: '3px solid #10b981',
                borderRadius: '0 8px 8px 0',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              "1년 이상 쿠팡 물류센터에서 일했는데 퇴직금이 있는지도 몰랐어요.
              CATCH로 계산해보니 200만 원이 나왔습니다."
            </blockquote>
          </Reveal>

          <div className="flex flex-col gap-4 max-w-[480px]">
            {[
              { num: '800만', label: '국내 일용직·긱워커 추정 인원' },
              { num: '68%', label: '퇴직금 수급 자격을 모르는 비율' },
              { num: '3,200억', label: '연간 미수령 노동 급여 추정액' },
            ].map((item, i) => (
              <Reveal key={item.num} delay={0.1 + i * 0.1}>
                <div
                  className="flex items-center gap-6 rounded-[12px] transition-all hover:translate-x-2 cursor-default"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    padding: '28px 32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = '0 4px 16px rgba(5,150,105,0.1)'
                    el.style.borderColor = '#10b981'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                    el.style.borderColor = '#e5e7eb'
                  }}
                >
                  <div
                    className="font-black tracking-tight whitespace-nowrap"
                    style={{ fontSize: 42, color: '#059669', letterSpacing: '-1px' }}
                  >
                    {item.num}
                  </div>
                  <div className="text-[15px] leading-[1.5]" style={{ color: '#6b7280' }}>
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ③ SOLUTION — 흰 배경 ───────────────────────────────────────────── */}
      <section id="solution" className="relative z-[1]" style={{ padding: '120px 0', background: '#ffffff' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-[600px] mx-auto mb-[70px]">
              <div className="flex justify-center">
                <SectionBadge>솔루션</SectionBadge>
              </div>
              <h2
                className="leading-[1.25] mb-4"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#111827' }}
              >
                CATCH가 해결합니다
              </h2>
              <p className="text-[17px] leading-[1.7]" style={{ color: '#6b7280' }}>
                복잡한 노동법을 몰라도 됩니다. PDF 한 장이면 충분합니다.
              </p>
            </div>
          </Reveal>

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
                  className="relative overflow-hidden rounded-[12px] transition-all group hover:-translate-y-2 cursor-default"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    padding: '36px 32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.25s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = '0 4px 16px rgba(5,150,105,0.1)'
                    el.style.borderColor = '#10b981'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                    el.style.borderColor = '#e5e7eb'
                  }}
                >
                  {/* 에메랄드 아이콘 배경 원형 */}
                  <div
                    className="flex items-center justify-center rounded-full text-2xl mb-6"
                    style={{ width: 52, height: 52, background: 'rgba(5,150,105,0.1)' }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-[20px] mb-3" style={{ fontWeight: 700, color: '#111827' }}>{card.title}</h3>
                  <p className="text-[15px] leading-[1.65]" style={{ color: '#6b7280' }}>
                    {card.desc}
                  </p>
                  <span
                    className="inline-block mt-5 px-3 py-1 rounded-[6px] text-xs font-semibold"
                    style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}
                  >
                    {card.badge}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ④ HOW — 연한 틴트 배경 ────────────────────────────────────────── */}
      <section id="how" className="relative z-[1]" style={{ padding: '120px 0', background: '#f8fffe' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <div className="text-center mb-[70px]">
              <div className="flex justify-center">
                <SectionBadge>사용 방법</SectionBadge>
              </div>
              <h2
                className="leading-[1.25]"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#111827' }}
              >
                3단계로 끝납니다
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* 스텝 연결선 — 에메랄드 */}
            <div
              className="hidden md:block absolute h-[1px]"
              style={{
                top: 44,
                left: 'calc(100% / 6)',
                right: 'calc(100% / 6)',
                background: 'linear-gradient(90deg, transparent, rgba(5,150,105,0.3), transparent)',
              }}
            />
            {[
              { num: 1, title: '로그인', desc: '카카오 또는 구글 계정으로\n5초 만에 가입·로그인' },
              { num: 2, title: 'PDF 업로드 또는 직접 입력', desc: '근무 내역 PDF 파일을 올리거나\n시급·일수를 직접 입력' },
              { num: 3, title: '결과 확인', desc: '받을 수 있는 금액과\n신청 방법을 즉시 확인' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={0.1 + i * 0.1}>
                <div className="text-center px-6 py-10 relative">
                  {/* 스텝 번호 원 — 에메랄드 */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-black text-white mx-auto mb-7 relative z-[1]"
                    style={{
                      background: '#059669',
                      boxShadow: '0 0 0 8px rgba(5,150,105,0.1)',
                    }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-[18px] mb-3" style={{ fontWeight: 700, color: '#111827' }}>{step.title}</h3>
                  <p className="text-[14px] leading-[1.65] whitespace-pre-line" style={{ color: '#6b7280' }}>
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ WHY CATCH — 흰 배경 ──────────────────────────────────────────── */}
      <section id="why" className="relative z-[1]" style={{ padding: '120px 0', background: '#ffffff' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-[80px] items-center">
            <div>
              <Reveal>
                <SectionBadge>왜 CATCH인가</SectionBadge>
              </Reveal>
              <Reveal delay={0.1}>
                <h2
                  className="leading-[1.25] mb-10"
                  style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#111827' }}
                >
                  우리는 일용직 근로자
                  <br />
                  편입니다
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
                      {/* 에메랄드 원형 체크 */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                      >
                        ✓
                      </div>
                      <div>
                        <strong className="block text-[16px] mb-1" style={{ fontWeight: 700, color: '#111827' }}>{item.title}</strong>
                        <span className="text-[14px] leading-[1.6]" style={{ color: '#6b7280' }}>
                          {item.desc}
                        </span>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>

            {/* 우측 스탯 카드 */}
            <Reveal delay={0.2}>
              <div
                className="rounded-[16px] text-center"
                style={{
                  background: '#f8fffe',
                  border: '1px solid #e5e7eb',
                  padding: '48px 40px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="font-black leading-none mb-3"
                  style={{ fontSize: 80, color: '#059669', letterSpacing: '-3px' }}
                >
                  365+
                </div>
                <p className="text-[18px] mb-10" style={{ color: '#6b7280' }}>
                  근무일 이상이면 퇴직금 수령 가능
                </p>
                <div className="mx-auto mb-9 rounded-full" style={{ width: 40, height: 2, background: '#10b981' }} />
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { num: '4개', label: '계산 서비스' },
                    { num: '무료', label: '모든 기능' },
                    { num: 'PDF', label: '정밀 분석' },
                    { num: '즉시', label: '결과 확인' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[12px] text-left"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="text-[28px] font-black mb-1" style={{ color: '#059669' }}>{stat.num}</div>
                      <div className="text-[12px]" style={{ color: '#9ca3af' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ⑥ STATS — 에메랄드 그래디언트 배경, 흰 텍스트 ─────────────────── */}
      <section
        id="stats"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        }}
      >
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
                  <div className="text-[14px] leading-[1.5] whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑦ CTA — 흰 배경 ────────────────────────────────────────────────── */}
      <section id="cta" className="relative z-[1] text-center" style={{ padding: '120px 0', background: '#ffffff' }}>
        <div className="max-w-[700px] mx-auto px-6">
          <Reveal>
            <div className="flex justify-center">
              <SectionBadge>지금 시작하기</SectionBadge>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              className="leading-[1.2] mb-5"
              style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: '#111827' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#059669' }}>CATCH가 찾아드립니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[18px] leading-[1.7] mb-12" style={{ color: '#6b7280' }}>
              무료로, 지금 바로. 5초 로그인 후 계산 시작.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 justify-center flex-wrap">
              {/* 카카오 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] text-[16px] font-bold transition-all hover:-translate-y-0.5 hover:brightness-105"
                style={{ padding: '18px 36px', background: '#fee500', color: '#191919', borderRadius: 8, boxShadow: '0 4px 16px rgba(254,229,0,0.3)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.56 1.522 4.817 3.828 6.213-.167.606-.625 2.193-.715 2.534-.11.42.154.414.324.302.133-.088 2.107-1.43 2.96-2.013.496.073 1.006.11 1.603.11 5.523 0 10-3.477 10-7.646C22 6.477 17.523 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>

              {/* 구글 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] text-[16px] font-bold transition-all hover:-translate-y-0.5"
                style={{ padding: '18px 36px', background: '#ffffff', color: '#374151', borderRadius: 8, border: '1.5px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
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

          <Reveal delay={0.4}>
            <p className="mt-7 text-[13px]" style={{ color: '#9ca3af' }}>
              신용카드 불필요 · 개인정보 최소 수집 · 언제든지 탈퇴 가능
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-[1] text-center"
        style={{ padding: '40px 0', borderTop: '1px solid #f3f4f6', background: '#ffffff' }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-[20px] font-black mb-3" style={{ color: '#059669' }}>CATCH</div>
          <div className="text-[13px]" style={{ color: '#9ca3af' }}>© 2026 CATCH — 퇴직금 한번에. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
