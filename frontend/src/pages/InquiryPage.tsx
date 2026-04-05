// 문의하기 페이지 (/inquiry)
// - 문의 유형 선택 (일반 문의 / 채용 관련 / 기술 문제 / 기타)
// - 제목 + 내용 입력
// - Supabase inquiries 테이블에 INSERT
// - 제출 완료 후 토스트 메시지 + 자동 뒤로가기

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// 문의 유형 목록
const CATEGORIES = ['일반 문의', '채용 관련', '기술 문제', '기타'] as const
type Category = typeof CATEGORIES[number]

export default function InquiryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── 폼 상태
  const [category, setCategory] = useState<Category>('일반 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // ── 제출 상태
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── 완료 토스트 상태
  const [showSuccess, setShowSuccess] = useState(false)

  // 폼 제출 핸들러
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      console.error('문의 제출 실패:', err)
      setError('문의 제출에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
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
          <h1 className="text-2xl font-bold text-[#191F28] mb-1">문의하기</h1>
          <p className="text-sm text-gray-500">궁금한 점이나 불편한 점을 알려주세요. 빠르게 답변드릴게요.</p>
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
