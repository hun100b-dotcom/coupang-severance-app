// 실업급여 계산 페이지 — 4단계 설문 플로우 → 간편/PDF 정밀계산
// 근거: 고용보험법 제40조(실업급여 수급요건)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageMeta from '../components/PageMeta'

// ── 실업급여 계산기 — SoftwareApplication JSON-LD ──
const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '쿠팡·CFS 일용직 실업급여 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  description: '쿠팡·CFS·마켓컬리 일용직 근로자 실업급여 수급액 무료 자동 계산기. PDF 급여명세서 업로드 지원.',
  url: 'https://catch-daily-worker.vercel.app/unemployment',
}

// ── 실업급여 계산기 — FAQPage JSON-LD ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '쿠팡 일용직 실업급여를 받을 수 있는 조건은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① 최근 18개월 내 피보험단위기간 180일 이상 ② 최근 1개월 근로일수 10일 미만 ③ 자발적 퇴사가 아닌 경우(계약 만료, 권고사직 포함)입니다. 쿠팡·CFS 일용직도 고용보험 가입 기간이 있다면 신청 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 실업급여 하루에 얼마나 받나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '일용직 실업급여 1일 수급액 = 이직 전 평균임금의 60%. 2026년 기준 상한액은 66,000원/일, 하한액은 최저임금의 80%입니다. 수급 기간은 고용보험 가입 기간에 따라 120~270일입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 CFS 실업급여 신청 방법은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '고용24(www.work.go.kr)에서 온라인 신청하거나 가까운 고용센터를 방문하면 됩니다. CATCH 계산기로 예상 수급액을 먼저 확인한 후 신청하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 실업급여 신청 기한이 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '마지막 근무일로부터 12개월 이내에 수급 신청을 완료해야 합니다. 기한이 지나면 수급 자격이 소멸됩니다. 빨리 신청할수록 더 많은 급여일수를 받을 수 있습니다.',
      },
    },
  ],
}
import {
  CalcHeader, CalcStepCard, CalcStepIcon, CalcChoiceButton,
  CalcNextButton, CalcBackButton, CalcInputCard, CalcModeSelector,
  CalcErrorMsg, CalcPageWrapper, CalcContentArea, AnimatePresence,
} from '../components/calc/CalcLayout'
import LoadingOverlay from '../components/LoadingOverlay'
import PdfGuide from '../components/PdfGuide'
import ResultUnemployment from './ResultUnemployment'
import { calcUBPrecise, calcUBSimple, extractUnemploymentCompanies, UBResult } from '../lib/api'
import { COMPANIES, Company } from '../lib/constants'
import { ShieldCheck, HelpCircle, Calendar, FileText, Check, Upload } from 'lucide-react'
import PdfSourceSelector from '../components/calc/PdfSourceSelector'

type Step = 1 | 2 | 3 | 4
type CalcMode = 'precise' | 'simple'

interface State {
  step: Step
  company: Company | ''
  companyOther: string
  displayCompany?: string
  q1: boolean | null
  q2: boolean | null
  q3: boolean | null
  calcMode: CalcMode | null
  failed: boolean
  failReason: string
  result: UBResult | null
  age50: boolean
}

const INIT: State = {
  step: 1, company: '', companyOther: '', q1: null, q2: null, q3: null,
  calcMode: null, failed: false, failReason: '', result: null, age50: false,
}

