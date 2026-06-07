// 어드민 — 채용공고 관리 전용 메뉴 (Phase B)
// JobsMenu.tsx에서 공고 CRUD 로직만 분리
// 기능: 공고 등록/수정/삭제, 섹션 변경, 상태 필터, 사업장 필터, view_count 표시, CSV 내보내기
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { logAdminAction } from '../../../lib/adminAuditLog'
import type { JobPosting } from '../../../types/supabase'

// ── 공고 등록/수정 폼 타입 ──
interface JobForm {
  company_name: string
  center_name: string
  region: string
  headcount: number
  hourly_wage: number
  daily_wage: number
  work_hours: string
  description: string
  contact_phone: string
  external_link: string
  is_urgent: boolean
  section: 'today-urgent' | 'tomorrow-urgent' | 'always'
  benefits: string[]
  task_options: string[]
  shift_options: string[]
  work_date: string
  expires_at: string
  status: 'active' | 'draft' | 'expired' | 'deleted'
  // ── 20260419 추가 필드 ──
  work_type: 'always' | 'date'                            // 상시모집 / 일자지정
  work_dates: string[]                                     // 일자지정 시 날짜 배열
  shift_wages: Record<string, { hourly: number; daily: number }> // 근무조별 시급/일급
  task_wages: Record<string, number>                       // 업무별 시급
  use_task_wages: boolean                                  // UI 전용: 업무별 금액 차등 토글
}

const defaultForm: JobForm = {
  company_name: '', center_name: '', region: '',
  headcount: 0, hourly_wage: 0, daily_wage: 0, work_hours: '',
  description: '', contact_phone: '', external_link: '',
  is_urgent: false, section: 'always', benefits: [],
  task_options: ['상차', '하차', '분류', '피킹', '포장'],
  shift_options: [],
  work_date: '',
  expires_at: '',
  status: 'active',
  // 20260419 추가 기본값
  work_type: 'always',
  work_dates: [],
  shift_wages: {},
  task_wages: {},
  use_task_wages: false,
}

// 스텝퍼 정의
const STEPS = [
  { num: 1, label: '기본 정보', desc: '회사·센터·지역' },
  { num: 2, label: '근무 조건', desc: '시급·일급·근무시간' },
  { num: 3, label: '상세 & 업무', desc: '내용·복리후생·업무' },
  { num: 4, label: '발행 설정', desc: '섹션·마감일·상태' },
  { num: 5, label: '미리보기', desc: '최종 확인 후 발행' },
]

