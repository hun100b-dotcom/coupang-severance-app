// 문의하기 페이지 (/inquiry)
// - 문의 유형 선택 (일반 문의 / 채용 관련 / 기술 문제 / 기타)
// - 제목 + 내용 입력
// - Supabase inquiries 테이블에 INSERT
// - 제출 완료 후 토스트 메시지 + 자동 뒤로가기

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, CheckCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// 문의 유형 목록
const CATEGORIES = ['일반 문의', '채용 관련', '기술 문제', '기타'] as const
type Category = typeof CATEGORIES[number]

// FAQ 항목 (하드코딩)
const FAQ_ITEMS = [
  {
    id: 1,
    title: '퇴직금 계산 기준이 뭔가요?',
    answer: '퇴직금은 퇴직 전 3개월 평균 임금 기준으로 계산합니다. 계속 근무 기간이 1년(365일) 이상이어야 하며, 1년마다 평균 임금 30일분이 지급됩니다. 일용직은 28일 역산 블록 방식으로 적격 근무일을 산정합니다.',
  },
  {
    id: 2,
    title: '일용직도 실업급여를 받을 수 있나요?',
    answer: '네, 받을 수 있습니다. 이직일 이전 18개월 중 피보험 단위기간이 180일 이상이고, 비자발적 이직(계약 종료, 권고사직 등)이어야 합니다. 일용직은 월 10일 미만 근무 시 수급 요건이 별도로 적용됩니다.',
  },
  {
    id: 3,
    title: 'CATCH 앱은 무료인가요?',
    answer: '네, 기본 계산 기능(퇴직금·실업급여·주휴수당·연차수당)은 완전 무료입니다. 로그인 시 계산 이력 저장, PDF 정밀 분석 등 추가 기능도 이용하실 수 있습니다.',
  },
  {
    id: 4,
    title: '개인정보는 어떻게 처리되나요?',
    answer: '입력하신 개인정보는 서비스 제공 목적으로만 사용되며, 제3자에게 제공되지 않습니다. 업로드하신 PDF 파일은 계산 후 즉시 삭제되며, 저장을 원하지 않으시면 로그인 없이도 이용 가능합니다.',
  },
  {
    id: 5,
    title: '계산 결과가 실제와 다를 수 있나요?',
    answer: 'CATCH는 참고용 계산기입니다. 실제 지급 금액은 근로계약 조건, 공제 항목, 회사 규정 등에 따라 달라질 수 있습니다. 정확한 금액 확인이나 분쟁 해결을 위해서는 고용노동부 또는 노무사 상담을 권장합니다.',
  },
] as const

