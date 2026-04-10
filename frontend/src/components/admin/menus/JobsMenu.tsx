// 관리자 — 채용공고 관리 메뉴
// [공고 목록] 탭: 공고 CRUD (추가/수정/삭제/긴급 토글)
// [지원자 관리] 탭: 공고별 지원자 목록 조회 + 출근확정/지원거절/취소 처리 + xlsx 다운로드
// [📊 확정 현황] 탭: 센터별 지원/확정/거절 현황 대시보드
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import type { JobPosting } from '../../../types/supabase'

// ── 공고 등록/수정 폼 타입 ──
// A-3: section 3종 추가 (today-urgent | tomorrow-urgent | always)
// A-4: benefits 복리후생 태그 배열 추가
// A-5: task_options 지원자 선택 업무 배열 추가 (2026-04-11)
// A-6: work_date 근무 예정일 추가 (2026-04-11, 중복 확정 차단 기준)
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
  section: 'today-urgent' | 'tomorrow-urgent' | 'always'  // A-3: 섹션 3종
  benefits: string[]   // A-4: 복리후생 태그
  task_options: string[]  // A-5: 지원자 선택 업무 종류 목록
  work_date: string    // A-6: 근무 예정일 (YYYY-MM-DD, 빈 문자열이면 미지정)
  expires_at: string
}

const defaultForm: JobForm = {
  company_name: '', center_name: '', region: '',
  headcount: 0, hourly_wage: 0, daily_wage: 0, work_hours: '',
  description: '', contact_phone: '', external_link: '',
  is_urgent: false, section: 'always', benefits: [],
  task_options: ['상차', '하차', '분류', '피킹', '포장'],  // 기본 업무 옵션
  work_date: '',
  expires_at: '',
}

// ── 지원자 한 행의 타입 (job_postings JOIN 포함) ──
interface ApplicationRow {
  id: string
  user_id: string
  job_posting_id: string
  // 'rejected' 추가: DB 마이그레이션(20260410_job_applications_rejected.sql)과 연동
  status: 'applied' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  applied_at: string
  work_date: string | null
  // D-NEW-3: 지원 시점 직접 입력한 인적사항
  applicant_name: string | null
  applicant_birth: string | null   // YYYY-MM-DD
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  consent_collect: boolean | null
  consent_third_party: boolean | null
  // JOIN된 공고 정보
  job_postings?: {
    company_name: string
    center_name: string
  } | null
  // JOIN된 프로필 정보 (이름/이메일) — LEFT JOIN으로 조회해 RLS 오류 방지
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
  rejected: '지원거절',  // REQ7: 거절 상태 추가
}

