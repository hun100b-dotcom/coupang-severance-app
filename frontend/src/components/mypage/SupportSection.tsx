// 고객지원 섹션 — 1:1 문의, 문의 내역, FAQ 아코디언 통합
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown, CheckCircle2, Clock, Plus } from 'lucide-react'
import type { InquiryItem } from './InquiryHistory'

interface SupportSectionProps {
  inquiries: InquiryItem[]
  loadingInquiries: boolean
  onOpenInquiry: () => void  // 1:1 문의 모달 열기
}

// 자주 묻는 질문 데이터
const FAQS = [
  {
    q: '퇴직금은 언제 받을 수 있나요?',
    a: '퇴직 후 14일 이내에 지급받아야 합니다. 당사자 간 합의 시 연장 가능하지만, 법정 기한 내 미지급 시 고용노동부(1350)에 신고할 수 있어요.',
  },
  {
    q: '일용직도 실업급여를 받을 수 있나요?',
    a: '네! 일용직도 고용보험에 가입되어 있고, 최근 18개월 내 피보험 단위기간이 180일 이상이면 실업급여 수급 자격이 됩니다.',
  },
  {
    q: '주휴수당을 안 줬을 때는 어떻게 하나요?',
    a: '임금체불에 해당합니다. 고용노동부(1350)에 신고하거나, 지방노동청에 진정서를 제출할 수 있어요. 3년 내 청구가 가능합니다.',
  },
]

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch { return iso }
}

export function SupportSection({ inquiries, loadingInquiries, onOpenInquiry }: SupportSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4">
        <p className="text-[15px] font-extrabold text-[#191f28] tracking-tight mb-4">고객지원</p>

        {/* 1:1 문의 버튼 */}
        <button type="button" onClick={onOpenInquiry}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#3182f6] text-white hover:bg-[#1b64da] active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(49,130,246,0.3)] mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-extrabold">1:1 문의하기</p>
            <p className="text-[11px] text-white/75 mt-0.5">퇴직금·실업급여 관련 궁금한 점을 남겨주세요</p>
          </div>
          <Plus className="w-4 h-4 text-white/75" />
        </button>

        {/* 문의 내역 */}
        <p className="text-[12px] font-bold text-[#4e5968] mb-2">문의 내역</p>
        {loadingInquiries ? (
          <div className="h-12 rounded-2xl bg-slate-100 animate-pulse mb-3" />
        ) : inquiries.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 mb-3">
            <p className="text-[12px] text-[#8b95a1]">아직 남긴 문의가 없어요</p>
          </div>
        ) : (
          <ul className="space-y-2 mb-3">
            {inquiries.map(item => {
              const answered = (item.status && item.status.toLowerCase() === 'answered') || !!item.answer
              return (
                <li key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-[#8b95a1]">{formatDate(item.created_at)}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      answered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {answered
                        ? <><CheckCircle2 className="w-3 h-3" /><span>답변 완료</span></>
                        : <><Clock className="w-3 h-3" /><span>답변 대기중</span></>
                      }
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#191f28] truncate">{item.title || '제목 없음'}</p>
                  <p className="text-[11px] text-[#4e5968] line-clamp-1">{item.content}</p>
                  {item.answer && (
                    <div className="mt-1.5 rounded-xl bg-white border border-slate-100 px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#4e5968] mb-0.5">CATCH 답변</p>
                      <p className="text-[11px] text-[#4e5968] whitespace-pre-line line-clamp-2">{item.answer}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* FAQ 아코디언 */}
        <p className="text-[12px] font-bold text-[#4e5968] mb-2">자주 묻는 질문</p>
        <div className="space-y-1.5">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
              <button type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                <p className="text-[12px] font-bold text-[#191f28] pr-4">{faq.q}</p>
                <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-[#8b95a1] flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-[12px] text-[#4e5968] leading-relaxed border-t border-slate-100 pt-2.5">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
