// 관리자 — 채용공고 관리 메뉴
// [공고 목록] 탭: 공고 CRUD (추가/수정/삭제/긴급 토글) + 풀페이지 스텝퍼 등록/수정
// [지원자 관리] 탭: 공고별 지원자 목록 조회 + 출근확정/지원거절/취소 처리 + xlsx 다운로드
// [📊 확정 현황] 탭: 센터별 지원/확정/거절 현황 대시보드
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
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
}

// ── 지원자 한 행의 타입 ──
interface ApplicationRow {
  id: string
  user_id: string
  job_posting_id: string
  status: 'applied' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  applied_at: string
  work_date: string | null
  applicant_name: string | null
  applicant_birth: string | null
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  consent_collect: boolean | null
  consent_third_party: boolean | null
  job_postings?: { company_name: string; center_name: string } | null
  profiles?: { full_name: string | null; email: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  applied: '지원완료',
  confirmed: '출근확정',
  completed: '출근완료',
  cancelled: '취소',
  rejected: '지원거절',
}

// ── 스텝 정의 ──
const STEPS = [
  { num: 1, label: '기본 정보', desc: '회사·센터·지역' },
  { num: 2, label: '근무 조건', desc: '시급·일급·근무시간' },
  { num: 3, label: '상세 & 업무', desc: '내용·복리후생·업무' },
  { num: 4, label: '발행 설정', desc: '섹션·마감일·상태' },
  { num: 5, label: '미리보기', desc: '최종 확인 후 발행' },
]

export default function JobsMenu() {
  const { user } = useAuth()

  // ── 페이지 모드: null=목록, 'create'=신규등록, 'edit'=수정 ──
  // 모달 대신 풀페이지로 전환하는 핵심 상태
  const [pageMode, setPageMode] = useState<null | 'create' | 'edit'>(null)

  // ── 상위 탭 ──
  const [mainTab, setMainTab] = useState<'jobs' | 'applicants' | 'dashboard'>('jobs')

  // ── 토스트 ──
  const [adminToast, setAdminToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (!adminToast) return
    const t = setTimeout(() => setAdminToast(null), 3000)
    return () => clearTimeout(t)
  }, [adminToast])

