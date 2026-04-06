// LandingV4 — 딥 네이비 + 골드 (프리미엄/신뢰감) (/v4 라우트)
// V1 섹션 구조 그대로, 색상·디테일만 네이비+앰버 핀테크 스타일로 변경

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

// ── 골드 액센트 바가 붙은 섹션 제목 래퍼 ────────────────────────────────────
function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide uppercase mb-5"
      style={{ color: '#f59e0b' }}
    >
      {/* 골드 세로 액센트 바 */}
      <span
        style={{
          display: 'inline-block',
          width: 4,
          height: 16,
          borderRadius: 2,
          background: '#f59e0b',
        }}
      />
      {children}
    </span>
  )
}

export default function LandingV4() {
  const navigate = useNavigate()

  // ── 스크롤 시 NAV 배경 강화 ──────────────────────────────────────────────
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.style.background =
          window.scrollY > 80
            ? 'rgba(15,23,42,0.98)'
            : 'rgba(15,23,42,0.9)'
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── 로그인 페이지로 이동 ─────────────────────────────────────────────────
  const goLogin = () => navigate('/login')

  return (
    // 전체 래퍼 — 딥 네이비 배경, 가로 스크롤 방지
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        background: '#0f172a',
        color: '#f8fafc',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center px-6 py-[18px]"
        style={{
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245,158,11,0.12)',
          transition: 'background 0.3s',
        }}
      >
        {/* 로고 — 골드 */}
        <span className="text-[22px] font-black tracking-tight" style={{ color: '#f59e0b' }}>
          CATCH
        </span>
        <button
          onClick={goLogin}
          className="px-[22px] py-[10px] text-sm font-bold transition-all hover:scale-[1.04] hover:brightness-110"
          style={{
            background: '#f59e0b',
            color: '#0f172a',
            borderRadius: 8,
          }}
        >
          지금 시작하기 →
        </button>
      </nav>

      {/* ① HERO — 딥 네이비 + 도트 패턴 배경 ─────────────────────────────── */}
      <section
        id="hero"
        className="relative flex items-center overflow-hidden"
        style={{
          minHeight: '100vh',
          padding: '120px 0 80px',
          background: '#0f172a',
        }}
      >
        {/* 미세 도트 패턴 — 앰버 틴트 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(245,158,11,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* 좌측 하단 글로우 오브 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '-200px',
            bottom: '-100px',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)',
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
              className="font-black leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: '#f8fafc' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#f59e0b' }}>아직 거기 있습니다.</span>
            </h1>
            {/* 서브 카피 */}
            <p
              className="font-semibold mb-8"
              style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: '#94a3b8' }}
            >
              일용직 근로의 동반자, CATCH
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <p
              className="leading-[1.7] mb-12 max-w-[540px]"
              style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#94a3b8' }}
            >
              퇴직금·실업급여·주휴수당·연차수당—
              <br />
              몰라서 못 받는 돈, CATCH가 정확히 계산해드립니다.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 flex-wrap">
              {/* 기본 CTA 버튼 — 골드 배경 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-2 font-bold transition-all hover:-translate-y-0.5 hover:brightness-110"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  background: '#f59e0b',
                  color: '#0f172a',
                  borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
                }}
              >
                ✦ 무료로 계산하기
              </button>
              {/* 보조 버튼 — 테두리만 */}
              <a
                href="#solution"
                className="inline-flex items-center gap-2 font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  padding: '18px 36px',
                  fontSize: 17,
                  color: '#94a3b8',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 8,
                  textDecoration: 'none',
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
                <div key={label} className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                  {label}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ② PAIN ─────────────────────────────────────────────────────────── */}
      <section id="pain" className="relative z-[1]" style={{ padding: '120px 0', background: '#131c35' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <SectionBadge>문제 인식</SectionBadge>
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              className="font-black leading-[1.25] mb-4"
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: '#f8fafc' }}
            >
              정보의 소외,
              <br />
              <span style={{ color: '#f59e0b' }}>당신만의 문제가 아닙니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[17px] leading-[1.7] max-w-[600px] mb-8" style={{ color: '#94a3b8' }}>
              대한민국 일용직·단기근로자의 80%는 자신이 받을 수 있는 급여를 정확히 모릅니다.
              복잡한 법 조항과 어려운 계산식 때문에 매년 수천억 원의 권리가 증발하고 있습니다.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {/* 인용문 — 골드 왼쪽 보더 */}
            <blockquote
              className="text-[16px] leading-[1.7] italic mb-12"
              style={{
                color: '#94a3b8',
                background: 'rgba(245,158,11,0.06)',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '0 8px 8px 0',
                padding: '24px 28px',
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
                  className="flex items-center gap-6 rounded-[16px] transition-all hover:translate-x-2 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(245,158,11,0.18)',
                    padding: '28px 32px',
                    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(245,158,11,0.5)'
                    el.style.boxShadow = '0 0 20px rgba(245,158,11,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(245,158,11,0.18)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div
                    className="font-black tracking-tight whitespace-nowrap"
                    style={{ fontSize: 42, color: '#f59e0b', letterSpacing: '-1px' }}
                  >
                    {item.num}
                  </div>
                  <div className="text-[15px] leading-[1.5]" style={{ color: '#94a3b8' }}>
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ③ SOLUTION ──────────────────────────────────────────────────────── */}
      <section id="solution" className="relative z-[1]" style={{ padding: '120px 0', background: '#0f172a' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-[600px] mx-auto mb-[70px]">
              <div className="flex justify-center">
                <SectionBadge>솔루션</SectionBadge>
              </div>
              <h2
                className="font-black leading-[1.25] mb-4"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: '#f8fafc' }}
              >
                CATCH가 해결합니다
              </h2>
              <p className="text-[17px] leading-[1.7]" style={{ color: '#94a3b8' }}>
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
                  className="relative overflow-hidden rounded-[16px] transition-all group hover:-translate-y-2 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(245,158,11,0.18)',
                    padding: '36px 32px',
                    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.25s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(245,158,11,0.5)'
                    el.style.boxShadow = '0 0 20px rgba(245,158,11,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(245,158,11,0.18)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {/* 상단 골드 호버 라인 */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }}
                  />
                  <div
                    className="flex items-center justify-center rounded-[12px] text-2xl mb-6"
                    style={{ width: 52, height: 52, background: 'rgba(245,158,11,0.12)' }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-[20px] font-bold mb-3" style={{ color: '#f8fafc' }}>{card.title}</h3>
                  <p className="text-[15px] leading-[1.65]" style={{ color: '#94a3b8' }}>
                    {card.desc}
                  </p>
                  <span
                    className="inline-block mt-5 px-3 py-1 rounded-[6px] text-xs font-semibold"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}
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
      <section id="how" className="relative z-[1]" style={{ padding: '120px 0', background: '#131c35' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <Reveal>
            <div className="text-center mb-[70px]">
              <div className="flex justify-center">
                <SectionBadge>사용 방법</SectionBadge>
              </div>
              <h2
                className="font-black leading-[1.25]"
                style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: '#f8fafc' }}
              >
                3단계로 끝납니다
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* 스텝 연결선 */}
            <div
              className="hidden md:block absolute h-[1px]"
              style={{
                top: 44,
                left: 'calc(100% / 6)',
                right: 'calc(100% / 6)',
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)',
              }}
            />
            {[
              { num: 1, title: '로그인', desc: '카카오 또는 구글 계정으로\n5초 만에 가입·로그인' },
              { num: 2, title: 'PDF 업로드 또는 직접 입력', desc: '근무 내역 PDF 파일을 올리거나\n시급·일수를 직접 입력' },
              { num: 3, title: '결과 확인', desc: '받을 수 있는 금액과\n신청 방법을 즉시 확인' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={0.1 + i * 0.1}>
                <div className="text-center px-6 py-10 relative">
                  {/* 스텝 번호 원 — 골드 */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-black mx-auto mb-7 relative z-[1]"
                    style={{
                      background: '#f59e0b',
                      color: '#0f172a',
                      boxShadow: '0 0 0 8px rgba(245,158,11,0.12)',
                    }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-[18px] font-bold mb-3" style={{ color: '#f8fafc' }}>{step.title}</h3>
                  <p className="text-[14px] leading-[1.65] whitespace-pre-line" style={{ color: '#94a3b8' }}>
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ WHY CATCH ─────────────────────────────────────────────────────── */}
      <section id="why" className="relative z-[1]" style={{ padding: '120px 0', background: '#0f172a' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-[80px] items-center">
            <div>
              <Reveal>
                <SectionBadge>왜 CATCH인가</SectionBadge>
              </Reveal>
              <Reveal delay={0.1}>
                <h2
                  className="font-black leading-[1.25] mb-10"
                  style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: '#f8fafc' }}
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
                      {/* 골드 체크 아이콘 박스 */}
                      <div
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[14px] flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                      >
                        ✓
                      </div>
                      <div>
                        <strong className="block text-[16px] font-bold mb-1" style={{ color: '#f8fafc' }}>{item.title}</strong>
                        <span className="text-[14px] leading-[1.6]" style={{ color: '#94a3b8' }}>
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
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  padding: '48px 40px',
                }}
              >
                <div
                  className="font-black leading-none mb-3"
                  style={{ fontSize: 80, color: '#f59e0b', letterSpacing: '-3px' }}
                >
                  365+
                </div>
                <p className="text-[18px] mb-10" style={{ color: '#94a3b8' }}>
                  근무일 이상이면 퇴직금 수령 가능
                </p>
                <div className="mx-auto mb-9 rounded-full" style={{ width: 40, height: 2, background: '#f59e0b' }} />
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
                      style={{ background: 'rgba(245,158,11,0.08)', padding: '20px' }}
                    >
                      <div className="text-[28px] font-black mb-1" style={{ color: '#fbbf24' }}>{stat.num}</div>
                      <div className="text-[12px]" style={{ color: '#64748b' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ⑥ STATS — 골드 배경, 네이비 텍스트 ─────────────────────────────── */}
      <section
        id="stats"
        className="relative z-[1] overflow-hidden"
        style={{
          padding: '100px 0',
          background: '#f59e0b',
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
                    className="font-black mb-2"
                    style={{ fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1px', color: '#0f172a' }}
                  >
                    {item.num}
                  </div>
                  <div className="text-[14px] leading-[1.5] whitespace-pre-line" style={{ color: 'rgba(15,23,42,0.65)' }}>
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑦ CTA ──────────────────────────────────────────────────────────── */}
      <section id="cta" className="relative z-[1] text-center" style={{ padding: '120px 0', background: '#131c35' }}>
        <div className="max-w-[700px] mx-auto px-6">
          <Reveal>
            <div className="flex justify-center">
              <SectionBadge>지금 시작하기</SectionBadge>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              className="font-black leading-[1.2] mb-5"
              style={{ fontSize: 'clamp(32px, 5vw, 52px)', color: '#f8fafc' }}
            >
              당신이 받아야 할 돈,
              <br />
              <span style={{ color: '#f59e0b' }}>CATCH가 찾아드립니다</span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[18px] leading-[1.7] mb-12" style={{ color: '#94a3b8' }}>
              무료로, 지금 바로. 5초 로그인 후 계산 시작.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex gap-4 justify-center flex-wrap">
              {/* 카카오 버튼 */}
              <button
                onClick={goLogin}
                className="inline-flex items-center gap-[10px] text-[16px] font-bold transition-all hover:-translate-y-0.5 hover:brightness-110"
                style={{ padding: '18px 36px', background: '#fee500', color: '#191919', borderRadius: 8, boxShadow: '0 8px 24px rgba(254,229,0,0.2)' }}
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
                style={{ padding: '18px 36px', background: 'rgba(255,255,255,0.08)', color: '#f8fafc', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)' }}
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
            <p className="mt-7 text-[13px]" style={{ color: '#475569' }}>
              신용카드 불필요 · 개인정보 최소 수집 · 언제든지 탈퇴 가능
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-[1] text-center"
        style={{ padding: '40px 0', borderTop: '1px solid rgba(245,158,11,0.1)', background: '#0f172a' }}
      >
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-[20px] font-black mb-3" style={{ color: '#f59e0b' }}>CATCH</div>
          <div className="text-[13px]" style={{ color: '#475569' }}>© 2026 CATCH — 퇴직금 한번에. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
