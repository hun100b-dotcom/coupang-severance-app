// 1:1 문의를 작성하기 위한 모달 컴포넌트입니다.
// 제목/내용을 입력받고 저장 버튼을 누르면 상위 컴포넌트로 값을 전달합니다.

import { FormEvent, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'

interface InquiryModalProps {
  open: boolean // 모달 표시 여부입니다.
  onClose: () => void // 닫기 버튼이나 배경 클릭 시 호출되는 콜백입니다.
  onSubmit: (payload: { title: string; content: string }) => Promise<void> // 실제 저장 로직을 수행하는 비동기 콜백입니다.
}

export function InquiryModal({ open, onClose, onSubmit }: InquiryModalProps) {
  const [title, setTitle] = useState('') // 사용자가 입력한 제목입니다.
  const [content, setContent] = useState('') // 사용자가 입력한 본문 내용입니다.
  const [submitting, setSubmitting] = useState(false) // 제출 중 로딩 상태입니다.

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), content: content.trim() }) // 상위에서 전달받은 저장 로직을 실행합니다.
      setTitle('')
      setContent('')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 반투명 배경 */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 모달 카드 */}
          <motion.form
            onSubmit={handleSubmit}
            className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-[0_24px_80px_rgba(15,23,42,0.45)] border border-slate-100 px-5 py-5 space-y-4"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-semibold text-[#4e5968]">1:1 문의</p>
                <p className="text-sm font-extrabold text-[#191f28] tracking-tight">
                  궁금한 점을 편하게 남겨주세요
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e5968]">제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예) 퇴직금 계산 결과가 맞는지 확인하고 싶어요"
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3182f6]/40 focus:border-[#3182f6]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e5968]">내용</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="상세한 근무 기간, 궁금한 점 등을 자유롭게 적어주세요."
                  rows={5}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-sm text-[#191f28] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3182f6]/40 focus:border-[#3182f6] resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-[#3182f6] disabled:bg-slate-300 shadow-[0_14px_40px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>보내는 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>문의 보내기</span>
                </>
              )}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

