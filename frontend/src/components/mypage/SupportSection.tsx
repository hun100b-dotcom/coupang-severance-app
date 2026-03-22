// 고객지원 섹션 — 문의내역 아코디언 + 카테고리 필터 + 관리자 답변 접기/펼치기
// - 기본(접힌 상태): 최근 3건만 표시
// - 섹션 헤더 클릭 시 전체 펼쳐짐 (accordion)
// - 펼쳐진 상태: 카테고리 필터 탭 노출
// - 각 문의 카드: 관리자 답변을 별도로 접기/펼치기 가능

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  ChevronDown,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
} from 'lucide-react'
import type { InquiryItem } from './InquiryHistory'

interface SupportSectionProps {
  inquiries: InquiryItem[]
  loadingInquiries: boolean
  onOpenInquiry: () => void // 1:1 문의 모달 열기
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

// 카테고리 필터 탭 목록 (전체 포함)
const CATEGORY_TABS = ['전체', '퇴직금/실업급여', '서류발급', '오류/버그', '기타']

// 문의 상태별 배지 스타일/레이블
function StatusBadge({ status, answered }: { status: string | null; answered: boolean }) {
  if (answered || status === '답변완료' || status === 'answered') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        완료
      </span>
    )
  }
  if (status === '처리중' || status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-500">
        <Clock className="w-3 h-3" />
        처리중
      </span>
    )
  }
  // 기본: 접수됨 (대기중)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">
      <Clock className="w-3 h-3" />
      접수됨
    </span>
  )
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

export function SupportSection({
  inquiries,
  loadingInquiries,
  onOpenInquiry,
}: SupportSectionProps) {
  // 섹션 전체 펼침/접힘 상태
  const [isExpanded, setIsExpanded] = useState(false)
  // 카테고리 필터 선택 상태
  const [activeCategory, setActiveCategory] = useState('전체')
  // 각 문의 카드의 답변 펼침 상태 (id → boolean)
  const [openAnswers, setOpenAnswers] = useState<Record<string, boolean>>({})
  // FAQ 아코디언 열림 상태
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // 카테고리 필터 적용
  const filteredInquiries =
    activeCategory === '전체'
      ? inquiries
      : inquiries.filter((item) => item.category === activeCategory)

  // 접힌 상태에서는 최근 3건만 표시
  const displayedInquiries = isExpanded ? filteredInquiries : inquiries.slice(0, 3)

  // 답변 펼침/접힘 토글
  function toggleAnswer(id: string) {
    setOpenAnswers((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // 섹션 펼침 시 카테고리 초기화
  function handleToggleExpand() {
    if (!isExpanded) {
      setActiveCategory('전체')
    }
    setIsExpanded((prev) => !prev)
  }

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
        <button
          type="button"
          onClick={onOpenInquiry}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#3182f6] text-white hover:bg-[#1b64da] active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(49,130,246,0.3)] mb-4"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-extrabold">1:1 문의하기</p>
            <p className="text-[11px] text-white/75 mt-0.5">
              퇴직금·실업급여 관련 궁금한 점을 남겨주세요
            </p>
          </div>
          <Plus className="w-4 h-4 text-white/75" />
        </button>

        {/* ── 문의 내역 섹션 헤더 (아코디언 토글) ── */}
        <button
          type="button"
          onClick={handleToggleExpand}
          className="w-full flex items-center justify-between mb-2 group"
        >
          <p className="text-[12px] font-bold text-[#4e5968]">
            문의 내역
            {inquiries.length > 0 && (
              <span className="ml-1.5 text-[10px] font-semibold text-[#8b95a1]">
                ({inquiries.length}건)
              </span>
            )}
          </p>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-[#8b95a1]" />
          </motion.div>
        </button>

        {/* 카테고리 필터 탭 — 펼쳐진 상태에서만 노출 */}
        <AnimatePresence>
          {isExpanded && inquiries.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 hide-scrollbar"
                style={{ scrollbarWidth: 'none' }}>
                {CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all active:scale-95 ${
                      activeCategory === cat
                        ? 'bg-[#191f28] text-white'
                        : 'bg-slate-100 text-[#4e5968]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 문의 내역 리스트 */}
        {loadingInquiries ? (
          <div className="h-12 rounded-2xl bg-slate-100 animate-pulse mb-3" />
        ) : displayedInquiries.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 mb-3">
            <p className="text-[12px] text-[#8b95a1]">
              {isExpanded && activeCategory !== '전체'
                ? `'${activeCategory}' 카테고리의 문의가 없어요`
                : '아직 남긴 문의가 없어요'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 mb-3">
            {displayedInquiries.map((item) => {
              const answered =
                (item.status &&
                  (item.status === '답변완료' || item.status === 'answered')) ||
                !!item.answer
              const isAnswerOpen = openAnswers[item.id] ?? false

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 space-y-1"
                >
                  {/* 날짜 + 상태 배지 */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-[#8b95a1]">{formatDate(item.created_at)}</p>
                    <StatusBadge status={item.status} answered={!!answered} />
                  </div>

                  {/* 카테고리 + 제목 */}
                  {item.category && (
                    <p className="text-[10px] font-semibold text-[#3182f6]">{item.category}</p>
                  )}
                  <p className="text-[13px] font-semibold text-[#191f28] truncate">
                    {item.title || '제목 없음'}
                  </p>
                  <p className="text-[11px] text-[#4e5968] line-clamp-1">{item.content}</p>

                  {/* 관리자 답변 접기/펼치기 */}
                  {item.answer && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => toggleAnswer(item.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#3182f6] hover:text-[#1b64da] transition-colors"
                      >
                        <span>{isAnswerOpen ? '답변 접기' : '답변 보기'}</span>
                        <motion.div
                          animate={{ rotate: isAnswerOpen ? 90 : 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </motion.div>
                      </button>

                      {/* 답변 내용 — AnimatePresence로 부드럽게 */}
                      <AnimatePresence>
                        {isAnswerOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1.5 rounded-xl bg-white border border-slate-100 px-3 py-2">
                              <p className="text-[10px] font-semibold text-[#4e5968] mb-0.5">
                                CATCH 답변
                              </p>
                              <p className="text-[11px] text-[#4e5968] whitespace-pre-line">
                                {item.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* 접힌 상태에서 3건 초과 시 "더보기" 안내 */}
        {!isExpanded && inquiries.length > 3 && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="w-full text-[11px] font-bold text-[#8b95a1] py-1 hover:text-[#4e5968] transition-colors"
          >
            전체 {inquiries.length}건 보기
          </button>
        )}

        {/* FAQ 아코디언 */}
        <p className="text-[12px] font-bold text-[#4e5968] mb-2 mt-2">자주 묻는 질문</p>
        <div className="space-y-1.5">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <p className="text-[12px] font-bold text-[#191f28] pr-4">{faq.q}</p>
                <motion.div
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-[#8b95a1] flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-[12px] text-[#4e5968] leading-relaxed border-t border-slate-100 pt-2.5">
                        {faq.a}
                      </p>
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
