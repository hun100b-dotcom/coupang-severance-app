// 주휴수당 계산 페이지 — 한 질문씩 설문 플로우 → 간편/PDF 정밀계산
// 근거: 근로기준법 제55조(주휴일), 제18조(단시간 근로자 적용 제외)
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info,
  FileText, Calculator, ChevronRight, Upload, Loader2, Save,
} from 'lucide-react'
import {
  calcWeeklyAllowancePrecise,
  extractWeeklyAllowanceCompanies,
  type WeeklyAllowancePreciseResult,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WeeklyAllowancePayload } from '../types/supabase'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

// 메인 step: 설문 / 계산방식 / 간편결과 / PDF계산
type Step = 'survey' | 'mode' | 'simple' | 'pdf'

// 설문 안의 단계 (0~4)
// 0: 근무형태  1: 주당근무일  2: 하루시간  3: 시급  4: 개근여부
const SURVEY_TOTAL = 5

interface Survey {
  workType: string | null   // '단기 알바' | '일용직' | '파트타임' | '기타'
  weeklyDays: number | null // 1~7
  dailyHours: string        // 숫자 문자열
  hourlyWage: string        // 숫자 문자열
  allPresent: boolean | null
}

// 간편계산 결과 타입
interface SimpleResult {
  weeklyHours: number
  eligible: boolean
  allowance: number
  reason: string
}

// 저장 상태 타입
type SaveState = 'idle' | 'saving' | 'saved' | 'login_required' | 'error'

