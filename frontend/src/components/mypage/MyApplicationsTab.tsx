// 📋 지원현황 탭 — 내가 지원한 공고 목록
// job_applications 테이블에서 내 지원 내역을 상태별로 필터링해서 보여줍니다.
// 상태: 전체 / 지원중(applied) / 출근확정(confirmed) / 출근완료(completed)
// ✅ Supabase Realtime 구독으로 어드민이 상태를 바꾸면 즉시 반영
// ✅ 출근확정 상태의 공고 중 오늘이 출근일이면 "출근완료 체크" 버튼 표시
import { useEffect, useState, useCallback } from 'react'
import { MapPin, Clock, Loader2, CheckCircle2, XCircle, Calendar, UserCheck, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listApplications } from '../../lib/jobApplications'
import type { JobApplication } from '../../types/supabase'

interface Props {
  userId: string
}

// ── 지원 상태 한글 라벨 + 색상 정의 ──
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

  // ── Supabase Realtime 구독 ──
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
                    <p className="text-[12px] text-[#8b95a1] mt-0.5">{job.center_name}</p>
                  )}
                </div>
                {/* 상태 배지 */}
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${status.badgeBg} ${status.badgeText}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              {/* 위치 + 근무시간 */}
              {job && (
                <div className="flex items-center gap-3 text-[12px] text-[#8b95a1] mb-3">
                  {job.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#3182f6]" />{job.region}
                    </span>
                  )}
                  {job.work_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{job.work_hours}
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
            </div>
          )
        })
      )}
    </div>
  )
}
