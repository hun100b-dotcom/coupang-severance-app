// 사용자가 남긴 1:1 문의 내역을 리스트로 보여주는 컴포넌트입니다.
// 답변 상태에 따라 '대기중' / '답변완료' 배지를 함께 렌더링합니다.

import { motion } from 'framer-motion'
import { MessageCircle, CheckCircle2, Clock } from 'lucide-react'

export interface InquiryItem {
  id: string
  title: string | null
  content: string
  status: string | null
  created_at: string
  answer?: string | null
}

interface InquiryHistoryProps {
  items: InquiryItem[]
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
      d.getDate(),
    ).padStart(2, '0')}`
  } catch {
    return iso
  }
}

export function InquiryHistory({ items }: InquiryHistoryProps) {
  return (
    <motion.section
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-5 space-y-3"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-extrabold text-[#191f28] tracking-tight">나의 상담 내역</p>
        {items.length > 0 && (
          <p className="text-[11px] text-[#8b95a1]">
            최근{' '}
            <span className="font-semibold text-[#4e5968]">{items.length.toLocaleString()}건</span>의
            문의
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#191f28]">아직 남긴 문의가 없어요</p>
              <p className="text-[11px] text-[#8b95a1]">
                퇴직금, 실업급여가 헷갈린다면 언제든 1:1 문의를 남겨주세요.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(item => {
            const answered =
              (item.status && item.status.toLowerCase() === 'answered') || !!item.answer
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#8b95a1]">{formatDate(item.created_at)}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      answered
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {answered ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>답변 완료</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>답변 대기중</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#191f28] truncate">
                  {item.title || '제목 없음'}
                </p>
                <p className="text-[11px] text-[#4e5968] line-clamp-2">{item.content}</p>
                {item.answer && (
                  <div className="mt-2 rounded-xl bg-white border border-slate-100 px-3 py-2">
                    <p className="text-[10px] font-semibold text-[#4e5968] mb-1">
                      CATCH 답변
                    </p>
                    <p className="text-[11px] text-[#4e5968] whitespace-pre-line">
                      {item.answer}
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )
}

