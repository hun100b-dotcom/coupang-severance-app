import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { PrimaryButton, SecondaryButton, ChoiceButton } from '../components/Button'
import ProgressSummary from '../components/ProgressSummary'
import LoadingOverlay from '../components/LoadingOverlay'
import ResultSeverance from './ResultSeverance'
import { calcSeverancePrecise, calcSeveranceSimple, extractSeveranceCompanies, SeverancePreciseResult, SeveranceSimpleResult } from '../lib/api'
import { COMPANIES, Company } from '../lib/constants'
import { Check } from 'lucide-react'

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

// 스텝별 진행도 빌더
function buildSteps(s: State, selectedPdfCompany: string | null) {
  const compLabel = selectedPdfCompany
    ? (selectedPdfCompany.length > 12 ? selectedPdfCompany.slice(0, 12) + '…' : selectedPdfCompany)
    : s.company === '기타' && s.companyOther
      ? s.companyOther.slice(0, 12)
      : s.company || '회사 선택'
  const modeLabel = s.calcMode === 'precise' ? '정밀 계산' : s.calcMode === 'simple' ? '쉬운 계산' : '계산 방식'
  const steps: { label: string; done?: boolean; current?: boolean }[] = [
    { label: `① ${compLabel}`, done: !!s.company && s.step > 1, current: s.step === 1 },
    { label: '② 자격 확인', done: s.step > 2 && !s.failed, current: s.step === 2 },
    { label: `③ ${modeLabel}`, done: !!s.calcMode && s.step > 3, current: s.step === 3 },
    { label: '④ 계산', done: !!s.result, current: s.step === 4 },
  ]
  return steps
}

