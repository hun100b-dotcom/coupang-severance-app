// 퇴직금 여정 위젯: 정밀계산 이력이 있으면 최근 이력 표시, 없으면 정밀계산 유도
import { motion } from 'framer-motion'
import { Clock, ArrowRight, Calculator, CheckCircle2 } from 'lucide-react'
import type { ReportRow } from '../../types/supabase'

interface RetirementWidgetProps {
  workDays: number | null
  latestReport: ReportRow | null | undefined // undefined=로딩중, null=이력없음
  onGoCalculate: () => void
  onViewReport: (id: string) => void
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch { return iso }
}

export function RetirementWidget({ workDays, latestReport, onGoCalculate, onViewReport }: RetirementWidgetProps) {
  const progress = workDays != null ? Math.min(100, (workDays / 365) * 100) : 0
  const isLoading = latestReport === undefined

  return (
    <motion.section
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6 space-y-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-[#e8f3ff] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#3182f6]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#4e5968]">퇴직금 여정</p>
            <p className="text-sm font-extrabold text-[#191f28] tracking-tight">
              {latestReport ? '최근 정밀계산 이력' : '내 퇴직금 계산 현황'}
            </p>
          </div>
        </div>
        {workDays != null && (
          <p className="text-xs font-semibold text-[#3182f6]">
            {Math.round(progress)}% / 1년
          </p>
        )}
      </div>

      {/* 근무 일수 게이지 (workDays가 있을 때만) */}
      {workDays != null && (
        <div className="space-y-2">
          <p className="text-sm text-[#4e5968]">
            오늘까지 <span className="font-semibold text-[#191f28]">{workDays.toLocaleString()}일</span>{' '}
            가입 경과
          </p>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#3182f6]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </div>
      )}

      {/* 정밀계산 이력 있음 */}
      {!isLoading && latestReport ? (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-600">정밀계산 완료</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 space-y-1">
            <p className="text-sm font-extrabold text-[#191f28] tracking-tight truncate">
              {latestReport.company_name ?? latestReport.title ?? '계산 완료'}
            </p>
            <p className="text-[11px] text-[#8b95a1]">
              {formatDate(latestReport.created_at)} 계산
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onViewReport(latestReport.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#3182f6] text-white text-xs font-semibold shadow-[0_10px_30px_rgba(49,130,246,0.3)] hover:bg-[#1b64da] transition-colors"
            >
              <span>리포트 보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onGoCalculate}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 text-[#4e5968] text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>다시 계산</span>
            </button>
          </div>
        </div>
      ) : !isLoading && !latestReport ? (
        /* 이력 없음 → 정밀계산 유도 */
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <p className="text-sm text-[#8b95a1] leading-relaxed">
            아직 정밀계산 이력이 없어요.<br />
            PDF 파일로 정확한 퇴직금을 확인해보세요.
          </p>
          <button
            type="button"
            onClick={onGoCalculate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#3182f6] text-white text-xs font-semibold shadow-[0_10px_30px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>정밀계산 시작하기</span>
          </button>
        </div>
      ) : (
        /* 로딩 중 */
        <div className="pt-2 border-t border-slate-100">
          <div className="h-10 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      )}
    </motion.section>
  )
}
