// 연차수당 계산 페이지 — 일용직 근로자 전용
// 1년 미만: 근로기준법 제60조 제2항 (1개월 만근 시 1일 발생, 최대 11일)
// 1년 이상: 근로기준법 제60조 제1항 (소정근로일 80% 이상 출근 시 15일 발생)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react'

type Tab = 'under1' | 'over1'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

// 일용직 1일 통상임금 = 시급 × 1일 소정근로시간
function calcDailyWage(hourlyWage: number, dailyHours: number) {
  return hourlyWage * dailyHours
}

export default function AnnualLeaveAllowancePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('under1')

  // 1년 미만 입력
  const [u_hourlyWage, u_setHourlyWage] = useState('')
  const [u_dailyHours, u_setDailyHours] = useState('')
  const [u_fullMonths, u_setFullMonths] = useState('')   // 만근한 개월 수
  const [u_usedDays, u_setUsedDays] = useState('')       // 이미 사용한 연차일수
  const [u_result, u_setResult] = useState<{
    earnedDays: number; unusedDays: number; allowance: number; dailyWage: number
  } | null>(null)

  // 1년 이상 입력
  const [o_hourlyWage, o_setHourlyWage] = useState('')
  const [o_dailyHours, o_setDailyHours] = useState('')
  const [o_workYears, o_setWorkYears] = useState('')     // 근속 연수
  const [o_scheduledDays, o_setScheduledDays] = useState('')  // 소정근로일수 (연간)
  const [o_actualDays, o_setActualDays] = useState('')   // 실제 출근일수
  const [o_usedDays, o_setUsedDays] = useState('')       // 이미 사용한 연차
  const [o_result, o_setResult] = useState<{
    attendanceRate: number; eligible: boolean; earnedDays: number; unusedDays: number; allowance: number; dailyWage: number; reason: string
  } | null>(null)

  // ── 1년 미만 계산 ───────────────────────────────────────────────
  const calcUnder1 = () => {
    const wage = Number(u_hourlyWage)
    const hours = Number(u_dailyHours)
    const months = Number(u_fullMonths)
    const used = Number(u_usedDays) || 0
    const dailyWage = calcDailyWage(wage, hours)
    const earnedDays = Math.min(months, 11)  // 최대 11일
    const unusedDays = Math.max(0, earnedDays - used)
    const allowance = Math.round(unusedDays * dailyWage)
    u_setResult({ earnedDays, unusedDays, allowance, dailyWage })
  }

  // ── 1년 이상 계산 ───────────────────────────────────────────────
  const calcOver1 = () => {
    const wage = Number(o_hourlyWage)
    const hours = Number(o_dailyHours)
    const years = Number(o_workYears)
    const scheduled = Number(o_scheduledDays)
    const actual = Number(o_actualDays)
    const used = Number(o_usedDays) || 0
    const dailyWage = calcDailyWage(wage, hours)
    const rate = scheduled > 0 ? (actual / scheduled) * 100 : 0

    // 기본 15일 + (근속 2년 초과마다 +1일, 최대 25일)
    const bonus = Math.floor(Math.max(0, years - 1) / 2)
    const baseDays = Math.min(25, 15 + bonus)

    if (rate < 80) {
      o_setResult({
        attendanceRate: rate,
        eligible: false,
        earnedDays: 0,
        unusedDays: 0,
        allowance: 0,
        dailyWage,
        reason: `출근율 ${rate.toFixed(1)}% < 80% → 연차 발생 요건 미충족\n(소정근로일 ${scheduled}일 중 ${actual}일 출근)`,
      })
      return
    }

    const unusedDays = Math.max(0, baseDays - used)
    const allowance = Math.round(unusedDays * dailyWage)
    o_setResult({
      attendanceRate: rate,
      eligible: true,
      earnedDays: baseDays,
      unusedDays,
      allowance,
      dailyWage,
      reason: `출근율 ${rate.toFixed(1)}% ≥ 80% + 근속 ${years}년 → 연차 ${baseDays}일 발생`,
    })
  }

  const u_canCalc = Number(u_hourlyWage) > 0 && Number(u_dailyHours) > 0 && Number(u_fullMonths) >= 0
  const o_canCalc = Number(o_hourlyWage) > 0 && Number(o_dailyHours) > 0 &&
    Number(o_workYears) >= 1 && Number(o_scheduledDays) > 0 && Number(o_actualDays) >= 0

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-10">
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5">
            <ChevronLeft className="w-5 h-5 text-[#191f28]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">연차수당 계산기</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[460px] mx-auto px-4 pt-5 space-y-4">
        {/* 안내 배너 */}
        <div className="rounded-[24px] bg-amber-50 border border-amber-100 p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-amber-800">일용직 연차수당이란?</p>
            <p className="text-[12px] text-amber-700 leading-relaxed">
              일용직도 계속근로관계가 인정되면 연차가 발생합니다.<br />
              근속기간과 출근율에 따라 <strong>1년 미만형</strong>(최대 11일)과<br />
              <strong>1년 이상형</strong>(15일 ~)으로 나뉩니다.
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 bg-white rounded-[20px] p-1.5 border border-slate-100 shadow-sm">
          {[
            { key: 'under1' as Tab, label: '1년 미만', sub: '월 만근 기준' },
            { key: 'over1' as Tab, label: '1년 이상', sub: '출근율 80% 기준' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-[14px] transition-all text-center ${
                tab === t.key ? 'bg-amber-500 text-white shadow-md' : 'text-[#4e5968] hover:bg-slate-50'
              }`}
            >
              <p className={`text-sm font-bold ${tab === t.key ? 'text-white' : 'text-[#191f28]'}`}>{t.label}</p>
              <p className={`text-[10px] ${tab === t.key ? 'text-amber-100' : 'text-[#8b95a1]'}`}>{t.sub}</p>
            </button>
          ))}
        </div>

        {/* 1년 미만 탭 */}
        {tab === 'under1' && (
          <motion.div key="under1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.06)] border border-slate-100 px-5 py-6 space-y-5">
              <p className="text-sm font-extrabold text-[#191f28]">1년 미만 연차수당</p>
              <p className="text-[12px] text-[#4e5968] leading-relaxed bg-amber-50 rounded-2xl px-4 py-3">
                한 달 소정근로일 <strong>전부 출근(만근)</strong>하면 다음 달에 연차 1일 발생.<br />
                최대 <strong>11개월 × 1일 = 11일</strong> 적립 가능.
              </p>

              {[
                { label: '시급', value: u_hourlyWage, set: u_setHourlyWage, placeholder: '예) 10030', unit: '원' },
                { label: '1일 소정근로시간', value: u_dailyHours, set: u_setDailyHours, placeholder: '예) 8', unit: '시간' },
                { label: '만근한 개월 수', value: u_fullMonths, set: u_setFullMonths, placeholder: '0 ~ 11', unit: '개월' },
                { label: '이미 사용한 연차일수', value: u_usedDays, set: u_setUsedDays, placeholder: '없으면 0', unit: '일' },
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">{field.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      min={0}
                      className="w-full px-4 py-3 pr-12 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1]">{field.unit}</span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={calcUnder1}
                disabled={!u_canCalc}
                className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${
                  u_canCalc
                    ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                연차수당 계산하기
              </button>
            </div>

            <AnimatePresence>
              {u_result && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    {u_result.unusedDays > 0
                      ? <CheckCircle2 className="w-5 h-5 text-amber-500" />
                      : <AlertCircle className="w-5 h-5 text-slate-400" />
                    }
                    <p className="text-sm font-extrabold text-[#191f28]">연차수당 계산 결과</p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-center">
                    <p className="text-[11px] font-semibold text-amber-600 mb-1">미사용 연차수당</p>
                    <p className="text-[32px] font-extrabold text-amber-700 tracking-tight">
                      {formatWon(u_result.allowance)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8b95a1]">발생 연차</span>
                      <span className="font-semibold text-[#4e5968]">{u_result.earnedDays}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b95a1]">미사용 연차</span>
                      <span className="font-semibold text-[#4e5968]">{u_result.unusedDays}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b95a1]">1일 통상임금</span>
                      <span className="font-semibold text-[#4e5968]">{formatWon(u_result.dailyWage)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8b95a1] text-center">이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 1년 이상 탭 */}
        {tab === 'over1' && (
          <motion.div key="over1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.06)] border border-slate-100 px-5 py-6 space-y-5">
              <p className="text-sm font-extrabold text-[#191f28]">1년 이상 연차수당</p>
              <p className="text-[12px] text-[#4e5968] leading-relaxed bg-amber-50 rounded-2xl px-4 py-3">
                1년간 소정근로일의 <strong>80% 이상</strong> 출근 시 <strong>15일</strong> 발생.<br />
                이후 2년마다 1일 추가 (최대 25일).<br />
                <span className="text-[11px] text-amber-600">일용직은 계속근로관계 인정 여부가 핵심입니다.</span>
              </p>

              {[
                { label: '시급', value: o_hourlyWage, set: o_setHourlyWage, placeholder: '예) 10030', unit: '원' },
                { label: '1일 소정근로시간', value: o_dailyHours, set: o_setDailyHours, placeholder: '예) 8', unit: '시간' },
                { label: '계속근로 연수', value: o_workYears, set: o_setWorkYears, placeholder: '예) 2 (2년)', unit: '년' },
                { label: '연간 소정근로일수', value: o_scheduledDays, set: o_setScheduledDays, placeholder: '예) 260', unit: '일' },
                { label: '실제 출근일수 (연간)', value: o_actualDays, set: o_setActualDays, placeholder: '예) 210', unit: '일' },
                { label: '이미 사용한 연차일수', value: o_usedDays, set: o_setUsedDays, placeholder: '없으면 0', unit: '일' },
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">{field.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      min={0}
                      className="w-full px-4 py-3 pr-12 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1]">{field.unit}</span>
                  </div>
                </div>
              ))}

              {/* 출근율 미리보기 */}
              {Number(o_scheduledDays) > 0 && Number(o_actualDays) >= 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-[#4e5968]">출근율</p>
                  <p className={`text-sm font-extrabold ${
                    (Number(o_actualDays) / Number(o_scheduledDays)) * 100 >= 80 ? 'text-amber-600' : 'text-rose-500'
                  }`}>
                    {((Number(o_actualDays) / Number(o_scheduledDays)) * 100).toFixed(1)}%
                    {(Number(o_actualDays) / Number(o_scheduledDays)) * 100 >= 80 ? ' ✓' : ' (80% 미만)'}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={calcOver1}
                disabled={!o_canCalc}
                className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${
                  o_canCalc
                    ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                연차수당 계산하기
              </button>
            </div>

            <AnimatePresence>
              {o_result && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    {o_result.eligible
                      ? <CheckCircle2 className="w-5 h-5 text-amber-500" />
                      : <AlertCircle className="w-5 h-5 text-rose-400" />
                    }
                    <p className="text-sm font-extrabold text-[#191f28]">
                      {o_result.eligible ? '연차수당 발생' : '연차 요건 미충족'}
                    </p>
                  </div>

                  {o_result.eligible && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-center">
                      <p className="text-[11px] font-semibold text-amber-600 mb-1">미사용 연차수당</p>
                      <p className="text-[32px] font-extrabold text-amber-700 tracking-tight">
                        {formatWon(o_result.allowance)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8b95a1]">출근율</span>
                      <span className="font-semibold text-[#4e5968]">{o_result.attendanceRate.toFixed(1)}%</span>
                    </div>
                    {o_result.eligible && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#8b95a1]">발생 연차</span>
                          <span className="font-semibold text-[#4e5968]">{o_result.earnedDays}일</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b95a1]">미사용 연차</span>
                          <span className="font-semibold text-[#4e5968]">{o_result.unusedDays}일</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b95a1]">1일 통상임금</span>
                          <span className="font-semibold text-[#4e5968]">{formatWon(o_result.dailyWage)}</span>
                        </div>
                      </>
                    )}
                    <p className="text-[#4e5968] leading-relaxed whitespace-pre-line pt-1">{o_result.reason}</p>
                  </div>
                  <p className="text-[10px] text-[#8b95a1] text-center">이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 참고 정보 */}
        <div className="bg-white rounded-[32px] border border-slate-100 px-5 py-5 space-y-3">
          <p className="text-sm font-extrabold text-[#191f28]">일용직 연차 핵심 정리</p>
          <ul className="space-y-2 text-[12px] text-[#4e5968] leading-relaxed">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold flex-shrink-0">①</span>
              <span><strong>계속근로 인정</strong>: 실질적으로 계속 고용되었다면 일용직도 적용</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold flex-shrink-0">②</span>
              <span><strong>1년 미만</strong>: 월 만근 시 다음 달 연차 1일 (최대 11일)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold flex-shrink-0">③</span>
              <span><strong>1년 이상</strong>: 소정근로일 80% 이상 출근 시 15일 (2년마다 +1일, 최대 25일)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold flex-shrink-0">④</span>
              <span><strong>연차수당</strong>: 퇴직 전 미사용 연차 × 1일 통상임금 (= 시급 × 1일 소정근로시간)</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
