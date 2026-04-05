// 관리자 — 채용공고 관리 메뉴
// [공고 목록] 탭: 공고 CRUD (추가/수정/삭제/긴급 토글)
// [지원자 관리] 탭: 공고별 지원자 목록 조회 + 출근확정/출근완료/취소 처리
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { awardPoints } from '../../../lib/jobApplications'
import type { JobPosting } from '../../../types/supabase'

// ── 공고 등록/수정 폼 타입 ──
interface JobForm {
  company_name: string
  center_name: string
  region: string
  headcount: number
  hourly_wage: number
  daily_wage: number    // 일급 (시급 × 근무시간 계산 없이 직접 입력)
  work_hours: string
  description: string
  contact_phone: string
  external_link: string
  is_urgent: boolean
  expires_at: string
}

const defaultForm: JobForm = {
  company_name: '', center_name: '', region: '',
  headcount: 0, hourly_wage: 0, daily_wage: 0, work_hours: '',
  description: '', contact_phone: '', external_link: '',
  is_urgent: false, expires_at: '',
}

// ── 지원자 한 행의 타입 (job_postings JOIN 포함) ──
interface ApplicationRow {
  id: string
  user_id: string
  job_posting_id: string
  status: 'applied' | 'confirmed' | 'completed' | 'cancelled'
  applied_at: string
  work_date: string | null
  // JOIN된 공고 정보
  job_postings?: {
    company_name: string
    center_name: string
  } | null
  // JOIN된 프로필 정보 (이름/이메일)
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

// ── 상태 라벨 ──
const STATUS_LABEL: Record<string, string> = {
  applied: '지원완료',
  confirmed: '출근확정',
  completed: '출근완료',
  cancelled: '취소',
}

export default function JobsMenu() {
  const { user } = useAuth()

  // ── 상위 탭: 공고 목록 / 지원자 관리 ──
  const [mainTab, setMainTab] = useState<'jobs' | 'applicants'>('jobs')

  // ───────────────────────────────────────
  // 공고 목록 탭 상태
  // ───────────────────────────────────────
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<JobForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null) // CRUD 오류 메시지
  // 공고 상태 필터: 전체/active/expired/deleted
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ───────────────────────────────────────
  // 지원자 관리 탭 상태
  // ───────────────────────────────────────
  const [applicants, setApplicants] = useState<ApplicationRow[]>([])
  const [appLoading, setAppLoading] = useState(false)
  // 공고별 필터 (빈 문자열 = 전체)
  const [appJobFilter, setAppJobFilter] = useState<string>('')
  // 상태별 필터
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all')
  // 상태 변경 처리 중인 ID
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ───────────────────────────────────────
  // 공고 목록 로드
  // ───────────────────────────────────────
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

  // ───────────────────────────────────────
  // 지원자 목록 로드
  // job_applications + job_postings + profiles 3-way JOIN
  // ───────────────────────────────────────
  const fetchApplicants = async () => {
    if (!supabase) return
    setAppLoading(true)
    let query = supabase
      .from('job_applications')
      .select(`
        *,
        job_postings (
          company_name,
          center_name
        ),
        profiles (
          full_name,
          email
        )
      `)
      .order('applied_at', { ascending: false })

    // 공고별 필터가 선택된 경우 해당 공고만 조회
    if (appJobFilter) {
      query = query.eq('job_posting_id', appJobFilter)
    }
    // 상태 필터
    if (appStatusFilter !== 'all') {
      query = query.eq('status', appStatusFilter)
    }

    const { data, error } = await query
    if (error) console.error('[지원자 목록 조회 오류]', error)
    setApplicants((data ?? []) as ApplicationRow[])
    setAppLoading(false)
  }

  // 지원자 탭으로 전환하거나 필터 변경 시 재조회
  useEffect(() => {
    if (mainTab === 'applicants') fetchApplicants()
  }, [mainTab, appJobFilter, appStatusFilter])

  // ───────────────────────────────────────
  // 공고 관리 핸들러
  // ───────────────────────────────────────

