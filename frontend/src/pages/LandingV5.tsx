// LandingV5 — C 뉴스레터/매거진 버전 (/v5 라우트)
// 컨셉: 신문/잡지 레이아웃, 정보 밀도 높음, 신뢰감·전문성
// 배경: #fafaf8 (크림), 포인트: #dc2626 (레드), 세리프 제목 폰트

import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// ── 스크롤 reveal 애니메이션 variants ──────────────────────────────────────
const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', delay },
  }),
}

// ── 스크롤 reveal 래퍼 ────────────────────────────────────────────────────
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

// ── 공통 스타일 상수 ───────────────────────────────────────────────────────
const serifFont = "Georgia, 'Times New Roman', serif"
const sansFont = 'system-ui, -apple-system, sans-serif'
const sectionLabelStyle: React.CSSProperties = {
  fontFamily: sansFont,
  fontSize: '0.7rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  color: '#dc2626',
  marginBottom: '8px',
}

export default function LandingV5() {
  const navigate = useNavigate()

  // ── CTA 핸들러 ────────────────────────────────────────────────────────────
  const handleCTA = () => navigate('/login')

  return (
    <div
      style={{
        background: '#fafaf8',
        color: '#1a1a1a',
        fontFamily: sansFont,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* ── 상단 레드 바 (3px) ──────────────────────────────────────────── */}
      <div style={{ height: '3px', background: '#dc2626', width: '100%' }} />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          background: '#fafaf8',
          borderBottom: '3px solid #1a1a1a',
          padding: '0 clamp(24px, 5vw, 80px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          {/* 왼쪽 메뉴 */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: sansFont,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#1a1a1a',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
              onClick={() => document.getElementById('v5-pain')?.scrollIntoView({ behavior: 'smooth' })}
            >
              문제
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: sansFont,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#1a1a1a',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
              onClick={() => document.getElementById('v5-solution')?.scrollIntoView({ behavior: 'smooth' })}
            >
              솔루션
            </button>
          </div>

          {/* 중앙 로고 */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#1a1a1a',
                lineHeight: 1,
              }}
            >
              CATCH
            </div>
            <div
              style={{
                fontFamily: sansFont,
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#dc2626',
                fontWeight: 600,
              }}
            >
              퇴직금 한번에
            </div>
          </div>

          {/* 오른쪽 CTA */}
          <button
            onClick={handleCTA}
            style={{
              background: '#1a1a1a',
              color: '#fafaf8',
              border: '2px solid #1a1a1a',
              borderRadius: 0,
              padding: '8px 20px',
              fontFamily: sansFont,
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
              e.currentTarget.style.borderColor = '#dc2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a1a'
              e.currentTarget.style.borderColor = '#1a1a1a'
            }}
          >
            무료 시작
          </button>
        </div>
      </nav>

      {/* ── 신문 에디션 라인 ─────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '8px clamp(24px, 5vw, 80px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1a1a1a',
          fontSize: '0.75rem',
          fontFamily: sansFont,
          color: '#666',
        }}
      >
        <span>CATCH DAILY — 일용직 권리 매거진</span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>2025년 봄호</span>
        <span>일용직 근로의 동반자</span>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          1. HERO 섹션 — 신문 1면 스타일
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(32px, 5vw, 64px) clamp(24px, 5vw, 80px)',
        }}
      >
        {/* 1면 헤드라인 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'start',
          }}
        >
          {/* 좌측: 대형 헤드라인 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div style={sectionLabelStyle}>BREAKING NEWS</div>
            <div style={{ borderTop: '3px solid #1a1a1a', marginBottom: '24px' }} />
            <h1
              style={{
                fontFamily: serifFont,
                fontSize: 'clamp(2.5rem, 5vw, 5rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                color: '#1a1a1a',
                margin: '0 0 24px 0',
              }}
            >
              당신이 받아야 할 돈,<br />
              <span style={{ color: '#dc2626' }}>아직 거기</span>{' '}
              있습니다.
            </h1>

            {/* 인용구 스타일 */}
            <blockquote
              style={{
                borderLeft: '4px solid #dc2626',
                paddingLeft: '1rem',
                fontStyle: 'italic',
                fontFamily: serifFont,
                fontSize: '1.125rem',
                color: '#444',
                margin: '0 0 32px 0',
                lineHeight: 1.6,
              }}
            >
              "일용직 근로자 10명 중 8명이 퇴직금을 받을 수 있다는 사실을 모릅니다."
            </blockquote>

            <p
              style={{
                fontFamily: sansFont,
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#444',
                marginBottom: '32px',
              }}
            >
              퇴직금, 실업급여, 주휴수당, 연차수당 — CATCH는 복잡한 노동법 계산을 자동화해
              일용직 근로자가 마땅히 받아야 할 권리를 찾아드립니다.
            </p>

            <button
              onClick={handleCTA}
              style={{
                background: '#1a1a1a',
                color: '#fafaf8',
                border: '2px solid #1a1a1a',
                borderRadius: 0,
                padding: '16px 40px',
                fontFamily: sansFont,
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626'
                e.currentTarget.style.borderColor = '#dc2626'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a1a1a'
                e.currentTarget.style.borderColor = '#1a1a1a'
              }}
            >
              지금 무료로 시작하기 →
            </button>
          </motion.div>

          {/* 우측: 서브 스토리 미리보기 카드 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
          >
            {[
              {
                tag: '퇴직금',
                tagColor: '#dc2626',
                title: '1년 이상 일했다면 퇴직금이 있습니다',
                excerpt: '28일 블록 알고리즘으로 정확히 계산하는 방법',
              },
              {
                tag: '실업급여',
                tagColor: '#dc2626',
                title: '실업급여 수급 자격, 당신도 해당될 수 있습니다',
                excerpt: '수급 조건과 신청 절차를 한눈에 확인하세요',
              },
              {
                tag: '주휴수당',
                tagColor: '#dc2626',
                title: '주 15시간 이상 일했다면 주휴수당은 필수',
                excerpt: '놓치기 쉬운 주휴수당, 자동으로 계산해드립니다',
              },
            ].map((card, i) => (
              <div
                key={card.title}
                style={{
                  padding: '20px 0',
                  borderBottom: i < 2 ? '1px solid #d0d0cc' : 'none',
                  cursor: 'pointer',
                }}
                onClick={handleCTA}
              >
                <div
                  style={{
                    display: 'inline-block',
                    background: card.tagColor,
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '2px 8px',
                    marginBottom: '8px',
                    fontFamily: sansFont,
                  }}
                >
                  {card.tag}
                </div>
                <h3
                  style={{
                    fontFamily: serifFont,
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    marginBottom: '6px',
                    lineHeight: 1.3,
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ fontFamily: sansFont, fontSize: '0.875rem', color: '#666', lineHeight: 1.5 }}>
                  {card.excerpt}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          2. PAIN 섹션 — 헤드라인 뉴스 스타일
      ──────────────────────────────────────────────────────────────────── */}
      <section
        id="v5-pain"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #1a1a1a',
        }}
      >
        <Reveal>
          <div style={sectionLabelStyle}>일용직 근로자의 현실</div>
          <h2
            style={{
              fontFamily: serifFont,
              fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
              fontWeight: 700,
              marginBottom: '40px',
              lineHeight: 1.2,
            }}
          >
            몰랐기에 잃어버린 <span style={{ color: '#dc2626' }}>권리들</span>
          </h2>
        </Reveal>

        {/* 3단 뉴스 카드 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
          }}
        >
          {[
            {
              num: '01',
              headline: '퇴직금 미수령 — 평균 120만원',
              subhead: '일용직도 1년 이상 근무하면 퇴직금을 받을 수 있습니다.',
              quote: '"받을 수 있는 줄 몰랐어요. 그냥 일용직이니까 해당 없는 줄 알았죠."',
              body: '근로기준법은 고용 형태와 무관하게 1년 이상 근무한 모든 근로자에게 퇴직금을 보장합니다. 그러나 대부분의 일용직 근로자는 이를 인지하지 못해 권리를 포기합니다.',
            },
            {
              num: '02',
              headline: '실업급여 수급률 23% — 사각지대',
              subhead: '수급 자격이 있는 일용직 근로자 중 실제 신청자는 4명 중 1명뿐.',
              quote: '"신청 방법도 모르고, 나 같은 경우도 되는지도 몰랐습니다."',
              body: '고용보험 적용 확대로 일용직도 실업급여 대상이 되었지만, 복잡한 수급 조건과 신청 절차가 근로자들의 접근을 막고 있습니다.',
            },
            {
              num: '03',
              headline: '수당 오계산 — 전문가도 실수하는 계산',
              subhead: '28일 블록, 주휴 조건, 연차 발생 기준 — 복잡한 계산의 함정.',
              quote: '"계산해봤는데 회사에서 준 금액이 맞는지 확인할 방법이 없었어요."',
              body: '일용직 수당 계산은 근무 패턴에 따라 복잡해집니다. 잘못된 계산으로 받아야 할 금액보다 적게 수령하는 사례가 빈번합니다.',
            },
          ].map((item, i) => (
            <Reveal key={item.num} delay={i * 0.1}>
              <div style={{ borderTop: '3px solid #1a1a1a', paddingTop: '24px' }}>
                <div
                  style={{
                    fontFamily: sansFont,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: '#dc2626',
                    marginBottom: '12px',
                  }}
                >
                  ISSUE {item.num}
                </div>
                <h3
                  style={{
                    fontFamily: serifFont,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                    lineHeight: 1.3,
                  }}
                >
                  {item.headline}
                </h3>
                <p
                  style={{
                    fontFamily: sansFont,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#444',
                    marginBottom: '16px',
                  }}
                >
                  {item.subhead}
                </p>
                <blockquote
                  style={{
                    borderLeft: '4px solid #dc2626',
                    paddingLeft: '1rem',
                    fontStyle: 'italic',
                    fontFamily: serifFont,
                    fontSize: '0.9375rem',
                    color: '#555',
                    margin: '0 0 16px 0',
                    lineHeight: 1.5,
                  }}
                >
                  {item.quote}
                </blockquote>
                <p
                  style={{
                    fontFamily: sansFont,
                    fontSize: '0.875rem',
                    color: '#555',
                    lineHeight: 1.7,
                  }}
                >
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          3. SOLUTION 섹션 — 피처 아티클 스타일
      ──────────────────────────────────────────────────────────────────── */}
      <section
        id="v5-solution"
        style={{
          background: '#1a1a1a',
          color: '#fafaf8',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ ...sectionLabelStyle, color: '#dc2626' }}>CATCH 솔루션</div>
            <h2
              style={{
                fontFamily: serifFont,
                fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
                fontWeight: 700,
                marginBottom: '48px',
                lineHeight: 1.2,
                color: '#fafaf8',
              }}
            >
              CATCH가 해결하는 방법
            </h2>
          </Reveal>

          {/* 2컬럼 체크리스트 + 설명 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '48px',
              alignItems: 'start',
            }}
          >
            {/* 왼쪽: 기능 체크리스트 */}
            <div>
              {[
                { title: '자동 정밀 계산', desc: 'PDF 업로드 → 28일 블록 알고리즘으로 퇴직금 자동 산출' },
                { title: '4대 수당 통합 관리', desc: '퇴직금·실업급여·주휴수당·연차수당을 한 앱에서' },
                { title: '맞춤 수급 자격 확인', desc: '내 근무 패턴 분석 → 실업급여 수급 자격 즉시 판단' },
                { title: '계산 이력 저장', desc: '과거 결과를 보관하고 언제든 다시 조회 가능' },
                { title: '간편 수동 입력', desc: 'PDF 없이도 빠른 간편 계산 모드 제공' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '20px 0',
                      borderBottom: '1px solid rgba(250,250,248,0.1)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        background: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: sansFont,
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: '#fafaf8',
                          marginBottom: '4px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontFamily: sansFont, fontSize: '0.8125rem', color: 'rgba(250,250,248,0.6)', lineHeight: 1.5 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* 오른쪽: 강조 블록 + 인용 */}
            <Reveal delay={0.3}>
              <div
                style={{
                  background: '#dc2626',
                  padding: '40px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    fontFamily: serifFont,
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: '#fafaf8',
                    lineHeight: 1.3,
                    marginBottom: '16px',
                  }}
                >
                  "몰라서 못 받는 돈을<br />
                  CATCH가 찾아드립니다."
                </div>
                <div style={{ fontFamily: sansFont, fontSize: '0.8125rem', color: 'rgba(250,250,248,0.8)' }}>
                  — CATCH 서비스 철학
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(250,250,248,0.2)',
                  padding: '32px',
                }}
              >
                <div style={{ ...sectionLabelStyle, color: '#dc2626', marginBottom: '16px' }}>
                  완전 무료
                </div>
                <p style={{ fontFamily: sansFont, fontSize: '0.9375rem', color: 'rgba(250,250,248,0.7)', lineHeight: 1.7 }}>
                  CATCH는 일용직 근로자의 권리를 위해 모든 기능을 영구 무료로 제공합니다. 숨은 비용, 광고, 프리미엄 플랜 없습니다.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          4. HOW 섹션 — 스텝 번호 잡지 스타일
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #1a1a1a',
        }}
      >
        <Reveal>
          <div style={sectionLabelStyle}>사용법</div>
          <h2
            style={{
              fontFamily: serifFont,
              fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
              fontWeight: 700,
              marginBottom: '48px',
              lineHeight: 1.2,
            }}
          >
            3단계로 <span style={{ color: '#dc2626' }}>시작하기</span>
          </h2>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0',
          }}
        >
          {[
            {
              step: '01.',
              title: '카카오로 1초 로그인',
              desc: '복잡한 회원가입 없이 카카오 계정으로 바로 시작합니다. 최초 접속 후 30초 이내 시작 가능합니다.',
              detail: '카카오톡 계정 필요',
            },
            {
              step: '02.',
              title: '근무 정보 입력',
              desc: 'PDF 근무 기록을 업로드하거나 직접 날짜와 시급을 입력하세요. 두 가지 방식 모두 지원합니다.',
              detail: 'PDF 또는 직접 입력',
            },
            {
              step: '03.',
              title: '결과 즉시 확인',
              desc: '퇴직금, 실업급여 수급 자격, 주휴수당, 연차수당을 한 화면에서 확인하고 저장합니다.',
              detail: '4가지 수당 동시 계산',
            },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 0.12}>
              <div
                style={{
                  padding: '32px',
                  borderLeft: i > 0 ? '1px solid #d0d0cc' : 'none',
                  borderTop: '3px solid #1a1a1a',
                }}
              >
                <div
                  style={{
                    fontFamily: serifFont,
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    lineHeight: 1,
                    marginBottom: '16px',
                  }}
                >
                  {item.step}
                </div>
                <h3
                  style={{
                    fontFamily: serifFont,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '12px',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontFamily: sansFont,
                    fontSize: '0.875rem',
                    color: '#555',
                    lineHeight: 1.7,
                    marginBottom: '16px',
                  }}
                >
                  {item.desc}
                </p>
                <div
                  style={{
                    fontFamily: sansFont,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.detail}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          5. WHY CATCH 섹션
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#f0efeb',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #1a1a1a',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Reveal>
            <div style={sectionLabelStyle}>신뢰 포인트</div>
            <h2
              style={{
                fontFamily: serifFont,
                fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
                fontWeight: 700,
                marginBottom: '48px',
                lineHeight: 1.2,
              }}
            >
              CATCH를 <span style={{ color: '#dc2626' }}>선택해야 하는 이유</span>
            </h2>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '32px',
            }}
          >
            {[
              { label: '완전 무료', icon: '₩0', desc: '모든 기능, 영구 무료. 숨은 비용이나 프리미엄 플랜 없이 모든 서비스를 이용하세요.' },
              { label: '철통 보안', icon: '🔒', desc: '개인정보는 암호화 저장되며 외부에 절대 공유되지 않습니다. Supabase 보안 인프라 사용.' },
              { label: '전문 알고리즘', icon: '⚡', desc: '노동법 기반 28일 블록 알고리즘. 전문가 수준의 정확한 계산을 제공합니다.' },
              { label: '모바일 최적화', icon: '📱', desc: '현장에서 스마트폰으로 바로 계산하고 확인하세요. 언제 어디서나 접근 가능.' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.1}>
                <div
                  style={{
                    background: '#fafaf8',
                    border: '1px solid #d0d0cc',
                    padding: '32px',
                    borderTop: '3px solid #1a1a1a',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{item.icon}</div>
                  <h3
                    style={{
                      fontFamily: serifFont,
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    {item.label}
                  </h3>
                  <p style={{ fontFamily: sansFont, fontSize: '0.875rem', color: '#555', lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          6. STATS 섹션 — 인포그래픽 스타일, 검정 배경 블록
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#1a1a1a',
          color: '#fafaf8',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #1a1a1a',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ ...sectionLabelStyle, color: '#dc2626' }}>데이터로 보는 현실</div>
            <h2
              style={{
                fontFamily: serifFont,
                fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
                fontWeight: 700,
                marginBottom: '56px',
                lineHeight: 1.2,
                color: '#fafaf8',
              }}
            >
              숫자가 <span style={{ color: '#dc2626' }}>말해줍니다</span>
            </h2>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2px',
            }}
          >
            {[
              { value: '120만원', label: '평균 미수령 퇴직금', sub: '1년 이상 근무 일용직 기준' },
              { value: '23%', label: '실업급여 실제 수급률', sub: '수급 자격자 대비' },
              { value: '4가지', label: 'CATCH 계산 서비스', sub: '퇴직금·실업급여·주휴·연차' },
              { value: '무료', label: 'CATCH 이용 비용', sub: '모든 기능 영구 무료 제공' },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.1}>
                <div
                  style={{
                    background: '#111',
                    padding: '40px 32px',
                    borderTop: '3px solid #dc2626',
                  }}
                >
                  <div
                    style={{
                      fontFamily: serifFont,
                      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                      fontWeight: 700,
                      color: '#fafaf8',
                      lineHeight: 1,
                      marginBottom: '12px',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: sansFont,
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: 'rgba(250,250,248,0.9)',
                      marginBottom: '6px',
                    }}
                  >
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: sansFont, fontSize: '0.75rem', color: 'rgba(250,250,248,0.5)' }}>
                    {stat.sub}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          7. FINAL CTA 섹션
      ──────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Reveal>
          <div style={sectionLabelStyle}>지금 시작하세요</div>
          <h2
            style={{
              fontFamily: serifFont,
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: '24px',
              maxWidth: '700px',
            }}
          >
            당신이 받아야 할 돈,<br />
            <span style={{ color: '#dc2626' }}>아직 거기 있습니다.</span>
          </h2>
          <blockquote
            style={{
              borderLeft: '4px solid #dc2626',
              paddingLeft: '1rem',
              fontStyle: 'italic',
              fontFamily: serifFont,
              fontSize: '1.125rem',
              color: '#555',
              margin: '0 0 40px 0',
              lineHeight: 1.6,
              textAlign: 'left',
              maxWidth: '500px',
            }}
          >
            "CATCH 덕분에 퇴직금 130만원을 받을 수 있었습니다. 몰랐으면 그냥 지나쳤을 돈이에요."
          </blockquote>
          <button
            onClick={handleCTA}
            style={{
              background: '#1a1a1a',
              color: '#fafaf8',
              border: '2px solid #1a1a1a',
              borderRadius: 0,
              padding: '20px 56px',
              fontFamily: sansFont,
              fontWeight: 700,
              fontSize: '1.0625rem',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
              e.currentTarget.style.borderColor = '#dc2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a1a'
              e.currentTarget.style.borderColor = '#1a1a1a'
            }}
          >
            지금 무료로 시작하기
          </button>
          <div style={{ fontFamily: sansFont, fontSize: '0.8125rem', color: '#888' }}>
            회원가입 불필요 · 카카오 1초 로그인 · 완전 무료
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: '#1a1a1a',
          color: '#fafaf8',
          padding: 'clamp(32px, 4vw, 48px) clamp(24px, 5vw, 80px)',
          borderTop: '3px solid #dc2626',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontFamily: serifFont, fontSize: '1.5rem', fontWeight: 700 }}>CATCH</div>
            <div style={{ fontFamily: sansFont, fontSize: '0.75rem', color: 'rgba(250,250,248,0.5)', marginTop: '4px' }}>
              일용직 근로자의 권리를 지킵니다
            </div>
          </div>
          <span style={{ fontFamily: sansFont, color: 'rgba(250,250,248,0.4)', fontSize: '0.8125rem' }}>
            © 2025 CATCH. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button
              onClick={() => navigate('/terms/privacy')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(250,250,248,0.4)',
                cursor: 'pointer',
                fontFamily: sansFont,
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
                color: 'rgba(250,250,248,0.4)',
                cursor: 'pointer',
                fontFamily: sansFont,
                fontSize: '0.8125rem',
              }}
            >
              이용약관
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
