import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'
import { PrimaryButton } from '../components/Button'
import { getClickCount, registerClick } from '../lib/api'
import { INTRO_COPIES } from '../lib/constants'

// CATCH 강조 텍스트 렌더러
function HighlightCatch({ text }: { text: string }) {
  const parts = text.split(/(CATCH)/g)
  return (
    <>
      {parts.map((part, i) =>
        part === 'CATCH' ? (
          <span key={i} className="catch-highlight">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function Intro() {
  const navigate = useNavigate()
  const [copyIdx, setCopyIdx] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    getClickCount().then(d => setCount(d.total)).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCopyIdx(i => (i + 1) % INTRO_COPIES.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const handleStart = useCallback(async (service: 'severance' | 'unemployment') => {
    try { await registerClick(service) } catch { /* 무시 */ }
    setCount(c => c + 1)
    navigate(`/${service}`)
  }, [navigate])

  const copy = INTRO_COPIES[copyIdx]
  const lines = copy.split('\n')

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* ── 메인 카드 ─────────────────────────────────── */}
        <GlassCard className="p-8" animate={false}>

          {/* 로고 · 브랜드 */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'linear-gradient(135deg, var(--toss-blue), #5b9ef4)',
                fontSize: '2rem',
                marginBottom: 14,
                boxShadow: '0 8px 32px rgba(49,130,246,0.35)',
              }}
            >
              🔍
            </div>
            {/* CATCH 워드마크 */}
            <p
              style={{
                fontFamily: "'Inter', 'Pretendard', sans-serif",
                fontSize: '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.06em',
                background: 'linear-gradient(135deg, #1a73e8, #3182f6, #5b9ef4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              CATCH
            </p>
            <p
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--toss-text-3)',
                letterSpacing: '0.05em',
              }}
            >
              퇴직금 · 실업급여 자동계산
            </p>
          </div>

          {/* 7초 Spring 슬라이드 카피 */}
          <div style={{ minHeight: 88, marginBottom: 28, overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={copyIdx}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 28,
                  mass: 0.9,
                }}
                style={{ textAlign: 'center', position: 'absolute', left: 0, right: 0 }}
              >
                {lines.map((line, i) => (
                  <p
                    key={i}
                    className="heading-intro"
                    style={{
                      textAlign: 'center',
                      lineHeight: 1.4,
                      marginBottom: i < lines.length - 1 ? 6 : 0,
                    }}
                  >
                    <HighlightCatch text={line} />
                  </p>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 누적 카운트 */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 28,
              padding: '12px 20px',
              background: 'rgba(49,130,246,0.06)',
              borderRadius: 12,
            }}
          >
            <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)' }}>
              지금까지{' '}
              <span
                style={{
                  color: 'var(--toss-blue)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  fontFamily: "'Inter', 'Pretendard', sans-serif",
                }}
              >
                {count.toLocaleString()}명
              </span>
              이 확인했어요
            </p>
          </div>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PrimaryButton
              onClick={() => handleStart('severance')}
              style={{ fontSize: '1.05rem', padding: '18px' }}
            >
              🔍 내 퇴직금 캐치하기
            </PrimaryButton>
            <PrimaryButton
              onClick={() => handleStart('unemployment')}
              style={{
                fontSize: '1.05rem',
                padding: '18px',
                background: 'linear-gradient(135deg, #2d6fa8, #3182f6)',
              }}
            >
              🔎 실업급여 확인하기
            </PrimaryButton>
          </div>
        </GlassCard>

        {/* ── 특징 카드 (glassmorphism hover) ────────────── */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
          }}
        >
          {[
            { icon: '⚡', label: '1분 만에', sub: '빠른 계산' },
            { icon: '🔒', label: '안전하게', sub: '개인정보 보호' },
            { icon: '📄', label: 'PDF 분석', sub: '자동 계산' },
          ].map(f => (
            <div key={f.label} className="feature-chip">
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{f.icon}</div>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--toss-text)' }}>{f.label}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--toss-text-3)', marginTop: 2 }}>{f.sub}</p>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(120,130,150,0.65)', marginTop: 20, lineHeight: 1.6 }}>
          © 2026 CATCH by LEAF-MASTER. All rights reserved.
          <br />
          <span style={{ fontSize: '0.68rem' }}>이 결과는 참고용이에요. 정확한 금액은 노무사 상담을 받으세요.</span>
        </p>

      </div>
    </div>
  )
}