  // 새 공고 추가 모달 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  // 수정 모달 열기
  const openEdit = (job: JobPosting) => {
    setEditTarget(job)
    setForm({
      company_name: job.company_name,
      center_name: job.center_name,
      region: job.region,
      headcount: job.headcount,
      hourly_wage: job.hourly_wage,
      daily_wage: job.daily_wage ?? 0,   // DB에 저장된 일급 (없으면 0)
      work_hours: job.work_hours,
      description: job.description,
      contact_phone: job.contact_phone,
      external_link: job.external_link,
      is_urgent: job.is_urgent,
      expires_at: job.expires_at ?? '',
    })
    setModalOpen(true)
  }

  // 저장 (생성 또는 수정)
  const handleSave = async () => {
    if (!supabase || !form.company_name.trim() || !form.region.trim()) return
    // 마감일 필수 검증 — 직업안정법상 마감일 없는 공고는 이용자 혼란 유발 가능
    if (!form.expires_at) {
      alert('마감일은 필수 입력입니다.')
      return
    }
    setSaving(true)
    setJobError(null)
    try {
      const payload = {
        company_name: form.company_name.trim(),
        center_name: form.center_name.trim(),
        region: form.region.trim(),
        headcount: form.headcount,
        hourly_wage: form.hourly_wage,
        daily_wage: form.daily_wage,          // 일급 저장
        work_hours: form.work_hours.trim(),
        description: form.description.trim(),
        contact_phone: form.contact_phone.trim(),
        external_link: form.external_link.trim(),
        is_urgent: form.is_urgent,
        expires_at: form.expires_at || null,
      }
      if (editTarget) {
        const { error } = await supabase.from('job_postings').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('job_postings').insert({ ...payload, created_by: user?.id ?? null })
        if (error) throw error
      }
      setModalOpen(false)
      fetchJobs()
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : '저장에 실패했습니다. RLS 정책 또는 컬럼명을 확인하세요.')
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
    if (error) setJobError(error.message)
    else fetchJobs()
  }

  // 삭제 (soft delete → status = 'deleted')
  const handleDelete = async (job: JobPosting) => {
    if (!window.confirm(`"${job.company_name} ${job.center_name}" 공고를 삭제할까요?`)) return
    if (!supabase) return
    const { error } = await supabase.from('job_postings')
      .update({ status: 'deleted' })
      .eq('id', job.id)
    if (error) setJobError(error.message)
    else fetchJobs()
  }

  // ───────────────────────────────────────
  // 지원자 상태 변경 핸들러
  // ───────────────────────────────────────

