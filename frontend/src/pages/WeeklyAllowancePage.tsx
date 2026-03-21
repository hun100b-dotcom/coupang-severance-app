// 주휴수당 계산 페이지 — 설문 → 간편/PDF 정밀계산
// 근거: 근로기준법 제55조, 제18조
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info,
  FileText, Calculator, ChevronRight, Upload, Loader2,
} from 'lucide-react'
import {
  calcWeeklyAllowancePrecise,
  extractWeeklyAllowanceCompanies,
  type WeeklyAllowancePreciseResult,
} from '../lib/api'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

type Step = 'survey' | 'mode' | 'simple' | 'pdf'

interface Survey {
  weeklyDays: number | null
  dailyHours: string
  allPresent: boolean | null
}

// ── 간편 계산 결과 타입
interface SimpleResult {
  weeklyHours: number
  eligible: boolean
  allowance: number
  reason: string
}

export default function WeeklyAllowancePage() {
  const navigate = useNavigate()

  // 설문 상태
  const [survey, setSurvey] = useState<Survey>({ weeklyDays: null, dailyHours: '', allPresent: null })
  const [hourlyWage, setHourlyWage] = useState('')
  const [step, setStep] = useState<Step>('survey')

  // 간편계산 결과
  const [simpleResult, setSimpleResult] = useState<SimpleResult | null>(null)

  // PDF 계산 상태
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfCompanies, setPdfCompanies] = useState<string[] | null>(null)
  const [pdfCompany, setPdfCompany] = useState('')
  const [pdfOther, setPdfOther] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult] = useState<WeeklyAllowancePreciseResult | null>(null)
  const [pdfError, setPdfError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const wage = Number(hourlyWage.replace(/,/g, ''))
  const hours = Number(survey.dailyHours)
  const days = survey.weeklyDays ?? 0

  const surveyComplete = days > 0 && hours > 0 && hours <= 12 && survey.allPresent !== null && wage > 0

  // ── 간편계산 실행
  const runSimple = () => {
    const weeklyHours = hours * days
    if (!survey.allPresent) {
      setSimpleResult({ weeklyHours, eligible: false, allowance: 0,
        reason: '소정근로일을 개근하지 않아 주휴수당 발생 요건 미충족입니다.\n(근로기준법 제55조: 1주 소정근로일 개근 조건 필요)' })
      return
    }
    if (weeklyHours < 15) {
      setSimpleResult({ weeklyHours, eligible: false, allowance: 0,
        reason: `주 소정근로시간이 ${weeklyHours}시간으로 15시간 미만이므로 주휴수당 적용 대상이 아닙니다.\n(근로기준법 제18조: 4주 평균 주 15시간 미만 단시간 근로자는 적용 제외)` })
      return
    }
    const allowance = Math.round((weeklyHours / 40) * 8 * wage)
    setSimpleResult({ weeklyHours, eligible: true, allowance,
      reason: `주 ${weeklyHours}시간 근무 + 소정근로일 개근 → 주휴수당 발생` })
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
      const data = await extractWeeklyAllowanceCompanies(f)
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
    if (!pdfFile || !pdfCompany) return
    setPdfLoading(true)
    setPdfError('')
    setPdfResult(null)
    try {
      const fd = new FormData()
      fd.append('file', pdfFile)
      fd.append('company', pdfCompany)
      fd.append('company_other', pdfCompany === '기타' ? pdfOther : '')
      fd.append('hourly_wage', String(wage))
      fd.append('daily_hours', String(hours || 8))
      const result = await calcWeeklyAllowancePrecise(fd)
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

  const canRunPrecise = pdfFile && pdfCompany && wage > 0 && !pdfLoading &&
    (pdfCompany !== '기타' || pdfOther.trim())

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
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">주휴수당 계산기</h1>
          </div>
          {/* 단계 표시 */}
          <div className="ml-auto flex gap-1">
            {(['survey', 'mode', step === 'simple' ? 'simple' : 'pdf'] as const).map((_s, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  (step === 'survey' && i === 0) ||
                  (step === 'mode' && i <= 1) ||
                  ((step === 'simple' || step === 'pdf') && i <= 2)
                    ? 'bg-emerald-500' : 'bg-gray-200'
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
              <div className="rounded-[24px] bg-emerald-50/80 backdrop-blur-md border border-emerald-100/80 p-4 flex gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-800">주휴수당이란?</p>
                  <p className="text-[12px] text-emerald-700 leading-relaxed mt-0.5">
                    1주 소정근로시간 <strong>15시간 이상</strong>이고, 소정근로일을 <strong>개근</strong>하면
                    1주에 하루치 유급휴일 수당이 발생합니다.
                  </p>
                </div>
              </div>

              {/* 설문 카드 */}
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-5">
                <p className="text-sm font-extrabold text-[#191f28]">기본 정보 입력</p>

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

                {/* 주 근무일수 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">1주 근무일수 <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[1,2,3,4,5,6,7].map(d => (
                      <button key={d} type="button" onClick={() => setSurvey(s => ({ ...s, weeklyDays: d }))}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          survey.weeklyDays === d
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                            : 'bg-white/50 border border-white/60 text-[#4e5968] hover:bg-white/70'
                        }`}
                      >{d}일</button>
                    ))}
                  </div>
                </div>

                {/* 1일 근로시간 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">1일 소정근로시간 <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type="number" value={survey.dailyHours}
                      onChange={e => setSurvey(s => ({ ...s, dailyHours: e.target.value }))}
                      placeholder="예) 8" min={1} max={12}
                      className="w-full px-4 py-3 pr-16 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8b95a1] font-medium">시간/일</span>
                  </div>
                </div>

                {/* 개근 여부 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4e5968]">이번 주 소정근로일 개근했나요? <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: '네, 개근했어요', value: true }, { label: '아니요, 결근 있었어요', value: false }].map(opt => (
                      <button key={String(opt.value)} type="button"
                        onClick={() => setSurvey(prev => ({ ...prev, allPresent: opt.value }))}
                        className={`py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                          survey.allPresent === opt.value
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
                  type="button" onClick={() => setStep('mode')} disabled={!surveyComplete}
                  className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                    surveyComplete
                      ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                      : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                  }`}
                >
                  계산 방법 선택하기 <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 핵심 정리 */}
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.04)] px-5 py-5 space-y-3">
                <p className="text-sm font-extrabold text-[#191f28]">주휴수당 핵심 정리</p>
                <ul className="space-y-2 text-[12px] text-[#4e5968] leading-relaxed">
                  {[
                    ['①', <><strong>대상</strong>: 1주 소정근로시간 15시간 이상인 모든 근로자 (일용직 포함)</>],
                    ['②', <><strong>조건</strong>: 해당 주 소정근로일 개근 (지각·조퇴는 결근 아님)</>],
                    ['③', <><strong>계산식</strong>: (주 소정근로시간 ÷ 40시간) × 8시간 × 시급</>],
                    ['④', <><strong>미지급 시</strong>: 임금체불 — 고용노동부(1350) 신고 가능</>],
                  ].map(([n, text]) => (
                    <li key={n as string} className="flex gap-2">
                      <span className="text-emerald-500 font-bold flex-shrink-0">{n}</span>
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
              {/* 입력값 요약 */}
              <div className="rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/60 px-4 py-3">
                <p className="text-xs font-bold text-[#4e5968] mb-2">입력하신 정보</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">시급</p>
                    <p className="text-sm font-extrabold text-[#191f28]">{formatWon(wage)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">주 {survey.weeklyDays}일 × {hours}시간</p>
                    <p className="text-sm font-extrabold text-[#191f28]">주 {(survey.weeklyDays ?? 0) * hours}시간</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8b95a1]">개근</p>
                    <p className={`text-sm font-extrabold ${survey.allPresent ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {survey.allPresent ? '개근 ✓' : '결근 있음'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-base font-extrabold text-[#191f28] px-1">계산 방법을 선택하세요</p>

              {/* 간편계산 선택 */}
              <button
                type="button"
                onClick={() => { runSimple(); setStep('simple') }}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-extrabold text-[#191f28]">간편 계산</p>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">즉시 확인</span>
                  </div>
                  <p className="text-[12px] text-[#4e5968] leading-relaxed">
                    입력하신 정보를 바탕으로<br />이번 주 주휴수당을 바로 계산해요.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8b95a1] flex-shrink-0 mt-1" />
              </button>

              {/* PDF 정밀계산 선택 */}
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
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">주차별 분석</span>
                  </div>
                  <p className="text-[12px] text-[#4e5968] leading-relaxed">
                    근로복지공단 일용근로내역서 PDF로<br />주차별 주휴수당을 정밀하게 분석해요.
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
                  {simpleResult.eligible
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <AlertCircle className="w-5 h-5 text-rose-400" />}
                  <p className="text-sm font-extrabold text-[#191f28]">
                    {simpleResult.eligible ? '주휴수당 발생' : '주휴수당 미발생'}
                  </p>
                </div>

                {simpleResult.eligible && (
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-100 px-5 py-5 text-center">
                    <p className="text-[11px] font-semibold text-emerald-600 mb-1">이번 주 주휴수당</p>
                    <p className="text-[36px] font-extrabold text-emerald-700 tracking-tight">
                      {formatWon(simpleResult.allowance)}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-white/50 border border-white/60 px-4 py-3 space-y-2">
                  {simpleResult.eligible && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#8b95a1]">계산식</span>
                      <span className="font-semibold text-[#4e5968]">
                        ({simpleResult.weeklyHours}h ÷ 40h) × 8h × {formatWon(wage)}
                      </span>
                    </div>
                  )}
                  <p className="text-[12px] text-[#4e5968] leading-relaxed whitespace-pre-line">{simpleResult.reason}</p>
                </div>

                <p className="text-[10px] text-[#8b95a1] text-center">
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
              {/* PDF 업로드 카드 */}
              {!pdfResult && (
                <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                  <p className="text-sm font-extrabold text-[#191f28]">PDF 정밀 계산</p>
                  <p className="text-[12px] text-[#4e5968]">
                    근로복지공단에서 발급받은 <strong>일용근로내역서 PDF</strong>를 업로드하면<br />
                    주차별 주휴수당을 자동으로 계산해 드려요.
                  </p>

                  {/* 파일 업로드 */}
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

                  {/* 회사 선택 */}
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
                          className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
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
                    {pdfLoading ? <><Loader2 className="w-4 h-4 animate-spin" />계산 중...</> : '주차별 주휴수당 분석하기'}
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
                  {/* 총합 */}
                  <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      <p className="text-sm font-extrabold text-[#191f28]">주차별 주휴수당 분석 완료</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50/80 border border-blue-100 px-5 py-4 text-center mb-3">
                      <p className="text-[11px] font-semibold text-blue-600 mb-1">총 주휴수당 합계</p>
                      <p className="text-[36px] font-extrabold text-blue-700 tracking-tight">
                        {formatWon(pdfResult.total_allowance)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white/50 border border-white/60 px-2 py-2.5">
                        <p className="text-[10px] text-[#8b95a1]">전체 주차</p>
                        <p className="text-sm font-extrabold text-[#191f28]">{pdfResult.total_weeks}주</p>
                      </div>
                      <div className="rounded-xl bg-white/50 border border-white/60 px-2 py-2.5">
                        <p className="text-[10px] text-[#8b95a1]">주휴수당 발생</p>
                        <p className="text-sm font-extrabold text-emerald-600">{pdfResult.eligible_weeks}주</p>
                      </div>
                      <div className="rounded-xl bg-white/50 border border-white/60 px-2 py-2.5">
                        <p className="text-[10px] text-[#8b95a1]">적용 시급</p>
                        <p className="text-sm font-extrabold text-[#191f28]">{formatWon(pdfResult.hourly_wage)}</p>
                      </div>
                    </div>
                  </div>

                  {/* 주차별 상세 */}
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.06)] px-4 py-4">
                    <p className="text-sm font-extrabold text-[#191f28] mb-3">주차별 상세</p>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {pdfResult.weeks.map(w => (
                        <div
                          key={w.week_key}
                          className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                            w.eligible ? 'bg-emerald-50/60 border border-emerald-100' : 'bg-white/40 border border-white/60'
                          }`}
                        >
                          <div>
                            <p className="text-[11px] font-bold text-[#191f28]">{w.week_start} ~ {w.week_end}</p>
                            <p className="text-[10px] text-[#8b95a1]">{w.work_days}일 근무 · {w.weekly_hours}시간</p>
                          </div>
                          <div className="text-right">
                            {w.eligible ? (
                              <p className="text-sm font-extrabold text-emerald-700">{formatWon(w.allowance)}</p>
                            ) : (
                              <p className="text-[11px] font-semibold text-[#8b95a1]">해당 없음</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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
