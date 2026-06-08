// 어드민 — 지원자 관리 전용 메뉴 (Phase C)
// 기능: LMS형 필터(사업장/공고/근무일자/업무/사용자ID/사용자명), 상태변경, 대량 처리, CSV 내보내기
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 지원자 한 행의 타입 ──
interface ApplicationRow {
  id: string
  user_id: string
  job_posting_id: string
  status: 'applied' | 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  applied_at: string
  work_date: string | null
  applicant_name: string | null
  applicant_birth: string | null
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  consent_collect: boolean | null
  consent_third_party: boolean | null
  preferred_shift: string | null  // 교대 구분: morning|afternoon|night|any
  applied_task: string | null     // 지원 업무 (단일 텍스트)
  job_postings?: { company_name: string; center_name: string } | null
  profiles?: { full_name: string | null; email: string | null } | null
}

// 상태별 한국어 레이블
const STATUS_LABEL: Record<string, string> = {
  applied:   '지원완료',
  reviewing: '검토중',
  confirmed: '출근확정',
  completed: '출근완료',
  cancelled: '취소',
  rejected:  '지원거절',
}

// 상태별 색상
const statusColor = (status: string) => {
  if (status === 'confirmed') return { bg: 'rgba(49,200,100,0.18)', color: '#3fc878' }
  if (status === 'reviewing') return { bg: 'rgba(255,180,0,0.18)',  color: '#ffb400' }
  if (status === 'completed') return { bg: '#f1f5f9', color: '#64748b' }
  if (status === 'cancelled') return { bg: 'rgba(240,68,82,0.18)',  color: '#f04452' }
  if (status === 'rejected')  return { bg: 'rgba(240,68,82,0.25)',  color: '#ff4d4d' }
  return { bg: 'rgba(49,130,246,0.18)', color: '#3182f6' }  // applied
}

// 휴대폰 번호 마스킹
function maskPhone(phone: string): string {
  const nums = phone.replace(/\D/g, '')
  if (nums.length < 10) return phone
  return `${nums.slice(0, 3)}-****-${nums.slice(-4)}`
}

// 공통 셀렉트/인풋 스타일 (라이트 모드)
const filterSelectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff', color: '#0f172a',
  fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
}
const filterInputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff', color: '#0f172a',
  fontSize: '0.82rem', outline: 'none',
  minWidth: 110,
}

