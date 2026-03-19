import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Intro 화면(첫 진입 잠깐 표시용)
 *
 * - 사용자가 앱에 처음 들어온 “첫 접속”에는 "/" 경로로 잠깐 노출됩니다.
 * - 다시 "/" 로 들어오면 로컬스토리지를 보고 자동으로 "/home"으로 넘겨서
 *   "기존 메인 화면"으로 자연스럽게 이어지게 합니다.
 * - 디자인 요구사항대로 로고 + 한 줄 후킹 문구 + 강력한 CTA만 남겨
 *   정보 과다를 없앱니다.
 */
export default function Intro() {
  const navigate = useNavigate()

  // 로컬스토리지에 이미 봤다면 "/home"으로 바로 이동합니다.
  // (이 로직은 "첫 접속시 잠깐 나타나는 화면" 요구를 만족시키기 위한 장치입니다.)
  useEffect(() => {
    const key = 'catch_intro_seen_v1'
    const alreadySeen = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (alreadySeen) {
      navigate('/home', { replace: true })
      return
    }
    window.localStorage.setItem(key, '1')
  }, [navigate])

  const hookText = useMemo(
    () => (
      <>
        퇴직금과 실업급여를
        <span className="text-[#3182f6]"> 3초 안에 시작</span>하세요
      </>
    ),
    []
  )

  const handleStart = () => {
    // Intro의 역할은 "첫 진입 유도"이므로, 버튼 클릭 시 바로 기존 메인 화면으로 이동합니다.
    navigate('/home')
  }

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center px-4 pb-28 font-sans bg-transparent">
      {/* 가운데 영역: 로고 + 후킹 문구 */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-[460px]"
      >
        <div className="flex flex-col items-center text-center gap-4">
          {/* 로고 이미지 */}
          <div className="w-20 h-20 rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_18px_60px_rgba(49,130,246,0.12)] flex items-center justify-center overflow-hidden">
            <img src="/catch-logo.png" alt="CATCH" className="w-10 h-10 object-contain" />
          </div>

          {/* 로고 후킹 문구(요구: 세련되고 빠져나갈 수 없는 느낌) */}
          <h1 className="text-[28px] sm:text-[34px] leading-[1.15] font-black tracking-tight text-[#191F28]">
            {hookText}
          </h1>

          <p className="text-[13px] text-[#4E5968] font-medium leading-relaxed">
            지금 시작하면 복잡한 절차는 줄이고, 핵심만 빠르게 안내받을 수 있어요.
          </p>

          {/* CTA 주변에 “유도” 카드처럼 프레이밍 */}
          <div className="w-full rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/70 p-4 mt-2 shadow-[0_18px_60px_rgba(49,130,246,0.10)]">
            <p className="text-[12px] text-[#4E5968] font-semibold tracking-tight">
              아래 버튼을 누르면 바로 메인 화면으로 이동합니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 하단 고정 CTA 버튼 */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-gradient-to-t from-white via-white/90 to-white/0 pt-3 pb-3 px-4"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleStart}
          className="w-full rounded-[18px] bg-[#3182f6] text-white font-extrabold tracking-tight px-5 py-4 shadow-[0_14px_50px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] active:scale-[0.99] transition-transform"
        >
          CATCH 시작하기
        </button>
        <p className="text-center text-[10px] text-[#8B95A1] mt-2 font-medium">
          시작은 무료입니다. 언제든 원하실 때 종료할 수 있어요.
        </p>
      </div>
    </div>
  )
}

