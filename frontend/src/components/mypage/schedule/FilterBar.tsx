// 🔍 스케줄 필터 바 — 검색 + 접이식 필터 드롭다운
// 기획서 tasks/schedule-manager-plan.md §2-1 "모달 X, 드롭다운" 방침 준수
// - 상단: 회사명 검색 input (항상 노출) + 필터 토글 버튼
// - 확장영역: 상태/회사/기간 3섹션 × 단일선택 칩 + 초기화
// - 필터 적용 중이면 빨간 점 표시 + "필터 적용: N건 조회 중" 메타
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

// ── 필터 상태 타입 ──
// 외부(훅/컨테이너)에서도 import 가능하도록 export
// 모든 값이 'all' 또는 빈 문자열이면 "필터 미적용" 상태
export interface ScheduleFilters {
  search: string                                                        // 회사명 부분일치 검색어
  status: 'all' | 'applied' | 'confirmed' | 'completed' | 'cancelled'   // 지원 상태
  company: 'all' | 'coupang' | 'kurly' | 'cj' | 'other'                 // 회사 그룹
  period: 'all' | 'week' | 'month' | 'quarter'                          // 기간(이번주/이번달/3개월)
}

// 필터 초기값 — 리셋 시 이 값으로 되돌린다
export const DEFAULT_FILTERS: ScheduleFilters = {
  search: '',
  status: 'all',
  company: 'all',
  period: 'all',
}

interface Props {
  filters: ScheduleFilters               // 현재 필터 상태
  onChange: (next: ScheduleFilters) => void  // 필터 변경 콜백
  onReset: () => void                    // 초기화 콜백 (부모에서 URL까지 정리하도록 위임)
  filteredCount?: number                 // 필터 적용 결과 개수 (메타 표시용)
}

// ── 칩 옵션 정의 ──
// 각 섹션의 라벨을 상수로 분리 → 한 곳에서 수정 가능
const STATUS_OPTIONS: { key: ScheduleFilters['status']; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'applied',   label: '지원완료' },
  { key: 'confirmed', label: '출근확정' },
  { key: 'completed', label: '출근완료' },
  { key: 'cancelled', label: '취소' },
]

const COMPANY_OPTIONS: { key: ScheduleFilters['company']; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'coupang', label: '쿠팡' },
  { key: 'kurly',   label: '컬리' },
  { key: 'cj',      label: 'CJ' },
  { key: 'other',   label: '기타' },
]

const PERIOD_OPTIONS: { key: ScheduleFilters['period']; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'week',    label: '이번주' },
  { key: 'month',   label: '이번달' },
  { key: 'quarter', label: '3개월' },
]

// 필터 하나라도 'all' 이 아니거나 검색어가 있으면 "활성" 상태로 간주
// → 빨간 점 / 메타 표시 조건에 사용
export function isFilterActive(f: ScheduleFilters): boolean {
  return (
    f.search.trim().length > 0 ||
    f.status !== 'all' ||
    f.company !== 'all' ||
    f.period !== 'all'
  )
}

export default function FilterBar({ filters, onChange, onReset, filteredCount }: Props) {
  // 드롭다운 펼침 여부 (기본: 접힘)
  const [expanded, setExpanded] = useState(false)
  // 필터 활성 여부 (빨간 점 / 메타 표시에 사용)
  const active = isFilterActive(filters)

  // 칩 하나 클릭 핸들러 생성기 — section 키와 value를 바인딩해서 새 filters 반환
  const setField = <K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── 상단 바: 검색 + 필터 토글 ── */}
      <div className="flex items-center gap-2">
        {/* 검색 input — 항상 노출 (드롭다운 접혀 있어도 사용 가능) */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b95a1] pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setField('search', e.target.value)}
            placeholder="회사명으로 검색..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-[13px] text-[#191f28] placeholder:text-[#b0b8c1] focus:outline-none focus:border-[#3182f6] transition-colors"
          />
          {/* 검색어 있을 때 X 버튼 노출 */}
          {filters.search && (
            <button
              type="button"
              onClick={() => setField('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8b95a1] hover:text-[#191f28]"
              aria-label="검색어 지우기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 필터 토글 버튼 — 펼쳐진 상태면 파랑 배경 */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className={`
            relative flex items-center justify-center gap-1.5
            px-3 py-2.5 rounded-2xl border transition-colors
            ${expanded
              ? 'bg-[#3182f6] text-white border-[#3182f6]'
              : 'bg-white text-[#4e5968] border-slate-200 hover:bg-slate-50'}
          `}
          aria-label="필터"
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-[13px] font-bold">필터</span>
          {/* 활성 필터 있으면 빨간 점 (펼침 상태에서도 유지) */}
          {active && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
          )}
        </button>
      </div>

      {/* ── 필터 적용 메타 표시 ── */}
      {active && typeof filteredCount === 'number' && (
        <p className="text-[12px] text-[#4e5968] px-1">
          필터 적용: <span className="font-bold text-[#3182f6]">{filteredCount}건</span> 조회 중
        </p>
      )}

      {/* ── 확장 영역 (드롭다운) ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="filter-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-3 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
              {/* 상태 섹션 */}
              <FilterSection
                label="상태"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(v) => setField('status', v)}
              />
              {/* 회사 섹션 */}
              <FilterSection
                label="회사"
                options={COMPANY_OPTIONS}
                value={filters.company}
                onChange={(v) => setField('company', v)}
              />
              {/* 기간 섹션 */}
              <FilterSection
                label="기간"
                options={PERIOD_OPTIONS}
                value={filters.period}
                onChange={(v) => setField('period', v)}
              />

              {/* 하단 초기화 버튼 */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[12px] text-slate-500 underline hover:text-slate-700"
                >
                  초기화
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── 단일 섹션 (라벨 + 칩 그룹) ──
// FilterBar 내부에서만 사용 → 별도 export 하지 않음
interface SectionProps<T extends string> {
  label: string
  options: { key: T; label: string }[]
  value: T
  onChange: (next: T) => void
}
function FilterSection<T extends string>({ label, options, value, onChange }: SectionProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold text-[#8b95a1] px-0.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`
                px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors
                ${active
                  ? 'bg-[#3182f6] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
              `}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