export default function ApplicantsMenu() {
  // 지원자 목록 상태
  const [applicants, setApplicants] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── 서버사이드 필터 상태 ──
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [jobFilter, setJobFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ── LMS형 클라이언트사이드 필터 상태 ──
  const [shiftFilter, setShiftFilter] = useState('')   // 교대근무 (preferred_shift: morning|오전 등) 검색
  const [taskFilter,  setTaskFilter]  = useState('')   // 업무 (applied_task 단일 텍스트) 검색
  const [phoneFilter, setPhoneFilter] = useState('')   // 사용자ID (휴대폰번호) 검색
  const [nameFilter,  setNameFilter]  = useState('')   // 사용자명 (성명) 검색

  // 대량 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 상태 변경 진행 중 ID
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  // 토스트 알림
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 공고 목록 (필터 드롭다운용)
  const [jobs, setJobs] = useState<{ id: string; company_name: string; center_name: string }[]>([])
  const [companies, setCompanies] = useState<string[]>([])

  // 공고 목록 로드
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('id, company_name, center_name')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
      const list = (data ?? []) as { id: string; company_name: string; center_name: string }[]
      setJobs(list)
      const uniqueCompanies = [...new Set(list.map(j => j.company_name).filter(Boolean))]
      setCompanies(uniqueCompanies)
    })()
  }, [])

  // 지원자 목록 로드 (서버사이드 필터만 적용)
  const fetchApplicants = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('job_applications')
        .select('*, job_postings(company_name, center_name)')
        .order('applied_at', { ascending: false })

      // 사업장 필터 — 해당 사업장 공고 ID 목록으로 필터
      if (companyFilter !== 'all') {
        const companyJobIds = jobs
          .filter(j => j.company_name === companyFilter)
          .map(j => j.id)
        if (companyJobIds.length > 0) {
          query = query.in('job_posting_id', companyJobIds)
        }
      }

      // 공고별 필터
      if (jobFilter) query = query.eq('job_posting_id', jobFilter)

      // 상태 필터
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []) as ApplicationRow[]

      // profiles 별도 조회 + 병합 (RLS 분리)
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
      setSelectedIds(new Set())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '지원자 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [companyFilter, jobFilter, statusFilter, jobs])

  useEffect(() => {
    if (jobs.length > 0 || companyFilter === 'all') {
      fetchApplicants()
    }
  }, [fetchApplicants, jobs.length, companyFilter])

  // 클라이언트사이드 필터 적용 (서버필터 후 추가 정제)
  const displayApplicants = applicants.filter(app => {
    // preferred_shift는 영문 enum (morning|afternoon|night|any) — 부분 일치 검색
    if (shiftFilter && !app.preferred_shift?.toLowerCase().includes(shiftFilter.toLowerCase())) return false
    // applied_task는 단일 텍스트 컬럼
    if (taskFilter  && !app.applied_task?.toLowerCase().includes(taskFilter.toLowerCase())) return false
    if (phoneFilter && !app.applicant_phone?.includes(phoneFilter)) return false
    if (nameFilter  && !app.applicant_name?.toLowerCase().includes(nameFilter.toLowerCase())) return false
    return true
  })

  // 단건 상태 변경
  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected',
    workDate?: string
  ) => {
    if (!supabase || updatingId) return
    setUpdatingId(appId)
    try {
      const payload: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'confirmed' && workDate) payload.work_date = workDate

      const { error } = await supabase
        .from('job_applications')
        .update(payload)
        .eq('id', appId)
      if (error) throw error

      // 출근확정 / 거절 시 사용자에게 알림 발송
      if (newStatus === 'confirmed' || newStatus === 'rejected') {
        const app = applicants.find(a => a.id === appId)
        if (app?.user_id && supabase) {
          await supabase.from('notifications').insert({
            user_id: app.user_id,
            type:    newStatus === 'confirmed' ? 'application_confirmed' : 'application_rejected',
            title:   newStatus === 'confirmed' ? '출근이 확정됐어요! 🎉' : '지원이 거절됐습니다',
            body:    newStatus === 'confirmed'
              ? `출근 예정일: ${workDate ?? '미정'} — 준비물을 챙기고 건강하게 출근하세요!`
              : '아쉽지만 이번 공고는 어렵게 됐습니다. 다른 공고를 확인해보세요.',
            metadata: { application_id: appId, job_posting_id: app.job_posting_id },
          })
        }
      }

      await fetchApplicants()
      const msgs: Record<string, string> = {
        reviewing: '🔍 검토중으로 변경됐습니다.',
        confirmed: '✅ 출근 확정 처리됐습니다.',
        completed: '✅ 출근 완료로 변경됐습니다.',
        cancelled: '✅ 취소 처리됐습니다.',
        rejected:  '❌ 지원 거절 처리됐습니다.',
      }
      setToast({ msg: msgs[newStatus] ?? '✅ 상태 변경됐습니다.', type: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '상태 변경에 실패했습니다.'
      setToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  // 대량 상태 변경 (체크박스 선택 기반)
  const handleBulkUpdate = async (newStatus: 'reviewing' | 'confirmed' | 'rejected') => {
    if (!supabase || selectedIds.size === 0 || bulkUpdating) return
    if (!window.confirm(`선택된 ${selectedIds.size}명을 "${STATUS_LABEL[newStatus]}"로 변경할까요?`)) return

    setBulkUpdating(true)
    try {
      const ids = [...selectedIds]
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .in('id', ids)
      if (error) throw error

      // 확정/거절 시 알림 일괄 발송
      if (newStatus === 'confirmed' || newStatus === 'rejected') {
        const targets = applicants.filter(a => selectedIds.has(a.id))
        const notifications = targets
          .filter(a => a.user_id)
          .map(a => ({
            user_id:  a.user_id,
            type:     newStatus === 'confirmed' ? 'application_confirmed' : 'application_rejected',
            title:    newStatus === 'confirmed' ? '출근이 확정됐어요! 🎉' : '지원이 거절됐습니다',
            body:     newStatus === 'confirmed'
              ? '출근 일정을 확인하고 준비하세요!'
              : '아쉽지만 이번 공고는 어렵게 됐습니다.',
            metadata: { job_posting_id: a.job_posting_id },
          }))
        if (notifications.length > 0 && supabase) {
          await supabase.from('notifications').insert(notifications)
        }
      }

      await fetchApplicants()
      setToast({ msg: `✅ ${ids.length}명 ${STATUS_LABEL[newStatus]} 처리됐습니다.`, type: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '대량 처리에 실패했습니다.'
      setToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setBulkUpdating(false)
    }
  }

  // 체크박스 전체 선택/해제 (현재 표시된 행 기준)
  const toggleSelectAll = () => {
    if (selectedIds.size === displayApplicants.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayApplicants.map(a => a.id)))
    }
  }

  // CSV 내보내기 (현재 필터 적용 목록 기준 + 제3자 동의 + 인적사항 입력 건)
  const handleExportCsv = () => {
    // displayApplicants: LMS 필터(교대/업무/사용자명 등) 적용된 현재 화면 목록
    const filtered = displayApplicants.filter(a => a.consent_third_party === true && a.applicant_name)
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
      STATUS_LABEL[a.status] ?? a.status,
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

  // 테이블 스타일 상수 (라이트 모드)
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
    fontSize: '0.83rem', color: '#334155', verticalAlign: 'middle',
  }
  const thStyle: React.CSSProperties = {
    ...cellStyle, color: '#64748b', fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: 280, maxWidth: 420, padding: '12px 20px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          {/* 흰색 타이틀 */}
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>👥 지원자 관리</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            지원자 상태를 검토중 → 출근확정 순으로 처리하세요. 총 {displayApplicants.length}명
          </p>
        </div>
        <button onClick={handleExportCsv}
          style={{
            padding: '7px 16px', borderRadius: 10, border: '1px solid #bbf7d0',
            background: '#f0fdf4', color: '#059669',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
          📥 CSV 다운로드
        </button>
      </div>

      {/* ── LMS형 필터 2행×3열 그리드 ── */}
      {/* 1행: [사업장][공고][교대] / 2행: [업무][사용자ID][사용자명] */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: 8,
      }}>

        {/* 1행 1열: 사업장 선택 (job_postings DISTINCT company_name) */}
        <select
          value={companyFilter}
          onChange={e => { setCompanyFilter(e.target.value); setJobFilter('') }}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="all" style={{ background: '#fff' }}>사업장 전체</option>
          {companies.map(c => (
            <option key={c} value={c} style={{ background: '#fff' }}>{c}</option>
          ))}
        </select>

        {/* 1행 2열: 공고 선택 (선택한 사업장의 공고 목록) */}
        <select
          value={jobFilter}
          onChange={e => setJobFilter(e.target.value)}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="" style={{ background: '#fff' }}>공고 전체</option>
          {(companyFilter === 'all'
            ? jobs
            : jobs.filter(j => j.company_name === companyFilter)
          ).map(job => (
            <option key={job.id} value={job.id} style={{ background: '#fff' }}>
              {job.company_name} {job.center_name}
            </option>
          ))}
        </select>

        {/* 1행 3열: 교대근무 — preferred_shift enum(morning/afternoon/night/any) select */}
        <select
          value={shiftFilter}
          onChange={e => setShiftFilter(e.target.value)}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="" style={{ background: '#fff' }}>교대 전체</option>
          <option value="morning"   style={{ background: '#fff' }}>오전(morning)</option>
          <option value="afternoon" style={{ background: '#fff' }}>오후(afternoon)</option>
          <option value="night"     style={{ background: '#fff' }}>야간(night)</option>
          <option value="any"       style={{ background: '#fff' }}>무관(any)</option>
        </select>

        {/* 2행 1열: 업무 — applied_task 단일 텍스트 검색 */}
        <input
          type="text"
          value={taskFilter}
          onChange={e => setTaskFilter(e.target.value)}
          placeholder="업무"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />

        {/* 2행 2열: 사용자ID — 휴대폰번호 검색 */}
        <input
          type="text"
          value={phoneFilter}
          onChange={e => setPhoneFilter(e.target.value)}
          placeholder="사용자ID(휴대폰)"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />

        {/* 2행 3열: 사용자명 — 성명 검색 */}
        <input
          type="text"
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          placeholder="사용자명"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />
      </div>

      {/* 클라이언트 필터 초기화 버튼 (하단 배치) */}
      {(shiftFilter || taskFilter || phoneFilter || nameFilter) && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => { setShiftFilter(''); setTaskFilter(''); setPhoneFilter(''); setNameFilter('') }}
            style={{
              padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            ✕ 초기화
          </button>
        </div>
      )}

      {/* 상태 필터 (pill 버튼 — 2번째 줄) */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'applied', 'reviewing', 'confirmed', 'completed', 'cancelled', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: '4px 12px', borderRadius: 999, border: 'none',
              background: statusFilter === s ? '#3182f6' : '#f1f5f9',
              color: statusFilter === s ? '#fff' : '#64748b',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 대량 처리 바 (1명 이상 선택 시 표시) */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(49,130,246,0.12)', border: '1px solid rgba(49,130,246,0.25)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3182f6' }}>
            {selectedIds.size}명 선택됨
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleBulkUpdate('reviewing')} disabled={bulkUpdating}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(255,180,0,0.15)', color: '#ffb400',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              🔍 일괄 검토중
            </button>
            <button onClick={() => handleBulkUpdate('confirmed')} disabled={bulkUpdating}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(49,200,100,0.15)', color: '#3fc878',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              ✅ 일괄 확정
            </button>
            <button onClick={() => handleBulkUpdate('rejected')} disabled={bulkUpdating}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(240,68,82,0.15)', color: '#f04452',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              ✕ 일괄 거절
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())}
            style={{
              marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b',
              fontSize: '0.75rem', cursor: 'pointer',
            }}>
            선택 해제
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          color: '#ff6b6b', fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(null); fetchApplicants() }}
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            다시 시도 ↻
          </button>
        </div>
      )}

      {/* 지원자 테이블 */}
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {/* 전체 선택 체크박스 */}
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={displayApplicants.length > 0 && selectedIds.size === displayApplicants.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th style={thStyle}>지원자 정보</th>
                  <th style={thStyle}>인적사항</th>
                  <th style={thStyle}>공고</th>
                  <th style={{ ...thStyle, width: 80 }}>지원일</th>
                  <th style={{ ...thStyle, width: 90 }}>상태</th>
                  <th style={{ ...thStyle, width: 240 }}>상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {displayApplicants.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8' }}>
                      지원자가 없습니다.
                    </td>
                  </tr>
                )}
                {displayApplicants.map(app => {
                  const sc = statusColor(app.status)
                  const isUpdating = updatingId === app.id
                  const isSelected = selectedIds.has(app.id)
                  return (
                    <tr key={app.id} style={{ background: isSelected ? 'rgba(49,130,246,0.06)' : undefined }}>
                      {/* 체크박스 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (next.has(app.id)) next.delete(app.id)
                              else next.add(app.id)
                              return next
                            })
                          }}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>

                      {/* 지원자 계정 정보 */}
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {app.profiles?.full_name ?? '이름 없음'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 1 }}>
                          {app.profiles?.email ?? '-'}
                        </div>
                      </td>

                      {/* 인적사항 (지원 폼에서 입력한 실제 정보) */}
                      <td style={cellStyle}>
                        {app.applicant_name ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                              {app.applicant_name}
                              <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 4 }}>
                                {app.applicant_gender === 'male' ? '남' : app.applicant_gender === 'female' ? '여' : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 1 }}>
                              {app.applicant_birth ? app.applicant_birth.slice(0, 10) : '-'}
                              {' · '}
                              {app.applicant_phone ? maskPhone(app.applicant_phone) : '-'}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>미입력</span>
                        )}
                      </td>

                      {/* 공고 정보 */}
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{app.job_postings?.company_name ?? '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {app.job_postings?.center_name ?? ''}
                        </div>
                      </td>

                      {/* 지원일 */}
                      <td style={cellStyle}>
                        {new Date(app.applied_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </td>

                      {/* 현재 상태 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999,
                          fontSize: '0.72rem', fontWeight: 700,
                          background: sc.bg, color: sc.color,
                        }}>
                          {STATUS_LABEL[app.status] ?? app.status}
                        </span>
                        {/* 출근 예정일 표시 (확정 이후) */}
                        {app.work_date && (app.status === 'confirmed' || app.status === 'completed') && (
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
                            {app.work_date}
                          </div>
                        )}
                      </td>

                      {/* 상태 변경 버튼 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>

                          {/* applied → reviewing 또는 confirmed/rejected */}
                          {app.status === 'applied' && (
                            <>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'reviewing')}
                                style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(255,180,0,0.15)', color: '#ffb400', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                🔍 검토
                              </button>
                              <button disabled={isUpdating}
                                onClick={() => {
                                  const today = new Date().toISOString().slice(0, 10)
                                  const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                  if (workDate !== null) handleUpdateStatus(app.id, 'confirmed', workDate)
                                }}
                                style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(49,200,100,0.15)', color: '#3fc878', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✓ 확정
                              </button>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(240,68,82,0.15)', color: '#f04452', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✕ 거절
                              </button>
                            </>
                          )}

                          {/* reviewing → confirmed/rejected */}
                          {app.status === 'reviewing' && (
                            <>
                              <button disabled={isUpdating}
                                onClick={() => {
                                  const today = new Date().toISOString().slice(0, 10)
                                  const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                  if (workDate !== null) handleUpdateStatus(app.id, 'confirmed', workDate)
                                }}
                                style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(49,200,100,0.15)', color: '#3fc878', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✓ 확정
                              </button>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(240,68,82,0.15)', color: '#f04452', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✕ 거절
                              </button>
                            </>
                          )}

                          {/* confirmed → completed */}
                          {app.status === 'confirmed' && (
                            <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'completed')}
                              style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                              출근완료
                            </button>
                          )}

                          {/* confirmed/reviewing → cancelled */}
                          {(app.status === 'confirmed' || app.status === 'reviewing') && (
                            <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                              style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                              취소
                            </button>
                          )}

                          {/* 최종 처리된 상태 표시 */}
                          {(app.status === 'completed' || app.status === 'cancelled' || app.status === 'rejected') && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>처리완료</span>
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
    </div>
  )
}
