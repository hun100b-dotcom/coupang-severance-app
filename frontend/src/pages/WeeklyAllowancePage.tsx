// 주휴수당 계산 페이지 — 일용직 근로자 전용
// 근거: 근로기준법 제55조, 제18조

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function WeeklyAllowancePage() {
  const navigate = useNavigate()

  const [hourlyWage, setHourlyWage]   = useState('')
  const [dailyHours, setDailyHours]   = useState('')
  const [weeklyDays, setWeeklyDays]   = useState('')
  const [allPresent, setAllPresent]   = useState<boolean | null>(null)
  const [result, setResult] = useState<{
    weeklyHours: number
    eligible: boolean
    allowance: number
    reason: string
  } | null>(null)

  const wage  = Number(hourlyWage.replace(/,/g, ''))
  const hours = Number(dailyHours)
  const days  = Number(weeklyDays)

  const canCalc = wage > 0 && hours > 0 && hours <= 12 && days > 0 && days <= 7 && allPresent !== null

  const calculate = () => {
    const weeklyHours = hours * days
    if (!allPresent) {
      setResult({ weeklyHours, eligible: false, allowance: 0,
        reason: '소정근로일을 개근하지 않아 주휴수당 발생 요건 미충족입니다.\n(근로기준법 제55조: 1주 소정근로일 개근 조건 필요)' })
      return
    }
    if (weeklyHours < 15) {
      setResult({ weeklyHours, eligible: false, allowance: 0,
        reason: `주 소정근로시간이 ${weeklyHours}시간으로 15시간 미만이므로 주휴수당 적용 대상이 아닙니다.\n(근로기준법 제18조: 4주 평균 주 15시간 미만 단시간 근로자는 적용 제외)` })
      return
    }
    const allowance = Math.round((weeklyHours / 40) * 8 * wage)
    setResult({ weeklyHours, eligible: true, allowance,
      reason: `주 ${weeklyHours}시간 근무 + 소정근로일 개근 → 주휴수당 발생` })
  }

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {/* 헤더 — Home과 동일한 glassmorphism 스타일 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
          <button
            type="button" onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[#191f28]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">주휴수당 계산기</h1>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4">
        {/* 안내 배너 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-[24px] bg-emerald-50/80 backdrop-blur-md border border-emerald-100/80 p-4 flex gap-3"
        >
          <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-emerald-800">일용직 주휴수당이란?</p>
            <p className="text-[12px] text-emerald-700 leading-relaxed">
              1주 소정근로시간 <strong>15시간 이상</strong>이고,<br />
              소정근로일을 <strong>개근</strong>하면 1주에 하루치 유급휴일이 발생합니다.<br />
              <span className="text-[11px] text-emerald-600">근로기준법 제55조, 제18조</span>
            </p>
          </div>
        </motion.div>

        {/* 입력 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-5"
        >
          <p className="text-sm font-extrabold text-[#191f28] tracking-tight">근로 조건 입력</p>

          {/* 시급 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">시급 <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number" value={hourlyWage} onChange={e => setHourlyWage(e.target.value)}
                placeholder="예) 10030" min={0}
                className="w-full px-4 py-3 pr-10 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">원</span>
            </div>
            {wage > 0 && wage < 10030 && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />2025년 최저시급(10,030원) 미만입니다
              </p>
            )}
          </div>

          {/* 1일 근로시간 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">1일 소정근로시간 <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number" value={dailyHours} onChange={e => setDailyHours(e.target.value)}
                placeholder="예) 8" min={1} max={12}
                className="w-full px-4 py-3 pr-16 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">시간/일</span>
            </div>
          </div>

          {/* 주 근로일수 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">1주 소정근로일수 <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-7 gap-1.5">
              {[1,2,3,4,5,6,7].map(d => (
                <button key={d} type="button" onClick={() => setWeeklyDays(String(d))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    weeklyDays === String(d)
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                      : 'bg-white/50 border border-white/60 text-[#4e5968] hover:bg-white/70'
                  }`}
                >{d}일</button>
              ))}
            </div>
          </div>

          {/* 개근 여부 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">이번 주 소정근로일 개근했나요? <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '네, 개근했어요', value: true },
                { label: '아니요, 결근 있었어요', value: false },
              ].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setAllPresent(opt.value)}
                  className={`py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                    allPresent === opt.value
                      ? opt.value ? 'bg-emerald-500 text-white shadow-md' : 'bg-rose-500 text-white shadow-md'
                      : 'bg-white/50 border border-white/60 text-[#4e5968] hover:bg-white/70'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* 주 근로시간 미리보기 */}
          {hours > 0 && days > 0 && (
            <div className="rounded-2xl bg-white/50 border border-white/60 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-[#4e5968]">주 소정근로시간</p>
              <p className={`text-sm font-extrabold ${hours * days >= 15 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {hours * days}시간 / 주{hours * days >= 15 ? ' ✓' : ' (15시간 미만)'}
              </p>
            </div>
          )}

          <button
            type="button" onClick={calculate} disabled={!canCalc}
            className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all ${
              canCalc
                ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
            }`}
          >주휴수당 계산하기</button>
        </motion.div>

        {/* 결과 카드 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                {result.eligible
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <AlertCircle className="w-5 h-5 text-rose-400" />}
                <p className="text-sm font-extrabold text-[#191f28]">
                  {result.eligible ? '주휴수당 발생' : '주휴수당 미발생'}
                </p>
              </div>

              {result.eligible && (
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-100 px-5 py-4 text-center">
                  <p className="text-[11px] font-semibold text-emerald-600 mb-1">이번 주 주휴수당</p>
                  <p className="text-[32px] font-extrabold text-emerald-700 tracking-tight">
                    {formatWon(result.allowance)}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-white/50 border border-white/60 px-4 py-3 space-y-2">
                {result.eligible && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b95a1]">계산식</span>
                    <span className="font-semibold text-[#4e5968]">
                      ({result.weeklyHours}h ÷ 40h) × 8h × {formatWon(wage)}
                    </span>
                  </div>
                )}
                <p className="text-[12px] text-[#4e5968] leading-relaxed whitespace-pre-line">{result.reason}</p>
              </div>

              <p className="text-[10px] text-[#8b95a1] text-center leading-relaxed">
                이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 핵심 정리 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.04)] px-5 py-5 space-y-3"
        >
          <p className="text-sm font-extrabold text-[#191f28]">주휴수당 핵심 정리</p>
          <ul className="space-y-2 text-[12px] text-[#4e5968] leading-relaxed">
            {[
              ['①', <><strong>대상</strong>: 1주 소정근로시간 15시간 이상인 모든 근로자 (일용직 포함)</>],
              ['②', <><strong>조건</strong>: 해당 주 소정근로일 개근 (지각·조퇴는 결근 아님)</>],
              ['③', <><strong>계산식</strong>: (주 소정근로시간 ÷ 40시간) × 8시간 × 시급</>],
              ['④', <><strong>미지급 시</strong>: 임금체불 — 고용노동부 신고 가능</>],
            ].map(([n, text]) => (
              <li key={n as string} className="flex gap-2">
                <span className="text-emerald-500 font-bold flex-shrink-0">{n}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
