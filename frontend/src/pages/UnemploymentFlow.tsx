import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { PrimaryButton, SecondaryButton, ChoiceButton } from '../components/Button'
import ProgressSummary from '../components/ProgressSummary'
import LoadingOverlay from '../components/LoadingOverlay'
import PdfGuide from '../components/PdfGuide'
import ResultUnemployment from './ResultUnemployment'
import { calcUBPrecise, calcUBSimple, extractUnemploymentCompanies, UBResult } from '../lib/api'
import { COMPANIES, Company } from '../lib/constants'
import { Check } from 'lucide-react'

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

function buildSteps(s: State, selectedPdfCompany: string | null) {
  const compLabel = selectedPdfCompany
    ? (selectedPdfCompany.length > 10 ? selectedPdfCompany.slice(0, 10) + '…' : selectedPdfCompany)
    : s.company === '기타' && s.companyOther ? s.companyOther.slice(0, 10) : s.company || '회사 선택'
  const modeLabel = s.calcMode === 'precise' ? '정밀 계산' : s.calcMode === 'simple' ? '쉬운 계산' : '계산 방식'
  return [
    { label: `① ${compLabel}`, done: !!s.company && s.step > 1, current: s.step === 1 },
    { label: '② 자격 확인', done: s.step > 3 && !s.failed, current: s.step <= 3 && s.step > 1 },
    { label: `③ ${modeLabel}`, done: !!s.calcMode && s.step === 4, current: s.step === 4 && !s.result },
    { label: '④ 계산', done: !!s.result, current: false },
  ]
}