export default function SeveranceFlow() {
  const [s, setS] = useState<State>(INIT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Precise inputs
  const [endDate, setEndDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pdfCompanies, setPdfCompanies] = useState<string[]>([])
  const [selectedPdfCompany, setSelectedPdfCompany] = useState<string | null>(null)
  const [extractLoading, setExtractLoading] = useState(false)

  // Simple inputs
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
    return (
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        {loading && <LoadingOverlay />}
        <div style={{ width: '100%', maxWidth: 480 }}>
          <GlassCard className="p-8">
            <ProgressSummary steps={buildSteps(s, selectedPdfCompany)} totalSteps={4} currentStep={2} />
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>😔</div>
              <h2 className="heading-lg" style={{ marginBottom: 12 }}>아직은 퇴직금을 받기 어려워요</h2>
              <p style={{ color: 'var(--toss-text-2)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: 24 }}>
                {s.q1 === false
                  ? '퇴직급여법상 계속근로기간 1년 이상이 필요해요. 1년이 되면 다시 확인해 보세요.'
                  : '주 15시간 이상 근무해야 퇴직금 수급 자격이 생겨요.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PrimaryButton onClick={reset}>처음으로 돌아가기</PrimaryButton>
                <SecondaryButton onClick={() => navigate('/')}>홈으로</SecondaryButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  // ── 계산 실행 ──────────────────────────────────
  async function runPrecise() {
    if (!file) { setError('PDF 파일을 업로드해 주세요.'); return }
    const usePdfCompany = selectedPdfCompany !== null
    if (!usePdfCompany && pdfCompanies.length > 1) {
      setError('사업장을 선택해 주세요.')
      return
    }
    setError(''); setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('company', usePdfCompany ? '기타' : s.company)
    fd.append('company_other', usePdfCompany ? selectedPdfCompany! : s.companyOther)
    if (endDate) fd.append('end_date', endDate)
    // 최소 3초 로딩
    const [res] = await Promise.allSettled([
      calcSeverancePrecise(fd),
      new Promise(r => setTimeout(r, 3000)),
    ])
    setLoading(false)
    if (res.status === 'fulfilled') {
      setS(p => ({
        ...p,
        result: res.value,
        resultType: 'precise',
        step: 4,
        displayCompany: usePdfCompany ? selectedPdfCompany || undefined : undefined,
      }))
    } else {
      const err = res.reason as {
        response?: { status?: number; data?: { detail?: string | Array<{ msg?: string }> } }
        message?: string
      }
      // 디버깅: 브라우저 콘솔에서 전체 오류 확인
      console.error('[퇴직금 정밀계산 오류]', err?.response?.data ?? err?.message ?? err)

      const detail = err?.response?.data?.detail
      let msg: string
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        msg = detail[0].msg
      } else if (err?.message === 'Network Error') {
        msg = '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
      } else if (err?.response?.status === 504 || (err?.message ?? '').includes('timeout')) {
        msg = '요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.'
      } else {
        const status = err?.response?.status
        const extra = typeof detail === 'object' && detail !== null
          ? ` (${JSON.stringify(detail).slice(0, 80)}…)`
          : status ? ` (HTTP ${status})` : ''
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

  const wrap = (content: JSX.Element, stepN: Step) => (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {loading && <LoadingOverlay message="퇴직금을 계산하고 있어요.." />}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <GlassCard className="p-8">
          <ProgressSummary steps={buildSteps(s, selectedPdfCompany)} totalSteps={4} currentStep={stepN} />
          {content}
        </GlassCard>
      </div>
    </div>
  )

  // ── STEP 1: 회사 선택 ─────────────────────────
  if (s.step === 1) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>어디에서 근무하셨나요?</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>근무처를 선택해 주세요.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {COMPANIES.map(c => (
          <ChoiceButton
            key={c}
            selected={s.company === c}
            onClick={() => setS(p => ({ ...p, company: c as Company, companyOther: '' }))}
          >
            {c}
          </ChoiceButton>
        ))}
      </div>
      {s.company === '기타' && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="회사명을 직접 입력해 주세요"
            value={s.companyOther}
            onChange={e => setS(p => ({ ...p, companyOther: e.target.value }))}
          />
        </div>
      )}
      <PrimaryButton
        disabled={!s.company || (s.company === '기타' && !s.companyOther)}
        onClick={() => go(2)}
      >
        다음
      </PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => navigate('/')}>← 홈으로</SecondaryButton>
    </>,
    1,
  )

  // ── STEP 2: Q1 — 1년 이상 ────────────────────
  if (s.step === 2) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>
        {s.company}에서 첫 출근부터 마지막 퇴근까지 <span style={{ color: 'var(--toss-blue)' }}>1년 넘게</span> 일하셨나요?
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>
        퇴직급여법상 계속근로기간 1년이 필요해요.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ChoiceButton icon="✅" selected={s.q1 === true} onClick={() => setS(p => ({ ...p, q1: true }))}>
          예, 1년 이상 일했어요
        </ChoiceButton>
        <ChoiceButton icon="❌" selected={s.q1 === false} onClick={() => setS(p => ({ ...p, q1: false, failed: true }))}>
          아니요, 1년 미만이에요
        </ChoiceButton>
      </div>
      {s.q1 === true && <PrimaryButton onClick={() => go(3)}>다음</PrimaryButton>}
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(1)}>← 이전으로</SecondaryButton>
    </>,
    2,
  )

  // ── STEP 3: Q2 — 주 15시간 & 계산 방식 ──────
  if (s.step === 3) return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>
        주 평균 <span style={{ color: 'var(--toss-blue)' }}>15시간 이상</span> 근무하셨나요?
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>
        4주 평균 주 15시간 이상이어야 퇴직금을 받을 수 있어요.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <ChoiceButton icon="✅" selected={s.q2 === true} onClick={() => setS(p => ({ ...p, q2: true }))}>
          예, 15시간 이상이에요
        </ChoiceButton>
        <ChoiceButton icon="❌" selected={s.q2 === false} onClick={() => setS(p => ({ ...p, q2: false, failed: true }))}>
          아니요, 15시간 미만이에요
        </ChoiceButton>
      </div>

      {s.q2 === true && (
        <>
          <div className="divider" />
          <h2 className="heading-md" style={{ marginBottom: 6 }}>어떻게 계산할까요?</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 16 }}>
            PDF를 올리면 자동으로, 직접 입력하면 빠르게 계산해요.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <ChoiceButton
              icon="📄"
              selected={s.calcMode === 'precise'}
              onClick={() => setS(p => ({ ...p, calcMode: 'precise' }))}
            >
              <div>
                <div>정밀 계산 — PDF 자동 분석</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', fontWeight: 400 }}>근로복지공단 일용근로내역서 업로드</div>
              </div>
            </ChoiceButton>
            <ChoiceButton
              icon="✏️"
              selected={s.calcMode === 'simple'}
              onClick={() => setS(p => ({ ...p, calcMode: 'simple' }))}
            >
              <div>
                <div>쉬운 계산 — 직접 입력</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', fontWeight: 400 }}>근무일수·평균임금 직접 입력</div>
              </div>
            </ChoiceButton>
          </div>
          {s.calcMode && <PrimaryButton onClick={() => go(4)}>다음</PrimaryButton>}
        </>
      )}
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(2)}>← 이전으로</SecondaryButton>
    </>,
    3,
  )

  // PDF 업로드 시 사업장 추출
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

  // ── STEP 4A: 정밀 계산 ───────────────────────
  if (s.step === 4 && s.calcMode === 'precise') return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>📄 근로내역서 PDF 업로드</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>
        근로복지공단 고용·산재보험 포털에서 발급받은<br />
        <strong>일용근로·노무제공내역서 PDF</strong>를 올려주세요.
      </p>

      {/* 드롭존 */}
      <div
        className={`dropzone ${file ? 'active' : ''}`}
        onClick={() => fileRef.current?.click()}
      >
        {file ? (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
            <p style={{ fontWeight: 700, color: 'var(--toss-blue)' }}>{file.name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>다른 파일로 교체하려면 클릭하세요</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📤</div>
            <p style={{ fontWeight: 700, color: 'var(--toss-text)' }}>여기를 클릭해서 PDF 업로드</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>PDF 파일만 가능해요</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPdfSelect(f) }}
        />
      </div>

      {/* 사업장 선택 카드 (토스 스타일 칩) */}
      {extractLoading && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 max-w-md mx-auto mt-4" style={{ textAlign: 'center', color: 'var(--toss-text-2)' }}>
          PDF 분석 중…
        </div>
      )}
      {!extractLoading && pdfCompanies.length > 1 && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 max-w-md mx-auto mt-4 transition-all duration-300">
          <p className="font-sans font-semibold text-toss-text mb-3" style={{ fontSize: '0.95rem' }}>계산할 사업장을 선택하세요</p>
          <div className="flex flex-wrap gap-2">
            {pdfCompanies.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedPdfCompany(prev => prev === name ? null : name)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  selectedPdfCompany === name
                    ? 'ring-2 ring-[#3182f6] bg-blue-50 text-[#3182f6]'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {selectedPdfCompany === name && <Check size={16} strokeWidth={2.5} />}
                <span className="truncate max-w-[200px]">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!extractLoading && pdfCompanies.length === 1 && selectedPdfCompany && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-4 max-w-md mx-auto mt-4 flex items-center gap-2">
          <Check size={20} className="text-[#3182f6] shrink-0" />
          <span className="font-medium text-toss-text text-sm">선택된 사업장: {selectedPdfCompany}</span>
        </div>
      )}

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--toss-text)', marginBottom: 8 }}>
          마지막 근무일 (선택)
        </label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>
          비워두면 PDF의 마지막 근무일을 사용해요.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(240,68,82,0.08)', border: '1px solid rgba(240,68,82,0.2)', borderRadius: 12, marginBottom: 16, color: '#cc2233', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <PrimaryButton
        onClick={runPrecise}
        disabled={!file || extractLoading || (pdfCompanies.length > 1 && !selectedPdfCompany)}
      >
        계산하기
      </PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(3)}>← 이전으로</SecondaryButton>
    </>,
    4,
  )

  // ── STEP 4B: 쉬운 계산 ───────────────────────
  return wrap(
    <>
      <h2 className="heading-md" style={{ marginBottom: 6 }}>✏️ 직접 입력해서 계산하기</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', marginBottom: 20 }}>
        근무일수와 평균 일당을 입력하면 예상 퇴직금을 바로 알 수 있어요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>전체 근무일수 (일)</label>
          <input
            type="number"
            placeholder="예: 400"
            value={workDays}
            onChange={e => setWorkDays(e.target.value)}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>첫 출근 ~ 마지막 퇴근까지의 총 일수</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>평균 일당 (원)</label>
          <input
            type="number"
            placeholder="예: 150000"
            value={avgWage}
            onChange={e => setAvgWage(e.target.value)}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>최근 3개월 총 지급액 ÷ 근무일수</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(240,68,82,0.08)', border: '1px solid rgba(240,68,82,0.2)', borderRadius: 12, marginBottom: 16, color: '#cc2233', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <PrimaryButton onClick={runSimple} disabled={!workDays || !avgWage}>
        계산하기
      </PrimaryButton>
      <SecondaryButton style={{ marginTop: 10 }} onClick={() => go(3)}>← 이전으로</SecondaryButton>
    </>,
    4,
  )
}
