// 저장된 계산 기록 섹션 — 탭 필터 + 카드 리스트
// Supabase reports 테이블에서 최대 50건 조회
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, FileText } from 'lucide-react'
import type { ReportRow, AnyPayload } from '../../types/supabase'

interface Props {
  reports: ReportRow[]           // 최대 50건
  loading: boolean
  onSelectReport: (report: ReportRow) => void  // 카드 클릭 → 상세 모달
  onGoCalculate: () => void      // 빈 상태에서 계산 시작
}

// 탭 타입: 전체 / 퇴직금 / 실업급여 / 주휴수당 / 연차수당
type Tab = 'all' | 'severance' | 'unemployment' | 'weekly_allowance' | 'annual_leave'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: '📂' },
  { key: 'severance', label: '퇴직금', icon: '💼' },
  { key: 'unemployment', label: '실업급여', icon: '🛡️' },
  { key: 'weekly_allowance', label: '주휴수당', icon: '📅' },
  { key: 'annual_leave', label: '연차수당', icon: '📋' },
]

// 포맷 헬퍼
function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}
function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch { return iso }
}

// payload type 판별
function getPayloadType(payload: AnyPayload | null | undefined): Tab | 'unknown' {
  if (!payload) return 'unknown'
  if ('type' in payload) return (payload as { type: string }).type as Tab
  if ('severance' in payload) return 'severance'
  return 'unknown'
}

// 각 타입별 요약 금액 텍스트
function getSummaryText(payload: AnyPayload | null | undefined): string {
  if (!payload) return ''
  const type = getPayloadType(payload)
  if (type === 'severance') {
    const p = payload as { severance: number }
    return fmt(Math.round(p.severance))
  }
  if (type === 'weekly_allowance') {
    const p = payload as { weekly_allowance: number }
    return fmt(p.weekly_allowance)
  }
  if (type === 'annual_leave') {
    const p = payload as { annual_leave_allowance: number }
    return p.annual_leave_allowance > 0 ? fmt(p.annual_leave_allowance) : `${(payload as { annual_leave_days: number }).annual_leave_days}일`
  }
  if (type === 'unemployment') {
    const p = payload as { total_estimate: number }
    return fmt(Math.round(p.total_estimate))
  }
  return ''
}

// 탭별 색상 설정
const TAB_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  severance:        { bg: 'bg-blue-50',    text: 'text-blue-600',   dot: 'bg-blue-400' },
  unemployment:     { bg: 'bg-violet-50',  text: 'text-violet-600', dot: 'bg-violet-400' },
  weekly_allowance: { bg: 'bg-emerald-50', text: 'text-emerald-600',dot: 'bg-emerald-400' },
  annual_leave:     { bg: 'bg-amber-50',   text: 'text-amber-600',  dot: 'bg-amber-400' },
  unknown:          { bg: 'bg-slate-50',   text: 'text-slate-600',  dot: 'bg-slate-400' },
}

import { useState } from 'react'

export function SavedResultsList({ reports, loading, onSelectReport, onGoCalculate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all')

  // 탭 필터링
  const filtered = activeTab === 'all'
    ? reports
    : reports.filter(r => getPayloadType(r.payload) === activeTab)

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 overflow-hidden"
    >
      {/* 섹션 헤더 */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-extrabold text-[#191f28] tracking-tight">내 계산 기록</p>
          {reports.length > 0 && (
            <span className="text-[11px] text-[#8b95a1]">총 {reports.length}건</span>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.key} type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#3182f6] text-white shadow-[0_4px_12px_rgba(49,130,246,0.3)]'
                  : 'bg-slate-100 text-[#4e5968] hover:bg-slate-200'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="px-5 pb-5 space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div className="px-5 pb-6 flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-[#191f28]">
              {activeTab === 'all' ? '아직 저장된 계산이 없어요' : `저장된 ${TABS.find(t => t.key === activeTab)?.label} 기록이 없어요`}
            </p>
            <p className="text-[12px] text-[#8b95a1] mt-1">결과 화면에서 저장하면 여기서 다시 볼 수 있어요</p>
          </div>
          {activeTab === 'all' && (
            <button type="button" onClick={onGoCalculate}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#3182f6] text-white text-xs font-semibold shadow-[0_6px_20px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] transition-colors">
              <Calculator className="w-3.5 h-3.5" />
              계산하러 가기
            </button>
          )}
        </div>
      )}

      {/* 리스트 */}
      {!loading && filtered.length > 0 && (
        <ul className="px-4 pb-4 space-y-2">
          {filtered.map(report => {
            const type = getPayloadType(report.payload)
            const colors = TAB_COLORS[type] ?? TAB_COLORS.unknown
            const tabInfo = TABS.find(t => t.key === type)
            const summary = getSummaryText(report.payload)
            return (
              <motion.li key={report.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}>
                <button type="button" onClick={() => onSelectReport(report)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-100/80 active:scale-[0.98] transition-all">
                  {/* 타입 아이콘 */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                    <span className="text-lg">{tabInfo?.icon ?? '📂'}</span>
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#191f28] truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#8b95a1]">{formatDate(report.created_at)}</span>
                      {report.company_name && (
                        <>
                          <span className="text-[#d1d5db]">·</span>
                          <span className="text-[10px] text-[#8b95a1] truncate">{report.company_name}</span>
                        </>
                      )}
                    </div>
                    {summary && (
                      <p className={`text-[13px] font-extrabold mt-1 ${colors.text}`}>{summary}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#d1d5db] flex-shrink-0" />
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )
}