export default function UnemploymentFlow() {
  const [s, setS] = useState<State>(INIT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [endDate, setEndDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        {loading && <LoadingOverlay />}
        <div style={{ width: '100%', maxWidth: 480 }}>
          <GlassCard className="p-8">
            <ProgressSummary steps={buildSteps(s, selectedPdfCompany)} totalSteps={4} currentStep={2} />
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>😔</div>
              <h2 className="heading-lg" style={{ marginBottom: 12 }}>아직은 실업급여를 받기 어려워요</h2>
              <p style={{ color: 'var(--toss-text-2)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: 24 }}>
                {s.failReason}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PrimaryButton onClick={reset}>처음으로 돌아가기</PrimaryButton>
                <SecondaryButton onClick={() => navigate('/home')}>홈으로</SecondaryButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

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

  // ── 계산 실행 ──
  async function runPrecise() {
    if (!file) { setError('PDF 파일을 업로드해 주세요.'); return }
    // PDF 사업장이 추출됐으면 반드시 선택 필요 (step1 설문과 완전 분리)
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

  const wrap = (content: JSX.Element, stepN: Step) => (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {loading && <LoadingOverlay message="실업급여를 계산하고 있어요.." />}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <GlassCard className="p-8">
          <ProgressSummary steps={buildSteps(s, selectedPdfCompany)} totalSteps={4} currentStep={stepN} />
          {content}
        </GlassCard>
      </div>
    </div>
  )

  // ── STEP 1: 회사 선택 ──
  if (s.step === 1) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>실업급여 — 어디서 근무하셨나요?</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>근무처를 선택해 주세요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {COMPANIES.map(c => (
          <ChoiceButton key={c} selected={s.company === c} onClick={() => setS(p => ({ ...p, company: c as Company, companyOther: '' }))}>
            {c}
          </ChoiceButton>
        ))}
      </div>
      {s.company === '기타' && (
        <div style={{ marginBottom: 20 }}>
          <input type="text" placeholder="회사명을 직접 입력해 주세요" value={s.companyOther} onChange={e => setS(p => ({ ...p, companyOther: e.target.value }))} />
        </div>
      )}
      <PrimaryButton disabled={!s.company || (s.company === '기타' && !s.companyOther)} onClick={() => go(2)}>다음</PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => navigate('/home')}>← 홈으로</SecondaryButton>
    </>,
    1,
  )

  // ── STEP 2: 18개월 내 180일 이상 ──
  if (s.step === 2) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>최근 <span style={{ color: 'var(--toss-blue)' }}>18개월 내 180일 이상</span> 고용보험에 가입되어 있었나요?</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>실업급여 수급을 위한 기본 요건이에요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ChoiceButton icon="✅" selected={s.q1 === true} onClick={() => setS(p => ({ ...p, q1: true }))}>예, 180일 이상이에요</ChoiceButton>
        <ChoiceButton icon="❌" selected={s.q1 === false} onClick={() => setS(p => ({ ...p, q1: false, failed: true, failReason: '최근 18개월 내 고용보험 가입일수가 180일 이상이어야 실업급여를 받을 수 있어요.' }))}>아니요, 180일 미만이에요</ChoiceButton>
      </div>
      {s.q1 === true && <PrimaryButton onClick={() => go(3)}>다음</PrimaryButton>}
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(1)}>← 이전으로</SecondaryButton>
    </>,
    2,
  )

  // ── STEP 3: 최근 1개월 근로일수 10일 미만 ──
  if (s.step === 3) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>최근 <span style={{ color: 'var(--toss-blue)' }}>1개월간 근로일수가 10일 미만</span>이었나요?</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 6 }}>일용직은 자발적/비자발적 퇴사 구분보다 실업 상태 유지 여부가 중요해요.</p>
      <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 20 }}>근로일수가 10일 미만이어야 실업 상태로 인정돼요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ChoiceButton icon="✅" selected={s.q2 === true} onClick={() => setS(p => ({ ...p, q2: true }))}>예, 10일 미만이에요</ChoiceButton>
        <ChoiceButton icon="❌" selected={s.q2 === false} onClick={() => setS(p => ({ ...p, q2: false, failed: true, failReason: '최근 1개월 근로일수가 10일 미만이어야 실업 상태로 인정되어 실업급여를 받을 수 있어요.' }))}>아니요, 10일 이상이에요</ChoiceButton>
      </div>
      {s.q2 === true && (
        <>
          <div className="divider" />
          <h2 className="heading-md" style={{ marginBottom: 6 }}>어떻게 계산할까요?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <ChoiceButton icon="📄" selected={s.calcMode === 'precise'} onClick={() => setS(p => ({ ...p, calcMode: 'precise' }))}>
              <div><div>정밀 계산 — PDF 자동 분석</div><div style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', fontWeight: 400 }}>근로복지공단 일용근로내역서 업로드</div></div>
            </ChoiceButton>
            <ChoiceButton icon="✏️" selected={s.calcMode === 'simple'} onClick={() => setS(p => ({ ...p, calcMode: 'simple' }))}>
              <div><div>쉬운 계산 — 직접 입력</div><div style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', fontWeight: 400 }}>가입일수·평균임금 직접 입력</div></div>
            </ChoiceButton>
          </div>
          {s.calcMode && <PrimaryButton onClick={() => go(4)}>다음</PrimaryButton>}
        </>
      )}
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(2)}>← 이전으로</SecondaryButton>
    </>,
    3,
  )

  // ── STEP 4A: 정밀 계산 ──
  if (s.step === 4 && s.calcMode === 'precise') return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>📄 근로내역서 PDF 업로드</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>근로복지공단 고용·산재보험 포털에서 발급받은 <strong>일용근로·노무제공내역서 PDF</strong>를 올려주세요.</p>
      <div className={`dropzone ${file ? 'active' : ''}`} onClick={() => fileRef.current?.click()}>
        {file ? (
          <><div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div><p style={{ fontWeight: 700, color: 'var(--toss-blue)' }}>{file.name}</p><p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>다른 파일로 교체하려면 클릭</p></>
        ) : (
          <><div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📤</div><p style={{ fontWeight: 700 }}>PDF 업로드</p><p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>PDF 파일만 가능해요</p></>
        )}
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onPdfSelect(f) }} />
      </div>

      {/* PDF 발급 가이드 트리거 */}
      <button
        type="button"
        onClick={() => setPdfGuideOpen(true)}
        className="pdf-guide-trigger"
      >
        ❓ 근로내역서 PDF는 어디서 받나요?
        <br />
        (클릭해서 발급 방법 보기)
      </button>

      {extractLoading && (
        <div className="company-select-card mt-4" style={{ textAlign: 'center', color: 'var(--toss-text-2)' }}>
          <p style={{ fontSize: '0.9rem' }}>📂 PDF 분석 중…</p>
        </div>
      )}
      {!extractLoading && pdfCompanies.length > 0 && (
        <div className="company-select-card mt-4">
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--toss-text)', marginBottom: 10 }}>
            계산할 사업장을 선택하세요
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--toss-text-3)', marginLeft: 6 }}>
              ({pdfCompanies.length}개 추출됨)
            </span>
          </p>
          <div className="company-list-scroll">
            {pdfCompanies.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedPdfCompany(prev => prev === name ? null : name)}
                className={`company-item ${selectedPdfCompany === name ? 'selected' : ''}`}
              >
                <span className="company-item-dot">
                  {selectedPdfCompany === name
                    ? <Check size={14} strokeWidth={2.5} />
                    : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
                  }
                </span>
                <span className="company-item-name">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>마지막 근무일 (선택)</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>
      <label className="custom-checkbox" style={{ margin: '16px 0' }}>
        <input type="checkbox" checked={s.age50} onChange={e => setS(p => ({ ...p, age50: e.target.checked }))} />
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>50세 이상이에요 (수급일수 더 길어요)</span>
      </label>
      {error && <div style={{ padding: '12px 16px', background: 'rgba(240,68,82,0.08)', border: '1px solid rgba(240,68,82,0.2)', borderRadius: 12, marginBottom: 16, color: '#cc2233', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {error}</div>}
      <PrimaryButton onClick={runPrecise} disabled={!file || extractLoading || (pdfCompanies.length > 0 && !selectedPdfCompany)}>계산하기</PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(3)}>← 이전으로</SecondaryButton>

      {pdfGuideOpen && <PdfGuide onClose={() => setPdfGuideOpen(false)} />}
    </>,
    4,
  )

  // ── STEP 4B: 쉬운 계산 ──
  return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>✏️ 직접 입력해서 계산하기</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>최근 18개월 고용보험 가입일수</label>
          <input type="number" placeholder="예: 200" value={insuredDays} onChange={e => setInsuredDays(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>평균 일당 (원)</label>
          <input type="number" placeholder="예: 150000" value={avgWage} onChange={e => setAvgWage(e.target.value)} />
        </div>
      </div>
      <label className="custom-checkbox" style={{ marginBottom: 20 }}>
        <input type="checkbox" checked={s.age50} onChange={e => setS(p => ({ ...p, age50: e.target.checked }))} />
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>50세 이상이에요</span>
      </label>
      {error && <div style={{ padding: '12px 16px', background: 'rgba(240,68,82,0.08)', border: '1px solid rgba(240,68,82,0.2)', borderRadius: 12, marginBottom: 16, color: '#cc2233', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {error}</div>}
      <PrimaryButton onClick={runSimple} disabled={!insuredDays || !avgWage}>계산하기</PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(3)}>← 이전으로</SecondaryButton>
    </>,
    4,
  )
}
