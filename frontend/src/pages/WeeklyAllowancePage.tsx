// 주휴수당 계산 페이지 — 한 질문씩 설문 플로우 → 간편/PDF 정밀계산
// 근거: 근로기준법 제55조(주휴일), 제18조(단시간 근로자 적용 제외)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageMeta from '../components/PageMeta'

// ── 주휴수당 계산기 — SoftwareApplication JSON-LD ──
const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '주휴수당 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  description: '알바·일용직 주휴수당 무료 자동 계산기. 시급과 근무시간을 입력하면 즉시 계산.',
  url: 'https://catch-daily-worker.vercel.app/weekly-allowance',
}

// ── 주휴수당 계산기 — FAQPage JSON-LD (구글 FAQ 리치 스니펫용) ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '주휴수당이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주휴수당은 1주일에 15시간 이상 근무한 근로자에게 유급 주휴일(쉬는 날)에 지급하는 수당입니다. 근로기준법 제55조에 보장된 권리로, 알바·일용직·파트타임 모두 해당됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 일용직도 주휴수당을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 쿠팡·CFS 일용직이라도 1주일(일~토)에 소정근로시간이 15시간 이상이면 주휴수당 지급 대상입니다. 단, 주 15시간 미만이면 적용 제외입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주휴수당 계산 공식이 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주휴수당 = (1주 소정근로시간 ÷ 40시간) × 8시간 × 시급. 예: 주 40시간 근무, 시급 10,030원 → 주휴수당 약 80,240원/주. CATCH 계산기에 시급과 근무시간을 입력하면 즉시 계산됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주휴수당을 안 줬을 때 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '고용노동부 민원마당(moel.go.kr)에 진정을 제기하거나 관할 고용노동지청에 신고할 수 있습니다. 주휴수당 청구권 소멸시효는 3년입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주 15시간 미만 근무자는 주휴수당을 받을 수 없나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '맞습니다. 근로기준법 제18조에 따라 1주 소정근로시간이 15시간 미만인 초단시간 근로자는 주휴수당이 적용되지 않습니다. 단, 여러 사업장에서 동시에 근무한다면 합산 여부를 전문가에게 확인하는 것이 좋습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주휴수당과 퇴직금은 어떤 관계인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주휴수당은 퇴직금 계산의 평균임금에 포함될 수 있습니다. 즉, 주휴수당을 정확히 받아야 퇴직금도 정확히 계산됩니다. CATCH는 퇴직금·주휴수당·실업급여·연차수당을 모두 한 번에 계산할 수 있습니다.',
      },
    },
  ],
}
import {
  Calendar, AlertCircle, CheckCircle2, Info,
  FileText, Calculator, ChevronRight, Loader2, Save, Clock,
} from 'lucide-react'
import {
  CalcHeader, CalcPageWrapper, CalcContentArea,
} from '../components/calc/CalcLayout'
import PdfSourceSelector from '../components/calc/PdfSourceSelector'
import PdfGuide from '../components/PdfGuide'
import CalcFeedback from '../components/feedback/CalcFeedback'
import {
  calcWeeklyAllowancePrecise,
  extractWeeklyAllowanceCompanies,
  type WeeklyAllowancePreciseResult,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WeeklyAllowancePayload } from '../types/supabase'