export default function WeeklyAllowancePage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  // ── 설문 상태
  const [survey, setSurvey] = useState<Survey>({
    workType: null, weeklyDays: null, dailyHours: '', hourlyWage: '', allPresent: null,
  })
  const [step, setStep] = useState<Step>('survey')
  const [surveyStep, setSurveyStep] = useState(0) // 현재 설문 단계

  // ── 간편계산 결과
  const [simpleResult, setSimpleResult] = useState<SimpleResult | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // ── PDF 계산 상태
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfCompanies, setPdfCompanies] = useState<string[] | null>(null)
  const [pdfCompany, setPdfCompany] = useState('')
  const [pdfOther, setPdfOther] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult] = useState<WeeklyAllowancePreciseResult | null>(null)
  const [pdfError, setPdfError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const wage = Number(survey.hourlyWage.replace(/,/g, ''))
  const hours = Number(survey.dailyHours)
  const days = survey.weeklyDays ?? 0

  // ── 각 설문 단계의 완료 여부
  const stepReady: Record<number, boolean> = {
    0: survey.workType !== null,
    1: survey.weeklyDays !== null,
    2: hours > 0 && hours <= 12,
    3: wage > 0,
    4: survey.allPresent !== null,
  }

  // ── 뒤로가기 처리
  const handleBack = () => {
    if (step === 'mode') { setStep('survey'); setSurveyStep(SURVEY_TOTAL - 1); return }
    if (step === 'simple' || step === 'pdf') { setStep('mode'); return }
    if (surveyStep > 0) { setSurveyStep(s => s - 1); return }
    navigate(-1)
  }

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

  // ── 간편계산 결과 저장
  const handleSave = async () => {
    if (!simpleResult) return
    if (!isLoggedIn) { setSaveState('login_required'); return }
    setSaveState('saving')
    try {
      const { data: { user } } = await supabase!.auth.getUser()
      if (!user) { setSaveState('login_required'); return }
      const payload: WeeklyAllowancePayload = {
        type: 'weekly_allowance',
        hourly_wage: wage,
        work_days_per_week: days,
        work_hours_per_day: hours,
        is_full_attendance: survey.allPresent ?? false,
        weekly_allowance: simpleResult.allowance,
        is_eligible: simpleResult.eligible,
      }
      const { error } = await supabase!.from('reports').insert({
        user_id: user.id,
        title: '주휴수당 계산 결과',
        company_name: null,
        payload,
      })
      setSaveState(error ? 'error' : 'saved')
    } catch {
      setSaveState('error')
    }
  }

  // ── PDF 파일 선택
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPdfFile(f); setPdfCompanies(null); setPdfCompany(''); setPdfResult(null); setPdfError('')
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
    setPdfLoading(true); setPdfError(''); setPdfResult(null)
    try {
      const fd = new FormData()
      fd.append('file', pdfFile)
      fd.append('company', pdfCompany)
      fd.append('company_other', pdfCompany === '기타' ? pdfOther : '')
      fd.append('hourly_wage', String(wage))
      fd.append('daily_hours', String(hours || 8))
      const result = await calcWeeklyAllowancePrecise(fd)
      if (result.error) { setPdfError(result.error) } else { setPdfResult(result) }
    } catch {
      setPdfError('계산 중 오류가 발생했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  const canRunPrecise = pdfFile && pdfCompany && wage > 0 && !pdfLoading &&
    (pdfCompany !== '기타' || pdfOther.trim())

  // ── 진행 바 퍼센트 계산
  const progressPct = step === 'survey'
    ? Math.round((surveyStep / SURVEY_TOTAL) * 100)
    : step === 'mode' ? 100
    : 100

  // ── 각 설문 단계 컨텐츠
  const WORK_TYPES = ['단기 알바', '일용직', '파트타임', '기타']

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
          <button type="button" onClick={handleBack}
            className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-[#191f28]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">주휴수당 계산기</h1>
          </div>
          {/* 진행 바 */}
          {step === 'survey' && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-600">{surveyStep + 1}/{SURVEY_TOTAL}</span>
            </div>
          )}
        </div>
        {/* 상단 진행 바 */}
        {step === 'survey' && (
          <div className="mt-2 w-full h-1 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {/* ═══ 설문 플로우 ═══ */}
          {step === 'survey' && (
            <AnimatePresence mode="wait">
              {/* 설문 Step 0: 근무 형태 */}
              {surveyStep === 0 && (
                <motion.div key="s0"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Info className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      쿠팡에서 어떤 형태로<br />일하셨나요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">근무 형태를 선택해 주세요</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {WORK_TYPES.map(type => (
                      <button key={type} type="button"
                        onClick={() => setSurvey(s => ({ ...s, workType: type }))}
                        className={`w-full px-5 py-4 rounded-[20px] text-left font-bold text-[15px] transition-all active:scale-[0.98] border ${
                          survey.workType === type
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.3)]'
                            : 'bg-white/60 backdrop-blur-xl border-white/60 text-[#191f28] hover:bg-white/80'
                        }`}
                      >{type}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(1)} disabled={!stepReady[0]}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 mt-1 ${
                      stepReady[0]
                        ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 설문 Step 1: 주당 근무일수 */}
              {surveyStep === 1 && (
                <motion.div key="s1"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      주당 며칠 근무하셨나요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">소정근로일 기준으로 선택해 주세요</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[1,2,3,4,5,6,7].map(d => (
                      <button key={d} type="button"
                        onClick={() => setSurvey(s => ({ ...s, weeklyDays: d }))}
                        className={`py-4 rounded-2xl text-sm font-extrabold transition-all active:scale-95 ${
                          survey.weeklyDays === d
                            ? 'bg-emerald-500 text-white shadow-[0_6px_20px_rgba(16,185,129,0.4)]'
                            : 'bg-white/60 backdrop-blur-xl border border-white/60 text-[#4e5968] hover:bg-white/80'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  {survey.weeklyDays && (
                    <div className="rounded-2xl bg-emerald-50/80 border border-emerald-100 px-4 py-3 text-center">
                      <p className="text-sm font-extrabold text-emerald-700">주 {survey.weeklyDays}일 근무</p>
                    </div>
                  )}
                  <button type="button" onClick={() => setSurveyStep(2)} disabled={!stepReady[1]}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[1]
                        ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 설문 Step 2: 하루 근로시간 */}
              {surveyStep === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Calculator className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      하루 평균 몇 시간<br />근무하셨나요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">소수점 입력 가능 (예: 7.5)</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.dailyHours} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, dailyHours: e.target.value }))}
                        placeholder="예) 8" min={1} max={12} step={0.5}
                        className="w-full px-4 py-4 pr-16 rounded-2xl border border-white/60 bg-white/70 text-[24px] font-extrabold text-[#191f28] placeholder:text-slate-300 placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b95a1] font-semibold">시간</span>
                    </div>
                    {hours > 0 && days > 0 && (
                      <div className={`mt-3 rounded-xl px-4 py-2.5 text-center border ${
                        hours * days >= 15
                          ? 'bg-emerald-50/80 border-emerald-100'
                          : 'bg-amber-50/80 border-amber-100'
                      }`}>
                        <p className={`text-sm font-extrabold ${hours * days >= 15 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          주 소정근로시간 {hours * days}시간 {hours * days >= 15 ? '✓ (15시간 이상)' : '⚠️ (15시간 미만)'}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(3)} disabled={!stepReady[2]}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[2]
                        ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 설문 Step 3: 시급 입력 */}
              {surveyStep === 3 && (
                <motion.div key="s3"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-extrabold text-emerald-600">₩</span>
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      시급은 얼마인가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">2025년 최저시급 10,030원</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.hourlyWage} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, hourlyWage: e.target.value }))}
                        placeholder="10030" min={0}
                        className="w-full px-4 py-4 pr-10 rounded-2xl border border-white/60 bg-white/70 text-[24px] font-extrabold text-[#191f28] placeholder:text-slate-300 placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b95a1] font-semibold">원</span>
                    </div>
                    {wage > 0 && wage < 10030 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <p className="text-[12px] text-amber-600 font-semibold">2025년 최저시급(10,030원) 미만이에요</p>
                      </div>
                    )}
                    {wage >= 10030 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-[12px] text-emerald-600 font-semibold">시급 {formatWon(wage)}</p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(4)} disabled={!stepReady[3]}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[3]
                        ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 설문 Step 4: 개근 여부 */}
              {surveyStep === 4 && (
                <motion.div key="s4"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      해당 주에 결근 없이<br />개근하셨나요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">지각·조퇴는 결근이 아니에요</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: '네, 모든 날 출근했어요', sub: '개근 조건 충족', value: true, color: 'emerald' },
                      { label: '아니요, 결근한 날이 있어요', sub: '주휴수당 요건 미충족', value: false, color: 'rose' },
                    ].map(opt => (
                      <button key={String(opt.value)} type="button"
                        onClick={() => setSurvey(s => ({ ...s, allPresent: opt.value }))}
                        className={`w-full px-5 py-5 rounded-[20px] text-left transition-all active:scale-[0.98] border ${
                          survey.allPresent === opt.value
                            ? opt.value
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.3)]'
                              : 'bg-rose-500 text-white border-rose-400 shadow-[0_8px_24px_rgba(244,63,94,0.3)]'
                            : 'bg-white/60 backdrop-blur-xl border-white/60 text-[#191f28] hover:bg-white/80'
                        }`}
                      >
                        <p className="font-bold text-[15px]">{opt.label}</p>
                        <p className={`text-[12px] mt-0.5 ${
                          survey.allPresent === opt.value ? 'text-white/80' : 'text-[#8b95a1]'
                        }`}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => setStep('mode')} disabled={!stepReady[4]}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 mt-1 ${
                      stepReady[4]
                        ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    계산 방법 선택하기 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ═══ STEP 2: 계산 방법 선택 ═══ */}
          {step === 'mode' && (
            <motion.div key="mode"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-4">
              {/* 입력값 요약 카드 */}
              <div className="rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/60 px-4 py-4">
                <p className="text-xs font-bold text-[#4e5968] mb-3">입력하신 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '근무 형태', value: survey.workType ?? '' },
                    { label: '주 근무일', value: `${days}일` },
                    { label: '하루 시간', value: `${hours}시간` },
                    { label: '시급', value: formatWon(wage) },
                    { label: '주 소정근로시간', value: `${hours * days}시간` },
                    { label: '개근 여부', value: survey.allPresent ? '개근 ✓' : '결근 있음' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white/50 border border-white/60 px-3 py-2">
                      <p className="text-[10px] text-[#8b95a1]">{label}</p>
                      <p className={`text-sm font-extrabold truncate ${
                        label === '개근 여부' && !survey.allPresent ? 'text-rose-500' :
                        label === '개근 여부' ? 'text-emerald-600' :
                        label === '주 소정근로시간' && hours * days < 15 ? 'text-amber-600' :
                        'text-[#191f28]'
                      }`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-base font-extrabold text-[#191f28] px-1">계산 방법을 선택하세요</p>

              {/* 간편계산 */}
              <button type="button"
                onClick={() => { runSimple(); setStep('simple') }}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all">
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

              {/* PDF 정밀계산 */}
              <button type="button"
                onClick={() => setStep('pdf')}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all">
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
            <motion.div key="simple"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-4">
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

                {/* 저장 버튼 */}
                <div className={`rounded-2xl px-4 py-4 border flex items-center justify-between gap-3 ${
                  saveState === 'saved'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-blue-50/80 border-blue-200'
                }`}>
                  <div>
                    <p className="text-[13px] font-bold text-[#191f28]">
                      {saveState === 'saved' ? '✅ 마이페이지에 저장됐어요' : '📌 계산결과 저장하기'}
                    </p>
                    <p className="text-[11px] text-[#8b95a1] mt-0.5">
                      {saveState === 'login_required' ? '로그인 후 저장할 수 있어요' :
                       saveState === 'error' ? '저장 중 오류가 발생했어요' :
                       saveState === 'saved' ? '마이페이지에서 다시 확인할 수 있어요' :
                       '로그인 후 마이페이지에서 다시 볼 수 있어요'}
                    </p>
                  </div>
                  {saveState !== 'saved' && (
                    <button type="button" onClick={handleSave} disabled={saveState === 'saving'}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3182f6] text-white text-xs font-bold shadow-[0_4px_12px_rgba(49,130,246,0.3)] hover:bg-[#1b64da] transition-colors disabled:opacity-60">
                      {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saveState === 'saving' ? '저장중...' : saveState === 'login_required' ? '로그인 필요' : '저장'}
                    </button>
                  )}
                </div>

                <button type="button"
                  onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setStep('pdf') }}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />PDF로 정밀 계산하기
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3b: PDF 정밀계산 ═══ */}
          {step === 'pdf' && (
            <motion.div key="pdf"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-4">
              {/* PDF 업로드 카드 */}
              {!pdfResult && (
                <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                  <p className="text-sm font-extrabold text-[#191f28]">PDF 정밀 계산</p>
                  <p className="text-[12px] text-[#4e5968]">
                    근로복지공단에서 발급받은 <strong>일용근로내역서 PDF</strong>를 업로드하면<br />
                    주차별 주휴수당을 자동으로 계산해 드려요.
                  </p>

                  <div>
                    <input type="file" accept=".pdf" ref={fileRef} onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-5 flex flex-col items-center gap-2 hover:bg-blue-50 transition-colors active:scale-[0.98]">
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
                          <button key={c} type="button" onClick={() => setPdfCompany(c)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                              pdfCompany === c
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-white/50 border border-white/60 text-[#191f28] hover:bg-white/70'
                            }`}>
                            {c}
                          </button>
                        ))}
                        <button type="button" onClick={() => setPdfCompany('기타')}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                            pdfCompany === '기타'
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-white/50 border border-white/60 text-[#191f28] hover:bg-white/70'
                          }`}>
                          직접 입력
                        </button>
                      </div>
                      {pdfCompany === '기타' && (
                        <input type="text" value={pdfOther} onChange={e => setPdfOther(e.target.value)}
                          placeholder="사업장명 직접 입력"
                          className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                      )}
                    </div>
                  )}

                  <button type="button" onClick={runPrecise} disabled={!canRunPrecise}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      canRunPrecise
                        ? 'bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:bg-blue-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    {pdfLoading ? <><Loader2 className="w-4 h-4 animate-spin" />계산 중...</> : '주차별 주휴수당 분석하기'}
                  </button>
                </div>
              )}

              {/* PDF 결과 */}
              {pdfResult && !pdfResult.error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
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

                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.06)] px-4 py-4">
                    <p className="text-sm font-extrabold text-[#191f28] mb-3">주차별 상세</p>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {pdfResult.weeks.map(w => (
                        <div key={w.week_key}
                          className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                            w.eligible ? 'bg-emerald-50/60 border border-emerald-100' : 'bg-white/40 border border-white/60'
                          }`}>
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

                  <button type="button"
                    onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setPdfError('') }}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold border border-white/60 bg-white/50 text-[#4e5968] hover:bg-white/70 active:scale-[0.98] transition-all">
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
