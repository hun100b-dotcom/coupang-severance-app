// 연차수당 계산 페이지 — 설문 → 간편/PDF 정밀계산
// 근거: 근로기준법 제60조
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info,
  FileText, Calculator, ChevronRight, Upload, Loader2,
} from 'lucide-react'
import {
  calcAnnualLeavePrecise,
  extractAnnualLeaveCompanies,
  type AnnualLeavePreciseResult,
} from '../lib/api'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

type Step = 'survey' | 'mode' | 'simple' | 'pdf'
type Purpose = '발생일수' | '미지급청구' | '남은일수'

interface Survey {
  purpose: Purpose | null
  hireDate: string       // "YYYY-MM-DD"
  isStillWorking: boolean | null
  endDate: string        // "YYYY-MM-DD" or ''
  avgDailyWage: string
  usedDays: string
}

interface SimpleResult {
  yearsWorked: number
  monthsWorked: number
  firstYearDays: number
  annualDays: number
  totalEntitlement: number
  usedDays: number
  remainingDays: number
  unpaidAllowance: number | null
}

// ── 연차 발생일수 계산 (프론트엔드 간편 버전)
function calcSimpleAnnualLeave(survey: Survey): SimpleResult {
  const hire = new Date(survey.hireDate)
  const end  = survey.isStillWorking === false && survey.endDate
    ? new Date(survey.endDate)
    : new Date()
  const diffMs  = end.getTime() - hire.getTime()
  const totalDays = diffMs / (1000 * 60 * 60 * 24)
  const totalMonths = Math.floor(totalDays / 30.44)
  const yearsWorked = Math.floor(totalMonths / 12)
  const monthsWorked = totalMonths

  const firstYearDays = Math.min(totalMonths, 11)

  let annualDays = 0
  if (yearsWorked >= 3) annualDays = Math.min(15 + Math.floor((yearsWorked - 1) / 2), 25)
  else if (yearsWorked >= 1) annualDays = 15

  // 총 발생 연차 (누적 간이 계산)
  let total = 0
  if (yearsWorked === 0) {
    total = firstYearDays
  } else {
    total = 11 // 첫해
    for (let y = 1; y <= yearsWorked; y++) {
      if (y < 3) total += 15
      else total += Math.min(15 + Math.floor((y - 1) / 2), 25)
    }
    const remMonths = totalMonths % 12
    total += Math.round(annualDays * remMonths / 12)
  }

  const used = Number(survey.usedDays) || 0
  const remaining = Math.max(total - used, 0)
  const wage = Number(survey.avgDailyWage.replace(/,/g, '')) || 0
  const unpaid = wage > 0 ? Math.round(remaining * wage) : null

  return { yearsWorked, monthsWorked, firstYearDays, annualDays, totalEntitlement: total, usedDays: used, remainingDays: remaining, unpaidAllowance: unpaid }
}