import { useGuestGate } from '../components/GuestGate'
import { storePendingSave } from '../lib/pendingSave'

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
  // 비로그인 게스트용 로그인 유도 모달
  const { openGuestGate, GuestGateModal } = useGuestGate()

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
  const [pdfGuideOpen, setPdfGuideOpen] = useState(false)

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
    // 주휴수당 = (주 소정근로시간 / 40) × 8 × 시급, 단 주 40시간 상한(8시간분 최대).
    //  8시간 상한 누락 버그 수정: 40 초과분(주48h 등)은 min(…,40)으로 캡 → 정확히 8시간분.
    const allowance = Math.round((Math.min(weeklyHours, 40) / 40) * 8 * wage)
    setSimpleResult({ weeklyHours, eligible: true, allowance,
      reason: `주 ${weeklyHours}시간 근무 + 소정근로일 개근 → 주휴수당 발생` })
  }

  // ── 간편계산 결과 저장
  const handleSave = async () => {
    if (!simpleResult) return

    // 비로그인(게스트) 상태: localStorage에 임시 저장 후 로그인 유도 모달 표시
    if (!isLoggedIn) {
      const payload: WeeklyAllowancePayload = {
        type: 'weekly_allowance',
        hourly_wage: wage,
        work_days_per_week: days,
        work_hours_per_day: hours,
        is_full_attendance: survey.allPresent ?? false,
        weekly_allowance: simpleResult.allowance,
        is_eligible: simpleResult.eligible,
      }
      // 로그인 후 자동 저장을 위해 localStorage에 임시 보관
      storePendingSave({
        type: 'weekly_allowance',
        title: '주휴수당 계산 결과',
        company_name: null,
        payload: payload as unknown as Record<string, unknown>,
      })
      // GuestGate 모달 표시
      openGuestGate('계산결과 저장')
      return
    }

    // supabase 클라이언트가 null이면 저장 불가 (환경변수 미설정 상황 대비)
    if (!supabase) { setSaveState('login_required'); return }
    setSaveState('saving')
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
      const { error } = await supabase.from('reports').insert({
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

  // ── PDF 파일 선택 (File 직접 수신)
  const handlePdfFile = async (f: File) => {
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
    } catch (err: unknown) {
      // HTTP 상태 코드별 사용자 친화 메시지 분기 (SeveranceFlow 패턴 동일 적용)
      const axErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
      const status = axErr?.response?.status
      if (!status || axErr?.message === 'Network Error') {
        setPdfError('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
      } else if (status === 504 || (axErr?.message ?? '').includes('timeout')) {
        setPdfError('서버 응답이 느려요 (첫 요청 시 30초 내외). 잠시 후 다시 시도해 주세요.')
      } else if (status === 422) {
        const detail = axErr?.response?.data?.detail
        setPdfError(typeof detail === 'string' ? detail : 'PDF 형식을 인식하지 못했어요. 근로복지공단 일용근로내역서인지 확인해 주세요.')
      } else {
        setPdfError('PDF 업로드 중 오류가 발생했습니다.')
      }
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
      // 사업장 필터: 항상 company='기타', company_other=실제사업장명 패턴 (퇴직금·실업급여와 동일)
      fd.append('company', '기타')
      fd.append('company_other', pdfCompany === '기타' ? pdfOther : pdfCompany)
      fd.append('hourly_wage', String(wage))
      fd.append('daily_hours', String(hours || 8))
      const result = await calcWeeklyAllowancePrecise(fd)
      if (result.error) { setPdfError(result.error) } else { setPdfResult(result) }
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
      const status = axErr?.response?.status
      if (!status || axErr?.message === 'Network Error') {
        setPdfError('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
      } else if (status === 504 || (axErr?.message ?? '').includes('timeout')) {
        setPdfError('서버 응답이 느려요 (첫 요청 시 30초 내외). 잠시 후 다시 시도해 주세요.')
      } else if (status === 422) {
        const detail = axErr?.response?.data?.detail
        setPdfError(typeof detail === 'string' ? detail : 'PDF 형식을 인식하지 못했어요. 근로복지공단 일용근로내역서인지 확인해 주세요.')
      } else {
        setPdfError('계산 중 오류가 발생했습니다.')
      }
    } finally {
      setPdfLoading(false)
    }
  }

  const canRunPrecise = pdfFile && pdfCompany && wage > 0 && !pdfLoading &&
    (pdfCompany !== '기타' || pdfOther.trim())

  // ── 각 설문 단계 컨텐츠
  const WORK_TYPES = ['단기 알바', '일용직', '파트타임', '기타']

  return (
    <CalcPageWrapper>
      {/* ── SEO 메타태그: 주휴수당 계산기 + SoftwareApplication 구조화 데이터 ── */}
      <PageMeta
        title="주휴수당 계산기 — 알바·일용직 주휴수당 무료 자동 계산 | CATCH"
        description="주 15시간 이상 근무 시 받을 수 있는 주휴수당을 자동 계산합니다. 시급과 근무시간 입력, 즉시 계산."
        canonical="https://catch-daily-worker.vercel.app/weekly-allowance"
        jsonLd={[SOFTWARE_SCHEMA, FAQ_SCHEMA]}
      />

      {/* 통일 헤더 */}
      <CalcHeader
        title="주휴수당 계산기"
        icon={<Clock className="w-4 h-4" />}
        accentColor="emerald"
        onBack={handleBack}
        progress={step === 'survey' ? { current: surveyStep + 1, total: SURVEY_TOTAL } : undefined}
        showProgress={step === 'survey'}
      />

      <CalcContentArea>
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
                    <div className="w-14 h-14 rounded-3xl bg-accent-bg flex items-center justify-center mx-auto mb-3">
                      <Info className="w-7 h-7 text-accent-700" />
                    </div>
                    <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight">
                      쿠팡에서 어떤 형태로<br />일하셨나요?
                    </p>
                    <p className="text-[13px] text-up-sub mt-1.5">근무 형태를 선택해 주세요</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {WORK_TYPES.map(type => (
                      <button key={type} type="button"
                        onClick={() => setSurvey(s => ({ ...s, workType: type }))}
                        className={`w-full px-5 py-4 rounded-lg text-left font-bold text-[15px] transition-all active:scale-[0.98] border ${
                          survey.workType === type
                            ? 'bg-accent-700 text-white border-accent/40 shadow-[0_8px_24px_rgba(6,190,123,0.28)]'
                            : 'bg-white border-line text-ink-900 hover:bg-page'
                        }`}
                      >{type}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(1)} disabled={!stepReady[0]}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 mt-1 ${
                      stepReady[0]
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
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
                    <div className="w-14 h-14 rounded-3xl bg-accent-bg flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-7 h-7 text-accent-700" />
                    </div>
                    <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight">
                      주당 며칠 근무하셨나요?
                    </p>
                    <p className="text-[13px] text-up-sub mt-1.5">소정근로일 기준으로 선택해 주세요</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[1,2,3,4,5,6,7].map(d => (
                      <button key={d} type="button"
                        onClick={() => setSurvey(s => ({ ...s, weeklyDays: d }))}
                        className={`py-4 rounded-2xl text-sm font-extrabold transition-all active:scale-95 ${
                          survey.weeklyDays === d
                            ? 'bg-accent-700 text-white shadow-[0_6px_20px_rgba(6,190,123,0.28)]'
                            : 'bg-white border border-line text-ink-700 hover:bg-page'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  {survey.weeklyDays && (
                    <div className="rounded-2xl bg-accent-bg border border-accent/20 px-4 py-3 text-center">
                      <p className="text-sm font-extrabold text-accent-700">주 {survey.weeklyDays}일 근무</p>
                    </div>
                  )}
                  <button type="button" onClick={() => setSurveyStep(2)} disabled={!stepReady[1]}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[1]
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
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
                    <div className="w-14 h-14 rounded-3xl bg-accent-bg flex items-center justify-center mx-auto mb-3">
                      <Calculator className="w-7 h-7 text-accent-700" />
                    </div>
                    <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight">
                      하루 평균 몇 시간<br />근무하셨나요?
                    </p>
                    <p className="text-[13px] text-up-sub mt-1.5">소수점 입력 가능 (예: 7.5)</p>
                  </div>
                  <div className="rounded-xl bg-white border border-line shadow-card px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.dailyHours} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, dailyHours: e.target.value }))}
                        placeholder="예) 8" min={1} max={12} step={0.5}
                        className="w-full px-4 py-4 pr-16 rounded-2xl border border-line bg-white text-[24px] font-extrabold text-ink-900 placeholder:text-ink-400 placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-up-sub font-semibold">시간</span>
                    </div>
                    {hours > 0 && days > 0 && (
                      <div className={`mt-3 rounded-xl px-4 py-2.5 text-center border ${
                        hours * days >= 15
                          ? 'bg-accent-bg border-accent/20'
                          : 'bg-warning/10 border-warning/20'
                      }`}>
                        <p className={`text-sm font-extrabold ${hours * days >= 15 ? 'text-accent-700' : 'text-[#B45309]'}`}>
                          주 소정근로시간 {hours * days}시간 {hours * days >= 15 ? '✓ (15시간 이상)' : '⚠️ (15시간 미만)'}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(3)} disabled={!stepReady[2]}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[2]
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
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
                    <div className="w-14 h-14 rounded-3xl bg-accent-bg flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-extrabold text-accent-700">₩</span>
                    </div>
                    <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight">
                      시급은 얼마인가요?
                    </p>
                    <p className="text-[13px] text-up-sub mt-1.5">2026년 최저시급 10,320원</p>
                  </div>
                  <div className="rounded-xl bg-white border border-line shadow-card px-5 py-6">
                    <div className="relative">
                      <input type="number" value={survey.hourlyWage} autoFocus
                        onChange={e => setSurvey(s => ({ ...s, hourlyWage: e.target.value }))}
                        placeholder="10030" min={0}
                        className="w-full px-4 py-4 pr-10 rounded-2xl border border-line bg-white text-[24px] font-extrabold text-ink-900 placeholder:text-ink-400 placeholder:text-[18px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-up-sub font-semibold">원</span>
                    </div>
                    {wage > 0 && wage < 10320 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4 text-[#B45309]" />
                        <p className="text-[12px] text-[#B45309] font-semibold">2026년 최저시급(10,320원) 미만이에요</p>
                      </div>
                    )}
                    {wage >= 10030 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-accent-700" />
                        <p className="text-[12px] text-accent-700 font-semibold">시급 {formatWon(wage)}</p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setSurveyStep(4)} disabled={!stepReady[3]}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      stepReady[3]
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
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
                    <div className="w-14 h-14 rounded-3xl bg-accent-bg flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-7 h-7 text-accent-700" />
                    </div>
                    <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight">
                      해당 주에 결근 없이<br />개근하셨나요?
                    </p>
                    <p className="text-[13px] text-up-sub mt-1.5">지각·조퇴는 결근이 아니에요</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: '네, 모든 날 출근했어요', sub: '개근 조건 충족', value: true, color: 'emerald' },
                      { label: '아니요, 결근한 날이 있어요', sub: '주휴수당 요건 미충족', value: false, color: 'rose' },
                    ].map(opt => (
                      <button key={String(opt.value)} type="button"
                        onClick={() => setSurvey(s => ({ ...s, allPresent: opt.value }))}
                        className={`w-full px-5 py-5 rounded-lg text-left transition-all active:scale-[0.98] border ${
                          survey.allPresent === opt.value
                            ? opt.value
                              ? 'bg-accent-700 text-white border-accent/40 shadow-[0_8px_24px_rgba(6,190,123,0.28)]'
                              : 'bg-danger text-white border-danger shadow-[0_6px_18px_rgba(240,68,82,0.3)]'
                            : 'bg-white border-line text-ink-900 hover:bg-page'
                        }`}
                      >
                        <p className="font-bold text-[15px]">{opt.label}</p>
                        <p className={`text-[12px] mt-0.5 ${
                          survey.allPresent === opt.value ? 'text-white/80' : 'text-up-sub'
                        }`}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => setStep('mode')} disabled={!stepReady[4]}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 mt-1 ${
                      stepReady[4]
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
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
              <div className="rounded-[24px] bg-white border border-line px-4 py-4">
                <p className="text-xs font-bold text-ink-700 mb-3">입력하신 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '근무 형태', value: survey.workType ?? '' },
                    { label: '주 근무일', value: `${days}일` },
                    { label: '하루 시간', value: `${hours}시간` },
                    { label: '시급', value: formatWon(wage) },
                    { label: '주 소정근로시간', value: `${hours * days}시간` },
                    { label: '개근 여부', value: survey.allPresent ? '개근 ✓' : '결근 있음' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white border border-line px-3 py-2">
                      <p className="text-[10px] text-up-sub">{label}</p>
                      <p className={`text-sm font-extrabold truncate ${
                        label === '개근 여부' && !survey.allPresent ? 'text-danger' :
                        label === '개근 여부' ? 'text-accent-700' :
                        label === '주 소정근로시간' && hours * days < 15 ? 'text-[#B45309]' :
                        'text-ink-900'
                      }`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-base font-extrabold text-ink-900 px-1">계산 방법을 선택하세요</p>

              {/* 간편계산 */}
              <button type="button"
                onClick={() => { runSimple(); setStep('simple') }}
                className="rounded-xl bg-white border border-line shadow-card p-5 flex items-start gap-4 text-left hover:bg-white active:scale-[0.98] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-accent-bg flex items-center justify-center flex-shrink-0">
                  <Calculator className="w-6 h-6 text-accent-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-extrabold text-ink-900">간편 계산</p>
                    <span className="text-[10px] font-bold bg-accent-bg text-accent-700 px-2 py-0.5 rounded-full">즉시 확인</span>
                  </div>
                  <p className="text-[12px] text-ink-700 leading-relaxed">
                    입력하신 정보를 바탕으로<br />이번 주 주휴수당을 바로 계산해요.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-up-sub flex-shrink-0 mt-1" />
              </button>

              {/* PDF 정밀계산 */}
              <button type="button"
                onClick={() => setStep('pdf')}
                className="rounded-xl bg-white border border-line shadow-card p-5 flex items-start gap-4 text-left hover:bg-white active:scale-[0.98] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-accent-bg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-accent-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-extrabold text-ink-900">PDF 정밀 계산</p>
                    <span className="text-[10px] font-bold bg-accent-bg text-accent-700 px-2 py-0.5 rounded-full">주차별 분석</span>
                  </div>
                  <p className="text-[12px] text-ink-700 leading-relaxed">
                    근로복지공단 일용근로내역서 PDF로<br />주차별 주휴수당을 정밀하게 분석해요.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-up-sub flex-shrink-0 mt-1" />
              </button>
            </motion.div>
          )}

          {/* ═══ STEP 3a: 간편계산 결과 ═══ */}
          {step === 'simple' && simpleResult && (
            <motion.div key="simple"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
              className="flex flex-col gap-4">
              <div className="rounded-xl bg-white border border-line shadow-card px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  {simpleResult.eligible
                    ? <CheckCircle2 className="w-5 h-5 text-accent-700" />
                    : <AlertCircle className="w-5 h-5 text-danger" />}
                  <p className="text-sm font-extrabold text-ink-900">
                    {simpleResult.eligible ? '주휴수당 발생' : '주휴수당 미발생'}
                  </p>
                </div>

                {simpleResult.eligible && (
                  <div className="rounded-2xl bg-accent-bg border border-accent/20 px-5 py-5 text-center">
                    <p className="text-[11px] font-semibold text-accent-700 mb-1">이번 주 주휴수당</p>
                    <p className="text-[clamp(25px,7vw,38px)] font-mono tabular-nums font-extrabold text-accent-700 tracking-tight leading-none break-keep">
                      {formatWon(simpleResult.allowance)}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-white border border-line px-4 py-3 space-y-2">
                  {simpleResult.eligible && (
                    <div className="flex justify-between text-xs">
                      <span className="text-up-sub">계산식</span>
                      <span className="font-semibold text-ink-700">
                        ({simpleResult.weeklyHours}h ÷ 40h) × 8h × {formatWon(wage)}
                      </span>
                    </div>
                  )}
                  <p className="text-[12px] text-ink-700 leading-relaxed whitespace-pre-line">{simpleResult.reason}</p>
                </div>

                <p className="text-[10px] text-up-sub text-center">
                  이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
                </p>

                {/* 저장 버튼 */}
                <div className={`rounded-2xl px-4 py-4 border flex items-center justify-between gap-3 ${
                  saveState === 'saved'
                    ? 'bg-accent-bg border-accent/30'
                    : 'bg-accent-bg border-accent/30'
                }`}>
                  <div>
                    <p className="text-[13px] font-bold text-ink-900">
                      {saveState === 'saved' ? '✅ 마이페이지에 저장됐어요' : '📌 계산결과 저장하기'}
                    </p>
                    <p className="text-[11px] text-up-sub mt-0.5">
                      {saveState === 'login_required' ? '로그인 후 저장할 수 있어요' :
                       saveState === 'error' ? '저장 중 오류가 발생했어요' :
                       saveState === 'saved' ? '마이페이지에서 다시 확인할 수 있어요' :
                       '로그인 후 마이페이지에서 다시 볼 수 있어요'}
                    </p>
                  </div>
                  {saveState !== 'saved' && (
                    <button type="button" onClick={handleSave} disabled={saveState === 'saving'}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-700 text-white text-xs font-bold shadow-[0_4px_12px_rgba(6,190,123,0.28)] hover:bg-[#036848] transition-colors disabled:opacity-60">
                      {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saveState === 'saving' ? '저장중...' : saveState === 'login_required' ? '로그인 필요' : '저장'}
                    </button>
                  )}
                </div>

                <button type="button"
                  onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setStep('pdf') }}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold border border-accent/30 text-accent-700 hover:bg-accent-bg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />PDF로 정밀 계산하기
                </button>
              </div>
              {/* 계산 결과 하단 피드백/문의 폼 (일용직 권리 증진) */}
              <CalcFeedback calcType="weekly" />
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
                <div className="rounded-xl bg-white border border-line shadow-card px-5 py-6 space-y-4">
                  <p className="text-sm font-extrabold text-ink-900">PDF 정밀 계산</p>
                  <p className="text-[12px] text-ink-700">
                    근로복지공단에서 발급받은 <strong>일용근로내역서 PDF</strong>를 업로드하면<br />
                    주차별 주휴수당을 자동으로 계산해 드려요.
                  </p>

                  {/* PDF 소스 선택 (저장된 PDF / 새 업로드) */}
                  <PdfSourceSelector
                    onFileSelect={handlePdfFile}
                    accentColor="emerald"
                    currentFile={pdfFile}
                  />

                  {/* PDF 발급 가이드 버튼 */}
                  <button type="button" onClick={() => setPdfGuideOpen(true)}
                    className="text-[13px] text-up-sub underline underline-offset-2 hover:text-accent-700 transition-colors">
                    ❓ 근로내역서 PDF는 어디서 받나요?
                  </button>

                  {pdfLoading && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-700" />
                      <p className="text-sm text-ink-700">PDF 분석 중...</p>
                    </div>
                  )}

                  {pdfError && (
                    <div className="rounded-xl bg-danger/10 border border-danger/20 px-3 py-2.5 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-danger">{pdfError}</p>
                    </div>
                  )}

                  {pdfCompanies && pdfCompanies.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-ink-700">사업장 선택</label>
                      <div className="space-y-1.5">
                        {pdfCompanies.map(c => (
                          <button key={c} type="button" onClick={() => setPdfCompany(c)}
                            className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                              pdfCompany === c
                                ? 'bg-accent-700 text-white shadow-md'
                                : 'bg-white border border-line text-ink-900 hover:bg-white'
                            }`}>
                            {c}
                          </button>
                        ))}
                        <button type="button" onClick={() => setPdfCompany('기타')}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all ${
                            pdfCompany === '기타'
                              ? 'bg-accent-700 text-white shadow-md'
                              : 'bg-white border border-line text-ink-900 hover:bg-white'
                          }`}>
                          직접 입력
                        </button>
                      </div>
                      {pdfCompany === '기타' && (
                        <input type="text" value={pdfOther} onChange={e => setPdfOther(e.target.value)}
                          placeholder="사업장명 직접 입력"
                          className="w-full px-4 py-3 rounded-2xl border border-line bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30" />
                      )}
                    </div>
                  )}

                  <button type="button" onClick={runPrecise} disabled={!canRunPrecise}
                    className={`w-full min-h-[56px] py-4 rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                      canRunPrecise
                        ? 'bg-accent-700 text-white shadow-[0_8px_24px_rgba(6,190,123,0.28)] hover:bg-[#036848] active:scale-[0.98]'
                        : 'bg-up-sunken text-ink-400 border border-line cursor-not-allowed'
                    }`}>
                    {pdfLoading ? <><Loader2 className="w-4 h-4 animate-spin" />계산 중...</> : '주차별 주휴수당 분석하기'}
                  </button>
                </div>
              )}

              {/* PDF 결과 */}
              {pdfResult && !pdfResult.error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                  <div className="rounded-xl bg-white border border-line shadow-card px-5 py-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-accent-700" />
                      <p className="text-sm font-extrabold text-ink-900">주차별 주휴수당 분석 완료</p>
                    </div>
                    <div className="rounded-2xl bg-accent-bg border border-accent/20 px-5 py-4 text-center mb-3">
                      <p className="text-[11px] font-semibold text-accent-700 mb-1">총 주휴수당 합계</p>
                      <p className="text-[clamp(25px,7vw,38px)] font-mono tabular-nums font-extrabold text-accent-700 tracking-tight leading-none break-keep">
                        {formatWon(pdfResult.total_allowance)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white border border-line px-2 py-2.5">
                        <p className="text-[10px] text-up-sub">전체 주차</p>
                        <p className="text-sm font-extrabold text-ink-900">{pdfResult.total_weeks}주</p>
                      </div>
                      <div className="rounded-xl bg-white border border-line px-2 py-2.5">
                        <p className="text-[10px] text-up-sub">주휴수당 발생</p>
                        <p className="text-sm font-extrabold text-accent-700">{pdfResult.eligible_weeks}주</p>
                      </div>
                      <div className="rounded-xl bg-white border border-line px-2 py-2.5">
                        <p className="text-[10px] text-up-sub">적용 시급</p>
                        <p className="text-sm font-extrabold text-ink-900">{formatWon(pdfResult.hourly_wage)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-line shadow-[0_8px_32px_rgba(49,130,246,0.06)] px-4 py-4">
                    <p className="text-sm font-extrabold text-ink-900 mb-3">주차별 상세</p>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {pdfResult.weeks.map(w => (
                        <div key={w.week_key}
                          className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                            w.eligible ? 'bg-accent-bg/60 border border-accent/20' : 'bg-up-sunken border border-line'
                          }`}>
                          <div>
                            <p className="text-[11px] font-bold text-ink-900">{w.week_start} ~ {w.week_end}</p>
                            <p className="text-[10px] text-up-sub">{w.work_days}일 근무 · {w.weekly_hours}시간</p>
                          </div>
                          <div className="text-right">
                            {w.eligible ? (
                              <p className="text-sm font-extrabold text-accent-700">{formatWon(w.allowance)}</p>
                            ) : (
                              <p className="text-[11px] font-semibold text-up-sub">해당 없음</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="button"
                    onClick={() => { setPdfResult(null); setPdfFile(null); setPdfCompanies(null); setPdfError('') }}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold border border-line bg-white text-ink-700 hover:bg-white active:scale-[0.98] transition-all">
                    다시 계산하기
                  </button>

                  <p className="text-[10px] text-up-sub text-center leading-relaxed">
                    이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
                  </p>
                  {/* 계산 결과 하단 피드백/문의 폼 (일용직 권리 증진) */}
                  <CalcFeedback calcType="weekly" />
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* 비로그인 게스트 → 저장하기 클릭 시 로그인 유도 모달 */}
        <GuestGateModal />
        {/* 근로내역서 PDF 발급 가이드 모달 */}
        {pdfGuideOpen && <PdfGuide onClose={() => setPdfGuideOpen(false)} />}
      </CalcContentArea>
    </CalcPageWrapper>
  )
}