export default function JobPostingsMenu() {
  const { user } = useAuth()

  // 풀페이지 모드: null=목록, 'create'=신규등록, 'edit'=수정
  const [pageMode, setPageMode] = useState<null | 'create' | 'edit'>(null)

  // 토스트 알림
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 공고 목록 상태
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<JobForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const [formStep, setFormStep] = useState(1)

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobSearch, setJobSearch] = useState<string>('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  // 지원자 수 (공고 ID → 카운트)
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({})

  // 사업장 목록 (company_name DISTINCT)
  const [companies, setCompanies] = useState<string[]>([])

  // 공고 목록 + 지원자 카운트 로드
  const fetchJobs = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let query = supabase.from('job_postings').select('*').order('created_at', { ascending: false })
      if (statusFilter === 'all') {
        query = query.neq('status', 'deleted')
      } else {
        query = query.eq('status', statusFilter)
      }
      const { data, error } = await query
      if (error) throw error
      const list = (data ?? []) as JobPosting[]
      setJobs(list)

      // 사업장 목록 추출 (중복 제거)
      const uniqueCompanies = [...new Set(list.map(j => j.company_name).filter(Boolean))]
      setCompanies(uniqueCompanies)

      // 공고별 지원자 수 조회
      if (list.length > 0 && supabase) {
        const ids = list.map(j => j.id)
        const { data: appData } = await supabase
          .from('job_applications')
          .select('job_posting_id')
          .in('job_posting_id', ids)
        const counts: Record<string, number> = {}
        ;(appData ?? []).forEach((a: { job_posting_id: string }) => {
          counts[a.job_posting_id] = (counts[a.job_posting_id] ?? 0) + 1
        })
        setApplicantCounts(counts)
      }
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : '공고 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // 신규 등록 폼 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setFormStep(1)
    setJobError(null)
    setPageMode('create')
  }

  // 수정 폼 열기 — 기존 데이터 prefill
  const openEdit = (job: JobPosting) => {
    setEditTarget(job)
    setFormStep(1)
    setJobError(null)
    setForm({
      company_name: job.company_name,
      center_name: job.center_name,
      region: job.region,
      headcount: job.headcount,
      hourly_wage: job.hourly_wage,
      daily_wage: job.daily_wage ?? 0,
      work_hours: job.work_hours,
      description: job.description,
      contact_phone: job.contact_phone,
      external_link: job.external_link,
      is_urgent: job.is_urgent,
      section: (job.section as 'today-urgent' | 'tomorrow-urgent' | 'always') ?? 'always',
      benefits: Array.isArray(job.benefits) ? job.benefits : [],
      task_options: Array.isArray(job.task_options) && job.task_options.length > 0
        ? job.task_options
        : ['상차', '하차', '분류', '피킹', '포장'],
      shift_options: Array.isArray(job.shift_options) ? job.shift_options : [],
      work_date: job.work_date ?? '',
      expires_at: job.expires_at ?? '',
      status: (job.status as 'active' | 'draft' | 'expired' | 'deleted') ?? 'active',
      // 20260419 추가 필드 prefill
      work_type: (job.work_type as 'always' | 'date') ?? 'always',
      work_dates: Array.isArray(job.work_dates) ? job.work_dates : [],
      shift_wages: (job.shift_wages as Record<string, { hourly: number; daily: number }>) ?? {},
      task_wages: (job.task_wages as Record<string, number>) ?? {},
      use_task_wages: Object.keys((job.task_wages as Record<string, number>) ?? {}).length > 0,
    })
    setPageMode('edit')
  }

  // 날짜 유효성: YYYY-MM-DD 형식 검사
  const isValidDate = (d: string) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d)

  // 과거 날짜 여부 (오늘 기준)
  const isPastDate = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return new Date(dateStr + 'T00:00:00') < today
  }

  // 연락처 유효성 (빈 값 허용)
  const isValidPhone = (p: string) =>
    !p.trim() || /^[\d]{2,4}-?[\d]{3,4}-?[\d]{4}$/.test(p.trim())

  // URL 유효성 (빈 값 허용)
  const isValidUrl = (u: string) =>
    !u.trim() || /^https?:\/\/.+/.test(u.trim())

  // 공고 저장 (신규 또는 수정)
  const handleSave = async (asDraft = false) => {
    if (!supabase || !form.company_name.trim() || !form.region.trim()) return
    if (!asDraft && !form.expires_at) {
      setJobError('마감일은 필수 입력입니다.')
      return
    }
    if (!isValidDate(form.work_date)) {
      setJobError('근무 예정일 형식이 올바르지 않습니다. (YYYY-MM-DD)')
      return
    }
    if (!isValidDate(form.expires_at)) {
      setJobError('공고 마감일 형식이 올바르지 않습니다. (YYYY-MM-DD)')
      return
    }
    if (!asDraft) {
      if (form.hourly_wage <= 0 && form.daily_wage <= 0) {
        setJobError('시급 또는 일급 중 하나는 0보다 큰 값을 입력해야 합니다.')
        return
      }
      if (form.headcount <= 0) {
        setJobError('모집인원은 1명 이상이어야 합니다.')
        return
      }
      if (form.task_options.length === 0) {
        setJobError('지원자 선택 업무를 최소 1개 이상 입력해주세요.')
        return
      }
      if (form.expires_at && isPastDate(form.expires_at)) {
        const isUnchanged = editTarget && editTarget.expires_at === form.expires_at
        if (!isUnchanged) {
          setJobError('공고 마감일은 오늘 이후 날짜만 입력할 수 있습니다.')
          return
        }
      }
      if (form.work_date && isPastDate(form.work_date)) {
        const isUnchanged = editTarget && editTarget.work_date === form.work_date
        if (!isUnchanged) {
          setJobError('근무 예정일은 오늘 이후 날짜만 입력할 수 있습니다.')
          return
        }
      }
      if (!isValidPhone(form.contact_phone)) {
        setJobError('연락처 형식이 올바르지 않습니다. 예: 010-1234-5678')
        return
      }
      if (!isValidUrl(form.external_link)) {
        setJobError('외부 링크는 http:// 또는 https://로 시작해야 합니다.')
        return
      }
    }

    setSaving(true)
    setJobError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setJobError('로그인 세션이 만료됐습니다. 새로고침 후 다시 로그인하세요.')
        return
      }

      const saveStatus = asDraft ? 'draft' : (form.status === 'draft' ? 'active' : form.status)
      const payload = {
        company_name:   form.company_name.trim(),
        center_name:    form.center_name.trim(),
        region:         form.region.trim(),
        headcount:      form.headcount,
        hourly_wage:    form.hourly_wage,
        daily_wage:     form.daily_wage,
        work_hours:     form.work_hours.trim(),
        description:    form.description.trim(),
        contact_phone:  form.contact_phone.trim(),
        external_link:  form.external_link.trim(),
        is_urgent:      form.section === 'today-urgent' || form.section === 'tomorrow-urgent',
        section:        form.section,
        benefits:       form.benefits,
        task_options:   form.task_options.length > 0
          ? form.task_options
          : ['상차', '하차', '분류', '피킹', '포장'],
        shift_options:  form.shift_options,
        work_date:      form.work_date || null,
        expires_at:     form.expires_at || null,
        status:         saveStatus,
        // 20260419 추가 필드
        work_type:      form.work_type,
        work_dates:     form.work_type === 'date' ? form.work_dates : [],
        shift_wages:    form.shift_wages,
        task_wages:     form.use_task_wages ? form.task_wages : {},
      }

      if (editTarget) {
        const { error } = await supabase.from('job_postings').update(payload).eq('id', editTarget.id)
        if (error) throw error
        await logAdminAction('job_update', 'job_posting', editTarget.id, payload as Record<string, unknown>, {
          company_name: editTarget.company_name,
          center_name:  editTarget.center_name,
          status:       editTarget.status,
          section:      editTarget.section,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('job_postings')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select('id')
          .single()
        if (error) throw error
        await logAdminAction('job_create', 'job_posting', inserted?.id ?? undefined, {
          company_name: payload.company_name,
          center_name:  payload.center_name,
          section:      payload.section,
          status:       payload.status,
        })
      }
      setPageMode(null)
      fetchJobs()
      setToast({
        msg: asDraft
          ? '📝 임시저장됐습니다.'
          : editTarget
            ? '✅ 공고가 수정됐습니다.'
            : '✅ 새 공고가 등록됐습니다.',
        type: 'success',
      })
    } catch (err: unknown) {
      const pgErr = err as { message?: string; details?: string; hint?: string }
      const msg = pgErr?.message ?? pgErr?.details ?? '알 수 없는 오류'
      setJobError(`저장 실패: ${msg}${pgErr?.hint ? ` (힌트: ${pgErr.hint})` : ''}`)
      setToast({ msg: '❌ 저장 실패', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // 섹션 변경 (오늘추가/내일긴급/상시)
  const handleChangeSection = async (job: JobPosting, newSection: 'today-urgent' | 'tomorrow-urgent' | 'always') => {
    if (!supabase || (job.section as string) === newSection) return
    const isUrgent = newSection === 'today-urgent' || newSection === 'tomorrow-urgent'
    const { error } = await supabase
      .from('job_postings')
      .update({ section: newSection, is_urgent: isUrgent })
      .eq('id', job.id)
    if (error) {
      setToast({ msg: '❌ 섹션 변경 실패', type: 'error' })
    } else {
      await logAdminAction('job_section_change', 'job_posting', job.id,
        { section: newSection, is_urgent: isUrgent },
        { section: job.section, is_urgent: job.is_urgent }
      )
      fetchJobs()
      const labels: Record<string, string> = {
        'today-urgent':    '🔥 오늘 추가모집으로 변경됨',
        'tomorrow-urgent': '⚡ 내일 긴급모집으로 변경됨',
        'always':          '📌 상시모집으로 변경됨',
      }
      setToast({ msg: labels[newSection] ?? '✅ 섹션 변경됨', type: 'success' })
    }
  }

  // soft delete (status='deleted')
  const handleDelete = async (job: JobPosting) => {
    if (!window.confirm(`"${job.company_name} ${job.center_name}" 공고를 삭제할까요?`)) return
    if (!supabase) return
    const { error } = await supabase.from('job_postings').update({ status: 'deleted' }).eq('id', job.id)
    if (error) {
      setToast({ msg: '❌ 삭제 실패: ' + error.message, type: 'error' })
    } else {
      await logAdminAction('job_delete', 'job_posting', job.id,
        { status: 'deleted' },
        { company_name: job.company_name, center_name: job.center_name, status: job.status }
      )
      fetchJobs()
      setToast({ msg: '🗑️ 공고가 삭제됐습니다.', type: 'success' })
    }
  }

  // 공고 CSV 내보내기 (모든 공고)
  const handleExportCsv = () => {
    const filtered = jobs.filter(j =>
      companyFilter === 'all' || j.company_name === companyFilter
    )
    if (filtered.length === 0) {
      alert('내보낼 공고가 없습니다.')
      return
    }
    const BOM = '\uFEFF'
    const header = ['ID', '회사명', '센터명', '지역', '시급', '일급', '모집인원', '섹션', '상태', '마감일', '조회수', '지원자수', '등록일']
    const rows = filtered.map(j => [
      j.id,
      j.company_name,
      j.center_name,
      j.region,
      j.hourly_wage,
      j.daily_wage,
      j.headcount,
      j.section,
      j.status,
      j.expires_at ?? '',
      j.view_count ?? 0,
      applicantCounts[j.id] ?? 0,
      j.created_at ? new Date(j.created_at).toLocaleDateString('ko-KR') : '',
    ])
    const csv = BOM + [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `채용공고_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── 공통 스타일 상수 ──
  const fmtWage = (w: number) => w.toLocaleString('ko-KR') + '원'
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff', color: '#0f172a',
    fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
  }
  const labelSpan: React.CSSProperties = {
    fontSize: '0.8rem', color: '#64748b',
    display: 'block', marginBottom: 6, fontWeight: 600,
  }

  // ══════════════════════════════════════════════════════
  // 풀페이지 스텝퍼 뷰 (공고 등록/수정)
  // ══════════════════════════════════════════════════════
  if (pageMode === 'create' || pageMode === 'edit') {
    return (
      <div style={{ minHeight: '100vh', padding: 'clamp(16px,3vw,32px)', position: 'relative' }}>
        {/* 토스트 */}
        {toast && <Toast msg={toast.msg} type={toast.type} />}

        {/* 상단 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => { setPageMode(null); setJobError(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#475569',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← 목록으로
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
              {pageMode === 'create' ? '💼 새 공고 등록' : `✏️ 공고 수정 — ${editTarget?.company_name ?? ''}`}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {pageMode === 'create'
                ? '단계별로 공고 정보를 입력하세요. 임시저장 후 나중에 발행 가능합니다.'
                : '수정 후 저장하면 즉시 피드에 반영됩니다.'}
            </p>
          </div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, overflowX: 'auto' }}>
          {STEPS.map((step, idx) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
              <button
                onClick={() => setFormStep(step.num)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer', flex: 1,
                  opacity: formStep < step.num ? 0.4 : 1, transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: formStep === step.num ? '#3182f6' : formStep > step.num ? 'rgba(49,200,100,0.25)' : '#f1f5f9',
                  border: formStep === step.num ? '2px solid #3182f6' : formStep > step.num ? '2px solid #3fc878' : '2px solid #e2e8f0',
                  color: formStep === step.num ? '#fff' : formStep > step.num ? '#3fc878' : '#94a3b8',
                  fontSize: '0.85rem', fontWeight: 800, transition: 'all 0.2s',
                }}>
                  {formStep > step.num ? '✓' : step.num}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: formStep === step.num ? '#fff' : '#64748b' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{step.desc}</div>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div style={{
                  height: 2, flex: 0.5, margin: '0 4px',
                  background: formStep > step.num ? '#3fc878' : '#f1f5f9',
                  transition: 'background 0.3s', marginTop: -20,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* 좌(폼) + 우(미리보기) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 32, alignItems: 'start' }}>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 20, padding: 'clamp(20px,3vw,36px)',
          }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{STEPS[formStep - 1].label}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>{STEPS[formStep - 1].desc}</p>
            </div>

            {/* STEP 1: 기본 정보 */}
            {formStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>회사/플랫폼 <span style={{ color: '#f04452' }}>*</span></span>
                    <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder="예: 쿠팡풀필먼트서비스" style={inputStyle} />
                  </label>
                  <label>
                    <span style={labelSpan}>센터명 / 직종</span>
                    <input value={form.center_name} onChange={e => setForm(f => ({ ...f, center_name: e.target.value }))}
                      placeholder="예: 부천 물류센터 야간" style={inputStyle} />
                  </label>
                </div>
                <label>
                  <span style={labelSpan}>지역 <span style={{ color: '#f04452' }}>*</span></span>
                  <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    placeholder="예: 경기 부천시, 서울 송파구" style={inputStyle} />
                </label>
              </div>
            )}

            {/* STEP 2: 근무 조건 */}
            {formStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* 근무일자 타입 — 상시모집 / 일자지정 */}
                <div>
                  <span style={labelSpan}>근무일자</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([
                      { value: 'always' as const, label: '📅 상시 모집', desc: '날짜 미정' },
                      { value: 'date'   as const, label: '🗓️ 일자 지정', desc: '특정 날짜' },
                    ]).map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(f => ({ ...f, work_type: opt.value, work_dates: [] }))}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.82rem',
                          background: form.work_type === opt.value ? 'rgba(49,130,246,0.2)' : '#f8fafc',
                          color: form.work_type === opt.value ? '#3182f6' : '#64748b',
                          outline: form.work_type === opt.value ? '2px solid #3182f6' : '2px solid transparent',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        }}>
                        <span>{opt.label}</span>
                        <span style={{ fontSize: '0.68rem', opacity: 0.7, fontWeight: 400 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  {/* 일자 지정 시 날짜 칩 입력 */}
                  {form.work_type === 'date' && (
                    <WorkDatesInput
                      dates={form.work_dates}
                      onChange={dates => setForm(f => ({ ...f, work_dates: dates }))}
                      inputStyle={inputStyle}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>시급 (원)</span>
                    <input type="text" inputMode="numeric" pattern="[0-9,]*"
                      value={form.hourly_wage ? form.hourly_wage.toLocaleString('ko-KR') : ''}
                      onChange={e => setForm(f => ({ ...f, hourly_wage: Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0) }))}
                      placeholder="예: 12,000" style={inputStyle} />
                  </label>
                  <label>
                    <span style={labelSpan}>일급 (원)</span>
                    <input type="text" inputMode="numeric" pattern="[0-9,]*"
                      value={form.daily_wage ? form.daily_wage.toLocaleString('ko-KR') : ''}
                      onChange={e => setForm(f => ({ ...f, daily_wage: Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0) }))}
                      placeholder="예: 130,000" style={inputStyle} />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>모집인원</span>
                    <input type="text" inputMode="numeric"
                      value={form.headcount || ''}
                      onChange={e => setForm(f => ({ ...f, headcount: Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0) }))}
                      placeholder="예: 10" style={inputStyle} />
                  </label>
                  <label>
                    <span style={labelSpan}>근무시간</span>
                    <input value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))}
                      placeholder="야간 22:00~06:00" style={inputStyle} />
                  </label>
                </div>
                {/* 모집 근무조 */}
                <div>
                  <span style={labelSpan}>모집 근무조</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    {(['morning', 'afternoon', 'night'] as const).map(v => {
                      const shiftLabels = { morning: '오전', afternoon: '오후', night: '야간' }
                      const checked = form.shift_options.includes(v)
                      return (
                        <button key={v} type="button"
                          onClick={() => setForm(f => {
                            // 조 해제 시 shift_wages에서도 해당 조 제거
                            const newShiftWages = { ...f.shift_wages }
                            if (checked) delete newShiftWages[v]
                            return {
                              ...f,
                              shift_options: checked ? f.shift_options.filter(x => x !== v) : [...f.shift_options, v],
                              shift_wages: newShiftWages,
                            }
                          })}
                          style={{
                            padding: '8px 20px', borderRadius: 999,
                            border: checked ? '2px solid #3182f6' : '2px solid #e2e8f0',
                            background: checked ? 'rgba(49,130,246,0.2)' : 'transparent',
                            color: checked ? '#3182f6' : '#64748b',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                          }}
                        >
                          {shiftLabels[v]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 근무조별 상세 금액 — 근무조 선택 시만 표시 */}
                {form.shift_options.length > 0 && (
                  <div>
                    <span style={labelSpan}>근무조별 금액</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {form.shift_options.map(shift => {
                        const shiftNameMap: Record<string, string> = { morning: '오전', afternoon: '오후', night: '야간' }
                        const shiftLabel = shiftNameMap[shift] ?? shift
                        const wages = form.shift_wages[shift] ?? { hourly: 0, daily: 0 }
                        return (
                          <div key={shift} style={{
                            background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                            border: '1px solid #e2e8f0',
                          }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                              {shiftLabel} 근무조
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <label>
                                <span style={labelSpan}>{shiftLabel} 시급 (원)</span>
                                <input type="text" inputMode="numeric" pattern="[0-9,]*"
                                  value={wages.hourly ? wages.hourly.toLocaleString('ko-KR') : ''}
                                  onChange={e => {
                                    const v = Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0)
                                    setForm(f => ({ ...f, shift_wages: { ...f.shift_wages, [shift]: { ...wages, hourly: v } } }))
                                  }}
                                  placeholder="예: 10,030" style={inputStyle} />
                              </label>
                              <label>
                                <span style={labelSpan}>{shiftLabel} 일급 (원)</span>
                                <input type="text" inputMode="numeric" pattern="[0-9,]*"
                                  value={wages.daily ? wages.daily.toLocaleString('ko-KR') : ''}
                                  onChange={e => {
                                    const v = Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0)
                                    setForm(f => ({ ...f, shift_wages: { ...f.shift_wages, [shift]: { ...wages, daily: v } } }))
                                  }}
                                  placeholder="예: 95,285" style={inputStyle} />
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '8px 0 0' }}>
                      조별 금액이 없으면 통합 시급/일급이 사용됩니다.
                    </p>
                  </div>
                )}

                {/* 근무 예정일 */}
                <label>
                  <span style={labelSpan}>근무 예정일</span>
                  <input type="text" value={form.work_date}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                      let fmt = digits
                      if (digits.length > 6) fmt = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
                      else if (digits.length > 4) fmt = `${digits.slice(0, 4)}-${digits.slice(4)}`
                      setForm(f => ({ ...f, work_date: fmt }))
                    }}
                    placeholder="예: 2026-04-20" maxLength={10} style={inputStyle} />
                </label>
              </div>
            )}

            {/* STEP 3: 상세 & 업무 */}
            {formStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <label>
                  <span style={labelSpan}>공고 내용 / 상세</span>
                  <textarea value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={5} placeholder="근무 조건, 우대사항, 복리후생 등"
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>연락처</span>
                    <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="010-1234-5678" style={inputStyle} />
                  </label>
                  <label>
                    <span style={labelSpan}>회사 정보 URL</span>
                    <input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                      placeholder="https://..." style={inputStyle} />
                  </label>
                </div>
                {/* 복리후생 태그 */}
                <div>
                  <span style={labelSpan}>복리후생</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {['식대제공','교통비지원','4대보험','주휴수당','기숙사제공','연장수당','야간수당','주5일','주6일'].map(tag => {
                      const sel = form.benefits.includes(tag)
                      return (
                        <button key={tag} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            benefits: sel ? f.benefits.filter(b => b !== tag) : [...f.benefits, tag],
                          }))}
                          style={{
                            padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 600,
                            background: sel ? '#3182f6' : '#f1f5f9',
                            color: sel ? '#fff' : '#64748b',
                          }}
                        >
                          {sel ? '✓ ' : '+ '}{tag}
                        </button>
                      )
                    })}
                  </div>
                  <BenefitsInput benefits={form.benefits} onChange={b => setForm(f => ({ ...f, benefits: b }))} inputStyle={inputStyle} />
                </div>
                {/* 업무 옵션 */}
                <div>
                  <span style={labelSpan}>지원자 선택 업무 <span style={{ color: '#f04452' }}>*</span></span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {form.task_options.map(task => (
                      <span key={task} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 12px', borderRadius: 999,
                        background: 'rgba(49,130,246,0.18)', color: '#3182f6',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        {task}
                        <button type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            task_options: f.task_options.filter(t => t !== task),
                            // 삭제된 업무의 task_wages도 함께 정리
                            task_wages: Object.fromEntries(Object.entries(f.task_wages).filter(([k]) => k !== task)),
                          }))}
                          style={{ background: 'none', border: 'none', color: '#3182f6', cursor: 'pointer', padding: 0, fontSize: '1rem' }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <TaskOptionsInput taskOptions={form.task_options} onChange={opts => setForm(f => ({ ...f, task_options: opts }))} inputStyle={inputStyle} />
                </div>

                {/* 업무별 금액 차등 적용 토글 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={labelSpan}>업무별 금액 차등 적용</span>
                    {/* 토글 스위치 */}
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, use_task_wages: !f.use_task_wages, task_wages: {} }))}
                      style={{
                        width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: form.use_task_wages ? '#3182f6' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}>
                      <div style={{
                        position: 'absolute', top: 3, left: form.use_task_wages ? 22 : 2, width: 18, height: 18,
                        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>
                  {/* 업무별 시급 입력 — 토글 ON 시만 표시 */}
                  {form.use_task_wages && form.task_options.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {form.task_options.map(task => (
                        <div key={task} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>{task}</span>
                          <div style={{ position: 'relative' }}>
                            <input type="text" inputMode="numeric" pattern="[0-9,]*"
                              value={form.task_wages[task] ? form.task_wages[task].toLocaleString('ko-KR') : ''}
                              onChange={e => {
                                const v = Math.max(0, parseInt(e.target.value.replace(/,/g, '')) || 0)
                                setForm(f => ({ ...f, task_wages: { ...f.task_wages, [task]: v } }))
                              }}
                              placeholder="시급 (원)" style={{ ...inputStyle, paddingRight: 32 }} />
                            <span style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              fontSize: '0.72rem', color: '#64748b',
                            }}>원</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: 발행 설정 */}
            {formStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <span style={labelSpan}>섹션 구분 <span style={{ color: '#f04452' }}>*</span></span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {([
                      { value: 'today-urgent' as const,    label: '🔥 오늘 추가모집', desc: '당일 급구', color: '#ef4444' },
                      { value: 'tomorrow-urgent' as const, label: '⚡ 내일 긴급모집', desc: '내일 긴급', color: '#f97316' },
                      { value: 'always' as const,          label: '✅ 상시모집',      desc: '기간 무관', color: '#22c55e' },
                    ]).map(opt => (
                      <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, section: opt.value }))}
                        style={{
                          padding: '14px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.85rem', textAlign: 'center',
                          background: form.section === opt.value ? `${opt.color}22` : '#f8fafc',
                          color: form.section === opt.value ? opt.color : '#64748b',
                          outline: form.section === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}>
                        <span style={{ fontSize: '1.1rem' }}>{opt.label.split(' ')[0]}</span>
                        <span>{opt.label.split(' ').slice(1).join(' ')}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <span style={labelSpan}>공고 마감일 <span style={{ color: '#f04452' }}>*</span></span>
                  <input type="text" value={form.expires_at}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                      let fmt = digits
                      if (digits.length > 6) fmt = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
                      else if (digits.length > 4) fmt = `${digits.slice(0, 4)}-${digits.slice(4)}`
                      setForm(f => ({ ...f, expires_at: fmt }))
                    }}
                    placeholder="예: 2026-05-31" maxLength={10} required style={inputStyle} />
                </label>
                <div>
                  <span style={labelSpan}>공고 상태</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([
                      { value: 'active' as const, label: '✅ 즉시 발행', color: '#22c55e' },
                      { value: 'draft'  as const, label: '📝 임시저장', color: '#ffb400' },
                    ]).map(opt => (
                      <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.85rem',
                          background: form.status === opt.value ? `${opt.color}22` : '#f8fafc',
                          color: form.status === opt.value ? opt.color : '#64748b',
                          outline: form.status === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: 최종 미리보기 */}
            {formStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  아래 내용을 최종 확인한 후 발행 버튼을 클릭하세요.
                </p>
                <div style={{
                  background: 'rgba(49,130,246,0.08)', border: '1px solid rgba(49,130,246,0.2)',
                  borderRadius: 12, padding: '16px 20px',
                }}>
                  <p style={{ margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 700, color: '#3182f6' }}>체크리스트</p>
                  {[
                    { ok: !!form.company_name.trim(), label: '회사명 입력됨' },
                    { ok: !!form.region.trim(), label: '지역 입력됨' },
                    { ok: form.hourly_wage > 0 || form.daily_wage > 0, label: '시급 또는 일급 입력됨' },
                    { ok: !!form.expires_at, label: '마감일 설정됨' },
                    { ok: form.task_options.length > 0, label: '업무 옵션 1개 이상' },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.82rem', color: item.ok ? '#3fc878' : '#f04452', marginBottom: 4,
                    }}>
                      <span>{item.ok ? '✓' : '✗'}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 에러 표시 */}
            {jobError && (
              <div style={{
                background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
                borderRadius: 10, padding: '12px 16px', marginTop: 16,
                color: '#ff6b6b', fontSize: '0.82rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>⚠️ {jobError}</span>
                <button onClick={() => setJobError(null)}
                  style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}>×</button>
              </div>
            )}

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 32, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {formStep > 1 && (
                  <button onClick={() => setFormStep(s => s - 1)}
                    style={{
                      padding: '10px 22px', borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: 'transparent', color: '#475569',
                      fontSize: '0.87rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                    ← 이전
                  </button>
                )}
                {formStep < 5 && (
                  <button onClick={() => handleSave(true)}
                    disabled={saving || !form.company_name.trim()}
                    style={{
                      padding: '10px 18px', borderRadius: 10,
                      border: '1px solid rgba(255,180,0,0.3)',
                      background: 'rgba(255,180,0,0.08)', color: '#ffb400',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      opacity: saving || !form.company_name.trim() ? 0.5 : 1,
                    }}>
                    📝 임시저장
                  </button>
                )}
              </div>
              {formStep < 5 ? (
                <button
                  onClick={() => {
                    if (formStep === 1 && (!form.company_name.trim() || !form.region.trim())) return
                    if (formStep === 2 && form.hourly_wage <= 0 && form.daily_wage <= 0) {
                      setJobError('시급 또는 일급 중 하나는 0보다 커야 합니다.')
                      return
                    }
                    if (formStep === 4 && !form.expires_at) {
                      setJobError('공고 마감일을 입력해주세요.')
                      return
                    }
                    setJobError(null)
                    setFormStep(s => s + 1)
                  }}
                  disabled={formStep === 1 && (!form.company_name.trim() || !form.region.trim())}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: 'none',
                    background: (formStep === 1 && (!form.company_name.trim() || !form.region.trim()))
                      ? 'rgba(49,130,246,0.3)' : '#3182f6',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                  다음 →
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleSave(true)} disabled={saving || !form.company_name.trim()}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      border: '1px solid rgba(255,180,0,0.3)',
                      background: 'rgba(255,180,0,0.08)', color: '#ffb400',
                      fontSize: '0.87rem', fontWeight: 600, cursor: 'pointer',
                      opacity: saving ? 0.5 : 1,
                    }}>
                    📝 임시저장
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at}
                    style={{
                      padding: '10px 28px', borderRadius: 10, border: 'none',
                      background: (saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at)
                        ? 'rgba(49,130,246,0.3)' : '#3182f6',
                      color: '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                    }}>
                    {saving ? '저장 중...' : pageMode === 'edit' ? '💾 저장' : '🚀 발행'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 우측 실시간 미리보기 */}
          <div style={{ position: 'sticky', top: 24 }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              실시간 미리보기
            </p>
            <div style={{
              background: '#f8fafc',
              border: `1px solid ${form.section !== 'always' ? 'rgba(240,68,82,0.3)' : '#f1f5f9'}`,
              borderRadius: 18, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {form.section === 'today-urgent' && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(240,68,82,0.2)', color: '#f04452' }}>🔥 오늘 추가모집</span>}
                {form.section === 'tomorrow-urgent' && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>⚡ 내일 긴급모집</span>}
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                  background: form.status === 'active' ? 'rgba(49,200,100,0.18)' : '#f1f5f9',
                  color: form.status === 'active' ? '#3fc878' : '#94a3b8',
                }}>
                  {form.status === 'active' ? '활성' : form.status === 'draft' ? '임시' : form.status}
                </span>
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.3 }}>
                {form.company_name || <span style={{ color: '#94a3b8' }}>회사명</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 3 }}>
                {form.center_name || <span style={{ color: '#94a3b8' }}>센터명</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
                📍 {form.region || <span style={{ color: '#94a3b8' }}>지역</span>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {form.hourly_wage > 0 && <span style={{ color: '#3182f6', fontWeight: 800 }}>시 {form.hourly_wage.toLocaleString()}원</span>}
                {form.daily_wage > 0 && <span style={{ color: '#7c3aed', fontWeight: 800 }}>일 {form.daily_wage.toLocaleString()}원</span>}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8 }}>
                👥 {form.headcount > 0 ? `${form.headcount}명` : '-'} · 📅 마감 {form.expires_at || '미정'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // 공고 목록 뷰
  // ══════════════════════════════════════════════════════
  // 사업장 + 상태 필터 + 검색 조합 적용
  const displayJobs = jobs.filter(j => {
    const matchCompany = companyFilter === 'all' || j.company_name === companyFilter
    const matchSearch = !jobSearch.trim() ||
      `${j.company_name} ${j.center_name} ${j.region}`.toLowerCase().includes(jobSearch.toLowerCase())
    return matchCompany && matchSearch
  })

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>💼 채용공고 관리</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
            채용정보 피드에 노출되는 공고를 관리합니다. ({displayJobs.length}건)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCsv}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: 'rgba(49,200,100,0.1)', color: '#3fc878',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}>
            📥 CSV 내보내기
          </button>
          <button onClick={openCreate}
            style={{
              padding: '10px 22px', borderRadius: 12, border: 'none',
              background: '#3182f6', color: '#fff', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(49,130,246,0.35)',
            }}>
            + 새 공고 등록
          </button>
        </div>
      </div>

      {/* 에러 */}
      {jobError && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          color: '#ff6b6b', fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {jobError}</span>
          <button onClick={() => setJobError(null)}
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}>×</button>
        </div>
      )}

      {/* 필터 바 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 사업장 필터 */}
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff', color: '#0f172a', /* 불투명 배경: option 텍스트 가시성 확보 */
            fontSize: '0.78rem', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all" style={{ background: '#fff', color: '#0f172a' }}>전체 사업장</option>
          {companies.map(c => (
            <option key={c} value={c} style={{ background: '#fff', color: '#0f172a' }}>{c}</option>
          ))}
        </select>

        {/* 상태 필터 */}
        {(['all', 'active', 'draft', 'expired', 'deleted'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 16px', borderRadius: 999, border: 'none',
              background: statusFilter === s ? '#3182f6' : '#f1f5f9',
              color: statusFilter === s ? '#fff' : '#64748b',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
            {s === 'all' ? '전체' : s === 'active' ? '활성' : s === 'draft' ? '임시저장' : s === 'expired' ? '만료' : '삭제됨'}
          </button>
        ))}

        {/* 검색 */}
        <input
          value={jobSearch}
          onChange={e => setJobSearch(e.target.value)}
          placeholder="🔍 회사명·센터명·지역 검색"
          style={{
            padding: '6px 16px', borderRadius: 999,
            border: '1px solid #e2e8f0',
            background: '#fff', color: '#0f172a',
            fontSize: '0.78rem', outline: 'none', minWidth: 220,
          }}
        />
      </div>

      {/* 공고 카드 그리드 */}
      {loading ? (
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : displayJobs.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
          공고가 없습니다.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {displayJobs.map(job => {
            const benefits = Array.isArray(job.benefits) ? job.benefits as string[] : []
            const appCount = applicantCounts[job.id] ?? 0
            return (
              <div key={job.id} style={{
                background: '#f8fafc',
                border: `1.5px solid ${job.is_urgent ? 'rgba(240,68,82,0.4)' : job.status === 'draft' ? 'rgba(255,180,0,0.3)' : '#f1f5f9'}`,
                borderRadius: 18, padding: '22px 24px',
                display: 'flex', flexDirection: 'column', gap: 12, minHeight: 220,
              }}>
                {/* 배지 영역 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(job.section as string) === 'today-urgent' && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>🔥 오늘추가</span>}
                  {(job.section as string) === 'tomorrow-urgent' && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>⚡ 내일긴급</span>}
                  {(job.section as string) === 'always' && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅ 상시</span>}
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, marginLeft: 'auto',
                    background: job.status === 'active' ? 'rgba(49,200,100,0.18)' : job.status === 'draft' ? 'rgba(255,180,0,0.18)' : '#f1f5f9',
                    color: job.status === 'active' ? '#3fc878' : job.status === 'draft' ? '#ffb400' : '#64748b',
                  }}>
                    {job.status === 'active' ? '활성' : job.status === 'draft' ? '임시저장' : job.status === 'expired' ? '만료' : '삭제'}
                  </span>
                </div>

                {/* 회사명 + 센터명 */}
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', wordBreak: 'break-word' }}>{job.company_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 3, wordBreak: 'break-word' }}>{job.center_name}</div>
                </div>

                {/* 지역 */}
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>📍 {job.region}</div>

                {/* 시급/일급 */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {job.hourly_wage > 0 && <span style={{ color: '#3182f6', fontWeight: 800, fontSize: '1rem' }}>시 {fmtWage(job.hourly_wage)}</span>}
                  {job.daily_wage > 0 && <span style={{ color: '#7c3aed', fontWeight: 800, fontSize: '1rem' }}>일 {fmtWage(job.daily_wage)}</span>}
                </div>

                {/* 근무 정보 */}
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {job.work_hours && <span>⏰ {job.work_hours}</span>}
                  <span>👥 {job.headcount}명</span>
                  <span>📅 마감 {job.expires_at ?? '미정'}</span>
                </div>

                {/* 통계 뱃지 (view_count + 지원자 수) */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>
                    👁 {job.view_count ?? 0}회 조회
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: appCount > 0 ? 'rgba(49,130,246,0.15)' : '#f1f5f9', color: appCount > 0 ? '#3182f6' : '#64748b' }}>
                    📋 {appCount}명 지원
                  </span>
                </div>

                {/* 복리후생 태그 */}
                {benefits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {benefits.slice(0, 4).map(b => (
                      <span key={b} style={{ padding: '3px 9px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>{b}</span>
                    ))}
                    {benefits.length > 4 && <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '3px 0' }}>+{benefits.length - 4}</span>}
                  </div>
                )}

                {/* 섹션 변경 버튼 */}
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {([
                    { value: 'today-urgent' as const,    label: '🔥 오늘', color: '#ef4444' },
                    { value: 'tomorrow-urgent' as const, label: '⚡ 내일', color: '#f97316' },
                    { value: 'always' as const,          label: '📌 상시', color: '#6b7280' },
                  ]).map(opt => {
                    const isActive = (job.section as string) === opt.value
                    return (
                      <button key={opt.value} onClick={() => handleChangeSection(job, opt.value)}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                          background: isActive ? `${opt.color}22` : '#f8fafc',
                          color: isActive ? opt.color : '#64748b',
                          fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          outline: isActive ? `2px solid ${opt.color}` : '2px solid transparent',
                        }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* 관리 버튼 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(job)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: 'rgba(49,130,246,0.15)', color: '#3182f6', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    ✏️ 수정
                  </button>
                  {job.status !== 'deleted' && (
                    <button onClick={() => handleDelete(job)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: 'rgba(240,68,82,0.12)', color: '#f04452', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      🗑️ 삭제
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 토스트 컴포넌트 ──
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, minWidth: 280, maxWidth: 420, padding: '12px 20px', borderRadius: 12,
      background: type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
      color: '#0f172a', fontWeight: 700, fontSize: '0.9rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
      textAlign: 'center', pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )
}

// ── 복리후생 직접 입력 컴포넌트 ──
function BenefitsInput({
  benefits, onChange, inputStyle,
}: { benefits: string[]; onChange: (b: string[]) => void; inputStyle: React.CSSProperties }) {
  const [draft, setDraft] = useState('')
  const addTag = () => {
    const tag = draft.trim()
    if (tag && !benefits.includes(tag)) onChange([...benefits, tag])
    setDraft('')
  }
  return (
    <div>
      {benefits.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {benefits.map(b => (
            <span key={b} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
              background: 'rgba(49,130,246,0.15)', color: '#3182f6', border: '1px solid rgba(49,130,246,0.3)',
            }}>
              {b}
              <button type="button" onClick={() => onChange(benefits.filter(x => x !== b))}
                style={{ background: 'none', border: 'none', color: '#3182f6', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
          placeholder="직접 입력 후 Enter" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addTag}
          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>추가</button>
      </div>
    </div>
  )
}

// ── 업무 옵션 직접 입력 컴포넌트 ──
function TaskOptionsInput({
  taskOptions, onChange, inputStyle,
}: { taskOptions: string[]; onChange: (opts: string[]) => void; inputStyle: React.CSSProperties }) {
  const [draft, setDraft] = useState('')
  const addTag = () => {
    const tag = draft.trim().replace(/,/g, '')
    if (tag && !taskOptions.includes(tag)) onChange([...taskOptions, tag])
    setDraft('')
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
        placeholder="업무 입력 후 Enter (예: 상차, 하차)" style={{ ...inputStyle, flex: 1 }} />
      <button type="button" onClick={addTag}
        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>추가</button>
    </div>
  )
}

// ── 근무 날짜 복수 입력 컴포넌트 (일자지정 시 사용) ──
function WorkDatesInput({
  dates, onChange, inputStyle,
}: { dates: string[]; onChange: (d: string[]) => void; inputStyle: React.CSSProperties }) {
  const [draft, setDraft] = useState('')

  // 날짜 추가 — YYYY-MM-DD 형식만 허용, 중복 방지
  const addDate = () => {
    const d = draft.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !dates.includes(d)) {
      onChange([...dates, d].sort()) // 날짜순 정렬
    }
    setDraft('')
  }

  // 숫자 입력 시 자동으로 YYYY-MM-DD 형식 변환
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let fmt = digits
    if (digits.length > 6) fmt = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
    else if (digits.length > 4) fmt = `${digits.slice(0, 4)}-${digits.slice(4)}`
    setDraft(fmt)
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* 입력된 날짜 칩 목록 */}
      {dates.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {dates.map(d => (
            <span key={d} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
              background: 'rgba(49,130,246,0.18)', color: '#3182f6', border: '1px solid rgba(49,130,246,0.3)',
            }}>
              {d}
              <button type="button" onClick={() => onChange(dates.filter(x => x !== d))}
                style={{ background: 'none', border: 'none', color: '#3182f6', cursor: 'pointer', padding: 0, fontSize: '1rem' }}>×</button>
            </span>
          ))}
        </div>
      )}
      {/* 날짜 직접 입력 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={draft} onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDate() } }}
          placeholder="날짜 입력 (예: 20260420) 후 Enter"
          maxLength={10} style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addDate}
          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>추가</button>
      </div>
      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '6px 0 0' }}>
        근무 예정일을 복수로 입력하세요. (예: 주 3회 근무)
      </p>
    </div>
  )
}
