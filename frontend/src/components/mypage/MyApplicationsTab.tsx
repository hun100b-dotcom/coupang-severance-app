// 📋 지원현황 탭 — 내가 지원한 공고 목록
// job_applications 테이블에서 내 지원 내역을 상태별로 필터링해서 보여줍니다.
// 상태: 전체 / 지원중(applied) / 출근확정(confirmed) / 출근완료(completed)
import { useEffect, useState } from 'react'
import { MapPin, Clock, Loader2, CheckCircle2, XCircle, Calendar } from 'lucide-react'
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
  // 현재 선택된 상태 필터
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await listApplications(userId)
      setApplications(data)
      setLoading(false)
    }
    load()
  }, [userId])

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
            </div>
          )
        })
      )}
    </div>
  )
}
