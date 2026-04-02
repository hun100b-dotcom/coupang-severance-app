// 📅 스케줄 탭 — 출근 일정 월간 캘린더
// 외부 라이브러리 없이 React + useState만으로 직접 구현한 캘린더
// 날짜에 출근 예정(파란 점) / 출근 완료(초록 점) 표시
import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2, MapPin, TrendingUp } from 'lucide-react'
import { listApplications } from '../../lib/jobApplications'
import type { JobApplication } from '../../types/supabase'

interface Props {
  userId: string
}

// 요일 헤더
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function MyScheduleTab({ userId }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)

  // 현재 보고 있는 연/월 (기본: 이번 달)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth()) // 0-indexed

  // 선택한 날짜 (클릭 시 하단 상세 표시)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await listApplications(userId)
      setApplications(data)
      setLoading(false)
    }
    load()
  }, [userId])

  // ── 날짜 → 출근 상태 매핑 계산 ──
  // "YYYY-MM-DD" → { confirmed: boolean, completed: boolean }
  const dateStatusMap = useMemo(() => {
    const map: Record<string, { confirmed: boolean; completed: boolean }> = {}
    for (const app of applications) {
      if (!app.work_date) continue
      const key = app.work_date.slice(0, 10) // "YYYY-MM-DD"
      if (!map[key]) map[key] = { confirmed: false, completed: false }
      if (app.status === 'confirmed') map[key].confirmed = true
      if (app.status === 'completed') map[key].completed = true
    }
    return map
  }, [applications])

  // ── 이번 달 캘린더 날짜 배열 계산 ──
  // 달력은 7열(일~토)이므로 앞뒤 빈칸 포함
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()  // 첫날 요일 (0=일)
    const daysInMonth = new Date(year, month + 1, 0).getDate()  // 이번 달 날짜 수
    const days: (number | null)[] = []

    // 앞쪽 빈칸
    for (let i = 0; i < firstDay; i++) days.push(null)
    // 실제 날짜
    for (let d = 1; d <= daysInMonth; d++) days.push(d)

    return days
  }, [year, month])

  // ── 이번 달 통계 계산 ──
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const thisMonthApps = applications.filter(app =>
      app.work_date?.startsWith(prefix) || app.applied_at.startsWith(prefix)
    )
    const confirmedCount = thisMonthApps.filter(a => a.status === 'confirmed').length
    const completedCount = thisMonthApps.filter(a => a.status === 'completed').length

    // 예상 수입: 출근 완료된 공고의 일급 합산
    const expectedIncome = thisMonthApps
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.job_postings?.daily_wage ?? 0), 0)

    return { confirmedCount, completedCount, expectedIncome }
  }, [applications, year, month])

  // ── 전체 누적 통계 ──
  const totalStats = useMemo(() => {
    const total = applications.filter(a => a.status !== 'cancelled').length
    const completed = applications.filter(a => a.status === 'completed').length
    const totalIncome = applications
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.job_postings?.daily_wage ?? 0), 0)
    return { total, completed, totalIncome }
  }, [applications])

  // 날짜 키 만들기 ("YYYY-MM-DD")
  const makeKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 선택한 날짜의 지원 내역
  const selectedDayApps = selectedDate
    ? applications.filter(app => app.work_date?.startsWith(selectedDate))
    : []

  // 오늘 날짜 키
  const todayKey = new Date().toISOString().slice(0, 10)

  // 이전 달로 이동
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  // 다음 달로 이동
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

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

      {/* ── 누적 통계 카드 3개 ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '전체 지원', value: totalStats.total, unit: '건', color: 'text-[#3182f6]' },
          { label: '출근 완료', value: totalStats.completed, unit: '건', color: 'text-emerald-600' },
          {
            label: '총 수입',
            value: totalStats.totalIncome > 0
              ? (totalStats.totalIncome / 10000).toFixed(0)
              : '0',
            unit: '만원',
            color: 'text-violet-600',
          },
        ].map(stat => (
          <div key={stat.label}
            className="bg-white rounded-[20px] p-3 text-center border border-slate-100 shadow-[0_4px_12px_rgba(49,130,246,0.04)]">
            <p className={`text-[22px] font-black ${stat.color} leading-tight`}>
              {stat.value}<span className="text-[11px] font-bold">{stat.unit}</span>
            </p>
            <p className="text-[11px] text-[#8b95a1] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── 월간 캘린더 ── */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)] overflow-hidden">
        {/* 캘린더 헤더: 이전/다음 달 이동 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#4e5968]" />
          </button>
          <p className="text-[15px] font-extrabold text-[#191f28]">
            {year}년 {month + 1}월
          </p>
          <button onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-[#4e5968]" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {WEEKDAYS.map((day, i) => (
            <div key={day}
              className={`text-center text-[11px] font-bold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#8b95a1]'
              }`}>
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0 px-2 pb-3">
          {calendarDays.map((day, i) => {
            if (day === null) {
              // 앞쪽 빈칸
              return <div key={`empty-${i}`} />
            }

            const key = makeKey(day)
            const status = dateStatusMap[key]
            const isToday = key === todayKey
            const isSelected = key === selectedDate

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(prev => prev === key ? null : key)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#3182f6] shadow-md shadow-blue-500/20'
                    : isToday
                    ? 'bg-blue-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* 날짜 숫자 */}
                <span className={`text-[13px] font-bold leading-tight ${
                  isSelected ? 'text-white' :
                  isToday ? 'text-[#3182f6]' :
                  i % 7 === 0 ? 'text-red-400' :
                  i % 7 === 6 ? 'text-blue-400' :
                  'text-[#191f28]'
                }`}>
                  {day}
                </span>

                {/* 출근 상태 점 */}
                <div className="flex gap-0.5 mt-0.5 h-2">
                  {/* 🔵 출근 확정 */}
                  {status?.confirmed && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                  {/* 🟢 출근 완료 */}
                  {status?.completed && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 px-4 pb-3 text-[11px] text-[#8b95a1]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            출근확정
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            출근완료
          </span>
        </div>
      </div>

      {/* ── 선택한 날짜의 일정 상세 ── */}
      {selectedDate && (
        <div className="bg-white rounded-[24px] p-4 border border-blue-100 shadow-[0_4px_16px_rgba(49,130,246,0.08)]">
          <p className="text-[14px] font-extrabold text-[#191f28] mb-3">
            {new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 일정
          </p>
          {selectedDayApps.length === 0 ? (
            <p className="text-[13px] text-[#8b95a1] text-center py-4">이 날 등록된 출근 일정이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayApps.map(app => (
                <div key={app.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#191f28]">
                      {app.job_postings?.company_name ?? '공고 정보 없음'}
                    </p>
                    {app.job_postings?.region && (
                      <p className="text-[12px] text-[#8b95a1] flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-3 h-3" />{app.job_postings.region}
                      </p>
                    )}
                  </div>
                  {/* 일급 */}
                  {(app.job_postings?.daily_wage ?? 0) > 0 && (
                    <span className="text-[14px] font-black text-[#3182f6] shrink-0">
                      {app.job_postings!.daily_wage.toLocaleString('ko-KR')}원
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 이번 달 통계 ── */}
      <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#3182f6]" />
          <p className="text-[14px] font-extrabold text-[#191f28]">이번 달 통계</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[20px] font-black text-blue-600">{monthStats.confirmedCount}<span className="text-[11px] font-bold">건</span></p>
            <p className="text-[11px] text-[#8b95a1]">출근 확정</p>
          </div>
          <div>
            <p className="text-[20px] font-black text-emerald-600">{monthStats.completedCount}<span className="text-[11px] font-bold">건</span></p>
            <p className="text-[11px] text-[#8b95a1]">출근 완료</p>
          </div>
          <div>
            <p className="text-[20px] font-black text-violet-600">
              {monthStats.expectedIncome > 0
                ? (monthStats.expectedIncome / 10000).toFixed(0)
                : '0'}
              <span className="text-[11px] font-bold">만원</span>
            </p>
            <p className="text-[11px] text-[#8b95a1]">예상 수입</p>
          </div>
        </div>
      </div>

    </div>
  )
}
