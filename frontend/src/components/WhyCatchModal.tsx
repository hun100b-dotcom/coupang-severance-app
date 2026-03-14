import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface WhyCatchModalProps {
  onClose: () => void
}

const STEP1_CONTENT = {
  title: '왜 CATCH인가요?',
  body: '쿠팡·컬리·CJ대한통운 등 일용직 근무자분들이 놓치기 쉬운 퇴직금·실업급여·주휴수당을 한곳에서 쉽게 확인할 수 있도록 만들었어요.',
}

const STEP2_CONTENT = {
  title: '정확하고 안전하게',
  body: '근로복지공단 PDF 기반 분석과 퇴직급여법 기준 계산으로 참고용 결과를 제공해 드립니다. 최종 금액은 노무사 상담을 권장해요.',
}

export default function WhyCatchModal({ onClose }: WhyCatchModalProps) {
  const [step, setStep] = useState<1 | 2>(1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[400px] bg-white rounded-[24px] shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <img src="/catch-logo.png" alt="" className="w-8 h-8 object-contain" />
            {[1, 2].map(i => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${step === i ? 'bg-[#3182F6]' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-[#191F28] rounded-full"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-6"
            >
              <h3 className="text-lg font-bold text-[#191F28] mb-3">{STEP1_CONTENT.title}</h3>
              <p className="text-sm text-[#4E5968] leading-relaxed">{STEP1_CONTENT.body}</p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-5 w-full py-3 rounded-xl bg-[#3182F6] text-white text-sm font-semibold"
              >
                다음
              </button>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-6"
            >
              <h3 className="text-lg font-bold text-[#191F28] mb-3">{STEP2_CONTENT.title}</h3>
              <p className="text-sm text-[#4E5968] leading-relaxed">{STEP2_CONTENT.body}</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-[#4E5968] text-sm font-semibold"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-[#3182F6] text-white text-sm font-semibold"
                >
                  확인
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