  // 지원자 상태 변경 (어드민이 직접 처리)
  // newStatus: 'confirmed' (출근확정), 'completed' (출근완료), 'cancelled' (취소)
  // 출근완료 처리 시 → 해당 지원자에게 포인트 +100P 자동 지급
  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled',
    workDate?: string  // 출근확정 시 출근일 설정 가능
  ) => {
    if (!supabase || updatingId) return
    setUpdatingId(appId)
    try {
      const updatePayload: Record<string, unknown> = { status: newStatus }
      // 출근확정 시 work_date가 넘어오면 함께 저장
      if (newStatus === 'confirmed' && workDate) {
        updatePayload.work_date = workDate
      }
      const { error } = await supabase
        .from('job_applications')
        .update(updatePayload)
        .eq('id', appId)
      if (error) throw error

      // 출근완료 처리 시 → 지원자 user_id 찾아서 포인트 +100P 지급
      if (newStatus === 'completed') {
        // applicants 배열에서 해당 지원 건의 user_id 조회
        const targetApp = applicants.find(a => a.id === appId)
        if (targetApp?.user_id) {
          // 실패해도 상태 변경 자체는 성공 처리 (조용히 에러 로그만 기록)
          await awardPoints(targetApp.user_id, 100, '출근 완료 (관리자 확인)', appId)
        }
      }

      // 목록 즉시 갱신
      await fetchApplicants()
    } catch (err) {
      console.error('[지원자 상태 변경 오류]', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // ───────────────────────────────────────
  // 스타일 상수
  // ───────────────────────────────────────
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
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.88rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }
  const labelSpan: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.45)',
    display: 'block',
    marginBottom: 6,
  }

  // 지원자 상태 배지 색상
  const appStatusColor = (status: string) => {
    if (status === 'confirmed') return { bg: 'rgba(49,200,100,0.18)', color: '#3fc878' }
    if (status === 'completed') return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
    if (status === 'cancelled') return { bg: 'rgba(240,68,82,0.18)', color: '#f04452' }
    return { bg: 'rgba(49,130,246,0.18)', color: '#3182f6' }  // applied
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>

      {/* ── 상위 탭: 공고 목록 / 지원자 관리 ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { key: 'jobs' as const, label: '💼 공고 목록' },
          { key: 'applicants' as const, label: '👥 지원자 관리' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: mainTab === tab.key ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: mainTab === tab.key ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderBottom: mainTab === tab.key ? '2px solid #3182f6' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          공고 목록 탭
      ══════════════════════════════════════ */}
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
            <button onClick={openCreate} style={{
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: '#3182f6', color: '#fff', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
              + 새 공고 추가
            </button>
          </div>

          {/* CRUD 오류 표시 */}
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

          {/* 공고 상태 필터 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['all', 'active', 'expired', 'deleted'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '5px 14px', borderRadius: 999, border: 'none',
                background: statusFilter === s ? '#3182f6' : 'rgba(255,255,255,0.08)',
                color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}>
                {s === 'all' ? '전체' : s === 'active' ? '활성' : s === 'expired' ? '만료' : '삭제됨'}
              </button>
            ))}
          </div>

          {/* 공고 테이블 */}
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={{ ...thStyle, width: 60 }}>긴급</th>
                      <th style={thStyle}>회사</th>
                      <th style={thStyle}>센터</th>
                      <th style={thStyle}>지역</th>
                      <th style={{ ...thStyle, width: 80 }}>시급</th>
                      <th style={{ ...thStyle, width: 50 }}>인원</th>
                      <th style={{ ...thStyle, width: 90 }}>마감일</th>
                      <th style={{ ...thStyle, width: 60 }}>상태</th>
                      <th style={{ ...thStyle, width: 130 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                          공고가 없습니다.
                        </td>
                      </tr>
                    )}
                    {jobs.map(job => (
                      <tr key={job.id}>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                          <button onClick={() => handleToggleUrgent(job)} style={{
                            padding: '3px 10px', borderRadius: 999, border: 'none',
                            background: job.is_urgent ? 'rgba(240,68,82,0.18)' : 'rgba(255,255,255,0.08)',
                            color: job.is_urgent ? '#f04452' : 'rgba(255,255,255,0.35)',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          }}>
                            {job.is_urgent ? '급구' : '-'}
                          </button>
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{job.company_name}</td>
                        <td style={cellStyle}>{job.center_name}</td>
                        <td style={cellStyle}>{job.region}</td>
                        <td style={{ ...cellStyle, color: '#3182f6', fontWeight: 700 }}>{fmtWage(job.hourly_wage)}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>{job.headcount}명</td>
                        <td style={cellStyle}>{job.expires_at ?? '-'}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                            background: job.status === 'active' ? 'rgba(49,200,100,0.18)' : job.status === 'expired' ? 'rgba(255,180,0,0.18)' : 'rgba(255,255,255,0.08)',
                            color: job.status === 'active' ? '#3fc878' : job.status === 'expired' ? '#ffb400' : 'rgba(255,255,255,0.35)',
                          }}>
                            {job.status === 'active' ? '활성' : job.status === 'expired' ? '만료' : '삭제'}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                          <button onClick={() => openEdit(job)} style={{
                            marginRight: 6, padding: '3px 10px', borderRadius: 8, border: 'none',
                            background: 'rgba(49,130,246,0.15)', color: '#3182f6',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          }}>수정</button>
                          {job.status !== 'deleted' && (
                            <button onClick={() => handleDelete(job)} style={{
                              padding: '3px 10px', borderRadius: 8, border: 'none',
                              background: 'rgba(240,68,82,0.12)', color: '#f04452',
                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            }}>삭제</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          지원자 관리 탭
          — 모든 공고의 지원자를 한눈에 보고
            출근확정 / 출근완료 / 취소 처리
      ══════════════════════════════════════ */}
      {mainTab === 'applicants' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>👥 지원자 관리</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              지원자 상태를 출근확정 → 출근완료 순으로 처리하세요.
            </p>
          </div>

          {/* 필터: 공고 선택 + 상태 선택 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* 공고별 필터 드롭다운 */}
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

            {/* 상태 필터 */}
            {(['all', 'applied', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
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

          {/* 지원자 테이블 */}
          {appLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={thStyle}>지원자</th>
                      <th style={thStyle}>공고</th>
                      <th style={{ ...thStyle, width: 90 }}>지원일</th>
                      <th style={{ ...thStyle, width: 90 }}>출근예정일</th>
                      <th style={{ ...thStyle, width: 80 }}>상태</th>
                      <th style={{ ...thStyle, width: 220 }}>상태 변경</th>
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
                          {/* 지원자 이름/이메일 */}
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {app.profiles?.full_name ?? '이름 없음'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                              {app.profiles?.email ?? '-'}
                            </div>
                          </td>

                          {/* 공고명 */}
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600 }}>{app.job_postings?.company_name ?? '-'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                              {app.job_postings?.center_name ?? ''}
                            </div>
                          </td>

                          {/* 지원일 */}
                          <td style={cellStyle}>
                            {new Date(app.applied_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </td>

                          {/* 출근 예정일 (confirmed 일 때만 의미있음) */}
                          <td style={{ ...cellStyle, color: app.work_date ? '#3fc878' : 'rgba(255,255,255,0.25)' }}>
                            {app.work_date
                              ? new Date(app.work_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                              : '-'}
                          </td>

                          {/* 현재 상태 배지 */}
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999,
                              fontSize: '0.72rem', fontWeight: 700,
                              background: sc.bg, color: sc.color,
                            }}>
                              {STATUS_LABEL[app.status] ?? app.status}
                            </span>
                          </td>

                          {/* 상태 변경 버튼 그룹 */}
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {/* 출근확정 버튼 — applied 상태일 때만 활성 */}
                              {app.status === 'applied' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => {
                                    // 출근일 입력 받기 (오늘 날짜를 기본값으로)
                                    const today = new Date().toISOString().slice(0, 10)
                                    const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                    if (workDate === null) return  // 취소 시 중단
                                    handleUpdateStatus(app.id, 'confirmed', workDate || today)
                                  }}
                                  style={{
                                    padding: '3px 10px', borderRadius: 8, border: 'none',
                                    background: 'rgba(49,200,100,0.15)', color: '#3fc878',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: isUpdating ? 0.5 : 1,
                                  }}
                                >
                                  출근확정
                                </button>
                              )}

                              {/* 출근완료 버튼 — confirmed 상태일 때만 활성 */}
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
                                >
                                  출근완료
                                </button>
                              )}

                              {/* 취소 버튼 — completed/cancelled 제외 */}
                              {app.status !== 'completed' && app.status !== 'cancelled' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                                  style={{
                                    padding: '3px 10px', borderRadius: 8, border: 'none',
                                    background: 'rgba(240,68,82,0.12)', color: '#f04452',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: isUpdating ? 0.5 : 1,
                                  }}
                                >
                                  취소
                                </button>
                              )}

                              {/* 최종 처리 완료 표시 */}
                              {(app.status === 'completed' || app.status === 'cancelled') && (
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

      {/* ── 공고 추가/수정 모달 ── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16162a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: 28, width: '100%', maxWidth: 560,
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800 }}>
              {editTarget ? '공고 수정' : '새 공고 추가'}
            </h3>

            {/* 공고 등록 안내 박스 */}
            <div style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 18,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 5, color: '#fbbf24', fontSize: '0.82rem' }}>
                📋 공고 등록 안내
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                <div>• 회사명에 [플랫폼명] + 지역 + 직종을 포함하면 검색 노출이 잘 됩니다</div>
                <div>• 외부 링크는 지원자가 바로 지원할 수 있는 URL을 넣어주세요</div>
                <div>• 공고는 등록 즉시 앱에 반영됩니다</div>
              </div>
            </div>

            {/* 회사/플랫폼 + 센터명 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>회사/플랫폼 *</span>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="예: 쿠팡풀필먼트서비스, CJ대한통운, 컬리" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>센터명 / 직종</span>
                <input value={form.center_name} onChange={e => setForm(f => ({ ...f, center_name: e.target.value }))}
                  placeholder="예: 부천 물류센터 야간" style={inputStyle} />
              </label>
            </div>
            {/* 회사 입력 도움말 */}
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: '4px 0 14px' }}>
              쿠팡FLC / 쿠팡이츠 등 플랫폼명을 정확히 입력해주세요
            </p>

            {/* 지역 */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelSpan}>지역 *</span>
              <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder="예: 경기 부천시, 서울 송파구" style={inputStyle} />
            </label>

            {/* 시급 + 일급 + 인원 + 근무시간 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>시급 (원)</span>
                <input type="number" value={form.hourly_wage || ''} onChange={e => setForm(f => ({ ...f, hourly_wage: parseInt(e.target.value) || 0 }))}
                  placeholder="예: 12000" style={inputStyle} />
              </label>
              {/* 일급: 시급 × 근무시간 계산 없이 직접 입력 (예: 일당 계약직인 경우) */}
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>일급 (원)</span>
                <input type="number" value={form.daily_wage || ''} onChange={e => setForm(f => ({ ...f, daily_wage: parseInt(e.target.value) || 0 }))}
                  placeholder="예: 130000" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>모집인원</span>
                <input type="number" value={form.headcount || ''} onChange={e => setForm(f => ({ ...f, headcount: parseInt(e.target.value) || 0 }))}
                  placeholder="예: 00명" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>근무시간</span>
                <input value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))}
                  placeholder="야간 22:00~06:00" style={inputStyle} />
              </label>
            </div>

            {/* 공고 내용/상세 */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelSpan}>공고 내용 / 상세</span>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="근무 조건, 우대사항, 복리후생 등 상세 내용 입력" style={{ ...inputStyle, resize: 'vertical' as const }} />
            </label>

            {/* 연락처 + 외부링크 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>연락처</span>
                <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  placeholder="010-1234-5678" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>원본 공고 URL</span>
                <input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                  placeholder="쿠팡알바, 잡코리아, 사람인 등 원본 공고 URL 붙여넣기" style={inputStyle} />
              </label>
            </div>
            {/* 외부 링크 도움말 */}
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: '4px 0 14px' }}>
              선택 입력 — 지원 링크가 없으면 비워두세요
            </p>

            {/* 마감일 + 긴급 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>공고 마감일 <span style={{ color: '#f04452' }}>*</span></span>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  required style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={labelSpan}>긴급</span>
                <div onClick={() => setForm(f => ({ ...f, is_urgent: !f.is_urgent }))} style={{
                  width: 44, height: 26, borderRadius: 999,
                  background: form.is_urgent ? '#f04452' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: form.is_urgent ? 21 : 3, transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            </div>

            {/* 저장 오류 표시 */}
            {jobError && (
              <div style={{
                background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                color: '#ff6b6b', fontSize: '0.8rem',
              }}>
                ⚠️ {jobError}
              </div>
            )}

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}>취소</button>
              <button onClick={handleSave}
                disabled={saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at
                    ? 'rgba(49,130,246,0.3)' : '#3182f6',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
