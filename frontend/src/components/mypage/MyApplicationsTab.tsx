// 📋 지원현황 탭 — 내가 지원한 공고 목록
// job_applications 테이블에서 내 지원 내역을 상태별로 필터링해서 보여줍니다.
// 상태: 전체 / 지원중(applied) / 출근확정(confirmed) / 출근완료(completed)
// ✅ Supabase Realtime 구독으로 어드민이 상태를 바꾸면 즉시 반영
// ✅ 출근확정 상태의 공고 중 오늘이 출근일이면 "출근완료 체크" 버튼 표시
import { useEffect, useState, useCallback } from 'react'
import { MapPin, Clock, Loader2, CheckCircle2, XCircle, Calendar, UserCheck, AlertCircle, RefreshCw, Eye, Pencil, X as XIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listApplications } from '../../lib/jobApplications'
import type { JobApplication } from '../../types/supabase'

interface Props {
  userId: string
}

// ── 지원 상태 한글 라벨 + 색상 정의 ──
// 'rejected' 추가 (20260410_job_applications_rejected.sql 마이그레이션과 연동)
const STATUS_CONFIG = {
  applied: {
    label: '지원완료',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  confirmed: {
    label: '출근확정',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: '출근완료',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  cancelled: {
    label: '취소',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-500',
    dot: 'bg-red-300',
  },
  rejected: {
    label: '지원거절',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    dot: 'bg-red-500',
  },
} as const

// 상태 필터 탭 목록 (전체 포함)
type FilterStatus = 'all' | 'applied' | 'confirmed' | 'completed'
const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'applied', label: '지원중' },
  { key: 'confirmed', label: '출근확정' },
  { key: 'completed', label: '출근완료' },
]

