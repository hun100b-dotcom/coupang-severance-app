// 퇴직금 계산 페이지 — 4단계 설문 플로우 → 간편/PDF 정밀계산
// 근거: 근로자퇴직급여 보장법 제8조
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalcHeader, CalcStepCard, CalcStepIcon, CalcChoiceButton,
  CalcNextButton, CalcBackButton, CalcInputCard, CalcModeSelector,
  CalcErrorMsg, CalcPageWrapper, CalcContentArea, AnimatePresence,
} from '../components/calc/CalcLayout'
import LoadingOverlay from '../components/LoadingOverlay'
import PdfGuide from '../components/PdfGuide'
import ResultSeverance from './ResultSeverance'
import { calcSeverancePrecise, calcSeveranceSimple, extractSeveranceCompanies, SeverancePreciseResult, SeveranceSimpleResult } from '../lib/api'
import { COMPANIES, Company } from '../lib/constants'
import { Briefcase, HelpCircle, Clock, FileText, Check, Upload } from 'lucide-react'
import PdfSourceSelector from '../components/calc/PdfSourceSelector'
import NonEligibleResult from '../components/non-eligible/NonEligibleResult'

type Step = 1 | 2 | 3 | 4
type CalcMode = 'precise' | 'simple'

interface State {
  step: Step
  company: Company | ''
  companyOther: string
  /** PDF 추출 후 선택한 사업장명 (정밀 계산 시 결과 화면 표시용) */
  displayCompany?: string
  q1: boolean | null
  q2: boolean | null
  calcMode: CalcMode | null
  failed: boolean
  result: SeverancePreciseResult | SeveranceSimpleResult | null
  resultType: CalcMode | null
}

const INIT: State = {
  step: 1, company: '', companyOther: '', q1: null, q2: null,
  calcMode: null, failed: false, result: null, resultType: null,
}

