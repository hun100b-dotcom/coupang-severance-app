// 📋 지원현황 탭 — LMS형 필터 + 상태별 카드 + D-day 배지 + 취소 바텀시트
// job_applications 테이블에서 내 지원 내역을 상태별로 필터링
// 필터: 전체 / 지원완료(applied) / 검토중(reviewing) / 출근확정(confirmed) / 출근완료(completed)
// ✅ Supabase Realtime 구독으로 어드민 상태 변경 즉시 반영
// ✅ 취소는 applied/reviewing 상태에서만 가능 (바텀시트 확인 후 실행)
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Clock, Loader2, CheckCircle2, XCircle, Calendar,
  AlertCircle, RefreshCw, Eye, Pencil, X as XIcon, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listApplications, cancelApplication } from '../../lib/jobApplications'
import type { JobApplication } from '../../types/supabase'

interface Props {
  userId: string
}

// ── 상태별 카드 스타일 정의 (배경/텍스트/테두리) ──
const STATUS_CONFIG = {
  applied: {
    label: '지원완료',
    cardBg: '#eff6ff',
    cardText: '#1d4ed8',
    cardBorder: '#bfdbfe',
  },
  reviewing: {
    label: '검토중',
    cardBg: '#fffbeb',
    cardText: '#92400e',
    cardBorder: '#fcd34d',
  },
  confirmed: {
    label: '출근확정',
    cardBg: '#ecfdf5',
    cardText: '#065f46',
    cardBorder: '#6ee7b7',
  },
  completed: {
    label: '출근완료',
    cardBg: '#f3f4f6',
    cardText: '#374151',
    cardBorder: '#e5e7eb',
  },
  cancelled: {
    label: '취소',
    cardBg: '#f9fafb',
    cardText: '#9ca3af',
    cardBorder: '#e5e7eb',
  },
  rejected: {
    label: '거절',
    cardBg: '#fef2f2',
    cardText: '#991b1b',
    cardBorder: '#fecaca',
  },
} as const

// 필터 탭 — 5개 (전체 포함)
type FilterStatus = 'all' | 'applied' | 'reviewing' | 'confirmed' | 'completed'
const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'applied', label: '지원완료' },
  { key: 'reviewing', label: '검토중' },
  { key: 'confirmed', label: '출근확정' },
  { key: 'completed', label: '출근완료' },
]