export default function AnnualLeaveAllowancePage() {
  const navigate = useNavigate()

  const [survey, setSurvey] = useState<Survey>({
    purpose: null, hireDate: '', isStillWorking: null, endDate: '', avgDailyWage: '', usedDays: '0',
  })
  const [step, setStep]       = useState<Step>('survey')
  const [simpleResult, setSimpleResult] = useState<SimpleResult | null>(null)

  // PDF 계산 상태
  const [pdfFile, setPdfFile]           = useState<File | null>(null)
  const [pdfCompanies, setPdfCompanies] = useState<string[] | null>(null)
  const [pdfCompany, setPdfCompany]     = useState('')
  const [pdfOther, setPdfOther]         = useState('')
  const [pdfLoading, setPdfLoading]     = useState(false)
  const [pdfResult, setPdfResult]       = useState<AnnualLeavePreciseResult | null>(null)
  const [pdfError, setPdfError]         = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const wage = Number(survey.avgDailyWage.replace(/,/g, ''))

  const surveyComplete =
    survey.purpose !== null &&
    survey.hireDate !== '' &&
    survey.isStillWorking !== null &&
    (survey.isStillWorking === true || survey.endDate !== '')

  // ── 간편계산 실행
  const runSimple = () => {
    setSimpleResult(calcSimpleAnnualLeave(survey))
    setStep('simple')
  }

  // ── PDF 파일 선택
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPdfFile(f)
    setPdfCompanies(null)
    setPdfCompany('')
    setPdfResult(null)
    setPdfError('')
    setPdfLoading(true)
    try {
      const data = await extractAnnualLeaveCompanies(f)
      if (data.companies.length === 0) {
        setPdfError('PDF에서 회사 정보를 찾지 못했습니다. 근로복지공단 일용근로내역서인지 확인해 주세요.')
      } else {
        setPdfCompanies(data.companies)
        setPdfCompany(data.companies[0])
      }
    } catch {
      setPdfError('PDF 업로드 중 오류가 발생했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  // ── PDF 정밀계산 실행
  const runPrecise = async () => {
    if (!pdfFile || !pdfCompany || !survey.hireDate) return
    setPdfLoading(true)
    setPdfError('')
    setPdfResult(null)
    try {
      const fd = new FormData()
      fd.append('file', pdfFile)
      fd.append('company', pdfCompany)
      fd.append('company_other', pdfCompany === '기타' ? pdfOther : '')
      fd.append('hire_date_str', survey.hireDate)
      fd.append('end_date_str', survey.endDate || '')
      fd.append('used_days', survey.usedDays || '0')
      fd.append('avg_daily_wage', String(wage))
      const result = await calcAnnualLeavePrecise(fd)
      if (result.error) {
        setPdfError(result.error)
      } else {
        setPdfResult(result)
      }
    } catch {
      setPdfError('계산 중 오류가 발생했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  const canRunPrecise = pdfFile && pdfCompany && survey.hireDate && !pdfLoading &&
    (pdfCompany !== '기타' || pdfOther.trim())

  const PURPOSES: { value: Purpose; label: string; sub: string }[] = [
    { value: '발생일수', label: '연차 발생일수 확인', sub: '내 연차가 몇 일 발생했나요?' },
    { value: '미지급청구', label: '미지급 연차수당 청구', sub: '못 받은 연차수당이 얼마인지 계산해요' },
    { value: '남은일수', label: '남은 연차일수 계산', sub: '현재 남은 연차가 며칠인지 확인해요' },
  ]

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
          <button
            type="button"
            onClick={() => {
              if (step === 'mode') setStep('survey')
              else if (step === 'simple' || step === 'pdf') setStep('mode')
              else navigate(-1)
            }}
            className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[#191f28]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">연차수당 계산기</h1>
          </div>
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  (step === 'survey' && i === 0) ||
                  (step === 'mode' && i <= 1) ||
                  ((step === 'simple' || step === 'pdf') && i <= 2)
                    ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: 설문 ═══ */}
          {step === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* 안내 배너 */}
              <div className="rounded-[24px] bg-amber-50/80 backdrop-blur-md border border-amber-100/80 p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-extrabold text-amber-800">연차수당이란?</p>
                  <p className="text-[12px] text-amber-700 leading-relaxed mt-0.5">
                    사용하지 못한 연차휴가에 대해 <strong>금전으로 보상</strong>받을 수 있어요.
                    퇴직 시 미사용 연차는 <strong>반드시 수당으로 지급</strong>받아야 합니다.
                  </p>
                </div>
              </div>

              {/* 설문 카드 */}
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-5">
                <p className="text-sm font-extrabold text-[#191f28]">기본 정보 입력</p>

                {/* 목적 선택 */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#4e5968]">무엇이 궁금하세요? <span className="text-rose-500">*</span></label>
                  <div className="space-y-2">
                    {PURPOSES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setSurvey(s => ({ ...s, purpose: p.value }))}
                        className={`w-full px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                          survey.purpose === p.value
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 border border-white/60 text-[#191f28] hover:bg-white/70'
                        }`}
                      >
                        <p className="text-sm font-bold">{p.label}</p>
                        <p className={`text-[11px] mt-0.5 ${survey.purpose === p.value ? 'text-white/80' : 'text-[#8b95a1]'}`}>{p.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 입사일 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">입사일 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={survey.hireDate}
                    onChange={e => setSurvey(s => ({ ...s, hireDate: e.target.value }))}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                  />
                </div>

                {/* 재직 여부 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">현재 재직 중인가요? <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: '재직 중이에요', value: true }, { label: '퇴직했어요', value: false }].map(opt => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setSurvey(s => ({ ...s, isStillWorking: opt.value, endDate: opt.value ? '' : s.endDate }))}
                        className={`py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                          survey.isStillWorking === opt.value
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white/50 border border-white/60 text-[#4e5968] hover:bg-white/70'
                        }`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* 퇴직일 (퇴직한 경우) */}
                {survey.isStillWorking === false && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#4e5968]">퇴직일 <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={survey.endDate}
                      onChange={e => setSurvey(s => ({ ...s, endDate: e.target.value }))}
                      min={survey.hireDate || undefined}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                    />
                  </div>
                )}

                {/* 사용한 연차 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">이미 사용한 연차일수 <span className="text-slate-400">(없으면 0)</span></label>
                  <div className="relative">
                    <input
                      type="number"
                      value={survey.usedDays}
                      onChange={e => setSurvey(s => ({ ...s, usedDays: e.target.value }))}
                      placeholder="0" min={0}
                      className="w-full px-4 py-3 pr-10 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">일</span>
                  </div>
                </div>

                {/* 평균 일급 (미지급 청구·남은일수 계산 시) */}
                {(survey.purpose === '미지급청구' || survey.purpose === '남은일수') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#4e5968]">평균 일급 <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={survey.avgDailyWage}
                        onChange={e => setSurvey(s => ({ ...s, avgDailyWage: e.target.value }))}
                        placeholder="예) 100000" min={0}
                        className="w-full px-4 py-3 pr-10 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">원</span>
                    </div>
                    <p className="text-[11px] text-[#8b95a1]">연차수당 = 남은 연차일수 × 평균 일급</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep('mode')}
                  disabled={!surveyComplete}
                  className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                    surveyComplete
                      ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                      : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                  }`}
                >
                  계산 방법 선택하기 <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 핵심 정리 */}
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.04)] px-5 py-5 space-y-3">
                <p className="text-sm font-extrabold text-[#191f28]">연차 발생 기준 정리</p>
                <ul className="space-y-2 text-[12px] text-[#4e5968] leading-relaxed">
                  {[
                    ['①', '입사 후 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)'],
                    ['②', '1년 이상~3년 미만: 15일/년'],
                    ['③', '3년 이상: 매 2년마다 1일 추가 (최대 25일)'],
                    ['④', '퇴직 시 미사용 연차: 반드시 수당으로 지급 (근로기준법 제60조)'],
                  ].map(([n, text]) => (
                    <li key={n} className="flex gap-2">
                      <span className="text-amber-500 font-bold flex-shrink-0">{n}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: 계산 방법 선택 ═══ */}
          {step === 'mode' && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* 요약 */}
              <div className="rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/60 px-4 py-3">
                <p className="text-xs font-bold text-[#4e5968] mb-2">입력하신 정보</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">목적</p>
                    <p className="text-sm font-extrabold text-[#191f28]">{survey.purpose}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">입사일</p>
                    <p className="text-sm font-extrabold text-[#191f28]">{survey.hireDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">재직 상태</p>
                    <p className="text-sm font-extrabold text-[#191f28]">{survey.isStillWorking ? '재직 중' : '퇴직'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">사용 연차</p>
                    <p className="text-sm font-extrabold text-[#191f28]">{survey.usedDays || '0'}일</p>
                  </div>
                </div>
              </div>

              <p className="text-base font-extrabold text-[#191f28] px-1">계산 방법을 선택하세요</p>

              {/* 간편계산 */}
              <button
                type="button"
                onClick={runSimple}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-extrabold text-[#191f28]">간편 계산</p>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">즉시 확인</span>
                  </div>
                  <p className="text-[12px] text-[#4e5968] leading-relaxed">
                    입력하신 정보로 연차 발생일수와<br />미지급 수당을 바로 계산해요.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8b95a1] flex-shrink-0 mt-1" />
              </button>

              {/* PDF 정밀계산 */}
              <button
                type="button"
                onClick={() => setStep('pdf')}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-extrabold text-[#191f28]">PDF 정밀 계산</p>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">월별 분석</span>
                  </div>
                  <p className="text-[12px] text-[#4e5968] leading-relaxed">
                    근로복지공단 일용근로내역서 PDF로<br />월별 개근 기록을 분석해 정밀하게 계산해요.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8b95a1] flex-shrink-0 mt-1" />
              </button>
            </motion.div>
          )}

          {/* ═══ STEP 3a: 간편계산 결과 ═══ */}
          {step === 'simple' && simpleResult && (
            <motion.div
              key="simple"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  <p className="text-sm font-extrabold text-[#191f28]">연차수당 계산 결과</p>
                </div>

                {/* 미지급 수당 (목적에 따라 표시) */}
                {(survey.purpose === '미지급청구' || survey.purpose === '남은일수') && simpleResult.unpaidAllowance !== null && (
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-100 px-5 py-5 text-center">
                    <p className="text-[11px] font-semibold text-amber-600 mb-1">미지급 연차수당</p>
                    <p className="text-[36px] font-extrabold text-amber-700 tracking-tight">
                      {formatWon(simpleResult.unpaidAllowance)}
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">남은 {simpleResult.remainingDays}일 × 일급 {formatWon(wage)}</p>
                  </div>
                )}

                {/* 상세 수치 */}
                <div className="space-y-2">
                  {[
                    ['근속 기간', `${simpleResult.yearsWorked}년 ${simpleResult.monthsWorked % 12}개월`],
                    ['총 발생 연차', `${simpleResult.totalEntitlement}일`],
                    ['사용한 연차', `${simpleResult.usedDays}일`],
                    ['남은 연차', `${simpleResult.remainingDays}일`],
                    ...(simpleResult.yearsWorked === 0
                      ? [['1년 미만 발생 (개근 기준)', `${simpleResult.firstYearDays}일`]]
                      : [['연간 발생 연차 (현재 연도)', `${simpleResult.annualDays}일`]]),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/50 border border-white/60">
                      <span className="text-[12px] text-[#4e5968]">{label}</span>
                      <span className="text-sm font-bold text-[#191f28]">{value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[#8b95a1] text-center leading-relaxed">
                  이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
                </p>

                <button
                  type="button"
                  onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setStep('pdf') }}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />PDF로 정밀 계산하기
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3b: PDF 정밀계산 ═══ */}
          {step === 'pdf' && (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {!pdfResult && (
                <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                  <p className="text-sm font-extrabold text-[#191f28]">PDF 정밀 계산</p>
                  <p className="text-[12px] text-[#4e5968]">
                    근로복지공단에서 발급받은 <strong>일용근로내역서 PDF</strong>를 업로드하면<br />
                    월별 개근 기록을 분석해 연차를 정밀하게 계산해 드려요.
                  </p>

                  <div>
                    <input type="file" accept=".pdf" ref={fileRef} onChange={handleFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-5 flex flex-col items-center gap-2 hover:bg-blue-50 transition-colors active:scale-[0.98]"
                    >
                      <Upload className="w-6 h-6 text-blue-400" />
                      {pdfFile ? (
                        <p className="text-sm font-semibold text-blue-700">{pdfFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-blue-600">PDF 파일 선택</p>
                          <p className="text-[11px] text-blue-400">근로복지공단 일용근로내역서</p>
                        </>
                      )}
                    </button>
                  </div>

                  {pdfLoading && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <p className="text-sm text-[#4e5968]">PDF 분석 중...</p>
                    </div>
                  )}

                  {pdfError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-rose-700">{pdfError}</p>
                    </div>
                  )}

                  {pdfCompanies && pdfCompanies.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#4e5968]">사업장 선택</label>
                      <div className="space-y-1.5">
                        {pdfCompanies.map(c => (
                          <button
                            key={c} type="button"
                            onClick={() => setPdfCompany(c)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                              pdfCompany === c
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-white/50 border border-white/60 text-[#191f28] hover:bg-white/70'
                            }`}
                          >{c}</button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPdfCompany('기타')}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                            pdfCompany === '기타'
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-white/50 border border-white/60 text-[#191f28] hover:bg-white/70'
                          }`}
                        >직접 입력</button>
                      </div>
                      {pdfCompany === '기타' && (
                        <input
                          type="text" value={pdfOther} onChange={e => setPdfOther(e.target.value)}
                          placeholder="사업장명 직접 입력"
                          className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                        />
                      )}
                    </div>
                  )}

                  <button
                    type="button" onClick={runPrecise} disabled={!canRunPrecise}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      canRunPrecise
                        ? 'bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:bg-blue-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}
                  >
                    {pdfLoading ? <><Loader2 className="w-4 h-4 animate-spin" />계산 중...</> : '월별 개근 기록 분석하기'}
                  </button>
                </div>
              )}

              {/* PDF 결과 */}
              {pdfResult && !pdfResult.error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      <p className="text-sm font-extrabold text-[#191f28]">연차 정밀 분석 완료</p>
                    </div>

                    {/* 미지급 수당 */}
                    {pdfResult.unpaid_allowance !== null && (
                      <div className="rounded-2xl bg-amber-50/80 border border-amber-100 px-5 py-4 text-center mb-4">
                        <p className="text-[11px] font-semibold text-amber-600 mb-1">미지급 연차수당</p>
                        <p className="text-[36px] font-extrabold text-amber-700 tracking-tight">
                          {formatWon(pdfResult.unpaid_allowance)}
                        </p>
                        <p className="text-[11px] text-amber-600 mt-1">
                          남은 {pdfResult.remaining_days}일 × 일급 {formatWon(pdfResult.avg_daily_wage)}
                        </p>
                      </div>
                    )}

                    {/* 상세 수치 */}
                    <div className="space-y-2">
                      {[
                        ['분석 기간', `${pdfResult.hire_date} ~ ${pdfResult.ref_date}`],
                        ['근속 기간', `${pdfResult.years_worked}년 ${pdfResult.months_worked % 12}개월`],
                        ['개근 확인 개월 수', `${pdfResult.attended_months}개월`],
                        ['총 발생 연차', `${pdfResult.total_entitlement}일`],
                        ['사용한 연차', `${pdfResult.used_days}일`],
                        ['남은 연차', `${pdfResult.remaining_days}일`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/50 border border-white/60">
                          <span className="text-[12px] text-[#4e5968]">{label}</span>
                          <span className="text-sm font-bold text-[#191f28]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 월별 상세 */}
                  {pdfResult.monthly_detail.length > 0 && (
                    <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.06)] px-4 py-4">
                      <p className="text-sm font-extrabold text-[#191f28] mb-3">월별 근무 현황</p>
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {pdfResult.monthly_detail.map(m => (
                          <div
                            key={m.month}
                            className={`rounded-xl px-3 py-2 flex items-center justify-between ${
                              m.attended ? 'bg-emerald-50/60 border border-emerald-100' : 'bg-white/40 border border-white/60'
                            }`}
                          >
                            <p className="text-[12px] font-semibold text-[#191f28]">{m.month}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-[#8b95a1]">{m.work_days}일 근무</p>
                              {m.attended
                                ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">개근</span>
                                : <span className="text-[10px] font-bold text-[#8b95a1] bg-gray-100 px-2 py-0.5 rounded-full">미개근</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setPdfError('') }}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold border border-white/60 bg-white/50 text-[#4e5968] hover:bg-white/70 active:scale-[0.98] transition-all"
                  >
                    다시 계산하기
                  </button>

                  <p className="text-[10px] text-[#8b95a1] text-center leading-relaxed">
                    이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
