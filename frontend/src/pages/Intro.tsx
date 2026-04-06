import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// 다크 그라디언트 스플래시: 진한 파란색→보라 배경에 흰색 텍스트로 가시성 극대화
export default function Intro() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'logo' | 'text' | 'ready'>('logo')
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(0)

  // 시퀀스: logo(0s) → text(0.6s) → ready(1.4s) → auto-advance(6s)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 600)
    const t2 = setTimeout(() => setPhase('ready'), 1400)
    const t3 = setTimeout(() => {
      setExiting(true)
      setTimeout(() => navigate('/home', { replace: true }), 500)
    }, 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [navigate])

  // 프로그레스 바: 6초 동안 0→100%
  useEffect(() => {
    const start = Date.now()
    const duration = 6000
    const raf = () => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct < 100) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [])

  const handleSkip = () => {
    setExiting(true)
    setTimeout(() => navigate('/home', { replace: true }), 400)
  }

  // 배경 빛 파티클 포지션
  const glows = [
    { x: '20%', y: '15%', size: 300, opacity: 0.15, delay: 0 },
    { x: '75%', y: '60%', size: 250, opacity: 0.12, delay: 0.5 },
    { x: '10%', y: '75%', size: 200, opacity: 0.1, delay: 1 },
  ]

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{
            // 다크 파란색→보라 그라디언트 배경
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 45%, #4c1d95 100%)',
          }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 배경 글로우 오브 */}
          {glows.map((g, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: g.x,
                top: g.y,
                width: g.size,
                height: g.size,
                background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)',
                opacity: g.opacity,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${g.delay}s`,
              }}
            />
          ))}

          {/* 배경 별 파티클 */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{
                duration: Math.random() * 2 + 1.5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* 중앙 콘텐츠 */}
          <div className="relative flex flex-col items-center z-10">
            {/* 로고 컨테이너 */}
            <motion.div
              className="w-24 h-24 rounded-[28px] flex items-center justify-center overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(99,102,241,0.3)',
              }}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                scale: { type: 'spring', damping: 14, stiffness: 100 },
              }}
            >
              <motion.img
                src="/catch-logo.png"
                alt="CATCH"
                className="w-12 h-12 object-contain"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4, type: 'spring', stiffness: 200 }}
              />
            </motion.div>

            {/* CATCH 브랜드명: 흰색 굵은 대형 텍스트 */}
            <motion.div
              className="mt-5 flex items-center gap-[1px]"
              initial="hidden"
              animate={phase !== 'logo' ? 'visible' : 'hidden'}
            >
              {'CATCH'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="text-[52px] font-black tracking-[-2px] text-white"
                  style={{
                    // 텍스트에 미세한 그림자로 입체감
                    textShadow: '0 2px 20px rgba(99,102,241,0.5)',
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                  }}
                  variants={{
                    hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
                  }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            {/* 구분선 */}
            <motion.div
              className="mt-3 w-8 h-[2px] rounded-full"
              style={{ background: 'rgba(255,255,255,0.4)' }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={phase !== 'logo' ? { opacity: 1, scaleX: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.4 }}
            />

            {/* 부제목: 흰색 반투명 */}
            <motion.p
              className="mt-3 text-[15px] font-medium tracking-tight text-center leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase !== 'logo' ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              일용직 근로의 동반자
            </motion.p>

            {/* 보조 설명 */}
            <motion.p
              className="mt-1 text-[12px] text-center"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              initial={{ opacity: 0 }}
              animate={phase !== 'logo' ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              퇴직금·실업급여·주휴·연차 한번에
            </motion.p>
          </div>

          {/* CTA 버튼 (ready 단계에서 등장) */}
          <motion.button
            type="button"
            onClick={handleSkip}
            className="mt-10 px-9 py-3.5 rounded-2xl font-bold text-[15px] tracking-tight relative z-10"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              color: '#ffffff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase === 'ready' ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              CATCH 시작하기 →
            </motion.span>
          </motion.button>

          {/* 하단 프로그레스 바 + 브랜드 */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 z-10">
            {/* 프로그레스 바 */}
            <motion.div
              className="w-32 h-[3px] rounded-full overflow-hidden mb-4"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div
                className="h-full rounded-full transition-none"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.7), rgba(165,180,252,1))',
                  boxShadow: '0 0 8px rgba(165,180,252,0.8)',
                }}
              />
            </motion.div>

            {/* 하단 브랜드 */}
            <motion.p
              className="text-[11px] font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              by LEAF-MASTER
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
