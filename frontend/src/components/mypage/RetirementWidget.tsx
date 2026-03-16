// 근무일수와 간단한 예상 퇴직금을 보여주는 위젯입니다.
// Toss 스타일의 심플한 게이지와 큰 숫자 표현에 집중합니다.

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

interface RetirementWidgetProps {
  workDays: number | null // 오늘까지의 근무 일수(없으면 null)
  onGoCalculate: () => void // 사용자가 계산 페이지로 이동하고 싶을 때 호출되는 콜백입니다.
}

export function RetirementWidget({ workDays, onGoCalculate }: RetirementWidgetProps) {
  // 근무일수가 있을 때 아주 단순한 예시 퇴직금(연차 X, 세부 규칙 X) 금액을 계산합니다.
  // 여기서는 "근무일수 × 3만원" 정도의 완전히 참고용 수치를 사용합니다.
  const estimatedSeverance =
    workDays != null ? Math.max(0, Math.round(workDays * 30000)) : null

  const progress = workDays != null ? Math.min(100, (workDays / 365) * 100) : 0

  return (
    <motion.section
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6 space-y-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-[#e8f3ff] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#3182f6]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#4e5968]">퇴직금 여정</p>
            <p className="text-sm font-extrabold text-[#191f28] tracking-tight">
              오늘까지 근무 일수
            </p>
          </div>
        </div>
        {workDays != null && (
          <p className="text-xs font-semibold text-[#3182f6]">
            {Math.round(progress)}% / 1년
          </p>
        )}
      </div>

      {workDays == null ? (
        <div className="space-y-3">
          <p className="text-sm text-[#8b95a1]">
            가입일 정보를 찾을 수 없어 근무 일수를 계산하지 못했어요.
          </p>
          <button
            type="button"
            onClick={onGoCalculate}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#3182f6] text-white text-xs font-semibold shadow-[0_10px_30px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] transition-colors"
          >
            내 퇴직금 계산하러 가기
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm text-[#4e5968]">
              오늘까지 <span className="font-semibold text-[#191f28]">{workDays.toLocaleString()}일</span>{' '}
              근무하셨어요.
            </p>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#3182f6]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#8b95a1] mb-1">예상 퇴직금 (참고용)</p>
              <p className="text-[22px] font-extrabold tracking-tight text-[#191f28]">
                {estimatedSeverance != null ? estimatedSeverance.toLocaleString() : '-'}원
              </p>
            </div>
            <button
              type="button"
              onClick={onGoCalculate}
              className="text-xs font-semibold text-[#3182f6] hover:text-[#1b64da]"
            >
              정밀 계산하기
            </button>
          </div>
        </>
      )}
    </motion.section>
  )
}

