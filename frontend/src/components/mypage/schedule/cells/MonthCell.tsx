// 🔘 월간 캘린더의 단일 날짜 셀
// 날짜 숫자 + 출근 상태 점(확정/완료) 표시 + 클릭 시 선택 상태 토글
// 기존 MyScheduleTab L196~229 영역을 그대로 분리했다.

interface Props {
  day: number
  dateKey: string // "YYYY-MM-DD"
  status?: { confirmed: boolean; completed: boolean }
  isToday: boolean
  isSelected: boolean
  columnIndex: number // 그리드 상의 인덱스 (요일 색상 계산용, 일=0, 토=6)
  onClick: (dateKey: string) => void
}

export default function MonthCell({
  day,
  dateKey,
  status,
  isToday,
  isSelected,
  columnIndex,
  onClick,
}: Props) {
  return (
    <button
      onClick={() => onClick(dateKey)}
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
        columnIndex % 7 === 0 ? 'text-red-400' :
        columnIndex % 7 === 6 ? 'text-blue-400' :
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
}