// ── D-day 계산 (양수=미래, 0=오늘, 음수=지남) ──
function calcDday(workDate: string | null): number | null {
  if (!workDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(workDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ── D-day 배지 색상 & 라벨 ──
// 오늘=빨강, D-1~3=주황, D-4~7=초록, D-8+=회색
function getDdayStyle(diff: number): { bg: string; text: string; label: string } {
  if (diff === 0) return { bg: '#ef4444', text: 'white', label: 'D-DAY' }
  if (diff > 0 && diff <= 3) return { bg: '#f59e0b', text: 'white', label: `D-${diff}` }
  if (diff > 3 && diff <= 7) return { bg: '#10b981', text: 'white', label: `D-${diff}` }
  if (diff > 7) return { bg: '#6b7280', text: 'white', label: `D-${diff}` }
  // 지난 날짜
  return { bg: '#6b7280', text: 'white', label: `D+${Math.abs(diff)}` }
}

export default function MyApplicationsTab({ userId }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')

  // 취소/거절 내역 접기 토글 상태
  const [showCancelled, setShowCancelled] = useState(false)

  // 취소 바텀시트 대상 (null이면 닫힘)
  const [cancelTarget, setCancelTarget] = useState<JobApplication | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // 취소 성공 토스트 (3초 자동 소멸)
  const [cancelToast, setCancelToast] = useState<string | null>(null)

  // 실시간 알림 토스트 (4초 자동 소멸)
  const [notifToast, setNotifToast] = useState<string | null>(null)

  // 상세보기 / 수정 모달 상태
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null)
  const [editMode, setEditMode] = useState(false)
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

  // LMS형 탭 언더라인 인디케이터 위치 계산용 ref
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // ── 지원 내역 로드 ──
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

  useEffect(() => { setLoading(true); fetchApplications() }, [fetchApplications])

  // 취소 토스트 3초 후 자동 소멸
  useEffect(() => {
    if (!cancelToast) return
    const t = setTimeout(() => setCancelToast(null), 3000)
    return () => clearTimeout(t)
  }, [cancelToast])

  // 알림 토스트 4초 후 자동 소멸
  useEffect(() => {
    if (!notifToast) return
    const t = setTimeout(() => setNotifToast(null), 4000)
    return () => clearTimeout(t)
  }, [notifToast])

  // ── Realtime 구독 1: job_applications ──
  // 어드민이 상태를 바꾸면 즉시 화면 갱신
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('my_applications_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'job_applications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchApplications())
      .subscribe()
    const sb = supabase
    return () => { sb.removeChannel(channel) }
  }, [userId, fetchApplications])

  // ── Realtime 구독 2: notifications ──
  // 어드민이 알림을 INSERT하면 토스트 표시
  useEffect(() => {
    if (!supabase) return
    const notifChannel = supabase
      .channel('my_notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const record = payload.new as { title?: string }
        setNotifToast(record.title ?? '새 알림이 도착했습니다.')
        fetchApplications()
      })
      .subscribe()
    const sb = supabase
    return () => { sb.removeChannel(notifChannel) }
  }, [userId, fetchApplications])

  // 선택된 탭의 언더라인 인디케이터 위치 계산
  useEffect(() => {
    const idx = FILTER_TABS.findIndex(t => t.key === filter)
    const el = tabsRef.current[idx]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [filter])

  // ── 상세보기 모달 열기 ──
  const openDetail = (app: JobApplication) => {
    setSelectedApp(app)
    setEditMode(false)
    setEditError(null)
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

  // ── 지원서 수정 저장 (applied 상태에서만 가능) ──
  const handleEditSave = async () => {
    if (!supabase || !selectedApp || editSaving) return
    setEditSaving(true)
    setEditError(null)
    try {
      const birth = `${editForm.birth_year}-${editForm.birth_month.padStart(2, '0')}-${editForm.birth_day.padStart(2, '0')}`
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
      await fetchApplications()
      setSelectedApp(null)
      setEditMode(false)
    } catch (err) {
      console.error('[지원서 수정 오류]', err)
      setEditError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── 지원 취소 실행 ──
  const handleCancel = async () => {
    if (!cancelTarget || cancelling) return
    const companyName = cancelTarget.job_postings?.company_name ?? '공고'
    setCancelling(true)
    const ok = await cancelApplication(cancelTarget.id)
    setCancelling(false)
    setCancelTarget(null)
    if (ok) {
      setCancelToast(`${companyName} 지원을 취소했어요.`)
      await fetchApplications()
    }
  }

  const SHIFT_LABEL: Record<string, string> = { morning: '오전', afternoon: '오후', night: '야간', any: '무관' }
  const TRANSPORT_LABEL: Record<string, string> = { car: '자차', public: '대중교통', shuttle: '셔틀 필요' }
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  // 취소/거절 건 분리
  const activeCancelled = applications.filter(a => a.status === 'cancelled' || a.status === 'rejected')
  // 활성 지원 목록 (취소/거절 제외)
  const activeApps = applications.filter(a => a.status !== 'cancelled' && a.status !== 'rejected')

  // 선택 필터 적용
  const filtered = activeApps.filter(app => {
    if (filter === 'all') return true
    return app.status === filter
  })

  // 탭별 건수 계산
  const tabCount = (key: FilterStatus) => {
    if (key === 'all') return activeApps.length
    return activeApps.filter(a => a.status === key).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

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

      {/* ── 취소 성공 토스트 (3초) ── */}
      <AnimatePresence>
        {cancelToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 z-[501] w-[calc(100%-32px)] max-w-[380px]"
            style={{ transform: 'translateX(-50%)' }}
          >
            <div
              className="rounded-2xl px-4 py-3 text-[14px] font-bold text-white text-center"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
            >
              ✅ {cancelToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 실시간 알림 토스트 ── */}
      <AnimatePresence>
        {notifToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[5.5rem] left-1/2 z-[500] w-[calc(100%-32px)] max-w-[380px]"
            style={{ transform: 'translateX(-50%)' }}
          >
            <div
              className="rounded-2xl px-4 py-3 text-[14px] font-bold text-white text-center"
              style={{ background: 'linear-gradient(135deg, #3182f6, #7c3aed)', boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}
            >
              🔔 {notifToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LMS형 필터 탭 (언더라인 슬라이딩 인디케이터) ── */}
      <div className="relative border-b border-slate-100 -mx-1">
        <div className="flex overflow-x-auto px-1">
          {FILTER_TABS.map((tab, idx) => {
            const count = tabCount(tab.key)
            return (
              <button
                key={tab.key}
                ref={el => { tabsRef.current[idx] = el }}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                  filter === tab.key ? 'text-[#3182f6]' : 'text-[#8b95a1]'
                }`}
              >
                {tab.label}
                {/* 건수 배지 */}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === tab.key
                      ? 'bg-blue-100 text-[#3182f6]'
                      : 'bg-slate-100 text-[#8b95a1]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* 슬라이딩 언더라인 (Framer Motion) */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-[#3182f6] rounded-full"
          animate={indicatorStyle}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      </div>

      {/* ── 지원 내역 카드 목록 ── */}
      {filtered.length === 0 ? (
        /* 빈 상태 UI */
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-200" />
          </div>
          <p className="text-[15px] font-bold text-[#4e5968]">
            {filter === 'all'
              ? '아직 지원한 공고가 없어요'
              : `${FILTER_TABS.find(t => t.key === filter)?.label} 내역이 없어요`}
          </p>
          <p className="text-[13px] text-[#8b95a1]">채용정보 탭에서 지원해보세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(app => {
            const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.applied
            const job = app.job_postings
            const ddiff = calcDday(app.work_date)
            const ddayStyle = ddiff !== null ? getDdayStyle(ddiff) : null
            // applied/reviewing 상태에서만 취소 가능
            const canCancel = app.status === 'applied' || app.status === 'reviewing'

            return (
              <div
                key={app.id}
                className="rounded-[24px] p-4 border shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                style={{ background: cfg.cardBg, borderColor: cfg.cardBorder }}
              >
                {/* 헤더: 회사명 + D-day 배지 + 상태 배지 */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-extrabold text-[#191f28]">
                      {job?.company_name ?? '공고 정보 없음'}
                    </span>
                    {job?.center_name && (
                      <p className="text-[12px] text-[#8b95a1] mt-0.5">{job.center_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* D-day 배지 — work_date 있을 때만 표시 */}
                    {ddayStyle && (
                      <span
                        className="px-2 py-0.5 rounded-lg text-[11px] font-black"
                        style={{ background: ddayStyle.bg, color: ddayStyle.text }}
                      >
                        {ddayStyle.label}
                      </span>
                    )}
                    {/* 상태 배지 */}
                    <span
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                      style={{ color: cfg.cardText, borderColor: cfg.cardBorder, background: 'rgba(255,255,255,0.6)' }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* 위치 + 근무시간 */}
                {job && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8b95a1] mb-3">
                    {job.region && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#3182f6] shrink-0" />
                        {job.region}
                      </span>
                    )}
                    {job.work_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {job.work_hours}
                      </span>
                    )}
                  </div>
                )}

                {/* 임금 정보 */}
                {job && (
                  <div className="flex items-center gap-2 mb-3">
                    {job.daily_wage > 0 && (
                      <div className="flex items-center gap-1 bg-white/60 px-3 py-1.5 rounded-xl">
                        <span className="text-[11px] text-[#8b95a1]">일급</span>
                        <span className="text-[14px] font-black text-[#3182f6]">
                          {job.daily_wage.toLocaleString('ko-KR')}원
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 bg-white/60 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] text-[#8b95a1]">시급</span>
                      <span className="text-[13px] font-bold text-[#4e5968]">
                        {job.hourly_wage.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  </div>
                )}

                {/* 지원일 + 출근 예정일/완료 */}
                <div className="flex items-center justify-between text-[12px] text-[#8b95a1] mb-2">
                  <span>지원일 {fmtDate(app.applied_at)}</span>
                  {app.work_date && app.status === 'confirmed' && (
                    <span className="flex items-center gap-1 font-bold text-emerald-600">
                      <Calendar className="w-3 h-3" />
                      출근일 {new Date(app.work_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {app.status === 'completed' && (
                    <span className="flex items-center gap-1 font-bold text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      완료
                    </span>
                  )}
                </div>

                {/* 출근확정 안내 문구 */}
                {app.status === 'confirmed' && (
                  <p className="text-[11px] text-emerald-600 text-center mb-2">
                    ✅ 출근 확정됨 — 출근 완료 처리는 관리자가 진행합니다
                  </p>
                )}

                {/* 하단 버튼 행 */}
                <div className="flex gap-2 mt-1">
                  {/* 지원서 상세보기 */}
                  <button
                    onClick={() => openDetail(app)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl bg-white/70 border border-white/80 text-[12px] text-[#4e5968] font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    지원서 보기
                  </button>
                  {/* 취소 버튼 — applied/reviewing 상태에만 표시 */}
                  {canCancel && (
                    <button
                      onClick={() => setCancelTarget(app)}
                      className="flex items-center justify-center gap-1 px-4 py-2 rounded-2xl bg-white/70 border border-white/80 text-[12px] text-red-500 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      취소
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 취소/거절 내역 N건 보기 ▼ 접기 토글 ── */}
      {activeCancelled.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowCancelled(v => !v)}
            className="flex items-center gap-1.5 text-[12px] text-[#8b95a1] font-medium px-1 py-1"
          >
            {showCancelled
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
            취소/거절 내역 {activeCancelled.length}건 {showCancelled ? '접기' : '보기 ▼'}
          </button>

          <AnimatePresence>
            {showCancelled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 mt-2">
                  {activeCancelled.map(app => {
                    const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.cancelled
                    const job = app.job_postings
                    return (
                      <div
                        key={app.id}
                        className="rounded-[20px] p-3 border"
                        style={{ background: cfg.cardBg, borderColor: cfg.cardBorder }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-bold text-[#4e5968]">
                              {job?.company_name ?? '공고 정보 없음'}
                            </span>
                            {job?.center_name && (
                              <p className="text-[11px] text-[#8b95a1]">{job.center_name}</p>
                            )}
                          </div>
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: cfg.cardText }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8b95a1] mt-1">
                          지원일 {fmtDate(app.applied_at)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 취소 확인 바텀시트 (Framer Motion AnimatePresence) ── */}
      <AnimatePresence>
        {cancelTarget && (
          <>
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400]"
              onClick={() => !cancelling && setCancelTarget(null)}
            />
            {/* 바텀시트 본체 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-[401] bg-white rounded-t-3xl px-5 pt-5 pb-10"
            >
              {/* 핸들바 */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <p className="text-[17px] font-extrabold text-[#191f28] mb-1">
                지원을 취소할까요?
              </p>
              <p className="text-[13px] text-[#8b95a1] mb-6">
                <span className="font-bold text-[#4e5968]">
                  {cancelTarget.job_postings?.company_name}
                </span>에 제출한 지원서가 삭제됩니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => !cancelling && setCancelTarget(null)}
                  className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-[14px] font-bold text-[#4e5968]"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-[1.2] py-3.5 rounded-2xl bg-red-500 text-white text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cancelling ? '취소 중...' : '지원 취소'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              {/* 모달 헤더 */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-[16px] font-bold text-[#191f28]">지원서 상세</h2>
                  <p className="text-[11px] text-[#8b95a1] mt-0.5">
                    {job?.company_name} {job?.center_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => { if (canEdit) setEditMode(true) }}
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

              {/* 모달 본문 */}
              <div className="px-5 py-4 space-y-4">
                {/* 수정 불가 안내 */}
                {statusLock && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[12px] text-amber-700 font-medium">{statusLock}</p>
                  </div>
                )}
                {/* 수정 에러 */}
                {editError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[12px] text-red-700">{editError}</p>
                  </div>
                )}
                {/* 공고 정보 */}
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
                {/* 지원자 인적사항 */}
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
                            <input
                              type="text" inputMode="numeric" placeholder="1990" maxLength={4}
                              value={editForm.birth_year}
                              onChange={e => setEditForm(f => ({ ...f, birth_year: e.target.value.replace(/\D/g, '') }))}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 block text-center mt-0.5">년</span>
                          </div>
                          <div className="w-[54px]">
                            <input
                              type="text" inputMode="numeric" placeholder="1" maxLength={2}
                              value={editForm.birth_month}
                              onChange={e => setEditForm(f => ({ ...f, birth_month: e.target.value.replace(/\D/g, '') }))}
                              className="w-full text-center py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-gray-400 block text-center mt-0.5">월</span>
                          </div>
                          <div className="w-[54px]">
                            <input
                              type="text" inputMode="numeric" placeholder="1" maxLength={2}
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
                            <button
                              key={g} type="button"
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
                        <input
                          type="tel"
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
                {/* 근무 관련 정보 */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">근무 관련</p>
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">지원 업무</label>
                        <input
                          type="text"
                          value={editForm.applied_task}
                          onChange={e => setEditForm(f => ({ ...f, applied_task: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-gray-600 mb-1">90일 이내 근무 경험</label>
                        <div className="flex gap-2">
                          {([true, false] as const).map(v => (
                            <button
                              key={String(v)} type="button"
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
                          {(['morning', 'afternoon', 'night', 'any'] as const).map(s => (
                            <button
                              key={s} type="button"
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
                          {(['car', 'public', 'shuttle'] as const).map(t => (
                            <button
                              key={t} type="button"
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
                        <input
                          type="text"
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
                        <input
                          type="tel"
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
                        <div className="col-span-2">
                          <span className="text-gray-400">특이사항</span><br />
                          <span className="font-semibold text-[#191f28]">{selectedApp.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* 지원 정보 (동의 여부 + 일시) */}
                <div className="bg-gray-50 rounded-2xl p-4 text-[12px]">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">지원 정보</p>
                  <div className="grid grid-cols-2 gap-y-1 text-[#4e5968]">
                    <span className="text-gray-400">지원 일시</span>
                    <span>
                      {new Date(selectedApp.applied_at).toLocaleString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span className="text-gray-400">제3자 제공 동의</span>
                    <span>{selectedApp.consent_third_party ? '✅ 동의함' : '❌ 미동의'}</span>
                  </div>
                </div>
                {/* 수정 모드 하단 버튼 */}
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
                      {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
