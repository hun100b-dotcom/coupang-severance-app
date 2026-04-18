// 🔁 스케줄 뷰 스위처
// 월간 / 주간 / 리스트 세 가지 뷰를 전환하는 3버튼 세그먼트 토글
// Toss 스타일: 활성 버튼은 Toss Blue(#3182f6) 배경 + 흰 글자 + 그림자
// 모바일에서 가로 스크롤 없이 한 줄에 3등분되도록 w-full + grid-cols-3 구성
import { CalendarDays, CalendarClock, List } from 'lucide-react'

// 스위처가 다루는 뷰 키 (index.ts 에서도 재export)
export type ViewKey = 'month' | 'week' | 'list'

interface Props {
  value: ViewKey                     // 현재 선택된 뷰
  onChange: (next: ViewKey) => void  // 뷰 변경 콜백
}

// 버튼 정의: 키 / 한국어 라벨 / 아이콘
// 순서를 배열로 분리해 두면 추후 뷰 추가/제거가 쉬워짐
const ITEMS: { key: ViewKey; label: string; Icon: typeof CalendarDays }[] = [
  { key: 'month', label: '월간', Icon: CalendarDays },
  { key: 'week',  label: '주간', Icon: CalendarClock },
  { key: 'list',  label: '리스트', Icon: List },
]

export default function ViewSwitcher({ value, onChange }: Props) {
  return (
    // 컨테이너: 연회색 배경 + 둥근 모서리 — 토글 "트랙" 역할
    // grid-cols-3 + 동일 gap 으로 모바일에서도 항상 3등분
    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl">
      {ITEMS.map(({ key, label, Icon }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            // 활성: 파랑 배경 + 흰글자 + 그림자 / 비활성: 투명 + hover 시 흰 배경
            className={`
              flex items-center justify-center gap-1.5
              px-3 py-2 rounded-xl
              text-[13px] font-bold
              transition-all duration-150
              ${active
                ? 'bg-[#3182f6] text-white shadow-[0_4px_12px_rgba(49,130,246,0.25)]'
                : 'text-[#4e5968] hover:bg-white/70'}
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
