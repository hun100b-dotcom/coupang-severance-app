// 연차수당 계산 페이지 — 한 질문씩 설문 플로우 → 간편/PDF 정밀계산
// 근거: 근로기준법 제60조(연차유급휴가)
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Calendar, AlertCircle, CheckCircle2, Info,
  FileText, Calculator, ChevronRight, Upload, Loader2, Save, User, Clock,
} from 'lucide-react'
import {
  calcAnnualLeavePrecise,
  extractAnnualLeaveCompanies,
  type AnnualLeavePreciseResult,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { AnnualLeavePayload } from '../types/supabase'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

type Step = 'survey' | 'mode' | 'simple' | 'pdf'
type Purpose = '발생일수' | '미지급청구' | '남은일수'
type SaveState = 'idle' | 'saving' | 'saved' | 'login_required' | 'error'

interface Survey {
  isStillWorking: boolean | null   // 재직 여부
  hireDate: string                 // "YYYY-MM-DD"
  endDate: string                  // "YYYY-MM-DD" or ''
  purpose: Purpose | null          // 무엇이 궁금한가
  usedDays: string                 // 사용한 연차
  avgDailyWage: string             // 평균 일급
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
  const diffMs      = end.getTime() - hire.getTime()
  const totalDays   = diffMs / (1000 * 60 * 60 * 24)
  const totalMonths = Math.floor(totalDays / 30.44)
  const yearsWorked  = Math.floor(totalMonths / 12)
  const monthsWorked = totalMonths

  const firstYearDays = Math.min(totalMonths, 11)

  let annualDays = 0
  if (yearsWorked >= 3) annualDays = Math.min(15 + Math.floor((yearsWorked - 1) / 2), 25)
  else if (yearsWorked >= 1) annualDays = 15

  let total = 0
  if (yearsWorked === 0) {
    total = firstYearDays
  } else {
    total = 11
    for (let y = 1; y <= yearsWorked; y++) {
      if (y < 3) total += 15
      else total += Math.min(15 + Math.floor((y - 1) / 2), 25)
    }
    const remMonths = totalMonths % 12
    total += Math.round(annualDays * remMonths / 12)
  }

  const used      = Number(survey.usedDays) || 0
  const remaining = Math.max(total - used, 0)
  const wage      = Number(survey.avgDailyWage.replace(/,/g, '')) || 0
  const unpaid    = wage > 0 ? Math.round(remaining * wage) : null

  return { yearsWorked, monthsWorked, firstYearDays, annualDays, totalEntitlement: total, usedDays: used, remainingDays: remaining, unpaidAllowance: unpaid }
}

const PURPOSES: { value: Purpose; label: string; sub: string; icon: string }[] = [
  { value: '발생일수', label: '연차 발생일수 확인', sub: '내 연차가 총 몇 일 발생했나요?', icon: '📅' },
  { value: '미지급청구', label: '미지급 연차수당 청구', sub: '못 받은 연차수당이 얼마인지 계산해요', icon: '💰' },
  { value: '남은일수', label: '남은 연차일수 계산', sub: '현재 남은 연차가 며칠인지 확인해요', icon: '📋' },
]

export default function AnnualLeaveAllowancePage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  const [survey, setSurvey] = useState<Survey>({
    isStillWorking: null, hireDate: '', endDate: '', purpose: null, usedDays: '0', avgDailyWage: '',
  })
  const [step, setStep]       = useState<Step>('survey')
  const [surveyStep, setSurveyStep] = useState(0)
  const [simpleResult, setSimpleResult] = useState<SimpleResult | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

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

  // ── 총 설문 단계 수 계산 (동적)
  // 퇴직이면 퇴직일 스텝 추가, 미지급/남은이면 일급 스텝 추가
  const totalSteps = (() => {
    let n = 4  // 재직여부, 입사일, 목적, 사용연차 (기본 4개)
    if (survey.isStillWorking === false) n++  // 퇴직일 추가
    if (survey.purpose === '미지급청구' || survey.purpose === '남은일수') n++  // 일급 추가
    return n
  })()

  // ── 설문 단계별 레이블 (뒤로가기 처리용)
  // 스텝 번호 → 실제 의미:
  // 0: 재직여부, 1: 입사일, 2: 퇴직일(조건부) or 목적, 3: 목적 or 사용연차, 4: 사용연차 or 일급, 5: 일급(조건부)
  const getStepLabel = (s: number): string => {
    if (s === 0) return '재직여부'
    if (s === 1) return '입사일'
    if (s === 2) return survey.isStillWorking === false ? '퇴직일' : '목적'
    if (s === 3) return survey.isStillWorking === false ? '목적' : '사용연차'
    if (s === 4) return survey.isStillWorking === false ? '사용연차' : '일급'
    return '일급'
  }
  void getStepLabel  // lint 방지

  // ── 현재 스텝에서 다음 스텝 번호 계산
  const nextStep = (cur: number): number | 'mode' => {
    if (cur === 0) return 1  // 재직여부 → 입사일
    if (cur === 1) return survey.isStillWorking === false ? 2 : 3  // 입사일 → (퇴직이면 퇴직일, 재직이면 목적)
    if (cur === 2) return survey.isStillWorking === false ? 3 : 4  // 퇴직일 → 목적 / 목적 → 사용연차
    if (cur === 3) {
      // 퇴직여부에 따라 다름
      if (survey.isStillWorking === false) {
        return 4  // 목적 → 사용연차
      } else {
        // 재직중이고 목적이 미지급/남은이면 일급 스텝
        if (survey.purpose === '미지급청구' || survey.purpose === '남은일수') return 4
        return 'mode'
      }
    }
    if (cur === 4) {
      if (survey.isStillWorking === false) {
        // 사용연차 → 일급(조건부) or mode
        if (survey.purpose === '미지급청구' || survey.purpose === '남은일수') return 5
        return 'mode'
      } else {
        // 일급 → mode
        return 'mode'
      }
    }
    return 'mode'
  }

  // ── 현재 스텝에서 이전 스텝 번호 계산
  const prevStep = (cur: number): number | null => {
    if (cur === 0) return null
    if (cur === 1) return 0
    if (cur === 2) return 1
    if (cur === 3) return survey.isStillWorking === false ? 2 : 1
    if (cur === 4) return survey.isStillWorking === false ? 3 : 3
    if (cur === 5) return 4
    return null
  }

  // ── 각 스텝 완료 여부
  const stepReady = (): boolean => {
    if (surveyStep === 0) return survey.isStillWorking !== null
    if (surveyStep === 1) return survey.hireDate !== ''
    if (surveyStep === 2) {
      if (survey.isStillWorking === false) return survey.endDate !== ''
      return survey.purpose !== null
    }
    if (surveyStep === 3) {
      if (survey.isStillWorking === false) return survey.purpose !== null
      return true  // usedDays는 기본값 0으로 항상 유효
    }
    if (surveyStep === 4) {
      if (survey.isStillWorking === false) return true  // usedDays
      return wage > 0  // avgDailyWage
    }
    return wage > 0  // step 5: 일급
  }

  // ── 뒤로가기
  const handleBack = () => {
    if (step === 'mode') { setStep('survey'); return }
    if (step === 'simple' || step === 'pdf') { setStep('mode'); return }
    const prev = prevStep(surveyStep)
    if (prev !== null) { setSurveyStep(prev); return }
    navigate(-1)
  }

  // ── 다음 스텝으로
  const handleNext = () => {
    const next = nextStep(surveyStep)
    if (next === 'mode') {
      setStep('mode')
    } else {
      setSurveyStep(next)
    }
  }

  // ── 간편계산 실행
  const runSimple = () => {
    setSimpleResult(calcSimpleAnnualLeave(survey))
    setStep('simple')
  }

  // ── 결과 저장
  const handleSave = async () => {
    if (!simpleResult) return
    if (!isLoggedIn) { setSaveState('login_required'); return }
    setSaveState('saving')
    try {
      const { data: { user } } = await supabase!.auth.getUser()
      if (!user) { setSaveState('login_required'); return }
      const payload: AnnualLeavePayload = {
        type: 'annual_leave',
        hire_date: survey.hireDate,
        resign_date: survey.isStillWorking === false ? survey.endDate : undefined,
        is_employed: survey.isStillWorking ?? true,
        used_days: Number(survey.usedDays) || 0,
        annual_leave_days: simpleResult.totalEntitlement,
        annual_leave_allowance: simpleResult.unpaidAllowance ?? 0,
      }
      const { error } = await supabase!.from('reports').insert({
        user_id: user.id,
        title: '연차수당 계산 결과',
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
    setPdfLoading(true); setPdfError(''); setPdfResult(null)
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
      if (result.error) { setPdfError(result.error) } else { setPdfResult(result) }
    } catch {
      setPdfError('계산 중 오류가 발생했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  const canRunPrecise = pdfFile && pdfCompany && survey.hireDate && !pdfLoading &&
    (pdfCompany !== '기타' || pdfOther.trim())

  const progressPct = step === 'survey' ? Math.round((surveyStep / totalSteps) * 100) : 100

  // ── 현재 스텝의 실제 의미 (동적 스텝 매핑)
  // isStillWorking=false: 0→재직여부, 1→입사일, 2→퇴직일, 3→목적, 4→사용연차, 5→일급
  // isStillWorking=true: 0→재직여부, 1→입사일, 2→목적, 3→사용연차, 4→일급
  type ActualStep = '재직여부' | '입사일' | '퇴직일' | '목적' | '사용연차' | '일급'
  const actualStep = (): ActualStep => {
    if (surveyStep === 0) return '재직여부'
    if (surveyStep === 1) return '입사일'
    if (surveyStep === 2) return survey.isStillWorking === false ? '퇴직일' : '목적'
    if (surveyStep === 3) return survey.isStillWorking === false ? '목적' : '사용연차'
    if (surveyStep === 4) return survey.isStillWorking === false ? '사용연차' : '일급'
    return '일급'
  }

  const curStep = actualStep()

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
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">연차수당 계산기</h1>
          </div>
          {step === 'survey' && (
            <div className="ml-auto">
              <span className="text-[10px] font-semibold text-amber-600">{surveyStep + 1}/{totalSteps}</span>
            </div>
          )}
        </div>
        {step === 'survey' && (
          <div className="mt-2 w-full h-1 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
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

              {/* 재직 여부 */}
              {curStep === '재직여부' && (
                <motion.div key="s-working"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <User className="w-7 h-7 text-amber-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      현재 재직 중이신가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">퇴직자도 연차수당을 청구할 수 있어요</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: '재직 중이에요', sub: '현재 근무 중인 경우', value: true, icon: '💼' },
                      { label: '퇴직했어요', sub: '이미 그만둔 경우', value: false, icon: '🏃' },
                    ].map(opt => (
                      <button key={String(opt.value)} type="button"
                        onClick={() => setSurvey(s => ({ ...s, isStillWorking: opt.value, endDate: opt.value ? '' : s.endDate }))}
                        className={`w-full px-5 py-5 rounded-[20px] text-left transition-all active:scale-[0.98] border ${
                          survey.isStillWorking === opt.value
                            ? 'bg-amber-500 text-white border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.35)]'
                            : 'bg-white/60 backdrop-blur-xl border-white/60 text-[#191f28] hover:bg-white/80'
                        }`}>
                        <p className="font-bold text-[15px]">{opt.icon} {opt.label}</p>
                        <p className={`text-[12px] mt-0.5 ${survey.isStillWorking === opt.value ? 'text-white/80' : 'text-[#8b95a1]'}`}>
                          {opt.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={handleNext} disabled={!stepReady()}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady()
                        ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 입사일 */}
              {curStep === '입사일' && (
                <motion.div key="s-hire"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-7 h-7 text-amber-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      입사일이 언제인가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">연차는 입사일 기준으로 계산돼요</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <input type="date" value={survey.hireDate} autoFocus
                      onChange={e => setSurvey(s => ({ ...s, hireDate: e.target.value }))}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 text-center"
                    />
                    {survey.hireDate && (
                      <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-100 px-4 py-2.5 text-center">
                        <p className="text-sm font-extrabold text-amber-700">
                          {survey.hireDate.replace(/-/g, '.')} 입사
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleNext} disabled={!stepReady()}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady()
                        ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 퇴직일 */}
              {curStep === '퇴직일' && (
                <motion.div key="s-end"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-7 h-7 text-amber-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      퇴직일이 언제인가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">마지막 근무일을 선택해 주세요</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <input type="date" value={survey.endDate} autoFocus
                      onChange={e => setSurvey(s => ({ ...s, endDate: e.target.value }))}
                      min={survey.hireDate || undefined}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 text-center"
                    />
                    {survey.endDate && survey.hireDate && (
                      <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-100 px-4 py-2.5 text-center">
                        <p className="text-sm font-extrabold text-amber-700">
                          {survey.hireDate.replace(/-/g, '.')} ~ {survey.endDate.replace(/-/g, '.')}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleNext} disabled={!stepReady()}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady()
                        ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 목적 선택 */}
              {curStep === '목적' && (
                <motion.div key="s-purpose"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <Info className="w-7 h-7 text-amber-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      무엇이 궁금하세요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">목적에 맞게 계산해 드릴게요</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {PURPOSES.map(p => (
                      <button key={p.value} type="button"
                        onClick={() => setSurvey(s => ({ ...s, purpose: p.value }))}
                        className={`w-full px-5 py-4 rounded-[20px] text-left transition-all active:scale-[0.98] border ${
                          survey.purpose === p.value
                            ? 'bg-amber-500 text-white border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.35)]'
                            : 'bg-white/60 backdrop-blur-xl border-white/60 text-[#191f28] hover:bg-white/80'
                        }`}>
                        <p className="font-bold text-[15px]">{p.icon} {p.label}</p>
                        <p className={`text-[12px] mt-0.5 ${survey.purpose === p.value ? 'text-white/80' : 'text-[#8b95a1]'}`}>
                          {p.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={handleNext} disabled={!stepReady()}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady()
                        ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    다음 <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 사용 연차 입력 */}
              {curStep === '사용연차' && (
                <motion.div key="s-used"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-amber-600" />
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      이미 사용한 연차는<br />며칠인가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">없으면 0을 입력하세요</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.usedDays} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, usedDays: e.target.value }))}
                        placeholder="0" min={0}
                        className="w-full px-4 py-4 pr-12 rounded-2xl border border-white/60 bg-white/70 text-[24px] font-extrabold text-[#191f28] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b95a1] font-semibold">일</span>
                    </div>
                  </div>
                  <button type="button" onClick={handleNext}
                    className="w-full py-4 rounded-2xl text-sm font-bold tracking-tight bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    {nextStep(surveyStep) === 'mode' ? '계산 방법 선택하기' : '다음'} <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 평균 일급 입력 */}
              {curStep === '일급' && (
                <motion.div key="s-wage"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
                  className="flex flex-col gap-4">
                  <div className="text-center pt-2 pb-1">
                    <div className="w-14 h-14 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-extrabold text-amber-600">₩</span>
                    </div>
                    <p className="text-[22px] font-extrabold text-[#191f28] tracking-tight leading-tight">
                      평균 일급은 얼마인가요?
                    </p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">연차수당 = 남은 연차일수 × 평균 일급</p>
                  </div>
                  <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.avgDailyWage} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, avgDailyWage: e.target.value }))}
                        placeholder="예) 100000" min={0}
                        className="w-full px-4 py-4 pr-10 rounded-2xl border border-white/60 bg-white/70 text-[24px] font-extrabold text-[#191f28] placeholder:text-slate-300 placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b95a1] font-semibold">원</span>
                    </div>
                    {wage > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        <p className="text-[12px] text-amber-600 font-semibold">일급 {formatWon(wage)}</p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleNext} disabled={!stepReady()}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady()
                        ? 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:bg-amber-600 active:scale-[0.98]'
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
              {/* 입력값 요약 */}
              <div className="rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/60 px-4 py-4">
                <p className="text-xs font-bold text-[#4e5968] mb-3">입력하신 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '재직 상태', value: survey.isStillWorking ? '재직 중' : '퇴직' },
                    { label: '입사일', value: survey.hireDate.replace(/-/g, '.') },
                    ...(survey.isStillWorking === false ? [{ label: '퇴직일', value: survey.endDate.replace(/-/g, '.') }] : []),
                    { label: '목적', value: survey.purpose ?? '미선택' },
                    { label: '사용 연차', value: `${survey.usedDays || '0'}일` },
                    ...((survey.purpose === '미지급청구' || survey.purpose === '남은일수') && wage > 0
                      ? [{ label: '평균 일급', value: formatWon(wage) }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white/50 border border-white/60 px-3 py-2">
                      <p className="text-[10px] text-[#8b95a1]">{label}</p>
                      <p className="text-sm font-extrabold text-[#191f28] truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-base font-extrabold text-[#191f28] px-1">계산 방법을 선택하세요</p>

              <button type="button" onClick={runSimple}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all">
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

              <button type="button" onClick={() => setStep('pdf')}
                className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] p-5 flex items-start gap-4 text-left hover:bg-white/70 active:scale-[0.98] transition-all">
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
            <motion.div key="simple"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-4">
              <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  <p className="text-sm font-extrabold text-[#191f28]">연차수당 계산 결과</p>
                </div>

                {(survey.purpose === '미지급청구' || survey.purpose === '남은일수') && simpleResult.unpaidAllowance !== null && (
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-100 px-5 py-5 text-center">
                    <p className="text-[11px] font-semibold text-amber-600 mb-1">미지급 연차수당</p>
                    <p className="text-[36px] font-extrabold text-amber-700 tracking-tight">
                      {formatWon(simpleResult.unpaidAllowance)}
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      남은 {simpleResult.remainingDays}일 × 일급 {formatWon(wage)}
                    </p>
                  </div>
                )}

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

                {/* 저장 버튼 */}
                <div className={`rounded-2xl px-4 py-4 border flex items-center justify-between gap-3 ${
                  saveState === 'saved' ? 'bg-emerald-50/80 border-emerald-200' : 'bg-blue-50/80 border-blue-200'
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
              {!pdfResult && (
                <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 space-y-4">
                  <p className="text-sm font-extrabold text-[#191f28]">PDF 정밀 계산</p>
                  <p className="text-[12px] text-[#4e5968]">
                    근로복지공단에서 발급받은 <strong>일용근로내역서 PDF</strong>를 업로드하면<br />
                    월별 개근 기록을 분석해 연차를 정밀하게 계산해 드려요.
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
                          className="w-full px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                      )}
                    </div>
                  )}

                  <button type="button" onClick={runPrecise} disabled={!canRunPrecise}
                    className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      canRunPrecise
                        ? 'bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:bg-blue-600 active:scale-[0.98]'
                        : 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
                    }`}>
                    {pdfLoading ? <><Loader2 className="w-4 h-4 animate-spin" />계산 중...</> : '월별 개근 기록 분석하기'}
                  </button>
                </div>
              )}

              {pdfResult && !pdfResult.error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                  <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      <p className="text-sm font-extrabold text-[#191f28]">연차 정밀 분석 완료</p>
                    </div>

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

                  {pdfResult.monthly_detail.length > 0 && (
                    <div className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.06)] px-4 py-4">
                      <p className="text-sm font-extrabold text-[#191f28] mb-3">월별 근무 현황</p>
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {pdfResult.monthly_detail.map(m => (
                          <div key={m.month}
                            className={`rounded-xl px-3 py-2 flex items-center justify-between ${
                              m.attended ? 'bg-emerald-50/60 border border-emerald-100' : 'bg-white/40 border border-white/60'
                            }`}>
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
