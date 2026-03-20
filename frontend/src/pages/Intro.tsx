import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// 시네마틱 인트로: Apple 수준의 브랜드 리빌 → 자동 전환
export default function Intro() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'logo' | 'text' | 'ready'>('logo')
  const [exiting, setExiting] = useState(false)

  // 재방문자는 즉시 메인으로
  useEffect(() => {
    const key = 'catch_intro_seen_v2'
    if (window.localStorage.getItem(key)) {
      navigate('/home', { replace: true })
      return
    }
    window.localStorage.setItem(key, '1')
  }, [navigate])

  // 시퀀스: logo(0s) → text(0.6s) → ready(1.4s) → auto-advance(3s)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 600)
    const t2 = setTimeout(() => setPhase('ready'), 1400)
    const t3 = setTimeout(() => {
      setExiting(true)
      setTimeout(() => navigate('/home', { replace: true }), 500)
    }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [navigate])

  const handleSkip = () => {
    setExiting(true)
    setTimeout(() => navigate('/home', { replace: true }), 400)
  }

  // 스파클 파티클 포지션
  const sparkles = [
    { x: -60, y: -50, delay: 0.3, size: 4 },
    { x: 55, y: -45, delay: 0.5, size: 3 },
    { x: -45, y: 40, delay: 0.4, size: 5 },
    { x: 50, y: 50, delay: 0.6, size: 3 },
    { x: -20, y: -65, delay: 0.7, size: 4 },
    { x: 30, y: 60, delay: 0.35, size: 3 },
  ]

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-transparent"
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 로고 리빌 */}
          <div className="relative flex flex-col items-center">
            {/* 스파클 파티클 */}
            {sparkles.map((s, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-[#3182F6]"
                style={{ width: s.size, height: s.size }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.7, 0],
                  x: s.x,
                  y: s.y,
                  scale: [0, 1.2, 0],
                }}
                transition={{
                  duration: 1.2,
                  delay: s.delay,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* 로고 컨테이너 */}
            <motion.div
              className="w-24 h-24 rounded-[32px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_20px_60px_rgba(49,130,246,0.18)] flex items-center justify-center overflow-hidden"
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
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4, type: 'spring', stiffness: 200 }}
              />
            </motion.div>

            {/* 브랜드명: 글자별 스태거 */}
            <motion.div
              className="mt-5 flex items-center gap-[2px]"
              initial="hidden"
              animate={phase !== 'logo' ? 'visible' : 'hidden'}
            >
              {'CATCH'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="text-[32px] font-black tracking-tighter"
                  style={{
                    background: 'linear-gradient(135deg, #1a73e8, #3182f6, #60a5fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  variants={{
                    hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
                  }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            {/* 태그라인 */}
            <motion.p
              className="mt-3 text-[14px] text-[#4E5968] font-medium tracking-tight text-center leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={phase !== 'logo' ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              퇴직금과 실업급여를 3초 안에 시작하세요
            </motion.p>
          </div>

          {/* CTA 버튼 (ready 단계에서 등장) */}
          <motion.button
            type="button"
            onClick={handleSkip}
            className="mt-10 px-8 py-3.5 rounded-2xl bg-[#3182F6] text-white font-bold text-[15px] tracking-tight shadow-[0_12px_40px_rgba(49,130,246,0.3)]"
            initial={{ opacity: 0, y: 16 }}
            animate={phase === 'ready' ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              CATCH 시작하기
            </motion.span>
          </motion.button>

          {/* 하단 브랜드 */}
          <motion.p
            className="absolute bottom-8 text-[11px] text-[#8B95A1]/70 font-medium tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            by LEAF-MASTER
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