export default function SeveranceFlow() {
  const [s, setS] = useState<State>(INIT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 정밀계산 입력값
  const [endDate, setEndDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // fileRef는 PdfSourceSelector 내부에서 관리
  const [pdfCompanies, setPdfCompanies] = useState<string[]>([])
  const [selectedPdfCompany, setSelectedPdfCompany] = useState<string | null>(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [pdfGuideOpen, setPdfGuideOpen] = useState(false)

  // 간편계산 입력값
  const [workDays, setWorkDays] = useState('')
  const [avgWage, setAvgWage] = useState('')

  const go = (step: Step) => setS(p => ({ ...p, step, failed: false }))
  const reset = () => {
    setS(INIT)
    setFile(null)
    setEndDate('')
    setWorkDays('')
    setAvgWage('')
    setError('')
    setPdfCompanies([])
    setSelectedPdfCompany(null)
  }

  // ── 결과 화면 ──────────────────────────────────
  if (s.result) {
    const companyLabel = s.displayCompany || (s.company === '기타' ? s.companyOther : s.company) || ''
    return (
      <ResultSeverance
        result={s.result}
        resultType={s.resultType!}
        company={companyLabel}
        onReset={reset}
      />
    )
  }

  // ── 실패 화면 ──────────────────────────────────
  if (s.failed) {
    const reason = s.q1 === false
      ? '퇴직급여법상 계속근로기간 1년 이상이 필요해요. 1년이 되면 다시 확인해 보세요.'
      : '주 15시간 이상 근무해야 퇴직금 수급 자격이 생겨요.'
    return <NonEligibleResult reason={reason} onRestart={reset} />
  }

  // ── 계산 실행 (로직 불변) ──────────────────────
  async function runPrecise() {
    if (!file) { setError('PDF 파일을 업로드해 주세요.'); return }
    if (pdfCompanies.length > 0 && !selectedPdfCompany) {
      setError('계산할 사업장을 선택해 주세요.')
      return
    }
    setError(''); setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('company', '기타')
    fd.append('company_other', selectedPdfCompany ?? '')
    if (endDate) fd.append('end_date', endDate)
    const [res] = await Promise.allSettled([
      calcSeverancePrecise(fd),
      new Promise(r => setTimeout(r, 3000)),
    ])
    setLoading(false)
    if (res.status === 'fulfilled') {
      setS(p => ({
        ...p, result: res.value, resultType: 'precise', step: 4,
        displayCompany: selectedPdfCompany || undefined,
      }))
    } else {
      const err = res.reason as {
        response?: { status?: number; data?: { detail?: string | Array<{ msg?: string }> } }
        message?: string
      }
      console.error('[퇴직금 정밀계산 오류]', err?.response?.data ?? err?.message ?? err)
      const detail = err?.response?.data?.detail
      let msg: string
      if (typeof detail === 'string') { msg = detail }
      else if (Array.isArray(detail) && detail[0]?.msg) { msg = detail[0].msg }
      else if (err?.message === 'Network Error') { msg = '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' }
      else if (err?.response?.status === 504 || (err?.message ?? '').includes('timeout')) { msg = '요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.' }
      else {
        const status = err?.response?.status
        const extra = typeof detail === 'object' && detail !== null
          ? ` (${JSON.stringify(detail).slice(0, 80)}…)` : status ? ` (HTTP ${status})` : ''
        msg = `계산 중 오류가 발생했어요.${extra}`
      }
      setError(msg)
    }
  }

  async function runSimple() {
    const days = parseInt(workDays)
    const wage = parseFloat(avgWage.replace(/,/g, ''))
    if (!days || !wage) { setError('근무일수와 평균 일당을 모두 입력해 주세요.'); return }
    setError(''); setLoading(true)
    const [res] = await Promise.allSettled([
      calcSeveranceSimple(days, wage),
      new Promise(r => setTimeout(r, 2000)),
    ])
    setLoading(false)
    if (res.status === 'fulfilled') {
      setS(p => ({ ...p, result: res.value, resultType: 'simple', step: 4 }))
    } else {
      setError('계산 중 오류가 발생했어요.')
    }
  }

  // PDF 업로드 시 사업장 추출 (로직 불변)
  async function onPdfSelect(f: File) {
    setFile(f)
    setPdfCompanies([])
    setSelectedPdfCompany(null)
    setExtractLoading(true)
    setError('')
    try {
      const { companies } = await extractSeveranceCompanies(f)
      setPdfCompanies(companies)
      if (companies.length === 1) setSelectedPdfCompany(companies[0])
      if (companies.length === 0) setError('PDF에서 사업장을 찾지 못했어요.')
    } catch {
      setError('PDF 분석에 실패했어요. 다시 시도해 주세요.')
      setPdfCompanies([])
    } finally {
      setExtractLoading(false)
    }
  }

  // ── 뒤로가기 핸들러 ──
  const handleBack = () => {
    if (s.step === 1) { navigate('/home'); return }
    if (s.step === 4) { go(3); return }
    go((s.step - 1) as Step)
  }

  // ── 렌더링 ─────────────────────────────────────
  return (
    <CalcPageWrapper>
      {loading && <LoadingOverlay message="퇴직금을 계산하고 있어요.." />}

      <CalcHeader
        title="퇴직금 계산기"
        icon={<Briefcase className="w-4 h-4" />}
        accentColor="blue"
        onBack={handleBack}
        progress={{ current: s.step, total: 4 }}
      />

      <CalcContentArea>
        <AnimatePresence mode="wait">

          {/* ── STEP 1: 회사 선택 ── */}
          {s.step === 1 && (
            <CalcStepCard motionKey="sev-step1">
              <CalcStepIcon
                icon={<Briefcase className="w-7 h-7" />}
                accentColor="blue"
                title="어디에서 근무하셨나요?"
                subtitle="근무처를 선택해 주세요"
              />
              <div className="flex flex-col gap-3">
                {COMPANIES.map(c => (
                  <CalcChoiceButton
                    key={c}
                    selected={s.company === c}
                    accentColor="blue"
                    onClick={() => setS(p => ({ ...p, company: c as Company, companyOther: '' }))}
                  >
                    {c}
                  </CalcChoiceButton>
                ))}
              </div>
              {/* 기타 직접 입력 */}
              {s.company === '기타' && (
                <CalcInputCard>
                  <input
                    type="text"
                    placeholder="회사명을 직접 입력해 주세요"
                    value={s.companyOther}
                    onChange={e => setS(p => ({ ...p, companyOther: e.target.value }))}
                    className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-center"
                  />
                </CalcInputCard>
              )}
              <CalcNextButton
                disabled={!s.company || (s.company === '기타' && !s.companyOther)}
                accentColor="blue"
                onClick={() => go(2)}
              />
              <CalcBackButton onClick={() => navigate('/home')}>← 홈으로</CalcBackButton>
            </CalcStepCard>
          )}

          {/* ── STEP 2: Q1 — 1년 이상 근무 여부 ── */}
          {s.step === 2 && (
            <CalcStepCard motionKey="sev-step2">
              <CalcStepIcon
                icon={<HelpCircle className="w-7 h-7" />}
                accentColor="blue"
                title={<>첫 출근부터 마지막 퇴근까지 <span className="text-blue-500">1년 넘게</span> 일하셨나요?</>}
                subtitle="퇴직급여법상 계속근로기간 1년이 필요해요"
              />
              <div className="flex flex-col gap-3">
                <CalcChoiceButton icon="✅" selected={s.q1 === true} accentColor="blue"
                  onClick={() => setS(p => ({ ...p, q1: true }))}
                  sub="퇴직금 수급 자격이 돼요">
                  예, 1년 이상 일했어요
                </CalcChoiceButton>
                <CalcChoiceButton icon="❌" selected={s.q1 === false} accentColor="blue"
                  onClick={() => setS(p => ({ ...p, q1: false, failed: true }))}
                  sub="아쉽지만 자격이 안 돼요">
                  아니요, 1년 미만이에요
                </CalcChoiceButton>
              </div>
              {s.q1 === true && (
                <CalcNextButton disabled={false} accentColor="blue" onClick={() => go(3)} />
              )}
              <CalcBackButton onClick={() => go(1)} />
            </CalcStepCard>
          )}

          {/* ── STEP 3: Q2 — 주 15시간 & 계산 방식 선택 ── */}
          {s.step === 3 && (
            <CalcStepCard motionKey="sev-step3">
              {/* 주 15시간 질문 */}
              <CalcStepIcon
                icon={<Clock className="w-7 h-7" />}
                accentColor="blue"
                title={<>주 평균 <span className="text-blue-500">15시간 이상</span> 근무하셨나요?</>}
                subtitle="4주 평균 주 15시간 이상이어야 퇴직금을 받을 수 있어요"
              />
              <div className="flex flex-col gap-3">
                <CalcChoiceButton icon="✅" selected={s.q2 === true} accentColor="blue"
                  onClick={() => setS(p => ({ ...p, q2: true }))}
                  sub="퇴직금 계산을 진행할게요">
                  예, 15시간 이상이에요
                </CalcChoiceButton>
                <CalcChoiceButton icon="❌" selected={s.q2 === false} accentColor="blue"
                  onClick={() => setS(p => ({ ...p, q2: false, failed: true }))}
                  sub="주 15시간 미만은 대상이 아니에요">
                  아니요, 15시간 미만이에요
                </CalcChoiceButton>
              </div>

              {/* q2 통과 시 계산 방식 선택 표시 */}
              {s.q2 === true && (
                <>
                  <div className="w-full h-px bg-white/40 my-2" />
                  <CalcStepIcon
                    icon={<FileText className="w-7 h-7" />}
                    accentColor="blue"
                    title="어떻게 계산할까요?"
                    subtitle="PDF를 올리면 자동으로, 직접 입력하면 빠르게 계산해요"
                  />
                  <CalcModeSelector
                    accentColor="blue"
                    onSimple={() => { setS(p => ({ ...p, calcMode: 'simple' })); go(4) }}
                    onPdf={() => { setS(p => ({ ...p, calcMode: 'precise' })); go(4) }}
                    simpleLabel="쉬운 계산"
                    simpleDesc="근무일수·평균임금 직접 입력"
                    pdfLabel="정밀 계산"
                    pdfDesc="근로복지공단 일용근로내역서 업로드"
                  />
                </>
              )}
              <CalcBackButton onClick={() => go(2)} />
            </CalcStepCard>
          )}

          {/* ── STEP 4A: 정밀 계산 (PDF 업로드) ── */}
          {s.step === 4 && s.calcMode === 'precise' && (
            <CalcStepCard motionKey="sev-step4a">
              <CalcStepIcon
                icon={<Upload className="w-7 h-7" />}
                accentColor="blue"
                title="근로내역서 PDF 업로드"
                subtitle="근로복지공단 일용근로·노무제공내역서 PDF를 올려주세요"
              />

              {/* PDF 소스 선택 (저장된 PDF / 새 업로드) */}
              <PdfSourceSelector
                onFileSelect={onPdfSelect}
                accentColor="blue"
                currentFile={file}
              />

              {/* PDF 발급 가이드 */}
              <button type="button" onClick={() => setPdfGuideOpen(true)}
                className="text-[13px] text-[#8b95a1] underline underline-offset-2 hover:text-blue-500 transition-colors">
                ❓ 근로내역서 PDF는 어디서 받나요?
              </button>

              {/* 사업장 선택 */}
              {extractLoading && (
                <CalcInputCard className="text-center">
                  <p className="text-[14px] text-[#8b95a1]">📂 PDF 분석 중…</p>
                </CalcInputCard>
              )}
              {!extractLoading && pdfCompanies.length > 0 && (
                <CalcInputCard>
                  <p className="text-[14px] font-bold text-[#191f28] mb-3">
                    계산할 사업장을 선택하세요
                    <span className="text-[12px] font-normal text-[#8b95a1] ml-2">
                      ({pdfCompanies.length}개 추출됨)
                    </span>
                  </p>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                    {pdfCompanies.map(name => (
                      <button key={name} type="button"
                        onClick={() => setSelectedPdfCompany(prev => prev === name ? null : name)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                          selectedPdfCompany === name
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-white/50 border border-white/40 hover:bg-white/80'
                        }`}>
                        <span className="shrink-0">
                          {selectedPdfCompany === name
                            ? <Check size={14} strokeWidth={2.5} className="text-blue-500" />
                            : <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-slate-300 inline-block" />
                          }
                        </span>
                        <span className="text-[14px] font-medium text-[#191f28]">{name}</span>
                      </button>
                    ))}
                  </div>
                </CalcInputCard>
              )}

              {/* 마지막 근무일 */}
              <CalcInputCard>
                <label className="block text-[14px] font-semibold text-[#191f28] mb-2">
                  마지막 근무일 (선택)
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-center"
                />
                <p className="text-[12px] text-[#8b95a1] mt-2">
                  비워두면 PDF의 마지막 근무일을 사용해요
                </p>
              </CalcInputCard>

              {error && <CalcErrorMsg message={error} />}

              <CalcNextButton
                disabled={!file || extractLoading || (pdfCompanies.length > 0 && !selectedPdfCompany)}
                accentColor="blue"
                onClick={runPrecise}
              >
                계산하기
              </CalcNextButton>
              <CalcBackButton onClick={() => go(3)} />

              {pdfGuideOpen && <PdfGuide onClose={() => setPdfGuideOpen(false)} />}
            </CalcStepCard>
          )}

          {/* ── STEP 4B: 쉬운 계산 (직접 입력) ── */}
          {s.step === 4 && s.calcMode === 'simple' && (
            <CalcStepCard motionKey="sev-step4b">
              <CalcStepIcon
                icon={<Briefcase className="w-7 h-7" />}
                accentColor="blue"
                title="직접 입력해서 계산하기"
                subtitle="근무일수와 평균 일당을 입력하면 예상 퇴직금을 바로 알 수 있어요"
              />

              <CalcInputCard>
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[14px] font-semibold text-[#191f28] mb-2">전체 근무일수 (일)</label>
                    <input
                      type="number"
                      placeholder="예: 400"
                      value={workDays}
                      onChange={e => setWorkDays(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-center"
                    />
                    <p className="text-[12px] text-[#8b95a1] mt-1.5">첫 출근 ~ 마지막 퇴근까지의 총 일수</p>
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#191f28] mb-2">평균 일당 (원)</label>
                    <input
                      type="number"
                      placeholder="예: 150000"
                      value={avgWage}
                      onChange={e => setAvgWage(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 text-center"
                    />
                    <p className="text-[12px] text-[#8b95a1] mt-1.5">최근 3개월 총 지급액 ÷ 근무일수</p>
                  </div>
                </div>
              </CalcInputCard>

              {error && <CalcErrorMsg message={error} />}

              <CalcNextButton disabled={!workDays || !avgWage} accentColor="blue" onClick={runSimple}>
                계산하기
              </CalcNextButton>
              <CalcBackButton onClick={() => go(3)} />
            </CalcStepCard>
          )}

        </AnimatePresence>
      </CalcContentArea>
    </CalcPageWrapper>
  )
}
