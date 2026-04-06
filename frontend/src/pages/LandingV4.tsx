// LandingV4 — B 임팩트/볼드 버전 (/v4 라우트)
// 컨셉: 전면을 꽉 채우는 BIG 타이포그래피, 오렌지 포인트, 직각 버튼
// 배경: #0a0a0a (거의 블랙), 포인트: #f97316 (오렌지)

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// ── 스크롤 reveal 애니메이션 variants ──────────────────────────────────────
const revealVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', delay },
  }),
}

// ── 섹션 스크롤 reveal 래퍼 ────────────────────────────────────────────────
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
      viewport={{ once: true, amount: 0.1 }}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

export default function LandingV4() {
  const navigate = useNavigate()

  // ── 스크롤 진행률 상태 (상단 오렌지 바) ─────────────────────────────────
  const [scrollProgress, setScrollProgress] = useState(0)
  // ── NAV 스크롤 상태 (투명 → #0a0a0a) ───────────────────────────────────
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      // 스크롤 진행률 계산 (0~100)
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
      setNavScrolled(scrollTop > 60)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── CTA 클릭 핸들러 ───────────────────────────────────────────────────────
  const handleCTA = () => navigate('/login')

  return (
    <div
      style={{ background: '#0a0a0a', color: '#ffffff', fontFamily: 'Pretendard, system-ui, sans-serif' }}
      className="min-h-screen overflow-x-hidden"
    >
      {/* ── 상단 스크롤 진행 바 (오렌지, 2px) ───────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollProgress}%`,
          height: '2px',
          background: '#f97316',
          zIndex: 9999,
          transition: 'width 0.1s linear',
        }}
      />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: navScrolled ? '#0a0a0a' : 'transparent',
          borderBottom: navScrolled ? '2px solid #f97316' : 'none',
          transition: 'background 0.3s, border 0.3s',
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}
        >
          CATCH
        </span>
        <button
          onClick={handleCTA}
          style={{
            background: '#f97316',
            color: '#ffffff',
            border: '2px solid #f97316',
            borderRadius: 0,
            padding: '8px 20px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          무료 시작
        </button>
      </nav>

      {/* ────────────────────────────────────────────────────────────────────
          1. HERO 섹션
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(80px, 10vw, 120px) clamp(24px, 6vw, 80px) 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 노이즈 텍스처 (SVG 필터) */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="overlay" />
          </filter>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundSize: '200px 200px',
            pointerEvents: 'none',
          }}
        />

        {/* 섹션 번호 배경 텍스트 */}
        <div
          style={{
            position: 'absolute',
            right: '-0.05em',
            bottom: '-0.1em',
            fontSize: 'clamp(200px, 40vw, 400px)',
            fontWeight: 900,
            color: '#ffffff',
            opacity: 0.03,
            lineHeight: 1,
            pointerEvents: 'none',
            letterSpacing: '-0.05em',
            userSelect: 'none',
          }}
        >
          01
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* 서브 레이블 */}
          <div
            style={{
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            일용직 근로의 동반자
          </div>

          {/* 메인 타이틀 */}
          <h1
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              margin: 0,
              marginBottom: '32px',
              maxWidth: '900px',
            }}
          >
            당신이{' '}
            <span style={{ color: '#f97316' }}>받아야 할 돈</span>
            ,<br />
            아직 거기{' '}
            <span
              style={{
                color: 'transparent',
                WebkitTextStroke: '2px #f97316',
              }}
            >
              있습니다.
            </span>
          </h1>

          {/* 서브 설명 */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '500px',
              lineHeight: 1.7,
              marginBottom: '48px',
            }}
          >
            퇴직금, 실업급여, 주휴수당, 연차수당 —<br />
            몰라서 못 받는 돈을 CATCH가 찾아드립니다.
          </p>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleCTA}
              style={{
                background: '#f97316',
                color: '#ffffff',
                border: '3px solid #f97316',
                borderRadius: 0,
                padding: '18px 40px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#f97316'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f97316'
                e.currentTarget.style.color = '#ffffff'
              }}
            >
              지금 무료로 시작하기
            </button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
              회원가입 불필요 · 카카오 1초 로그인
            </span>
          </div>
        </motion.div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          2. PAIN 섹션 — 일용직 근로자가 겪는 문제
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '80vh',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          background: '#111111',
          position: 'relative',
        }}
      >
        {/* 배경 섹션 번호 */}
        <div
          style={{
            position: 'absolute',
            right: '-0.05em',
            bottom: '-0.1em',
            fontSize: 'clamp(200px, 40vw, 400px)',
            fontWeight: 900,
            color: '#ffffff',
            opacity: 0.03,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          02
        </div>

        <Reveal>
          <div
            style={{
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            The Problem
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '56px',
              maxWidth: '600px',
            }}
          >
            대부분의 일용직은<br />
            <span style={{ color: '#f97316' }}>자신의 권리를 모릅니다.</span>
          </h2>
        </Reveal>

        {/* 3개 문제 카드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
          }}
        >
          {[
            {
              num: '01',
              title: '퇴직금 미수령',
              desc: '일용직도 1년 이상 일하면 퇴직금을 받을 수 있습니다. 하지만 대부분의 근로자는 이 사실조차 모릅니다.',
              highlight: '평균 미수령액 120만원',
            },
            {
              num: '02',
              title: '실업급여 포기',
              desc: '실업급여 수급 조건을 몰라 신청조차 하지 않는 경우가 태반입니다. 수급 가능 근로자 중 23%만 실제로 신청합니다.',
              highlight: '수급률 23%',
            },
            {
              num: '03',
              title: '복잡한 계산',
              desc: '28일 블록 계산, 주휴 조건, 연차 발생 기준 — 전문가조차 헷갈리는 복잡한 계산이 권리 행사를 막습니다.',
              highlight: '계산 오류율 68%',
            },
          ].map((item, i) => (
            <Reveal key={item.num} delay={i * 0.1}>
              <div
                style={{
                  border: '2px solid #f97316',
                  background: '#0a0a0a',
                  padding: '40px 32px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    color: '#f97316',
                    fontWeight: 900,
                    fontSize: '3rem',
                    lineHeight: 1,
                    marginBottom: '24px',
                    opacity: 0.4,
                  }}
                >
                  {item.num}
                </div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7,
                    fontSize: '0.9375rem',
                    marginBottom: '24px',
                  }}
                >
                  {item.desc}
                </p>
                <div
                  style={{
                    background: '#f97316',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    padding: '8px 16px',
                    display: 'inline-block',
                  }}
                >
                  {item.highlight}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          3. SOLUTION 섹션 — CATCH가 해결하는 것
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '80vh',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-0.05em',
            bottom: '-0.1em',
            fontSize: 'clamp(200px, 40vw, 400px)',
            fontWeight: 900,
            color: '#ffffff',
            opacity: 0.03,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          03
        </div>

        <Reveal>
          <div
            style={{
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            The Solution
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '56px',
              maxWidth: '600px',
            }}
          >
            CATCH가<br />
            <span style={{ color: '#f97316' }}>당신의 권리를 지킵니다.</span>
          </h2>
        </Reveal>

        {/* 번호 달린 해결책 리스트 */}
        <div style={{ maxWidth: '700px' }}>
          {[
            {
              title: '자동 정밀 계산',
              desc: 'PDF 근무 기록을 업로드하면 28일 블록 알고리즘으로 퇴직금을 자동 계산합니다. 수동 입력으로도 빠른 간편 계산이 가능합니다.',
            },
            {
              title: '맞춤 권리 안내',
              desc: '내 근무 패턴을 분석해 실업급여 수급 자격, 주휴수당, 연차수당 발생 여부를 한눈에 알려줍니다.',
            },
            {
              title: '간편 결과 조회',
              desc: '계산 결과를 저장하고 이전 기록과 비교하세요. 언제든지 내 권리 내역을 확인할 수 있습니다.',
            },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div
                style={{
                  display: 'flex',
                  gap: '32px',
                  padding: '32px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    color: '#f97316',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    minWidth: '48px',
                    paddingTop: '4px',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      marginBottom: '12px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          4. HOW 섹션 — 3단계 사용법 (세로 타임라인)
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '80vh',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          background: '#111111',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-0.05em',
            bottom: '-0.1em',
            fontSize: 'clamp(200px, 40vw, 400px)',
            fontWeight: 900,
            color: '#ffffff',
            opacity: 0.03,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          04
        </div>

        <Reveal>
          <div
            style={{
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            How It Works
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '64px',
            }}
          >
            3단계로<br />
            <span style={{ color: '#f97316' }}>끝납니다.</span>
          </h2>
        </Reveal>

        {/* 세로 타임라인 */}
        <div style={{ maxWidth: '600px', position: 'relative' }}>
          {/* 세로 연결선 */}
          <div
            style={{
              position: 'absolute',
              left: '24px',
              top: '48px',
              bottom: '48px',
              width: '2px',
              background: 'linear-gradient(to bottom, #f97316, rgba(249,115,22,0.1))',
            }}
          />

          {[
            { step: '01', title: '카카오로 1초 로그인', desc: '복잡한 회원가입 없이 카카오 계정으로 바로 시작합니다.' },
            { step: '02', title: '근무 정보 입력', desc: 'PDF 업로드 또는 직접 입력으로 내 근무 기록을 등록합니다.' },
            { step: '03', title: '결과 즉시 확인', desc: '퇴직금, 실업급여, 주휴수당, 연차수당을 한번에 확인하세요.' },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 0.15}>
              <div
                style={{
                  display: 'flex',
                  gap: '32px',
                  marginBottom: '48px',
                  alignItems: 'flex-start',
                  position: 'relative',
                }}
              >
                {/* 타임라인 원 */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.875rem',
                    color: '#ffffff',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  {item.step}
                </div>
                <div style={{ paddingTop: '8px' }}>
                  <h3
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      marginBottom: '8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          5. WHY CATCH 섹션 — 신뢰 포인트
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '80vh',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-0.05em',
            bottom: '-0.1em',
            fontSize: 'clamp(200px, 40vw, 400px)',
            fontWeight: 900,
            color: '#ffffff',
            opacity: 0.03,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          05
        </div>

        <Reveal>
          <div
            style={{
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            Why CATCH
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '56px',
            }}
          >
            왜<br />
            <span style={{ color: '#f97316' }}>CATCH 인가요?</span>
          </h2>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2px',
          }}
        >
          {[
            { icon: '₩', label: '완전 무료', desc: '숨은 비용 없이 모든 기능을 무료로 제공합니다. 광고도 없습니다.' },
            { icon: '🔒', label: '철통 보안', desc: '개인정보는 암호화 저장되며, 외부에 절대 공유하지 않습니다.' },
            { icon: '⚡', label: '전문 알고리즘', desc: '노동법에 기반한 28일 블록 알고리즘으로 정확하게 계산합니다.' },
            { icon: '📱', label: '모바일 최적화', desc: '스마트폰 하나로 현장에서 바로 계산하고 확인할 수 있습니다.' },
          ].map((item, i) => (
            <Reveal key={item.label} delay={i * 0.1}>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '40px 32px',
                  background: '#0d0d0d',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#f97316'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{item.icon}</div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    marginBottom: '12px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.label}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                  {item.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          6. STATS 섹션 — 오렌지 배경, 초대형 숫자
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#f97316',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          position: 'relative',
        }}
      >
        <Reveal>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '56px',
              letterSpacing: '-0.02em',
            }}
          >
            숫자로 보는 현실
          </h2>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '48px',
          }}
        >
          {[
            { value: '120만원', label: '평균 퇴직금 미수령액', sub: '1년 이상 근무 기준' },
            { value: '23%', label: '실업급여 실제 수급률', sub: '수급 가능 일용직 대비' },
            { value: '4가지', label: 'CATCH 계산 서비스', sub: '퇴직금·실업급여·주휴·연차' },
            { value: '0원', label: 'CATCH 이용 비용', sub: '모든 기능 영구 무료' },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.1}>
              <div>
                <div
                  style={{
                    fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                    fontWeight: 900,
                    color: '#ffffff',
                    lineHeight: 1,
                    marginBottom: '12px',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)' }}>{stat.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          7. FINAL CTA 섹션
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: 'clamp(60px, 8vw, 100px) clamp(24px, 6vw, 80px)',
          background: '#f97316',
        }}
      >
        <Reveal>
          <h2
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 6rem)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              marginBottom: '32px',
            }}
          >
            지금 바로<br />
            시작하세요.
          </h2>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '48px',
              lineHeight: 1.6,
            }}
          >
            당신이 받아야 할 돈이 기다리고 있습니다.
          </p>
          <button
            onClick={handleCTA}
            style={{
              background: '#0a0a0a',
              color: '#ffffff',
              border: '3px solid #0a0a0a',
              borderRadius: 0,
              padding: '20px 56px',
              fontWeight: 900,
              fontSize: '1.125rem',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#0a0a0a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0a0a0a'
              e.currentTarget.style.color = '#ffffff'
            }}
          >
            지금 무료로 시작하기
          </button>
        </Reveal>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: '#0a0a0a',
          borderTop: '2px solid #f97316',
          padding: '32px clamp(24px, 6vw, 80px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>CATCH</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
          © 2025 CATCH. 일용직 근로자의 권리를 지킵니다.
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            onClick={() => navigate('/terms/privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            개인정보처리방침
          </button>
          <button
            onClick={() => navigate('/terms/service')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            이용약관
          </button>
        </div>
      </footer>
    </div>
  )
}
