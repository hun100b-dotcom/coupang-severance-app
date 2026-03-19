// 주휴수당 계산 페이지 — 일용직 근로자 전용
// 근거: 근로기준법 제55조, 제18조
// 1주 소정근로시간 15시간 이상 + 소정근로일 개근 시 주휴수당 발생

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function WeeklyAllowancePage() {
  const navigate = useNavigate()

  const [hourlyWage, setHourlyWage] = useState('')        // 시급 (원)
  const [dailyHours, setDailyHours] = useState('')        // 1일 소정근로시간
  const [weeklyDays, setWeeklyDays] = useState('')        // 주 소정근로일수
  const [allPresent, setAllPresent] = useState<boolean | null>(null) // 소정근로일 개근 여부
  const [result, setResult] = useState<{
    weeklyHours: number
    eligible: boolean
    allowance: number
    reason: string
  } | null>(null)

  const wage = Number(hourlyWage.replace(/,/g, ''))
  const hours = Number(dailyHours)
  const days = Number(weeklyDays)

  const canCalc =
    wage > 0 && hours > 0 && hours <= 12 && days > 0 && days <= 7 && allPresent !== null

  const calculate = () => {
    const weeklyHours = hours * days

    if (!allPresent) {
      setResult({
        weeklyHours,
        eligible: false,
        allowance: 0,
        reason: '소정근로일을 개근하지 않아 주휴수당 발생 요건 미충족입니다.\n(근로기준법 제55조: 1주 소정근로일 개근 조건 필요)',
      })
      return
    }

    if (weeklyHours < 15) {
      setResult({
        weeklyHours,
        eligible: false,
        allowance: 0,
        reason: `주 소정근로시간이 ${weeklyHours}시간으로 15시간 미만이므로 주휴수당 적용 대상이 아닙니다.\n(근로기준법 제18조: 4주 평균 주 15시간 미만 단시간 근로자는 적용 제외)`,
      })
      return
    }

    // 주휴수당 = (주 소정근로시간 / 40시간) × 8시간 × 시급
    const allowance = Math.round((weeklyHours / 40) * 8 * wage)
    setResult({
      weeklyHours,
      eligible: true,
      allowance,
      reason: `주 ${weeklyHours}시간 근무 + 소정근로일 개근 → 주휴수당 발생`,
    })
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
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

      <main className="max-w-[460px] mx-auto px-4 pt-5 space-y-4">
        {/* 안내 배너 */}
        <div className="rounded-[24px] bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
          <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-emerald-800">일용직 주휴수당이란?</p>
            <p className="text-[12px] text-emerald-700 leading-relaxed">
              1주 소정근로시간 <strong>15시간 이상</strong>이고,<br />
              소정근로일을 <strong>개근</strong>하면 1주에 하루치 유급휴일이 발생합니다.<br />
              <span className="text-[11px] text-emerald-600">근로기준법 제55조, 제18조</span>
            </p>
          </div>
        </div>

        {/* 입력 카드 */}
        <div className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.06)] border border-slate-100 px-5 py-6 space-y-5">
          <p className="text-sm font-extrabold text-[#191f28] tracking-tight">근로 조건 입력</p>

          {/* 시급 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">
              시급 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={hourlyWage}
                onChange={e => setHourlyWage(e.target.value)}
                placeholder="예) 10030"
                min={0}
                className="w-full px-4 py-3 pr-10 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">원</span>
            </div>
            {wage > 0 && wage < 10030 && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                2025년 최저시급(10,030원) 미만입니다
              </p>
            )}
          </div>

          {/* 1일 근로시간 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">
              1일 소정근로시간 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={dailyHours}
                onChange={e => setDailyHours(e.target.value)}
                placeholder="예) 8"
                min={1}
                max={12}
                className="w-full px-4 py-3 pr-14 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">시간/일</span>
            </div>
          </div>

          {/* 주 근로일수 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">
              1주 소정근로일수 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWeeklyDays(String(d))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    weeklyDays === String(d)
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-100 text-[#4e5968] hover:bg-slate-200'
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>

          {/* 개근 여부 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4e5968]">
              이번 주 소정근로일 개근했나요? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '네, 개근했어요', value: true },
                { label: '아니요, 결근 있었어요', value: false },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setAllPresent(opt.value)}
                  className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                    allPresent === opt.value
                      ? opt.value
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-rose-500 text-white shadow-md'
                      : 'bg-slate-100 text-[#4e5968] hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 주 근로시간 미리보기 */}
          {hours > 0 && days > 0 && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-[#4e5968]">주 소정근로시간</p>
              <p className={`text-sm font-extrabold ${hours * days >= 15 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {hours * days}시간 / 주
                {hours * days >= 15 ? ' ✓' : ' (15시간 미만)'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={calculate}
            disabled={!canCalc}
            className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all ${
              canCalc
                ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            주휴수당 계산하기
          </button>
        </div>

        {/* 결과 카드 */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                {result.eligible
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <AlertCircle className="w-5 h-5 text-rose-400" />
                }
                <p className="text-sm font-extrabold text-[#191f28]">
                  {result.eligible ? '주휴수당 발생' : '주휴수당 미발생'}
                </p>
              </div>

              {result.eligible && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4 text-center">
                  <p className="text-[11px] font-semibold text-emerald-600 mb-1">이번 주 주휴수당</p>
                  <p className="text-[32px] font-extrabold text-emerald-700 tracking-tight">
                    {formatWon(result.allowance)}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 px-4 py-3 space-y-2">
                {result.eligible && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8b95a1]">계산식</span>
                    <span className="font-semibold text-[#4e5968]">
                      ({result.weeklyHours}h ÷ 40h) × 8h × {formatWon(wage)}
                    </span>
                  </div>
                )}
                <p className="text-[12px] text-[#4e5968] leading-relaxed whitespace-pre-line">
                  {result.reason}
                </p>
              </div>

              <p className="text-[10px] text-[#8b95a1] text-center leading-relaxed">
                이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 참고 정보 */}
        <div className="bg-white rounded-[32px] border border-slate-100 px-5 py-5 space-y-3">
          <p className="text-sm font-extrabold text-[#191f28]">주휴수당 핵심 정리</p>
          <ul className="space-y-2 text-[12px] text-[#4e5968] leading-relaxed">
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold flex-shrink-0">①</span>
              <span><strong>대상</strong>: 1주 소정근로시간 15시간 이상인 모든 근로자 (일용직 포함)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold flex-shrink-0">②</span>
              <span><strong>조건</strong>: 해당 주 소정근로일 개근 (지각·조퇴는 결근 아님)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold flex-shrink-0">③</span>
              <span><strong>계산식</strong>: (주 소정근로시간 ÷ 40시간) × 8시간 × 시급</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 font-bold flex-shrink-0">④</span>
              <span><strong>미지급 시</strong>: 임금체불 — 고용노동부 신고 가능</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