export default function JobsMenu() {
  const { user } = useAuth()

  // ── 상위 탭: 공고 목록 / 지원자 관리 / 확정 현황 ──
  const [mainTab, setMainTab] = useState<'jobs' | 'applicants' | 'dashboard'>('jobs')

  // ── 인라인 토스트 (성공/에러 메시지) ──
  // react-hot-toast 미사용 — 경량 커스텀 구현
  const [adminToast, setAdminToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  // 토스트 자동 소멸 (3초)
  useEffect(() => {
    if (!adminToast) return
    const t = setTimeout(() => setAdminToast(null), 3000)
    return () => clearTimeout(t)
  }, [adminToast])

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
  // REQ10: 5단계 폼 — 현재 단계 (1~5)
  // 1=기본정보, 2=근무조건, 3=상세/자격, 4=미리보기, 5=발행
  const [formStep, setFormStep] = useState(1)
  // 공고 상태 필터: 전체/active/expired/deleted
  const [statusFilter, setStatusFilter] = useState<string>('all')
  // REQ5: 검색 키워드 (회사명/센터명/지역 필터링)
  const [jobSearch, setJobSearch] = useState<string>('')

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
  // REQ6: 지원자 조회 에러를 UI에 표시하기 위한 state
  const [appError, setAppError] = useState<string | null>(null)

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
  // job_applications + job_postings 2-way JOIN 후
  // profiles는 user_id 배열로 별도 조회 후 클라이언트 병합
  // (job_applications.user_id FK가 auth.users 참조라 PostgREST 직접 JOIN 불가)
  // ───────────────────────────────────────
  const fetchApplicants = useCallback(async () => {
    if (!supabase) return
    setAppLoading(true)
    setAppError(null)  // 재조회 시 이전 에러 초기화
    try {
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          job_postings (
            company_name,
            center_name
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
      if (error) throw error

      const rows = (data ?? []) as ApplicationRow[]

      // profiles 별도 조회 후 user_id 기준으로 병합
      const userIds = [...new Set(rows.map(r => r.user_id))]
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        const profileMap = Object.fromEntries(
          (profileData ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
        )
        rows.forEach(r => {
          r.profiles = profileMap[r.user_id] ?? null
        })
      }

      setApplicants(rows)
    } catch (err: unknown) {
      // REQ6: 에러를 console 대신 UI에 표시
      const msg = err instanceof Error ? err.message : '지원자 목록을 불러오지 못했습니다.'
      setAppError(msg)
      console.error('[지원자 목록 조회 오류]', err)
    } finally {
      setAppLoading(false)
    }
  }, [appJobFilter, appStatusFilter])

  // 지원자 탭으로 전환하거나 필터 변경 시 재조회
  useEffect(() => {
    if (mainTab === 'applicants') fetchApplicants()
  }, [mainTab, appJobFilter, appStatusFilter])

  // ───────────────────────────────────────
  // 공고 관리 핸들러
  // ───────────────────────────────────────

  // 새 공고 추가 모달 열기 (REQ10: formStep 1로 초기화)
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setFormStep(1)
    setModalOpen(true)
  }

  // 수정 모달 열기 (REQ10: 수정 시에는 단계 없이 전체 폼 표시 → step=0 사용)
  // A-3/A-4/A-5/A-6: section + benefits + task_options + work_date도 함께 로드
  const openEdit = (job: JobPosting) => {
    setEditTarget(job)
    setFormStep(0)  // 0 = 단계 없이 전체 폼 (수정 시)
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
        : ['상차', '하차', '분류', '피킹', '포장'],  // 없으면 기본값
      work_date: job.work_date ?? '',
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
        daily_wage: form.daily_wage,
        work_hours: form.work_hours.trim(),
        description: form.description.trim(),
        contact_phone: form.contact_phone.trim(),
        external_link: form.external_link.trim(),
        is_urgent: form.section === 'today-urgent' || form.section === 'tomorrow-urgent',  // A-3: section → is_urgent 연동
        section: form.section,        // A-3: 섹션 3종 저장
        benefits: form.benefits,      // A-4: 복리후생 배열 저장
        task_options: form.task_options.length > 0
          ? form.task_options
          : ['상차', '하차', '분류', '피킹', '포장'],  // A-5: 업무 옵션 (비어있으면 기본값)
        work_date: form.work_date || null,              // A-6: 근무 예정일 (빈 문자열이면 null)
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
      // REQ4: 저장 성공 토스트
      setAdminToast({ msg: editTarget ? '✅ 공고가 수정됐습니다.' : '✅ 새 공고가 등록됐습니다.', type: 'success' })
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : '저장에 실패했습니다. RLS 정책 또는 컬럼명을 확인하세요.')
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
      setJobError(error.message)
      setAdminToast({ msg: '❌ 긴급 토글 실패', type: 'error' })
    } else {
      fetchJobs()
      setAdminToast({ msg: job.is_urgent ? '✅ 긴급 해제됨' : '🚨 긴급 공고로 설정됨', type: 'success' })
    }
  }

  // 삭제 (soft delete → status = 'deleted')
  const handleDelete = async (job: JobPosting) => {
    if (!window.confirm(`"${job.company_name} ${job.center_name}" 공고를 삭제할까요?`)) return
    if (!supabase) return
    const { error } = await supabase.from('job_postings')
      .update({ status: 'deleted' })
      .eq('id', job.id)
    if (error) {
      setJobError(error.message)
      setAdminToast({ msg: '❌ 삭제 실패: ' + error.message, type: 'error' })
    } else {
      fetchJobs()
      setAdminToast({ msg: '🗑️ 공고가 삭제됐습니다.', type: 'success' })
    }
  }

  // ───────────────────────────────────────
  // 지원자 상태 변경 핸들러
  // ───────────────────────────────────────

  // 지원자 상태 변경 (어드민이 직접 처리)
  // REQ7: 'rejected' 상태 추가, notifications 테이블에 알림 기록
  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled' | 'rejected',
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

      // REQ7: 출근확정 또는 지원거절 시 notifications 테이블에 알림 기록
      // 사용자가 마이페이지에서 실시간으로 확인 가능 (Realtime 구독)
      if (newStatus === 'confirmed' || newStatus === 'rejected') {
        // 지원자 user_id 조회
        const app = applicants.find(a => a.id === appId)
        if (app?.user_id) {
          const notifTitle = newStatus === 'confirmed' ? '출근이 확정됐어요! 🎉' : '지원이 거절됐습니다'
          const notifBody = newStatus === 'confirmed'
            ? `출근 예정일: ${workDate ?? '미정'} — 준비물을 챙기고 건강하게 출근하세요!`
            : '아쉽지만 이번 공고는 어렵게 됐습니다. 다른 공고를 확인해보세요.'
          // notifications 테이블 insert (마이그레이션으로 생성된 테이블)
          await supabase.from('notifications').insert({
            user_id: app.user_id,
            type: newStatus === 'confirmed' ? 'application_confirmed' : 'application_rejected',
            title: notifTitle,
            body: notifBody,
            metadata: { application_id: appId, job_posting_id: app.job_posting_id },
          })
        }
      }

      // 목록 즉시 갱신
      await fetchApplicants()

      // REQ4: 상태 변경 성공 토스트
      const toastMsgs: Record<string, string> = {
        confirmed: '✅ 출근 확정 처리됐습니다.',
        completed: '✅ 출근 완료로 변경됐습니다.',
        cancelled: '✅ 취소 처리됐습니다.',
        rejected: '❌ 지원 거절 처리됐습니다.',
      }
      setAdminToast({ msg: toastMsgs[newStatus] ?? '✅ 상태가 변경됐습니다.', type: 'success' })
    } catch (err) {
      // REQ4: 에러를 console 대신 toast로 표시
      const msg = err instanceof Error ? err.message : '상태 변경에 실패했습니다.'
      setAdminToast({ msg: '❌ ' + msg, type: 'error' })
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

  // 지원자 상태 배지 색상 (REQ7: 'rejected' 색상 추가)
  const appStatusColor = (status: string) => {
    if (status === 'confirmed') return { bg: 'rgba(49,200,100,0.18)', color: '#3fc878' }
    if (status === 'completed') return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
    if (status === 'cancelled') return { bg: 'rgba(240,68,82,0.18)', color: '#f04452' }
    if (status === 'rejected') return { bg: 'rgba(240,68,82,0.25)', color: '#ff4d4d' }
    return { bg: 'rgba(49,130,246,0.18)', color: '#3182f6' }  // applied
  }

  // ── REQ9: 확정 현황 대시보드 데이터 집계 ──
  // applicants 배열에서 센터별로 지원/확정/거절 수 집계
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

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)', position: 'relative' }}>

      {/* ── 인라인 토스트 (REQ4) — 성공/에러 알림 ── */}
      {adminToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: 280, maxWidth: 420,
          padding: '12px 20px', borderRadius: 12,
          background: adminToast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {adminToast.msg}
        </div>
      )}

      {/* ── 상위 탭: 공고 목록 / 지원자 관리 / 확정 현황 ── */}
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

          {/* 공고 필터 바: 상태 탭 + 검색 (REQ5) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {/* 검색 input — 회사명/센터명/지역 클라이언트 사이드 필터 */}
            <input
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
              placeholder="🔍 회사명·센터명·지역 검색"
              style={{
                padding: '5px 14px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: '#fff',
                fontSize: '0.78rem', outline: 'none', minWidth: 200,
              }}
            />
          </div>

          {/* 공고 카드 그리드 (REQ5 — 구식 테이블 대신 카드 기반 UI) */}
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : (() => {
            // 검색어 필터링 (클라이언트 사이드)
            const filtered = jobSearch.trim()
              ? jobs.filter(j =>
                  `${j.company_name} ${j.center_name} ${j.region}`.toLowerCase()
                    .includes(jobSearch.toLowerCase()))
              : jobs
            return filtered.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                공고가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {filtered.map(job => (
                  <div key={job.id} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${job.is_urgent ? 'rgba(240,68,82,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '16px 18px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {/* 카드 상단: 긴급 배지 + 상태 배지 */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {job.is_urgent && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800,
                          background: 'rgba(240,68,82,0.2)', color: '#f04452',
                        }}>🚨 급구</span>
                      )}
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                        background: job.status === 'active' ? 'rgba(49,200,100,0.18)' : job.status === 'expired' ? 'rgba(255,180,0,0.18)' : 'rgba(255,255,255,0.08)',
                        color: job.status === 'active' ? '#3fc878' : job.status === 'expired' ? '#ffb400' : 'rgba(255,255,255,0.35)',
                      }}>
                        {job.status === 'active' ? '활성' : job.status === 'expired' ? '만료' : '삭제'}
                      </span>
                    </div>

                    {/* 회사명 + 센터명 */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{job.company_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{job.center_name}</div>
                    </div>

                    {/* 시급/일급 + 지역 */}
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                      <span style={{ color: '#3182f6', fontWeight: 700 }}>시 {fmtWage(job.hourly_wage)}</span>
                      {job.daily_wage ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>일 {fmtWage(job.daily_wage)}</span> : null}
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>📍 {job.region}</span>
                    </div>

                    {/* 인원 + 마감일 */}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 12 }}>
                      <span>👥 {job.headcount}명</span>
                      <span>📅 마감 {job.expires_at ?? '미정'}</span>
                    </div>

                    {/* 관리 버튼 그룹 */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(job)} style={{
                        flex: 1, padding: '5px 0', borderRadius: 8, border: 'none',
                        background: 'rgba(49,130,246,0.15)', color: '#3182f6',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      }}>수정</button>
                      <button
                        onClick={() => handleToggleUrgent(job)}
                        style={{
                          flex: 1, padding: '5px 0', borderRadius: 8, border: 'none',
                          background: job.is_urgent ? 'rgba(240,68,82,0.15)' : 'rgba(255,180,0,0.1)',
                          color: job.is_urgent ? '#f04452' : '#ffb400',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >{job.is_urgent ? '급구 해제' : '급구 설정'}</button>
                      {job.status !== 'deleted' && (
                        <button onClick={() => handleDelete(job)} style={{
                          flex: 1, padding: '5px 0', borderRadius: 8, border: 'none',
                          background: 'rgba(240,68,82,0.12)', color: '#f04452',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}>삭제</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}

      {/* ══════════════════════════════════════
          지원자 관리 탭
          — 모든 공고의 지원자를 한눈에 보고
            출근확정 / 출근완료 / 취소 처리
      ══════════════════════════════════════ */}
      {mainTab === 'applicants' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>👥 지원자 관리</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                지원자 상태를 출근확정 → 출근완료 순으로 처리하세요.
              </p>
            </div>
            {/* E-1: 엑셀 다운로드 버튼 — consent_third_party=true 건만 내보내기 */}
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

          {/* REQ6: 지원자 조회 에러 표시 */}
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
                          {/* 지원자 계정 정보 (소셜 로그인 기준) */}
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              {app.profiles?.full_name ?? '이름 없음'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                              {app.profiles?.email ?? '-'}
                            </div>
                          </td>
                          {/* D-NEW-3: 지원 시점 입력한 인적사항 */}
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

                          {/* 상태 변경 버튼 그룹 (REQ7: 지원거절 버튼 추가) */}
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
                                  ✅ 확정
                                </button>
                              )}

                              {/* REQ7: 지원거절 버튼 — applied 상태일 때만 활성 + notifications 트리거 */}
                              {app.status === 'applied' && (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => {
                                    if (!window.confirm('이 지원자를 거절하시겠습니까?')) return
                                    handleUpdateStatus(app.id, 'rejected')
                                  }}
                                  style={{
                                    padding: '3px 10px', borderRadius: 8, border: 'none',
                                    background: 'rgba(240,68,82,0.15)', color: '#f04452',
                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: isUpdating ? 0.5 : 1,
                                  }}
                                >
                                  ✕ 거절
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

                              {/* 취소 버튼 — completed/cancelled/rejected 제외 */}
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
                                >
                                  취소
                                </button>
                              )}

                              {/* 최종 처리 완료 표시 */}
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
            {/* 모달 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {editTarget ? '공고 수정' : '새 공고 추가'}
              </h3>
              {/* REQ10: 신규 등록 시 단계 표시 (수정=formStep 0은 표시 안 함) */}
              {formStep > 0 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(s => (
                    <div key={s} style={{
                      width: s <= formStep ? 20 : 8, height: 8, borderRadius: 999,
                      background: s <= formStep ? '#3182f6' : 'rgba(255,255,255,0.12)',
                      transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* ── 단계 표시 텍스트 (신규 등록만) ── */}
            {formStep > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
                {formStep === 1 && '1단계: 기본 정보'}
                {formStep === 2 && '2단계: 근무 조건'}
                {formStep === 3 && '3단계: 상세 내용 & 연락처'}
                {formStep === 4 && '4단계: 미리보기 확인'}
                {formStep === 5 && '5단계: 발행 설정'}
              </p>
            )}

            {/* ── STEP 1: 기본 정보 (신규 등록) 또는 전체 폼 (수정) ── */}
            {(formStep === 1 || formStep === 0) && (
              <>
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
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: '4px 0 14px' }}>
                  쿠팡FLC / 쿠팡이츠 등 플랫폼명을 정확히 입력해주세요
                </p>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={labelSpan}>지역 *</span>
                  <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    placeholder="예: 경기 부천시, 서울 송파구" style={inputStyle} />
                </label>
              </>
            )}

            {/* ── STEP 2: 근무 조건 ── */}
            {/* A-1: 숫자 입력 spinner 제거 — type=text + inputMode=numeric + 천단위 콤마 파싱 */}
            {(formStep === 2 || formStep === 0) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: 100 }}>
                  <span style={labelSpan}>시급 (원)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9,]*"
                    value={form.hourly_wage ? form.hourly_wage.toLocaleString('ko-KR') : ''}
                    onChange={e => {
                      // 콤마 제거 후 숫자만 추출해 저장
                      const num = parseInt(e.target.value.replace(/,/g, '')) || 0
                      setForm(f => ({ ...f, hourly_wage: num }))
                    }}
                    placeholder="예: 12,000"
                    style={inputStyle}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 100 }}>
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
                <label style={{ flex: 1, minWidth: 80 }}>
                  <span style={labelSpan}>모집인원</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.headcount || ''}
                    onChange={e => {
                      const num = parseInt(e.target.value.replace(/\D/g, '')) || 0
                      setForm(f => ({ ...f, headcount: num }))
                    }}
                    placeholder="예: 10"
                    style={inputStyle}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 100 }}>
                  <span style={labelSpan}>근무시간</span>
                  <input value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))}
                    placeholder="야간 22:00~06:00" style={inputStyle} />
                </label>
              </div>
            )}

            {/* ── STEP 3: 상세 내용 & 연락처 ── */}
            {(formStep === 3 || formStep === 0) && (
              <>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={labelSpan}>공고 내용 / 상세</span>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4} placeholder="근무 조건, 우대사항, 복리후생 등 상세 내용 입력" style={{ ...inputStyle, resize: 'vertical' as const }} />
                </label>
                <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                  <label style={{ flex: 1 }}>
                    <span style={labelSpan}>연락처</span>
                    <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="010-1234-5678" style={inputStyle} />
                  </label>
                  <label style={{ flex: 1 }}>
                    <span style={labelSpan}>원본 공고 URL</span>
                    <input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                      placeholder="쿠팡알바, 잡코리아, 사람인 등 공고 URL" style={inputStyle} />
                  </label>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: '4px 0 14px' }}>
                  선택 입력 — 지원 링크가 없으면 비워두세요
                </p>

                {/* A-4: 복리후생 태그 입력 */}
                <div style={{ marginBottom: 14 }}>
                  <span style={labelSpan}>복리후생 (태그 추가)</span>
                  {/* 미리 정의된 추천 태그 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
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
                            padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: isSelected ? '#3182f6' : 'rgba(255,255,255,0.08)',
                            color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {isSelected ? '✓ ' : '+'}{tag}
                        </button>
                      )
                    })}
                  </div>
                  {/* 직접 입력 필드 */}
                  <BenefitsInput
                    benefits={form.benefits}
                    onChange={b => setForm(f => ({ ...f, benefits: b }))}
                    inputStyle={inputStyle}
                  />
                </div>

                {/* A-5: 지원자 선택 업무 종류 태그 칩 입력 */}
                <div style={{ marginBottom: 14 }}>
                  <span style={labelSpan}>
                    지원자 선택 업무 <span style={{ color: '#f04452' }}>*</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>
                      (지원서 폼 드롭다운에 표시됨)
                    </span>
                  </span>
                  {/* 현재 추가된 업무 칩 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {form.task_options.map(task => (
                      <span
                        key={task}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 999,
                          background: 'rgba(49,130,246,0.18)', color: '#3182f6',
                          fontSize: '0.75rem', fontWeight: 600,
                        }}
                      >
                        {task}
                        {/* X 버튼으로 삭제 */}
                        <button
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            task_options: f.task_options.filter(t => t !== task),
                          }))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#3182f6', padding: 0, lineHeight: 1,
                            fontSize: '0.85rem', fontWeight: 700,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* 태그 칩 직접 입력 컴포넌트 */}
                  <TaskOptionsInput
                    taskOptions={form.task_options}
                    onChange={opts => setForm(f => ({ ...f, task_options: opts }))}
                    inputStyle={inputStyle}
                  />
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    엔터 또는 쉼표로 구분 입력 (예: 상차, 하차, 분류)
                  </p>
                </div>

                {/* A-6: 근무 예정일 */}
                <div style={{ marginBottom: 4 }}>
                  <label>
                    <span style={labelSpan}>
                      근무 예정일
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>
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
              </>
            )}

            {/* ── STEP 4: 미리보기 ── */}
            {formStep === 4 && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '16px 18px', marginBottom: 8,
              }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
                  {form.company_name || '회사명'} — {form.center_name || '센터명'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>📍 {form.region || '지역'}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', marginBottom: 6 }}>
                  {form.hourly_wage ? <span style={{ color: '#3182f6', fontWeight: 700 }}>시 {form.hourly_wage.toLocaleString()}원</span> : null}
                  {form.daily_wage ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>일 {form.daily_wage.toLocaleString()}원</span> : null}
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>👥 {form.headcount}명</span>
                </div>
                {form.work_hours && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>⏰ {form.work_hours}</div>}
                {form.description && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-wrap', marginTop: 8 }}>{form.description}</div>}
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                  {form.contact_phone && <div>📞 {form.contact_phone}</div>}
                  {form.external_link && <div>🔗 {form.external_link}</div>}
                </div>
              </div>
            )}

            {/* ── STEP 5 / 수정 전체폼: 발행 설정 ── */}
            {(formStep === 5 || formStep === 0) && (
              <>
                {/* A-3: 섹션 3종 선택 (라디오 그룹) */}
                <div style={{ marginBottom: 16 }}>
                  <span style={labelSpan}>섹션 구분 <span style={{ color: '#f04452' }}>*</span></span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { value: 'today-urgent',    label: '🔥 오늘 추가모집', color: '#ef4444' },
                      { value: 'tomorrow-urgent', label: '⚡ 내일 긴급모집', color: '#f97316' },
                      { value: 'always',          label: '✅ 상시모집',      color: '#22c55e' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, section: opt.value }))}
                        style={{
                          flex: 1, minWidth: 100, padding: '8px 12px',
                          borderRadius: 10, border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.8rem',
                          background: form.section === opt.value
                            ? `${opt.color}22` : 'rgba(255,255,255,0.05)',
                          color: form.section === opt.value ? opt.color : 'rgba(255,255,255,0.45)',
                          outline: form.section === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* A-2: 공고 마감일 — min=오늘, 달력 아이콘 명시 */}
                <div style={{ marginBottom: 20 }}>
                  <label>
                    <span style={labelSpan}>공고 마감일 <span style={{ color: '#f04452' }}>*</span> <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>(오늘 이후만 선택 가능)</span></span>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={form.expires_at}
                        onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                        min={new Date().toISOString().slice(0, 10)}  // 과거 날짜 비활성
                        required
                        style={{
                          ...inputStyle,
                          paddingRight: 36,
                          // date 인풋 달력 아이콘 색상 (브라우저 기본값 흰색으로)
                          colorScheme: 'dark',
                        }}
                      />
                    </div>
                  </label>
                </div>
              </>
            )}

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

            {/* ── 버튼: 단계 진행 또는 저장 ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => {
                if (formStep > 1) setFormStep(s => s - 1)
                else setModalOpen(false)
              }} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}>
                {formStep > 1 ? '← 이전' : '취소'}
              </button>

              {/* 신규 등록: 1~4단계는 "다음", 5단계는 "발행" */}
              {/* 수정(step=0) 또는 마지막 단계: 저장 버튼 */}
              {(formStep === 0 || formStep === 5) ? (
                <button onClick={handleSave}
                  disabled={saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at}
                  style={{
                    padding: '9px 20px', borderRadius: 10, border: 'none',
                    background: saving || !form.company_name.trim() || !form.region.trim() || !form.expires_at
                      ? 'rgba(49,130,246,0.3)' : '#3182f6',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                  {saving ? '저장 중...' : formStep === 5 ? '🚀 발행' : '저장'}
                </button>
              ) : (
                <button
                  onClick={() => setFormStep(s => s + 1)}
                  disabled={
                    (formStep === 1 && (!form.company_name.trim() || !form.region.trim()))
                  }
                  style={{
                    padding: '9px 20px', borderRadius: 10, border: 'none',
                    background: (formStep === 1 && (!form.company_name.trim() || !form.region.trim()))
                      ? 'rgba(49,130,246,0.3)' : '#3182f6',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  다음 →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          REQ9: 확정 현황 대시보드 탭
          센터별 지원/확정/거절/완료 현황 + 합계
      ══════════════════════════════════════ */}
      {mainTab === 'dashboard' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>📊 확정 현황 대시보드</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              지원자 관리 탭 데이터 기반 집계 (필터 적용 중인 경우 해당 범위 반영)
            </p>
          </div>

          {/* 요약 카드 4개 */}
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

// ── 휴대폰 번호 마스킹 (개인정보 보호) ──
// 예: 01012345678 → 010-****-5678
function maskPhone(phone: string): string {
  const nums = phone.replace(/\D/g, '')
  if (nums.length < 10) return phone
  return `${nums.slice(0, 3)}-****-${nums.slice(-4)}`
}

// ── 복리후생 직접 입력 컴포넌트 (A-4) ──
// 태그를 직접 타이핑 후 엔터/쉼표로 추가, × 버튼으로 삭제
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
    if (tag && !benefits.includes(tag)) {
      onChange([...benefits, tag])
    }
    setDraft('')
  }

  return (
    <div>
      {/* 선택된 태그 칩 목록 */}
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
      {/* 직접 입력 필드 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
          }}
          placeholder="직접 입력 후 Enter"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={addTag}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}
        >추가</button>
      </div>
    </div>
  )
}

// ── 지원자 선택 업무 직접 입력 컴포넌트 (A-5) ──
// 엔터/쉼표로 업무 추가, × 버튼으로 삭제 (BenefitsInput과 동일 패턴)
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
    const tag = draft.trim().replace(/,/g, '')  // 쉼표 제거
    if (tag && !taskOptions.includes(tag)) {
      onChange([...taskOptions, tag])
    }
    setDraft('')
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
        }}
        placeholder="업무 입력 후 Enter (예: 상차, 하차, 분류)"
        style={{ ...inputStyle, flex: 1 }}
      />
      <button
        type="button"
        onClick={addTag}
        style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: '#3182f6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
        }}
      >추가</button>
    </div>
  )
}

// ── E-1: xlsx 다운로드 함수 (SheetJS 없이 CSV → xlsx 확장자로 저장) ──
// consent_third_party=true 건만 내보내기 (D-NEW-7)
// SheetJS(xlsx) 라이브러리 설치 없이 순수 CSV로 동작합니다.
// 추후 npm install xlsx 설치 후 진짜 xlsx 포맷으로 교체 가능.
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
  // D-NEW-7: 제3자 제공 동의한 건만 포함
  const filtered = applicants.filter(a => a.consent_third_party === true && a.applicant_name)

  if (filtered.length === 0) {
    alert('다운로드 가능한 지원자가 없습니다.\n(제3자 제공 동의 + 인적사항 입력 건만 포함됩니다)')
    return
  }

  // CSV 헤더 + 데이터 생성
  const BOM = '\uFEFF'  // Excel 한글 깨짐 방지용 BOM
  const header = ['이름', '생년월일', '성별', '휴대폰', '공고', '센터', '지원일시', '상태']
  const rows = filtered.map(a => [
    a.applicant_name ?? '',
    a.applicant_birth ?? '',
    a.applicant_gender === 'male' ? '남' : a.applicant_gender === 'female' ? '여' : '',
    // TODO: 채용담당자가 지원자에게 직접 연락해야 한다면 마스킹 해제 필요
    // 현재는 개인정보 최소 노출 원칙 + Phase 1 MVP 정책으로 마스킹 유지
    // 실번호 필요 시 이 줄을 `a.applicant_phone ?? ''` 로 교체하세요
    a.applicant_phone ? maskPhone(a.applicant_phone) : '',
    a.job_postings?.company_name ?? '',
    a.job_postings?.center_name ?? '',
    a.applied_at ? new Date(a.applied_at).toLocaleString('ko-KR') : '',
    a.status,
  ])

  const csv = BOM + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  // 파일 다운로드
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `CATCH_지원자_${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