export default function UnemploymentFlow() {
  // ── SEO: 실업급여 계산기 페이지 탭 제목 설정 → 언마운트 시 기본 타이틀 복원 ──
  useEffect(() => {
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거
    return () => {}
  }, [])

  const [s, setS] = useState<State>(INIT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [endDate, setEndDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // fileRef는 PdfSourceSelector 내부에서 관리
  const [pdfCompanies, setPdfCompanies] = useState<string[]>([])
  const [selectedPdfCompany, setSelectedPdfCompany] = useState<string | null>(null)
  const [pdfGuideOpen, setPdfGuideOpen] = useState(false)
  const [extractLoading, setExtractLoading] = useState(false)

  const [insuredDays, setInsuredDays] = useState('')
  const [avgWage, setAvgWage] = useState('')

  const go = (step: Step) => setS(p => ({ ...p, step, failed: false, failReason: '' }))
  const reset = () => {
    setS(INIT)
    setFile(null)
    setEndDate('')
    setInsuredDays('')
    setAvgWage('')
    setError('')
    setPdfCompanies([])
    setSelectedPdfCompany(null)
  }

  // ── 결과 화면 ──
  if (s.result) {
    const companyLabel = s.displayCompany || (s.company === '기타' ? s.companyOther : s.company) || ''
    return <ResultUnemployment result={s.result} company={companyLabel} onReset={reset} />
  }

  // ── 실패 화면 ──
  if (s.failed) {
    return (
      <CalcPageWrapper>
        <CalcHeader
          title="실업급여 계산기"
          icon={<ShieldCheck className="w-4 h-4" />}
          accentColor="sky"
          onBack={() => go((s.step - 1 || 1) as Step)}
          showProgress={false}
        />
        <CalcContentArea>
          <div className="text-center py-6">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-[22px] font-extrabold text-[#191f28] mb-3">
              아직은 실업급여를 받기 어려워요
            </h2>
            <p className="text-[14px] text-[#8b95a1] leading-relaxed mb-6">
              {s.failReason}
            </p>
            <div className="flex flex-col gap-3">
              <CalcNextButton disabled={false} accentColor="sky" onClick={reset}>
                처음으로 돌아가기
              </CalcNextButton>
              <CalcBackButton onClick={() => navigate('/home')}>홈으로</CalcBackButton>
            </div>
          </div>
        </CalcContentArea>
      </CalcPageWrapper>
    )
  }

  // ── PDF 업로드 시 사업장 추출 (로직 불변) ──
  async function onPdfSelect(f: File) {
    setFile(f)
    setPdfCompanies([])
    setSelectedPdfCompany(null)
    setExtractLoading(true)
    setError('')
    try {
      const { companies } = await extractUnemploymentCompanies(f)
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

  // ── 계산 실행 (로직 불변) ──
  async function runPrecise() {
    if (!file) { setError('PDF 파일을 업로드해 주세요.'); return }
    if (pdfCompanies.length > 0 && !selectedPdfCompany) { setError('계산할 사업장을 선택해 주세요.'); return }
    setError(''); setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('company', '기타')
    fd.append('company_other', selectedPdfCompany ?? '')
    if (endDate) fd.append('end_date', endDate)
    fd.append('age_50', String(s.age50))
    const [res] = await Promise.allSettled([
      calcUBPrecise(fd),
      new Promise(r => setTimeout(r, 3000)),
    ])
    setLoading(false)
    if (res.status === 'fulfilled') {
      setS(p => ({ ...p, result: res.value, displayCompany: selectedPdfCompany || undefined }))
    } else {
      const msg = (res.reason as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '계산 중 오류가 발생했어요.'
      setError(msg)
    }
  }

  async function runSimple() {
    const days = parseInt(insuredDays)
    const wage = parseFloat(avgWage.replace(/,/g, ''))
    if (!days || !wage) { setError('가입일수와 평균 일당을 모두 입력해 주세요.'); return }
    setError(''); setLoading(true)
    const [res] = await Promise.allSettled([
      calcUBSimple(days, wage, s.age50),
      new Promise(r => setTimeout(r, 2000)),
    ])
    setLoading(false)
    if (res.status === 'fulfilled') {
      setS(p => ({ ...p, result: res.value }))
    } else {
      setError('계산 중 오류가 발생했어요.')
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
      {/* ── SEO 메타태그: 실업급여 계산기 + SoftwareApplication 구조화 데이터 ── */}
      <PageMeta
        title="쿠팡·CFS 일용직 실업급여 계산기 무료 | CATCH — 수급액 3분 확인"
        description="쿠팡·CFS·마켓컬리 일용직 실업급여 수급액과 기간을 3분 만에 자동 계산. PDF 업로드 지원, 2026년 상한액 66,000원/일 반영."
        canonical="https://catch-daily-worker.vercel.app/unemployment"
        jsonLd={[SOFTWARE_SCHEMA, FAQ_SCHEMA]}
      />

      {/* PDF 분석 중 또는 계산 중 전체 화면 오버레이 — 배경 터치 차단 */}
      {(loading || extractLoading) && (
        <LoadingOverlay message={extractLoading ? "PDF를 분석하고 있어요.." : "실업급여를 계산하고 있어요.."} />
      )}

      <CalcHeader
        title="실업급여 계산기"
        icon={<ShieldCheck className="w-4 h-4" />}
        accentColor="sky"
        onBack={handleBack}
        progress={{ current: s.step, total: 4 }}
      />

      <CalcContentArea>
        <AnimatePresence mode="wait">

          {/* ── STEP 1: 회사 선택 ── */}
          {s.step === 1 && (
            <CalcStepCard motionKey="ub-step1">
              <CalcStepIcon
                icon={<ShieldCheck className="w-7 h-7" />}
                accentColor="sky"
                title="어디에서 근무하셨나요?"
                subtitle="근무처를 선택해 주세요"
              />
              <div className="flex flex-col gap-3">
                {COMPANIES.map(c => (
                  <CalcChoiceButton
                    key={c}
                    selected={s.company === c}
                    accentColor="sky"
                    onClick={() => setS(p => ({ ...p, company: c as Company, companyOther: '' }))}
                  >
                    {c}
                  </CalcChoiceButton>
                ))}
              </div>
              {s.company === '기타' && (
                <CalcInputCard>
                  <input
                    type="text"
                    placeholder="회사명을 직접 입력해 주세요"
                    value={s.companyOther}
                    onChange={e => setS(p => ({ ...p, companyOther: e.target.value }))}
                    className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 text-center"
                  />
                </CalcInputCard>
              )}
              <CalcNextButton
                disabled={!s.company || (s.company === '기타' && !s.companyOther)}
                accentColor="sky"
                onClick={() => go(2)}
              />
              <CalcBackButton onClick={() => navigate('/home')}>← 홈으로</CalcBackButton>
            </CalcStepCard>
          )}

          {/* ── STEP 2: Q1 — 18개월 내 180일 이상 ── */}
          {s.step === 2 && (
            <CalcStepCard motionKey="ub-step2">
              <CalcStepIcon
                icon={<HelpCircle className="w-7 h-7" />}
                accentColor="sky"
                title={<>최근 <span className="text-sky-500">18개월 내 180일 이상</span> 고용보험에 가입되어 있었나요?</>}
                subtitle="실업급여 수급을 위한 기본 요건이에요"
              />
              <div className="flex flex-col gap-3">
                <CalcChoiceButton icon="✅" selected={s.q1 === true} accentColor="sky"
                  onClick={() => setS(p => ({ ...p, q1: true }))}
                  sub="다음 조건을 확인할게요">
                  예, 180일 이상이에요
                </CalcChoiceButton>
                <CalcChoiceButton icon="❌" selected={s.q1 === false} accentColor="sky"
                  onClick={() => setS(p => ({ ...p, q1: false, failed: true, failReason: '최근 18개월 내 고용보험 가입일수가 180일 이상이어야 실업급여를 받을 수 있어요.' }))}
                  sub="아쉽지만 자격이 안 돼요">
                  아니요, 180일 미만이에요
                </CalcChoiceButton>
              </div>
              {s.q1 === true && (
                <CalcNextButton disabled={false} accentColor="sky" onClick={() => go(3)} />
              )}
              <CalcBackButton onClick={() => go(1)} />
            </CalcStepCard>
          )}

          {/* ── STEP 3: Q2 — 최근 1개월 근로일수 10일 미만 & 계산 방식 ── */}
          {s.step === 3 && (
            <CalcStepCard motionKey="ub-step3">
              <CalcStepIcon
                icon={<Calendar className="w-7 h-7" />}
                accentColor="sky"
                title={<>최근 <span className="text-sky-500">1개월간 근로일수가 10일 미만</span>이었나요?</>}
                subtitle="일용직은 실업 상태 유지 여부가 중요해요"
              />
              <div className="flex flex-col gap-3">
                <CalcChoiceButton icon="✅" selected={s.q2 === true} accentColor="sky"
                  onClick={() => setS(p => ({ ...p, q2: true }))}
                  sub="실업급여 계산을 진행할게요">
                  예, 10일 미만이에요
                </CalcChoiceButton>
                <CalcChoiceButton icon="❌" selected={s.q2 === false} accentColor="sky"
                  onClick={() => setS(p => ({ ...p, q2: false, failed: true, failReason: '최근 1개월 근로일수가 10일 미만이어야 실업 상태로 인정되어 실업급여를 받을 수 있어요.' }))}
                  sub="10일 이상이면 실업 상태가 아니에요">
                  아니요, 10일 이상이에요
                </CalcChoiceButton>
              </div>

              {/* q2 통과 시 계산 방식 선택 */}
              {s.q2 === true && (
                <>
                  <div className="w-full h-px bg-white/40 my-2" />
                  <CalcStepIcon
                    icon={<FileText className="w-7 h-7" />}
                    accentColor="sky"
                    title="어떻게 계산할까요?"
                    subtitle="PDF를 올리면 자동으로, 직접 입력하면 빠르게 계산해요"
                  />
                  <CalcModeSelector
                    accentColor="sky"
                    onSimple={() => { setS(p => ({ ...p, calcMode: 'simple' })); go(4) }}
                    onPdf={() => { setS(p => ({ ...p, calcMode: 'precise' })); go(4) }}
                    simpleLabel="쉬운 계산"
                    simpleDesc="가입일수·평균임금 직접 입력"
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
            <CalcStepCard motionKey="ub-step4a">
              <CalcStepIcon
                icon={<Upload className="w-7 h-7" />}
                accentColor="sky"
                title="근로내역서 PDF 업로드"
                subtitle="근로복지공단 일용근로·노무제공내역서 PDF를 올려주세요"
              />

              {/* PDF 소스 선택 (저장된 PDF / 새 업로드) */}
              <PdfSourceSelector
                onFileSelect={onPdfSelect}
                accentColor="sky"
                currentFile={file}
              />

              {/* PDF 발급 가이드 */}
              <button type="button" onClick={() => setPdfGuideOpen(true)}
                className="text-[13px] text-[#8b95a1] underline underline-offset-2 hover:text-sky-500 transition-colors">
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
                            ? 'bg-sky-50 border border-sky-200'
                            : 'bg-white/50 border border-white/40 hover:bg-white/80'
                        }`}>
                        <span className="shrink-0">
                          {selectedPdfCompany === name
                            ? <Check size={14} strokeWidth={2.5} className="text-sky-500" />
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
                  className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 text-center"
                />
              </CalcInputCard>

              {/* 50세 이상 체크 */}
              <CalcInputCard>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={s.age50}
                    onChange={e => setS(p => ({ ...p, age50: e.target.checked }))}
                    className="w-5 h-5 rounded-md border-2 border-sky-300 text-sky-500 focus:ring-sky-400/40"
                  />
                  <span className="text-[14px] font-semibold text-[#191f28]">
                    50세 이상이에요 <span className="text-[12px] text-[#8b95a1] font-normal">(수급일수 더 길어요)</span>
                  </span>
                </label>
              </CalcInputCard>

              {error && <CalcErrorMsg message={error} />}

              <CalcNextButton
                disabled={!file || extractLoading || (pdfCompanies.length > 0 && !selectedPdfCompany)}
                accentColor="sky"
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
            <CalcStepCard motionKey="ub-step4b">
              <CalcStepIcon
                icon={<ShieldCheck className="w-7 h-7" />}
                accentColor="sky"
                title="직접 입력해서 계산하기"
                subtitle="가입일수와 평균 일당을 입력하면 예상 실업급여를 바로 알 수 있어요"
              />

              <CalcInputCard>
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[14px] font-semibold text-[#191f28] mb-2">최근 18개월 고용보험 가입일수</label>
                    <input
                      type="number"
                      placeholder="예: 200"
                      value={insuredDays}
                      onChange={e => setInsuredDays(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#191f28] mb-2">평균 일당 (원)</label>
                    <input
                      type="number"
                      placeholder="예: 150000"
                      value={avgWage}
                      onChange={e => setAvgWage(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl border border-white/60 bg-white/70 text-lg font-bold text-[#191f28] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 text-center"
                    />
                  </div>
                </div>
              </CalcInputCard>

              {/* 50세 이상 체크 */}
              <CalcInputCard>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={s.age50}
                    onChange={e => setS(p => ({ ...p, age50: e.target.checked }))}
                    className="w-5 h-5 rounded-md border-2 border-sky-300 text-sky-500 focus:ring-sky-400/40"
                  />
                  <span className="text-[14px] font-semibold text-[#191f28]">
                    50세 이상이에요
                  </span>
                </label>
              </CalcInputCard>

              {error && <CalcErrorMsg message={error} />}

              <CalcNextButton disabled={!insuredDays || !avgWage} accentColor="sky" onClick={runSimple}>
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