export default function InquiryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── FAQ 검색 + 펼치기 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaqId, setOpenFaqId] = useState<number | null>(null)

  // 검색어로 FAQ 필터링
  const filteredFaqs = FAQ_ITEMS.filter(
    (faq) =>
      faq.title.includes(searchQuery) || faq.answer.includes(searchQuery)
  )

  // ── 폼 상태
  const [category, setCategory] = useState<Category>('일반 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // ── 제출 상태
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── 완료 토스트 상태
  const [showSuccess, setShowSuccess] = useState(false)

  // 폼 제출 핸들러 — type="button" 버튼에서 직접 호출하므로 이벤트 매개변수 불필요
  async function handleSubmit() {
    setError('')

    // 유효성 검사
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    if (title.trim().length < 2) {
      setError('제목은 2자 이상 입력해주세요.')
      return
    }
    if (!content.trim()) {
      setError('문의 내용을 입력해주세요.')
      return
    }
    if (content.trim().length < 10) {
      setError('문의 내용을 10자 이상 입력해주세요.')
      return
    }

    if (!supabase) {
      setError('서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setSubmitting(true)
    try {
      // inquiries 테이블에 INSERT
      // user_id가 있으면 로그인 사용자, 없으면 비회원 문의
      const { error: dbError } = await supabase.from('inquiries').insert({
        user_id: user?.raw.id ?? null, // 비회원도 문의 가능
        category: category,
        title: title.trim(),
        content: content.trim(),
        status: 'waiting', // 접수됨 상태로 시작
      })

      if (dbError) throw dbError

      // 성공 토스트 표시
      setShowSuccess(true)

      // 2.5초 후 이전 페이지로 자동 이동
      setTimeout(() => {
        navigate(-1)
      }, 2500)
    } catch (err) {
      if (import.meta.env.DEV) console.error('문의 제출 실패:', err)
      setError('문의 제출에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative z-[1] min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* ── 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">뒤로 가기</span>
          </button>
          <h1 className="text-2xl font-bold text-[#191F28] mb-1">고객센터</h1>
          <p className="text-sm text-gray-500">궁금한 점이나 불편한 점을 알려주세요. 빠르게 답변드릴게요.</p>
        </div>

        {/* ── FAQ 섹션 */}
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/50 p-6 mb-4">
          <h2 className="text-[15px] font-extrabold text-[#191f28] mb-4">자주 묻는 질문</h2>

          {/* 검색창 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="궁금한 내용을 검색해보세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* FAQ 목록 */}
          {filteredFaqs.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-4">검색 결과가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-[13px] font-semibold text-[#191f28] leading-snug flex-1">
                      Q. {faq.title}
                    </span>
                    {openFaqId === faq.id ? (
                      <ChevronUp className="w-4 h-4 text-[#3182f6] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaqId === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-0 bg-blue-50/50 border-t border-blue-100/50">
                          <p className="text-[12px] text-[#4e5968] leading-relaxed pt-2">
                            A. {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 구분선 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[12px] font-medium text-gray-400">직접 문의하기</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── 폼 카드 */}
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/50 p-6 space-y-5">

          {/* 문의 유형 선택 */}
          <div>
            <label className="block text-[13px] font-bold text-[#191f28] mb-2">
              문의 유형 <span className="text-[#3182f6]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2.5 px-3 rounded-2xl text-[13px] font-semibold border transition-all active:scale-[0.97] ${
                    category === cat
                      ? 'bg-[#3182f6] text-white border-[#3182f6] shadow-[0_4px_12px_rgba(49,130,246,0.3)]'
                      : 'bg-white text-[#4e5968] border-slate-200 hover:border-[#3182f6] hover:text-[#3182f6]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 입력 */}
          <div>
            <label htmlFor="inquiry-title" className="block text-[13px] font-bold text-[#191f28] mb-2">
              제목 <span className="text-[#3182f6]">*</span>
            </label>
            <input
              id="inquiry-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              placeholder="문의 제목을 입력해주세요"
              maxLength={100}
              disabled={submitting}
              className="w-full px-4 py-3 text-[13px] border border-slate-200 rounded-2xl outline-none bg-white focus:border-[#3182f6] focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 placeholder:text-slate-300"
            />
            {/* 글자 수 카운터 */}
            <p className="text-[11px] text-slate-400 mt-1 text-right">{title.length}/100</p>
          </div>

          {/* 내용 입력 */}
          <div>
            <label htmlFor="inquiry-content" className="block text-[13px] font-bold text-[#191f28] mb-2">
              문의 내용 <span className="text-[#3182f6]">*</span>
            </label>
            <textarea
              id="inquiry-content"
              value={content}
              onChange={(e) => { setContent(e.target.value); setError('') }}
              placeholder="문의 내용을 상세히 입력해주세요&#10;(최소 10자 이상)"
              rows={5}
              maxLength={1000}
              disabled={submitting}
              className="w-full px-4 py-3 text-[13px] border border-slate-200 rounded-2xl outline-none bg-white focus:border-[#3182f6] focus:ring-2 focus:ring-blue-100 transition-all resize-none disabled:opacity-50 placeholder:text-slate-300"
            />
            {/* 글자 수 카운터 */}
            <p className="text-[11px] text-slate-400 mt-1 text-right">{content.length}/1000</p>
          </div>

          {/* 에러 메시지 */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-[12px] text-red-500 font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* 비회원 안내 */}
          {!user && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-[12px] text-amber-700">
                로그인하지 않은 경우 답변을 받으실 수 없습니다.
                답변을 원하시면 로그인 후 문의해주세요.
              </p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || showSuccess}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#3182f6] text-white text-[14px] font-bold shadow-[0_8px_24px_rgba(49,130,246,0.3)] hover:bg-[#1b64da] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              /* 제출 중 스피너 */
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>제출 중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>문의 제출하기</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 성공 토스트 (화면 하단 중앙에 표시) */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#191f28] text-white shadow-2xl text-[13px] font-semibold"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            문의가 정상적으로 접수되었습니다!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
