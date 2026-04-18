// 🗓️ 월간 캘린더 뷰
// 캘린더 헤더(연/월 + 이전/다음) + 요일 헤더 + 날짜 그리드 + 범례 + 선택 날짜 상세 일정
// 기존 MyScheduleTab L153~281 영역을 그대로 분리했다.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { JobApplication } from '../../../../types/supabase'
import MonthCell from '../cells/MonthCell'

// 요일 헤더
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  applications: JobApplication[]
  year: number
  month: number // 0-indexed
  onPrevMonth: () => void
  onNextMonth: () => void
  // 지원 건 카드 클릭 시 상세 시트 열기 (step 5 — 선택)
  onApplicationClick?: (app: JobApplication) => void
}

export default function MonthView({
  applications,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onApplicationClick,
}: Props) {
  // 선택한 날짜 (클릭 시 하단 상세 표시)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // ── 이번 달 캘린더 날짜 배열 계산 ──
  // 달력은 7열(일~토)이므로 앞쪽에 빈칸(null)을 먼저 채운다
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

  // 날짜 키 만들기 ("YYYY-MM-DD")
  const makeKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 선택한 날짜의 지원 내역
  const selectedDayApps = selectedDate
    ? applications.filter(app => app.work_date?.startsWith(selectedDate))
    : []

  // 오늘 날짜 키
  const todayKey = new Date().toISOString().slice(0, 10)

  // 셀 클릭 시 선택 토글
  const handleCellClick = (key: string) => {
    setSelectedDate(prev => prev === key ? null : key)
  }

  return (
    <>
      {/* ── 월간 캘린더 ── */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)] overflow-hidden">
        {/* 캘린더 헤더: 이전/다음 달 이동 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={onPrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#4e5968]" />
          </button>
          <p className="text-[15px] font-extrabold text-[#191f28]">
            {year}년 {month + 1}월
          </p>
          <button onClick={onNextMonth}
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
              <MonthCell
                key={key}
                day={day}
                dateKey={key}
                status={status}
                isToday={isToday}
                isSelected={isSelected}
                columnIndex={i}
                onClick={handleCellClick}
              />
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
                <button
                  type="button"
                  key={app.id}
                  onClick={() => onApplicationClick?.(app)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors text-left w-full"
                >
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
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