  // ── 공고 목록 상태 ──
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<JobForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  // 풀페이지 스텝퍼 현재 단계 (1~5)
  const [formStep, setFormStep] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobSearch, setJobSearch] = useState<string>('')

  // ── 지원자 상태 ──
  const [applicants, setApplicants] = useState<ApplicationRow[]>([])
  const [appLoading, setAppLoading] = useState(false)
  const [appJobFilter, setAppJobFilter] = useState<string>('')
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [appError, setAppError] = useState<string | null>(null)

  // ── 공고 목록 로드 ──
  const fetchJobs = async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let query = supabase.from('job_postings').select('*').order('created_at', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data, error } = await query
      if (error) throw error
      setJobs((data ?? []) as JobPosting[])
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : '공고 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchJobs() }, [statusFilter])

  // ── 지원자 목록 로드 ──
  const fetchApplicants = useCallback(async () => {
    if (!supabase) return
    setAppLoading(true)
    setAppError(null)
    try {
      let query = supabase
        .from('job_applications')
        .select(`*, job_postings(company_name, center_name)`)
        .order('applied_at', { ascending: false })
      if (appJobFilter) query = query.eq('job_posting_id', appJobFilter)
      if (appStatusFilter !== 'all') query = query.eq('status', appStatusFilter)

      const { data, error } = await query
      if (error) throw error
      const rows = (data ?? []) as ApplicationRow[]

      // profiles 별도 조회 후 병합
      const userIds = [...new Set(rows.map(r => r.user_id))]
      if (userIds.length > 0 && supabase) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        const profileMap = Object.fromEntries(
          (profileData ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
        )
        rows.forEach(r => { r.profiles = profileMap[r.user_id] ?? null })
      }
      setApplicants(rows)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '지원자 목록을 불러오지 못했습니다.'
      setAppError(msg)
    } finally {
      setAppLoading(false)
    }
  }, [appJobFilter, appStatusFilter])

  useEffect(() => {
    if (mainTab === 'applicants') fetchApplicants()
  }, [mainTab, appJobFilter, appStatusFilter])

  // ── 공고 관리 핸들러 ──

  // 신규 등록 페이지 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setFormStep(1)
    setJobError(null)
    setPageMode('create')
  }

  // 수정 페이지 열기 — 기존 데이터 prefill
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
    })
    setPageMode('edit')
  }

  // 저장 (생성 또는 수정)
  const handleSave = async (asDraft = false) => {
    if (!supabase || !form.company_name.trim() || !form.region.trim()) return
    if (!asDraft && !form.expires_at) {
      setJobError('마감일은 필수 입력입니다.')
      return
    }
    setSaving(true)
    setJobError(null)
    try {
      const saveStatus = asDraft ? 'draft' : (form.status === 'draft' ? 'active' : form.status)
      const payload = {
        company_name: form.company_name.trim(),
        center_name: form.center_name.trim(),
        region: form.region.trim(),
        headcount: form.headcount,
        hourly_wage: form.hourly_wage,
        daily_wage: form.daily_wage,
        work_hours: form.work_hours.trim(),
        description: form.description.trim(),
        contact_phone: form.contact_phone.trim(),
        external_link: form.external_link.trim(),
        is_urgent: form.section === 'today-urgent' || form.section === 'tomorrow-urgent',
        section: form.section,
        benefits: form.benefits,
        task_options: form.task_options.length > 0
          ? form.task_options
          : ['상차', '하차', '분류', '피킹', '포장'],
        shift_options: form.shift_options,
        work_date: form.work_date || null,
        expires_at: form.expires_at || null,
        status: saveStatus,
      }
      if (editTarget) {
        const { error } = await supabase.from('job_postings').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('job_postings').insert({ ...payload, created_by: user?.id ?? null })
        if (error) throw error
      }
      setPageMode(null)
      fetchJobs()
      setAdminToast({
        msg: asDraft ? '📝 임시저장됐습니다.' : editTarget ? '✅ 공고가 수정됐습니다.' : '✅ 새 공고가 등록됐습니다.',
        type: 'success',
      })
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : '저장에 실패했습니다.')
      setAdminToast({ msg: '❌ 저장 실패 — 에러 메시지를 확인하세요.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // 긴급 토글
  const handleToggleUrgent = async (job: JobPosting) => {
    if (!supabase) return
    const { error } = await supabase.from('job_postings')
      .update({ is_urgent: !job.is_urgent })
      .eq('id', job.id)
    if (error) {
      setAdminToast({ msg: '❌ 긴급 토글 실패', type: 'error' })
    } else {
      fetchJobs()
      setAdminToast({ msg: job.is_urgent ? '✅ 긴급 해제됨' : '🚨 긴급 공고로 설정됨', type: 'success' })
    }
  }

  // 삭제 (soft delete)
  const handleDelete = async (job: JobPosting) => {
    if (!window.confirm(`"${job.company_name} ${job.center_name}" 공고를 삭제할까요?`)) return
    if (!supabase) return
    const { error } = await supabase.from('job_postings')
      .update({ status: 'deleted' })
      .eq('id', job.id)
    if (error) {
      setAdminToast({ msg: '❌ 삭제 실패: ' + error.message, type: 'error' })
    } else {
      fetchJobs()
      setAdminToast({ msg: '🗑️ 공고가 삭제됐습니다.', type: 'success' })
    }
  }

  // ── 지원자 상태 변경 ──
  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled' | 'rejected',
    workDate?: string
  ) => {
    if (!supabase || updatingId) return
    setUpdatingId(appId)
    try {
      const updatePayload: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'confirmed' && workDate) updatePayload.work_date = workDate

      const { error } = await supabase
        .from('job_applications')
        .update(updatePayload)
        .eq('id', appId)
      if (error) throw error

      if (newStatus === 'confirmed' || newStatus === 'rejected') {
        const app = applicants.find(a => a.id === appId)
        if (app?.user_id && supabase) {
          const notifTitle = newStatus === 'confirmed' ? '출근이 확정됐어요! 🎉' : '지원이 거절됐습니다'
          const notifBody = newStatus === 'confirmed'
            ? `출근 예정일: ${workDate ?? '미정'} — 준비물을 챙기고 건강하게 출근하세요!`
            : '아쉽지만 이번 공고는 어렵게 됐습니다. 다른 공고를 확인해보세요.'
          await supabase.from('notifications').insert({
            user_id: app.user_id,
            type: newStatus === 'confirmed' ? 'application_confirmed' : 'application_rejected',
            title: notifTitle,
            body: notifBody,
            metadata: { application_id: appId, job_posting_id: app.job_posting_id },
          })
        }
      }
      await fetchApplicants()
      const toastMsgs: Record<string, string> = {
        confirmed: '✅ 출근 확정 처리됐습니다.',
        completed: '✅ 출근 완료로 변경됐습니다.',
        cancelled: '✅ 취소 처리됐습니다.',
        rejected: '❌ 지원 거절 처리됐습니다.',
      }
      setAdminToast({ msg: toastMsgs[newStatus] ?? '✅ 상태가 변경됐습니다.', type: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '상태 변경에 실패했습니다.'
      setAdminToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  // ── 스타일 상수 ──
  const fmtWage = (w: number) => w.toLocaleString('ko-KR') + '원'

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.83rem',
    color: 'rgba(255,255,255,0.75)',
    verticalAlign: 'middle',
  }
  const thStyle: React.CSSProperties = {
    ...cellStyle,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.9rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }
  const labelSpan: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.55)',
    display: 'block',
    marginBottom: 6,
    fontWeight: 600,
  }

  const appStatusColor = (status: string) => {
    if (status === 'confirmed') return { bg: 'rgba(49,200,100,0.18)', color: '#3fc878' }
    if (status === 'completed') return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
    if (status === 'cancelled') return { bg: 'rgba(240,68,82,0.18)', color: '#f04452' }
    if (status === 'rejected') return { bg: 'rgba(240,68,82,0.25)', color: '#ff4d4d' }
    return { bg: 'rgba(49,130,246,0.18)', color: '#3182f6' }
  }

  // 확정 현황 대시보드 데이터 집계
  const dashboardStats = (() => {
    const map: Record<string, { center: string; applied: number; confirmed: number; rejected: number; completed: number }> = {}
    applicants.forEach(app => {
      const key = `${app.job_postings?.company_name ?? ''} ${app.job_postings?.center_name ?? ''}`.trim() || '기타'
      if (!map[key]) map[key] = { center: key, applied: 0, confirmed: 0, rejected: 0, completed: 0 }
      if (app.status === 'applied') map[key].applied++
      else if (app.status === 'confirmed') map[key].confirmed++
      else if (app.status === 'rejected') map[key].rejected++
      else if (app.status === 'completed') map[key].completed++
    })
    return Object.values(map)
  })()

  // ══════════════════════════════════════════════════════════════
  // 풀페이지 스텝퍼 뷰 (공고 등록/수정)
  // ══════════════════════════════════════════════════════════════
  if (pageMode === 'create' || pageMode === 'edit') {
    return (
      <div style={{ minHeight: '100vh', padding: 'clamp(16px, 3vw, 32px)', position: 'relative' }}>

        {/* 상단 헤더 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => { setPageMode(null); setJobError(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← 목록으로
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
              {pageMode === 'create' ? '💼 새 공고 등록' : `✏️ 공고 수정 — ${editTarget?.company_name ?? ''}`}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
              {pageMode === 'create' ? '단계별로 공고 정보를 입력하세요. 임시저장 후 나중에 발행 가능합니다.' : '수정 후 저장하면 즉시 피드에 반영됩니다.'}
            </p>
          </div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, overflowX: 'auto' }}>
          {STEPS.map((step, idx) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
              {/* 스텝 원 + 텍스트 */}
              <button
                onClick={() => setFormStep(step.num)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer', flex: 1,
                  opacity: formStep < step.num ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: formStep === step.num
                    ? '#3182f6'
                    : formStep > step.num
                      ? 'rgba(49,200,100,0.25)'
                      : 'rgba(255,255,255,0.08)',
                  border: formStep === step.num ? '2px solid #3182f6' : formStep > step.num ? '2px solid #3fc878' : '2px solid rgba(255,255,255,0.12)',
                  color: formStep === step.num ? '#fff' : formStep > step.num ? '#3fc878' : 'rgba(255,255,255,0.4)',
                  fontSize: '0.85rem', fontWeight: 800,
                  transition: 'all 0.2s',
                }}>
                  {formStep > step.num ? '✓' : step.num}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: formStep === step.num ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{step.desc}</div>
                </div>
              </button>
              {/* 연결선 (마지막 제외) */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  height: 2, flex: 0.5, margin: '0 4px',
                  background: formStep > step.num ? '#3fc878' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                  marginTop: -20, // 원과 수직으로 정렬
                }} />
              )}
            </div>
          ))}
        </div>

        {/* 메인 레이아웃: 좌(폼) + 우(미리보기) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: 32,
          alignItems: 'start',
        }}>

          {/* ── 좌측: 단계별 폼 ── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: 'clamp(20px, 3vw, 36px)',
          }}>

            {/* 단계 제목 */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {STEPS[formStep - 1].label}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                {STEPS[formStep - 1].desc}
              </p>
            </div>

            {/* ── STEP 1: 기본 정보 ── */}
            {formStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>회사/플랫폼 <span style={{ color: '#f04452' }}>*</span></span>
                    <input
                      value={form.company_name}
                      onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder="예: 쿠팡풀필먼트서비스"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <span style={labelSpan}>센터명 / 직종</span>
                    <input
                      value={form.center_name}
                      onChange={e => setForm(f => ({ ...f, center_name: e.target.value }))}
                      placeholder="예: 부천 물류센터 야간"
                      style={inputStyle}
                    />
                  </label>
                </div>
                <label>
                  <span style={labelSpan}>지역 <span style={{ color: '#f04452' }}>*</span></span>
                  <input
                    value={form.region}
                    onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    placeholder="예: 경기 부천시, 서울 송파구"
                    style={inputStyle}
                  />
                </label>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  💡 쿠팡FLC / 쿠팡이츠 등 플랫폼명을 정확히 입력해주세요.
                </p>
              </div>
            )}

            {/* ── STEP 2: 근무 조건 ── */}
            {formStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>시급 (원)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      value={form.hourly_wage ? form.hourly_wage.toLocaleString('ko-KR') : ''}
                      onChange={e => {
                        const num = parseInt(e.target.value.replace(/,/g, '')) || 0
                        setForm(f => ({ ...f, hourly_wage: num }))
                      }}
                      placeholder="예: 12,000"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <span style={labelSpan}>일급 (원)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      value={form.daily_wage ? form.daily_wage.toLocaleString('ko-KR') : ''}
                      onChange={e => {
                        const num = parseInt(e.target.value.replace(/,/g, '')) || 0
                        setForm(f => ({ ...f, daily_wage: num }))
                      }}
                      placeholder="예: 130,000"
                      style={inputStyle}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>모집인원</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.headcount || ''}
                      onChange={e => {
                        const num = parseInt(e.target.value.replace(/\D/g, '')) || 0
                        setForm(f => ({ ...f, headcount: num }))
                      }}
                      placeholder="예: 10"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <span style={labelSpan}>근무시간</span>
                    <input
                      value={form.work_hours}
                      onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))}
                      placeholder="야간 22:00~06:00"
                      style={inputStyle}
                    />
                  </label>
                </div>
                {/* 모집 근무조 */}
                <div>
                  <span style={labelSpan}>
                    모집 근무조
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: 400 }}>
                      (미선택 시 지원 폼에서 오전/오후/야간/무관 전체 표시)
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    {([
                      { value: 'morning', label: '오전' },
                      { value: 'afternoon', label: '오후' },
                      { value: 'night', label: '야간' },
                    ] as const).map(opt => {
                      const checked = form.shift_options.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            shift_options: checked
                              ? f.shift_options.filter(v => v !== opt.value)
                              : [...f.shift_options, opt.value],
                          }))}
                          style={{
                            padding: '8px 20px', borderRadius: 999,
                            border: checked ? '2px solid #3182f6' : '2px solid rgba(255,255,255,0.15)',
                            background: checked ? 'rgba(49,130,246,0.2)' : 'transparent',
                            color: checked ? '#3182f6' : 'rgba(255,255,255,0.5)',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* 근무 예정일 */}
                <label>
                  <span style={labelSpan}>
                    근무 예정일
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: 400 }}>
                      (중복 출근 방지 기준 — 상시 공고면 비워도 됩니다)
                    </span>
                  </span>
                  <input
                    type="date"
                    value={form.work_date}
                    onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </label>
              </div>
            )}

            {/* ── STEP 3: 상세 내용 & 업무 ── */}
            {formStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 공고 상세 내용 */}
                <label>
                  <span style={labelSpan}>공고 내용 / 상세</span>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={5}
                    placeholder="근무 조건, 우대사항, 복리후생 등 상세 내용 입력"
                    style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
                  />
                </label>

                {/* 연락처 + 외부 링크 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label>
                    <span style={labelSpan}>연락처</span>
                    <input
                      value={form.contact_phone}
                      onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="010-1234-5678"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <span style={labelSpan}>원본 공고 URL</span>
                    <input
                      value={form.external_link}
                      onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                      placeholder="잡코리아, 사람인 등 URL"
                      style={inputStyle}
                    />
                  </label>
                </div>

                {/* 복리후생 태그 */}
                <div>
                  <span style={labelSpan}>복리후생 (태그 선택/추가)</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {['식대제공', '교통비지원', '4대보험', '주휴수당', '기숙사제공', '연장수당', '야간수당', '주5일', '주6일'].map(tag => {
                      const isSelected = form.benefits.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            benefits: isSelected
                              ? f.benefits.filter(b => b !== tag)
                              : [...f.benefits, tag],
                          }))}
                          style={{
                            padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 600,
                            background: isSelected ? '#3182f6' : 'rgba(255,255,255,0.08)',
                            color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      )
                    })}
                  </div>
                  <BenefitsInput
                    benefits={form.benefits}
                    onChange={b => setForm(f => ({ ...f, benefits: b }))}
                    inputStyle={inputStyle}
                  />
                </div>

                {/* 지원자 선택 업무 */}
                <div>
                  <span style={labelSpan}>
                    지원자 선택 업무 <span style={{ color: '#f04452' }}>*</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: 400 }}>
                      (지원서 폼 드롭다운에 표시됨)
                    </span>
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {form.task_options.map(task => (
                      <span
                        key={task}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 999,
                          background: 'rgba(49,130,246,0.18)', color: '#3182f6',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        {task}
                        <button
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            task_options: f.task_options.filter(t => t !== task),
                          }))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#3182f6', padding: 0, lineHeight: 1,
                            fontSize: '1rem', fontWeight: 700,
                          }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <TaskOptionsInput
                    taskOptions={form.task_options}
                    onChange={opts => setForm(f => ({ ...f, task_options: opts }))}
                    inputStyle={inputStyle}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                    엔터 또는 쉼표로 구분 입력 (예: 상차, 하차, 분류)
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: 발행 설정 ── */}
            {formStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* 섹션 3종 선택 */}
                <div>
                  <span style={labelSpan}>섹션 구분 <span style={{ color: '#f04452' }}>*</span></span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {([
                      { value: 'today-urgent', label: '🔥 오늘 추가모집', desc: '당일 급구 공고', color: '#ef4444' },
                      { value: 'tomorrow-urgent', label: '⚡ 내일 긴급모집', desc: '내일 긴급 모집', color: '#f97316' },
                      { value: 'always', label: '✅ 상시모집', desc: '기간 무관 모집', color: '#22c55e' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, section: opt.value }))}
                        style={{
                          padding: '14px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' as const,
                          background: form.section === opt.value ? `${opt.color}22` : 'rgba(255,255,255,0.05)',
                          color: form.section === opt.value ? opt.color : 'rgba(255,255,255,0.45)',
                          outline: form.section === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                          transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4,
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{opt.label.split(' ')[0]}</span>
                        <span>{opt.label.split(' ').slice(1).join(' ')}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 공고 마감일 */}
                <label>
                  <span style={labelSpan}>
                    공고 마감일 <span style={{ color: '#f04452' }}>*</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: 400 }}>
                      (오늘 이후만 선택 가능)
                    </span>
                  </span>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </label>

                {/* 공고 상태 */}
                <div>
                  <span style={labelSpan}>공고 상태</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([
                      { value: 'active', label: '✅ 즉시 발행', color: '#22c55e' },
                      { value: 'draft', label: '📝 임시저장', color: '#ffb400' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.85rem',
                          background: form.status === opt.value ? `${opt.color}22` : 'rgba(255,255,255,0.05)',
                          color: form.status === opt.value ? opt.color : 'rgba(255,255,255,0.45)',
                          outline: form.status === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: 최종 미리보기 ── */}
            {formStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  아래 공고 내용을 최종 확인한 후 발행 버튼을 클릭하세요.
                </p>
                {/* 최종 확인 체크리스트 */}
                <div style={{
                  background: 'rgba(49,130,246,0.08)',
                  border: '1px solid rgba(49,130,246,0.2)',
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
                      fontSize: '0.82rem', color: item.ok ? '#3fc878' : '#f04452',
                      marginBottom: 4,
                    }}>
                      <span>{item.ok ? '✓' : '✗'}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 저장 오류 표시 */}
            {jobError && (
              <div style={{
                background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
                borderRadius: 10, padding: '12px 16px', marginTop: 16,
                color: '#ff6b6b', fontSize: '0.82rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>⚠️ {jobError}</span>
                <button
                  onClick={() => setJobError(null)}
                  style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}
                >×</button>
              </div>
            )}

            {/* 하단 버튼 그룹 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 32, justifyContent: 'space-between', alignItems: 'center' }}>
              {/* 이전 / 임시저장 */}
              <div style={{ display: 'flex', gap: 8 }}>
                {formStep > 1 && (
                  <button
                    onClick={() => setFormStep(s => s - 1)}
                    style={{
                      padding: '10px 22px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent', color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.87rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ← 이전
                  </button>
                )}
                {/* 임시저장 버튼 (1~4단계에서 표시) */}
                {formStep < 5 && (
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving || !form.company_name.trim()}
                    style={{
                      padding: '10px 18px', borderRadius: 10,
                      border: '1px solid rgba(255,180,0,0.3)',
                      background: 'rgba(255,180,0,0.08)', color: '#ffb400',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      opacity: saving || !form.company_name.trim() ? 0.5 : 1,
                    }}
                  >
                    📝 임시저장
                  </button>
                )}
              </div>

              {/* 다음 / 발행 */}
              {formStep < 5 ? (
                <button
                  onClick={() => setFormStep(s => s + 1)}
                  disabled={formStep === 1 && (!form.company_name.trim() || !form.region.trim())}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: 'none',
                    background: (formStep === 1 && (!form.company_name.trim() || !form.region.trim()))
                      ? 'rgba(49,130,246,0.3)' : '#3182f6',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  다음 →
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving || !form.company_name.trim()}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      border: '1px solid rgba(255,180,0,0.3)',
                      background: 'rgba(255,180,0,0.08)', color: '#ffb400',
                      fontSize: '0.87rem', fontWeight: 600, cursor: 'pointer',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
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
                      transition: 'background 0.15s',
                    }}
                  >
                    {saving ? '저장 중...' : pageMode === 'edit' ? '💾 저장' : '🚀 발행'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── 우측: 실시간 미리보기 카드 ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              실시간 미리보기
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${form.is_urgent || form.section !== 'always' ? 'rgba(240,68,82,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 18, padding: '20px 22px',
            }}>
              {/* 배지 영역 */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {form.section === 'today-urgent' && (
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(240,68,82,0.2)', color: '#f04452' }}>🔥 오늘 추가모집</span>
                )}
                {form.section === 'tomorrow-urgent' && (
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>⚡ 내일 긴급모집</span>
                )}
                {form.status === 'draft' && (
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,180,0,0.18)', color: '#ffb400' }}>📝 임시저장</span>
                )}
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                  background: form.status === 'active' ? 'rgba(49,200,100,0.18)' : 'rgba(255,255,255,0.08)',
                  color: form.status === 'active' ? '#3fc878' : 'rgba(255,255,255,0.4)',
                }}>
                  {form.status === 'active' ? '활성' : form.status === 'draft' ? '임시' : form.status}
                </span>
              </div>

              {/* 회사명 + 센터 */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.3, color: '#fff' }}>
                  {form.company_name || <span style={{ color: 'rgba(255,255,255,0.2)' }}>회사명</span>}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                  {form.center_name || <span style={{ color: 'rgba(255,255,255,0.2)' }}>센터명</span>}
                </div>
              </div>

              {/* 지역 */}
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                📍 {form.region || <span style={{ color: 'rgba(255,255,255,0.2)' }}>지역</span>}
              </div>

              {/* 시급/일급 */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                {form.hourly_wage > 0 && (
                  <span style={{ color: '#3182f6', fontWeight: 800, fontSize: '0.95rem' }}>
                    시 {form.hourly_wage.toLocaleString()}원
                  </span>
                )}
                {form.daily_wage > 0 && (
                  <span style={{ color: '#7c3aed', fontWeight: 800, fontSize: '0.95rem' }}>
                    일 {form.daily_wage.toLocaleString()}원
                  </span>
                )}
              </div>

              {/* 근무 정보 */}
              {form.work_hours && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                  ⏰ {form.work_hours}
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                👥 {form.headcount > 0 ? `${form.headcount}명` : '-'} · 📅 마감 {form.expires_at || '미정'}
              </div>

              {/* 복리후생 태그 */}
              {form.benefits.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {form.benefits.map(b => (
                    <span key={b} style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600,
                      background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)',
                    }}>{b}</span>
                  ))}
                </div>
              )}

              {/* 설명 미리보기 */}
              {form.description && (
                <div style={{
                  fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                  whiteSpace: 'pre-wrap', marginTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
                }}>
                  {form.description.slice(0, 150)}{form.description.length > 150 ? '...' : ''}
                </div>
              )}
            </div>

            {/* 도움말 */}
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6,
            }}>
              💡 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>임시저장</strong>이란?<br />
              지금 당장 발행하지 않고 draft 상태로 저장합니다. 목록에서 별도 표시되며 나중에 수정 후 발행 가능합니다.
            </div>
          </div>
        </div>

        {/* 토스트 */}
        {adminToast && (
          <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, minWidth: 280, maxWidth: 420,
            padding: '12px 20px', borderRadius: 12,
            background: adminToast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)', textAlign: 'center', pointerEvents: 'none',
          }}>
            {adminToast.msg}
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // 메인 목록 뷰
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)', position: 'relative' }}>

      {/* 인라인 토스트 */}
      {adminToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: 280, maxWidth: 420,
          padding: '12px 20px', borderRadius: 12,
          background: adminToast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)', textAlign: 'center', pointerEvents: 'none',
        }}>
          {adminToast.msg}
        </div>
      )}

      {/* 상위 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { key: 'jobs' as const, label: '💼 공고 목록' },
          { key: 'applicants' as const, label: '👥 지원자 관리' },
          { key: 'dashboard' as const, label: '📊 확정 현황' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              color: mainTab === tab.key ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: mainTab === tab.key ? 700 : 500,
              fontSize: '0.9rem', cursor: 'pointer',
              borderBottom: mainTab === tab.key ? '2px solid #3182f6' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ 공고 목록 탭 ══ */}
      {mainTab === 'jobs' && (
        <>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>💼 채용공고 관리</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                채용정보 피드에 노출되는 공고를 관리합니다. ({jobs.length}건)
              </p>
            </div>
            {/* ─ "새 공고 추가" 클릭 시 풀페이지 스텝퍼로 이동 ─ */}
            <button onClick={openCreate} style={{
              padding: '10px 22px', borderRadius: 12, border: 'none',
              background: '#3182f6', color: '#fff', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(49,130,246,0.35)',
            }}>
              + 새 공고 등록
            </button>
          </div>

          {/* CRUD 오류 */}
          {jobError && (
            <div style={{
              background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
              color: '#ff6b6b', fontSize: '0.82rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>⚠️ {jobError}</span>
              <button
                onClick={() => setJobError(null)}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}
              >×</button>
            </div>
          )}

          {/* 필터 바 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'active', 'draft', 'expired', 'deleted'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '6px 16px', borderRadius: 999, border: 'none',
                background: statusFilter === s ? '#3182f6' : 'rgba(255,255,255,0.08)',
                color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                {s === 'all' ? '전체' : s === 'active' ? '활성' : s === 'draft' ? '임시저장' : s === 'expired' ? '만료' : '삭제됨'}
              </button>
            ))}
            <input
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
              placeholder="🔍 회사명·센터명·지역 검색"
              style={{
                padding: '6px 16px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: '#fff',
                fontSize: '0.78rem', outline: 'none', minWidth: 220,
              }}
            />
          </div>

          {/* ── 공고 카드 그리드 (고도화 — 큰 카드, 텍스트 줄바꿈) ── */}
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : (() => {
            const filtered = jobSearch.trim()
              ? jobs.filter(j =>
                  `${j.company_name} ${j.center_name} ${j.region}`.toLowerCase()
                    .includes(jobSearch.toLowerCase()))
              : jobs
            return filtered.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
                공고가 없습니다.
              </p>
            ) : (
              // 2열 그리드 — 큰 카드
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20,
              }}>
                {filtered.map(job => {
                  const benefits = Array.isArray(job.benefits) ? job.benefits as string[] : []
                  return (
                    <div key={job.id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${job.is_urgent ? 'rgba(240,68,82,0.4)' : job.status === 'draft' ? 'rgba(255,180,0,0.3)' : 'rgba(255,255,255,0.09)'}`,
                      borderRadius: 18,
                      padding: '22px 24px',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      minHeight: 220,
                      transition: 'border-color 0.2s',
                    }}>
                      {/* 카드 상단: 배지 묶음 */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {job.is_urgent && (
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800,
                            background: 'rgba(240,68,82,0.2)', color: '#f04452',
                          }}>🚨 급구</span>
                        )}
                        {/* 섹션 배지 */}
                        {(job.section as string) === 'today-urgent' && (
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>🔥 오늘추가</span>
                        )}
                        {(job.section as string) === 'tomorrow-urgent' && (
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>⚡ 내일긴급</span>
                        )}
                        {(job.section as string) === 'always' && (
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅ 상시</span>
                        )}
                        <span style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                          marginLeft: 'auto',
                          background: job.status === 'active'
                            ? 'rgba(49,200,100,0.18)'
                            : job.status === 'draft'
                              ? 'rgba(255,180,0,0.18)'
                              : job.status === 'expired'
                                ? 'rgba(255,180,0,0.12)'
                                : 'rgba(255,255,255,0.08)',
                          color: job.status === 'active'
                            ? '#3fc878'
                            : job.status === 'draft'
                              ? '#ffb400'
                              : job.status === 'expired'
                                ? '#ffb400'
                                : 'rgba(255,255,255,0.35)',
                        }}>
                          {job.status === 'active' ? '활성' : job.status === 'draft' ? '임시저장' : job.status === 'expired' ? '만료' : '삭제'}
                        </span>
                      </div>

                      {/* 회사명 + 센터명 — 텍스트 잘림 없음 */}
                      <div>
                        <div style={{
                          fontWeight: 900, fontSize: '1.05rem',
                          color: '#fff', lineHeight: 1.4,
                          wordBreak: 'break-word', whiteSpace: 'normal',
                        }}>
                          {job.company_name}
                        </div>
                        <div style={{
                          fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginTop: 3,
                          wordBreak: 'break-word', whiteSpace: 'normal',
                        }}>
                          {job.center_name}
                        </div>
                      </div>

                      {/* 지역 */}
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                        📍 {job.region}
                      </div>

                      {/* 시급/일급 — 크게 */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {job.hourly_wage > 0 && (
                          <span style={{ color: '#3182f6', fontWeight: 800, fontSize: '1rem' }}>
                            시 {fmtWage(job.hourly_wage)}
                          </span>
                        )}
                        {job.daily_wage > 0 && (
                          <span style={{ color: '#7c3aed', fontWeight: 800, fontSize: '1rem' }}>
                            일 {fmtWage(job.daily_wage)}
                          </span>
                        )}
                      </div>

                      {/* 근무시간 + 인원 + 마감일 */}
                      <div style={{
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)',
                        display: 'flex', gap: 14, flexWrap: 'wrap', lineHeight: 1.5,
                      }}>
                        {job.work_hours && <span>⏰ {job.work_hours}</span>}
                        <span>👥 {job.headcount}명</span>
                        <span>📅 마감 {job.expires_at ?? '미정'}</span>
                      </div>

                      {/* 복리후생 태그 (최대 4개) */}
                      {benefits.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {benefits.slice(0, 4).map(b => (
                            <span key={b} style={{
                              padding: '3px 9px', borderRadius: 999,
                              fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(255,255,255,0.07)',
                              color: 'rgba(255,255,255,0.5)',
                            }}>{b}</span>
                          ))}
                          {benefits.length > 4 && (
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '3px 0' }}>
                              +{benefits.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 공고 내용 미리보기 (2줄까지) */}
                      {job.description && (
                        <div style={{
                          fontSize: '0.76rem', color: 'rgba(255,255,255,0.35)',
                          lineHeight: 1.55,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          paddingTop: 10,
                        }}>
                          {job.description}
                        </div>
                      )}

                      {/* 관리 버튼 — 넓게 */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {/* 수정 버튼 — 풀페이지 스텝퍼로 이동 */}
                        <button onClick={() => openEdit(job)} style={{
                          flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                          background: 'rgba(49,130,246,0.15)', color: '#3182f6',
                          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        }}>✏️ 수정</button>
                        <button
                          onClick={() => handleToggleUrgent(job)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                            background: job.is_urgent ? 'rgba(240,68,82,0.15)' : 'rgba(255,180,0,0.1)',
                            color: job.is_urgent ? '#f04452' : '#ffb400',
                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >{job.is_urgent ? '급구 해제' : '급구 설정'}</button>
                        {job.status !== 'deleted' && (
                          <button onClick={() => handleDelete(job)} style={{
                            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                            background: 'rgba(240,68,82,0.12)', color: '#f04452',
                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                          }}>🗑️ 삭제</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </>
      )}

      {/* ══ 지원자 관리 탭 ══ */}
      {mainTab === 'applicants' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>👥 지원자 관리</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                지원자 상태를 출근확정 → 출근완료 순으로 처리하세요.
              </p>
            </div>
            <button
              onClick={() => downloadXlsx(applicants)}
              style={{
                padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(49,200,100,0.1)', color: '#3fc878',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              📥 엑셀 다운로드
            </button>
          </div>

          {/* 필터 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={appJobFilter}
              onChange={e => setAppJobFilter(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">전체 공고</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.company_name} {job.center_name}
                </option>
              ))}
            </select>

            {(['all', 'applied', 'confirmed', 'completed', 'cancelled', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setAppStatusFilter(s)} style={{
                padding: '5px 14px', borderRadius: 999, border: 'none',
                background: appStatusFilter === s ? '#3182f6' : 'rgba(255,255,255,0.08)',
                color: appStatusFilter === s ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}>
                {s === 'all' ? '전체' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* 에러 */}
          {appError && (
            <div style={{
              background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
              color: '#ff6b6b', fontSize: '0.82rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>⚠️ {appError}</span>
              <button
                onClick={() => { setAppError(null); fetchApplicants() }}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 4px', fontSize: '0.8rem', fontWeight: 700 }}
              >다시 시도 ↻</button>
            </div>
          )}

          {/* 지원자 테이블 */}
          {appLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={thStyle}>지원자 정보</th>
                      <th style={thStyle}>인적사항</th>
                      <th style={thStyle}>공고</th>
                      <th style={{ ...thStyle, width: 80 }}>지원일</th>
                      <th style={{ ...thStyle, width: 80 }}>상태</th>
                      <th style={{ ...thStyle, width: 200 }}>상태 변경</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                          지원자가 없습니다.
                        </td>
                      </tr>
                    )}
                    {applicants.map(app => {
                      const sc = appStatusColor(app.status)
                      const isUpdating = updatingId === app.id
                      return (
                        <tr key={app.id}>
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              {app.profiles?.full_name ?? '이름 없음'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                              {app.profiles?.email ?? '-'}
                            </div>
                          </td>
                          <td style={cellStyle}>
                            {app.applicant_name ? (
                              <>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                                  {app.applicant_name}
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>
                                    {app.applicant_gender === 'male' ? '남' : app.applicant_gender === 'female' ? '여' : ''}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                                  {app.applicant_birth ? app.applicant_birth.slice(0, 10) : '-'} · {app.applicant_phone ? maskPhone(app.applicant_phone) : '-'}
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>미입력</span>
                            )}
                          </td>
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600 }}>{app.job_postings?.company_name ?? '-'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                              {app.job_postings?.center_name ?? ''}
                            </div>
                          </td>
                          <td style={cellStyle}>
                            {new Date(app.applied_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999,
                              fontSize: '0.72rem', fontWeight: 700,
                              background: sc.bg, color: sc.color,
                            }}>
                              {STATUS_LABEL[app.status] ?? app.status}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {app.status === 'applied' && (
                                <>
                                  <button
                                    disabled={isUpdating}
                                    onClick={() => {
                                      const today = new Date().toISOString().slice(0, 10)
                                      const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                      if (workDate !== null) handleUpdateStatus(app.id, 'confirmed', workDate)
                                    }}
                                    style={{
                                      padding: '3px 10px', borderRadius: 8, border: 'none',
                                      background: 'rgba(49,200,100,0.15)', color: '#3fc878',
                                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                      opacity: isUpdating ? 0.5 : 1,
                                    }}
                                  >✓ 확정</button>
                                  <button
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                    style={{
                                      padding: '3px 10px', borderRadius: 8, border: 'none',
                                      background: 'rgba(240,68,82,0.15)', color: '#f04452',
                                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                      opacity: isUpdating ? 0.5 : 1,
                                    }}
                                  >✕ 거절</button>
                                </>
                              )}
                              {app.status === 'confirmed' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(app.id, 'completed')}
                                  style={{
                                    padding: '3px 10px', borderRadius: 8, border: 'none',
                                    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: isUpdating ? 0.5 : 1,
                                  }}
                                >출근완료</button>
                              )}
                              {app.status !== 'completed' && app.status !== 'cancelled' && app.status !== 'rejected' && app.status !== 'applied' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                                  style={{
                                    padding: '3px 10px', borderRadius: 8, border: 'none',
                                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: isUpdating ? 0.5 : 1,
                                  }}
                                >취소</button>
                              )}
                              {(app.status === 'completed' || app.status === 'cancelled' || app.status === 'rejected') && (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>처리완료</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ 확정 현황 대시보드 탭 ══ */}
      {mainTab === 'dashboard' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>📊 확정 현황 대시보드</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              지원자 관리 탭 데이터 기반 집계 (필터 적용 중인 경우 해당 범위 반영)
            </p>
          </div>

          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: '전체 지원', value: applicants.length, color: '#3182f6' },
              { label: '출근확정', value: applicants.filter(a => a.status === 'confirmed').length, color: '#3fc878' },
              { label: '지원거절', value: applicants.filter(a => a.status === 'rejected').length, color: '#f04452' },
              { label: '출근완료', value: applicants.filter(a => a.status === 'completed').length, color: 'rgba(255,255,255,0.5)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '16px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 센터별 상세 테이블 */}
          {dashboardStats.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
              지원자 관리 탭에서 먼저 데이터를 로드하세요.
            </p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={thStyle}>센터명</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>지원</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>확정</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>거절</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>완료</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>확정률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats.map(stat => {
                      const total = stat.applied + stat.confirmed + stat.rejected + stat.completed
                      const confirmRate = total > 0 ? Math.round((stat.confirmed + stat.completed) / total * 100) : 0
                      return (
                        <tr key={stat.center}>
                          <td style={{ ...cellStyle, fontWeight: 700 }}>{stat.center}</td>
                          <td style={{ ...cellStyle, textAlign: 'center', color: '#3182f6' }}>{stat.applied}</td>
                          <td style={{ ...cellStyle, textAlign: 'center', color: '#3fc878' }}>{stat.confirmed}</td>
                          <td style={{ ...cellStyle, textAlign: 'center', color: '#f04452' }}>{stat.rejected}</td>
                          <td style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{stat.completed}</td>
                          <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: confirmRate >= 50 ? '#3fc878' : '#ffb400' }}>
                            {confirmRate}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── 휴대폰 번호 마스킹 ──
function maskPhone(phone: string): string {
  const nums = phone.replace(/\D/g, '')
  if (nums.length < 10) return phone
  return `${nums.slice(0, 3)}-****-${nums.slice(-4)}`
}

// ── 복리후생 직접 입력 컴포넌트 ──
function BenefitsInput({
  benefits,
  onChange,
  inputStyle,
}: {
  benefits: string[]
  onChange: (b: string[]) => void
  inputStyle: React.CSSProperties
}) {
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
              background: 'rgba(49,130,246,0.15)', color: '#3182f6',
              border: '1px solid rgba(49,130,246,0.3)',
            }}>
              {b}
              <button
                type="button"
                onClick={() => onChange(benefits.filter(x => x !== b))}
                style={{ background: 'none', border: 'none', color: '#3182f6', cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
          placeholder="직접 입력 후 Enter"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={addTag} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
        }}>추가</button>
      </div>
    </div>
  )
}

// ── 지원자 선택 업무 직접 입력 컴포넌트 ──
function TaskOptionsInput({
  taskOptions,
  onChange,
  inputStyle,
}: {
  taskOptions: string[]
  onChange: (opts: string[]) => void
  inputStyle: React.CSSProperties
}) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const tag = draft.trim().replace(/,/g, '')
    if (tag && !taskOptions.includes(tag)) onChange([...taskOptions, tag])
    setDraft('')
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
        placeholder="업무 입력 후 Enter (예: 상차, 하차, 분류)"
        style={{ ...inputStyle, flex: 1 }}
      />
      <button type="button" onClick={addTag} style={{
        padding: '8px 14px', borderRadius: 10, border: 'none',
        background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
      }}>추가</button>
    </div>
  )
}

// ── E-1: CSV 다운로드 (consent_third_party=true 건만) ──
function downloadXlsx(applicants: Array<{
  applicant_name: string | null
  applicant_birth: string | null
  applicant_gender: string | null
  applicant_phone: string | null
  consent_third_party: boolean | null
  job_postings?: { company_name: string; center_name: string } | null
  applied_at: string
  status: string
}>) {
  const filtered = applicants.filter(a => a.consent_third_party === true && a.applicant_name)
  if (filtered.length === 0) {
    alert('다운로드 가능한 지원자가 없습니다.\n(제3자 제공 동의 + 인적사항 입력 건만 포함됩니다)')
    return
  }

  const BOM = '\uFEFF'
  const header = ['이름', '생년월일', '성별', '휴대폰', '공고', '센터', '지원일시', '상태']
  const rows = filtered.map(a => [
    a.applicant_name ?? '',
    a.applicant_birth ?? '',
    a.applicant_gender === 'male' ? '남' : a.applicant_gender === 'female' ? '여' : '',
    a.applicant_phone ? maskPhone(a.applicant_phone) : '',
    a.job_postings?.company_name ?? '',
    a.job_postings?.center_name ?? '',
    a.applied_at ? new Date(a.applied_at).toLocaleString('ko-KR') : '',
    a.status,
  ])

  const csv = BOM + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `지원자_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