export default function MyApplicationsTab({ userId }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  // 데이터 로드 실패 시 에러 메시지 (null이면 정상)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // 현재 선택된 상태 필터
  const [filter, setFilter] = useState<FilterStatus>('all')
  // 셀프 체크인 처리 중인 지원 ID (중복 클릭 방지)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  // ── 지원서 상세보기 / 수정 모달 상태 ──
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null)
  const [editMode, setEditMode] = useState(false)
  // 수정 폼 데이터 (편집 시 사용)
  const [editForm, setEditForm] = useState({
    applicant_name: '',
    birth_year: '', birth_month: '', birth_day: '',
    applicant_gender: '' as 'male' | 'female' | '',
    applicant_phone: '',
    applied_task: '',
    prior_experience_90d: null as boolean | null,
    preferred_shift: '' as 'morning' | 'afternoon' | 'night' | 'any' | '',
    transportation: '' as 'car' | 'public' | 'shuttle' | '',
    shoe_size: '',
    notes: '',
    emergency_contact: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── 데이터 로드 함수 (Realtime 이벤트 수신 시에도 재사용) ──
  // try-catch로 감싸서 네트워크 오류 / Supabase 에러를 화면에 표시
  const fetchApplications = useCallback(async () => {
    setFetchError(null)
    try {
      const data = await listApplications(userId)
      setApplications(data)
    } catch (err) {
      console.error('[지원현황 로드 오류]', err)
      setFetchError('불러오기 실패. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // ── 최초 로드 ──
  useEffect(() => {
    setLoading(true)
    fetchApplications()
  }, [fetchApplications])

  // ── Realtime 알림 토스트 state ──
  // 어드민이 확정/거절 처리 시 notifications 테이블에 기록 → 즉시 toast 표시
  const [notifToast, setNotifToast] = useState<string | null>(null)
  useEffect(() => {
    if (!notifToast) return
    const t = setTimeout(() => setNotifToast(null), 4000)
    return () => clearTimeout(t)
  }, [notifToast])

  // ── Supabase Realtime 구독 1: job_applications ──
  // 어드민이 출근확정/완료 처리하면 자동으로 화면이 갱신됩니다.
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('my_applications_realtime')  // 채널명 (고유해야 함)
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'job_applications',
          filter: `user_id=eq.${userId}`,  // 내 지원건만 구독
        },
        () => {
          // 변경 감지 시 전체 목록 재조회 (JOIN 데이터가 필요하므로)
          fetchApplications()
        }
      )
      .subscribe()

    const sb = supabase  // null 체크 통과 후 로컬 변수로 캡처
    // 컴포넌트 언마운트 시 구독 해제 (메모리 누수 방지)
    return () => {
      sb.removeChannel(channel)
    }
  }, [userId, fetchApplications])

  // ── Supabase Realtime 구독 2: notifications ──
  // REQ8: 어드민이 notifications 테이블에 알림을 insert하면 즉시 toast 표시
  useEffect(() => {
    if (!supabase) return

    const notifChannel = supabase
      .channel('my_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',      // 새 알림 삽입만 감지
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // 새 알림 도착 시 toast 메시지 표시
          const record = payload.new as { title?: string; body?: string }
          const msg = record.title ?? '새 알림이 도착했습니다.'
          setNotifToast(msg)
          // job_applications 화면도 갱신 (상태 변경과 연동됨)
          fetchApplications()
        }
      )
      .subscribe()

    const sb = supabase
    return () => {
      sb.removeChannel(notifChannel)
    }
  }, [userId, fetchApplications])

  // ── 오늘 날짜 문자열 (KST 기준 YYYY-MM-DD) ──
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

  // ── 셀프 체크인 처리 ──
  // 출근확정 상태이고 오늘이 출근일인 경우에만 호출
  const handleSelfCheckIn = async (app: JobApplication) => {
    if (!supabase || checkingIn) return
    setCheckingIn(app.id)
    try {
      // 1. status를 'completed'로 변경
      const { error } = await supabase
        .from('job_applications')
        .update({ status: 'completed' })
        .eq('id', app.id)
        .eq('user_id', userId)  // 보안: 내 건만 변경 가능

      if (error) throw error

      // 2. UI 즉시 갱신 (Realtime으로도 반영되지만 즉각성을 위해 직접 갱신)
      await fetchApplications()
    } catch (err) {
      console.error('[셀프 체크인 오류]', err)
    } finally {
      setCheckingIn(null)
    }
  }

  // ── 상세보기 모달 열기 ──
  const openDetail = (app: JobApplication) => {
    setSelectedApp(app)
    setEditMode(false)
    setEditError(null)
    // editForm 초기화 (현재 데이터로 pre-fill)
    const birth = app.applicant_birth ?? ''
    const parts = birth.split('-')
    setEditForm({
      applicant_name: app.applicant_name ?? '',
      birth_year: parts[0] ?? '',
      birth_month: parts[1] ? String(parseInt(parts[1], 10)) : '',
      birth_day: parts[2] ? String(parseInt(parts[2], 10)) : '',
      applicant_gender: (app.applicant_gender ?? '') as 'male' | 'female' | '',
      applicant_phone: app.applicant_phone ?? '',
      applied_task: (app.applied_task ?? '') as string,
      prior_experience_90d: (app.prior_experience_90d ?? null) as boolean | null,
      preferred_shift: (app.preferred_shift ?? '') as 'morning' | 'afternoon' | 'night' | 'any' | '',
      transportation: (app.transportation ?? '') as 'car' | 'public' | 'shuttle' | '',
      shoe_size: app.shoe_size ?? '',
      notes: app.notes ?? '',
      emergency_contact: app.emergency_contact ?? '',
    })
  }

  // ── 수정 저장 ──
  // applied(지원중) 상태에서만 가능 — confirmed/rejected 이면 호출 불가
  const handleEditSave = async () => {
    if (!supabase || !selectedApp || editSaving) return
    setEditSaving(true)
    setEditError(null)
    try {
      const birth = `${editForm.birth_year}-${editForm.birth_month.padStart(2,'0')}-${editForm.birth_day.padStart(2,'0')}`
      const { error } = await supabase
        .from('job_applications')
        .update({
          applicant_name: editForm.applicant_name.trim() || null,
          applicant_birth: birth || null,
          applicant_gender: editForm.applicant_gender || null,
          applicant_phone: editForm.applicant_phone.replace(/\D/g, '') || null,
          applied_task: editForm.applied_task || null,
          prior_experience_90d: editForm.prior_experience_90d,
          preferred_shift: editForm.preferred_shift || null,
          transportation: editForm.transportation || null,
          shoe_size: editForm.shoe_size || null,
          notes: editForm.notes.trim() || null,
          emergency_contact: editForm.emergency_contact.replace(/\D/g, '') || null,
        })
        .eq('id', selectedApp.id)
      if (error) throw error
      // 목록 갱신 + 모달 닫기
      await fetchApplications()
      setSelectedApp(null)
      setEditMode(false)
    } catch (err) {
      console.error('[지원서 수정 오류]', err)
      setEditError(err instanceof Error ? err.message : '수정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setEditSaving(false)
    }
  }

  // 한글 라벨 헬퍼
  const SHIFT_LABEL: Record<string, string> = { morning: '오전', afternoon: '오후', night: '야간', any: '무관' }
  const TRANSPORT_LABEL: Record<string, string> = { car: '자차', public: '대중교통', shuttle: '셔틀 필요' }

  // 필터 적용 (취소 제외, 선택한 상태만)
  const filtered = applications.filter(app => {
    if (app.status === 'cancelled') return false   // 취소된 건 기본 숨김
    if (filter === 'all') return true
    return app.status === filter
  })

  // 날짜 포맷: "4월 5일"
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

  // ── 에러 상태 UI ──
  // 네트워크 오류 또는 Supabase 에러 발생 시 재시도 버튼 표시
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-300" />
        </div>
        <p className="text-[14px] font-bold text-[#4e5968]">{fetchError}</p>
        <button
          onClick={() => { setLoading(true); fetchApplications() }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#3182f6] text-white text-[13px] font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── REQ8: 실시간 알림 토스트 ── */}
      {/* notifications 테이블에 새 알림 INSERT 시 자동 표시, 4초 후 자동 소멸 */}
      {notifToast && (
        <div
          className="fixed top-16 left-1/2 z-[500] w-[calc(100%-32px)] max-w-[380px]"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="rounded-2xl px-4 py-3 text-[14px] font-bold text-white text-center"
            style={{
              background: 'linear-gradient(135deg, #3182f6, #7c3aed)',
              boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
            }}
          >
            🔔 {notifToast}
          </div>
        </div>
      )}

      {/* ── 상태 필터 탭 ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map(tab => {
          // 각 탭의 건수 계산 (취소 제외)
          const count = tab.key === 'all'
            ? applications.filter(a => a.status !== 'cancelled').length
            : applications.filter(a => a.status === tab.key).length

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all shrink-0 ${
                filter === tab.key
                  ? 'bg-[#3182f6] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-[#4e5968] border border-slate-200'
              }`}
            >
              {tab.label}
              {/* 건수 뱃지 */}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  filter === tab.key
                    ? 'bg-white/30 text-white'
                    : 'bg-slate-100 text-[#8b95a1]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── 지원 내역 목록 ── */}
      {filtered.length === 0 ? (
        // 빈 상태
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-200" />
          </div>
          <p className="text-[15px] font-bold text-[#4e5968]">
            {filter === 'all' ? '아직 지원한 공고가 없어요' : `${FILTER_TABS.find(t => t.key === filter)?.label} 내역이 없어요`}
          </p>
          <p className="text-[13px] text-[#8b95a1]">채용정보 탭에서 지원해보세요</p>
        </div>
      ) : (
        filtered.map(app => {
          const status = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.applied
          const job = app.job_postings

          // 출근확정 상태이고 오늘이 출근일인지 확인
          // work_date가 오늘(KST)과 같아야 셀프 체크인 버튼 활성화
          const isCheckInDay = app.status === 'confirmed'
            && app.work_date
            && app.work_date.slice(0, 10) === todayStr

          return (
            <div key={app.id}
              className={`bg-white rounded-[24px] p-4 border shadow-[0_4px_16px_rgba(49,130,246,0.04)] ${
                app.status === 'confirmed'
                  ? 'border-emerald-200 shadow-[0_4px_16px_rgba(16,185,129,0.08)]'
                  : 'border-slate-100'
              }`}
            >
              {/* 회사명 + 상태 뱃지 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] font-extrabold text-[#191f28]">
                    {job?.company_name ?? '공고 정보 없음'}
                  </span>
                  {job?.center_name && (
                    <p className="text-[12px] text-[#8b95a1] mt-0.5 break-words">{job.center_name}</p>
                  )}
                </div>
                {/* 상태 배지 */}
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${status.badgeBg} ${status.badgeText}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              {/* 위치 + 근무시간 — flex-wrap으로 줄바꿈 허용 */}
              {job && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8b95a1] mb-3">
                  {job.region && (
                    <span className="flex items-center gap-1 min-w-0 break-words">
                      <MapPin className="w-3 h-3 text-[#3182f6] shrink-0" />{job.region}
                    </span>
                  )}
                  {job.work_hours && (
                    <span className="flex items-center gap-1 min-w-0 break-words">
                      <Clock className="w-3 h-3 shrink-0" />{job.work_hours}
                    </span>
                  )}
                </div>
              )}

              {/* 일급 표시 */}
              {job && (
                <div className="flex items-center gap-2 mb-3">
                  {job.daily_wage > 0 && (
                    <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] text-[#8b95a1]">일급</span>
                      <span className="text-[14px] font-black text-[#3182f6]">
                        {job.daily_wage.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl">
                    <span className="text-[11px] text-[#8b95a1]">시급</span>
                    <span className="text-[13px] font-bold text-[#4e5968]">
                      {job.hourly_wage.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
              )}

              {/* 하단: 지원일 + 출근확정 시 날짜 강조 */}
              <div className="flex items-center justify-between text-[12px] text-[#8b95a1]">
                <span>지원일 {fmtDate(app.applied_at)}</span>

                {/* 출근 예정일 (confirmed 상태일 때 강조) */}
                {app.work_date && app.status === 'confirmed' && (
                  <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    <Calendar className="w-3 h-3" />
                    출근일 {new Date(app.work_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                )}

                {/* 출근 완료 아이콘 */}
                {app.status === 'completed' && (
                  <span className="flex items-center gap-1 font-bold text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    완료
                  </span>
                )}

                {/* 취소 아이콘 */}
                {app.status === 'cancelled' && (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    취소됨
                  </span>
                )}
              </div>

              {/* ── 셀프 체크인 버튼 ──
                  출근확정(confirmed) 상태이고 오늘이 출근일일 때만 표시 */}
              {isCheckInDay && (
                <button
                  onClick={() => handleSelfCheckIn(app)}
                  disabled={checkingIn === app.id}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500 text-white text-[13px] font-bold transition-opacity disabled:opacity-60"
                >
                  {checkingIn === app.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  {checkingIn === app.id ? '처리 중...' : '출근완료 체크'}
                </button>
              )}

              {/* ── 상세보기 버튼 ── */}
              <button
                onClick={() => openDetail(app)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl border border-slate-200 text-[12px] text-[#4e5968] font-medium hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                지원서 상세보기
              </button>
            </div>
          )
        })
      )}
      {/* ── 지원서 상세보기 / 수정 모달 ── */}
      {selectedApp && (() => {
        const job = selectedApp.job_postings
        const canEdit = selectedApp.status === 'applied'
        const statusLock = selectedApp.status === 'confirmed'
          ? '출근 확정된 지원서는 수정할 수 없습니다.'
          : selectedApp.status === 'rejected'
          ? '거절된 지원서는 수정할 수 없습니다.'
          : null
        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedApp(null)}
          >
            <div
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-[16px] font-bold text-[#191f28]">지원서 상세</h2>
                  <p className="text-[11px] text-[#8b95a1] mt-0.5">
                    {job?.company_name} {job?.center_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* 수정 버튼 — applied 상태일 때만 활성 */}
                  {!editMode && (
                    <button
                      onClick={() => {
                        if (!canEdit) return
                        setEditMode(true)
                      }}
                      disabled={!canEdit}
                      title={statusLock ?? undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                        canEdit
                          ? 'bg-blue-50 text-[#3182f6] hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      수정하기
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <XIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* 본문 */}
              <div className="px-5 py-4 space-y-4">

                {/* 수정 불가 안내 (confirmed/rejected) */}
                {statusLock && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[12px] text-amber-700 font-medium">{statusLock}</p>
                  </div>
                )}

                {/* 수정 에러 표시 */}
                {editError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[12px] text-red-700">{editError}</p>
                  </div>
                )}

                {/* 공고 정보 요약 */}
                {job && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">공고 정보</p>
                    <div className="space-y-1 text-[12px] text-[#4e5968]">
                      <p><span className="text-gray-400">회사</span> · {job.company_name} {job.center_name}</p>
                      {job.region && <p><span className="text-gray-400">지역</span> · {job.region}</p>}
                      {job.work_hours && <p><span className="text-gray-400">근무시간</span> · {job.work_hours}</p>}
                      <p className="text-[#3182f6] font-bold">
                        시급 {job.hourly_wage.toLocaleString('ko-KR')}원
                        {job.daily_wage > 0 && ` · 일급 ${job.daily_wage.toLocaleString('ko-KR')}원`}
                      </p>
                    </div>
                  </div>
                )}

                {/* 지원 인적사항 */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">지원자 정보</p>
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">성명</label>
                        <input
                          type="text"
                          value={editForm.applicant_name}
                          onChange={e => setEditForm(f => ({ ...f, applicant_name: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">생년월일</label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-[3] min-w-[80px]">
                            <input type="text" inputMode="numeric" placeholder="1990" maxLength={4}
                              value={editForm.birth_year}
                              onChange={e => setEditForm(f => ({ ...f, birth_year: e.target.value.replace(/\D/g, '') }))}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 block text-center mt-0.5">년</span>
                          </div>
                          <div className="w-[54px]">
                            <input type="text" inputMode="numeric" placeholder="1" maxLength={2}
                              value={editForm.birth_month}
                              onChange={e => setEditForm(f => ({ ...f, birth_month: e.target.value.replace(/\D/g, '') }))}
                              className="w-full text-center py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 block text-center mt-0.5">월</span>
                          </div>
                          <div className="w-[54px]">
                            <input type="text" inputMode="numeric" placeholder="1" maxLength={2}
                              value={editForm.birth_day}
                              onChange={e => setEditForm(f => ({ ...f, birth_day: e.target.value.replace(/\D/g, '') }))}
                              className="w-full text-center py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 block text-center mt-0.5">일</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">성별</label>
                        <div className="flex gap-2">
                          {(['male', 'female'] as const).map(g => (
                            <button key={g} type="button"
                              onClick={() => setEditForm(f => ({ ...f, applicant_gender: g }))}
                              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                editForm.applicant_gender === g
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {g === 'male' ? '남성' : '여성'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">휴대폰 번호</label>
                        <input type="tel"
                          value={editForm.applicant_phone}
                          onChange={e => setEditForm(f => ({ ...f, applicant_phone: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                      <div><span className="text-gray-400">성명</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.applicant_name ?? '—'}</span></div>
                      <div><span className="text-gray-400">생년월일</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.applicant_birth ?? '—'}</span></div>
                      <div><span className="text-gray-400">성별</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.applicant_gender === 'male' ? '남성' : selectedApp.applicant_gender === 'female' ? '여성' : '—'}</span></div>
                      <div><span className="text-gray-400">휴대폰</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.applicant_phone ?? '—'}</span></div>
                    </div>
                  )}
                </div>

                {/* 근무 관련 */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">근무 관련</p>
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">지원 업무</label>
                        <input type="text"
                          value={editForm.applied_task}
                          onChange={e => setEditForm(f => ({ ...f, applied_task: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">90일 이내 근무 경험</label>
                        <div className="flex gap-2">
                          {([true, false] as const).map(v => (
                            <button key={String(v)} type="button"
                              onClick={() => setEditForm(f => ({ ...f, prior_experience_90d: v }))}
                              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                editForm.prior_experience_90d === v
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {v ? '있음' : '없음'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">희망 출근 시간대</label>
                        <div className="flex gap-2 flex-wrap">
                          {(['morning','afternoon','night','any'] as const).map(s => (
                            <button key={s} type="button"
                              onClick={() => setEditForm(f => ({ ...f, preferred_shift: s }))}
                              className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                editForm.preferred_shift === s
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {SHIFT_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">교통 수단</label>
                        <div className="flex gap-2">
                          {(['car','public','shuttle'] as const).map(t => (
                            <button key={t} type="button"
                              onClick={() => setEditForm(f => ({ ...f, transportation: t }))}
                              className={`flex-1 py-2 rounded-xl border text-[12px] font-medium transition-colors ${
                                editForm.transportation === t
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {TRANSPORT_LABEL[t]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">안전화 사이즈</label>
                        <input type="text"
                          value={editForm.shoe_size}
                          onChange={e => setEditForm(f => ({ ...f, shoe_size: e.target.value }))}
                          placeholder="예: 270"
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">특이사항</label>
                        <textarea
                          value={editForm.notes}
                          onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">비상 연락처</label>
                        <input type="tel"
                          value={editForm.emergency_contact}
                          onChange={e => setEditForm(f => ({ ...f, emergency_contact: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                      <div><span className="text-gray-400">지원 업무</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.applied_task ?? '—'}</span></div>
                      <div><span className="text-gray-400">근무 경험 (90일)</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.prior_experience_90d === true ? '있음' : selectedApp.prior_experience_90d === false ? '없음' : '—'}</span></div>
                      <div><span className="text-gray-400">희망 시간대</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.preferred_shift ? SHIFT_LABEL[selectedApp.preferred_shift] : '—'}</span></div>
                      <div><span className="text-gray-400">교통 수단</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.transportation ? TRANSPORT_LABEL[selectedApp.transportation] : '—'}</span></div>
                      <div><span className="text-gray-400">안전화 사이즈</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.shoe_size ? `${selectedApp.shoe_size}mm` : '—'}</span></div>
                      <div><span className="text-gray-400">비상 연락처</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.emergency_contact ?? '—'}</span></div>
                      {selectedApp.notes && (
                        <div className="col-span-2"><span className="text-gray-400">특이사항</span><br /><span className="font-semibold text-[#191f28]">{selectedApp.notes}</span></div>
                      )}
                    </div>
                  )}
                </div>

                {/* 동의 + 지원일 */}
                <div className="bg-gray-50 rounded-2xl p-4 text-[12px]">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">지원 정보</p>
                  <div className="grid grid-cols-2 gap-y-1 text-[#4e5968]">
                    <span className="text-gray-400">지원 일시</span>
                    <span>{new Date(selectedApp.applied_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-gray-400">제3자 제공 동의</span>
                    <span>{selectedApp.consent_third_party ? '✅ 동의함' : '❌ 미동의'}</span>
                  </div>
                </div>

                {/* 수정 모드 버튼 */}
                {editMode && (
                  <div className="flex gap-2 pt-2 pb-4">
                    <button
                      onClick={() => { setEditMode(false); setEditError(null) }}
                      className="flex-1 py-3 rounded-2xl border border-gray-200 text-[14px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="flex-[2] py-3 rounded-2xl bg-[#3182f6] text-white text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                    >
                      {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editSaving ? '저장 중...' : '수정 완료'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
