// NoticesPage.tsx — 공지사항 전체 목록 페이지
// - 홈 화면의 공지사항 배너 클릭 시 이동하는 페이지
// - 카드 상단: 제목(title) 굵게 표시
// - 카드 하단: 본문(content) 3줄 미리보기 (말줄임)
// - 카드 클릭 시 모달에서 제목 + 전체 본문 표시

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Megaphone, X, Clock } from 'lucide-react'
import { useNotices } from '../hooks/useNotices'
import type { Notice } from '../types/supabase'

export default function NoticesPage() {
  const navigate = useNavigate()
  // Supabase에서 is_active=true 공지만 가져옴 (priority 내림차순 정렬)
  const { notices, loading } = useNotices()

  // 모달에 표시할 공지 (null이면 닫힘)
  const [selected, setSelected] = useState<Notice | null>(null)

  // ISO 날짜 문자열 → "YYYY.MM.DD" 형식 변환
  function formatDate(isoString: string) {
    const d = new Date(isoString)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  }

  return (
    // 전체 페이지 래퍼
    <div className="relative z-[1] min-h-screen bg-gray-50">

      {/* ── 커스텀 상단 헤더 ──
          TopNav는 Layout에 포함되므로 sticky top-14 로 그 아래에 배치 */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {/* 뒤로가기 버튼 */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="홈으로 돌아가기"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>

        {/* 페이지 제목 */}
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-blue-500" />
          <h1 className="text-base font-bold text-gray-800">공지사항</h1>
        </div>
      </div>

      {/* ── 공지사항 카드 목록 ── */}
      <div className="max-w-[500px] mx-auto px-4 py-4 space-y-3">

        {/* 로딩 중: 스켈레톤 카드 */}
        {loading && (
          <>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                {/* 제목 스켈레톤 */}
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                {/* 본문 스켈레톤 */}
                <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </>
        )}

        {/* 공지사항 없음 안내 */}
        {!loading && notices.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">등록된 공지사항이 없습니다.</p>
          </div>
        )}

        {/* 공지사항 카드 목록 */}
        {!loading && notices.map((notice, idx) => (
          <motion.button
            key={notice.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.25 }}
            onClick={() => setSelected(notice)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                       hover:border-blue-200 hover:shadow-md active:scale-[0.98]
                       transition-all duration-150"
          >
            {/* 카드 상단: 공지 번호 배지 + 날짜 */}
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600
                               bg-blue-50 px-2 py-0.5 rounded-full">
                <Megaphone size={10} />
                공지 {idx + 1}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={10} />
                {formatDate(notice.created_at)}
              </span>
            </div>

            {/* 제목: 굵게 표시. title이 없으면 content 앞부분으로 대체 */}
            <p className="text-sm font-bold text-gray-800 mb-1.5 leading-snug line-clamp-1">
              {notice.title?.trim() || notice.content.slice(0, 30)}
            </p>

            {/* 본문 미리보기: 최대 2줄, 넘치면 말줄임 */}
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
              {notice.content}
            </p>

            {/* 본문이 길 때 "전체보기" 힌트 */}
            {notice.content.length > 60 && (
              <p className="text-xs text-blue-400 mt-1.5 font-medium">전체보기 →</p>
            )}
          </motion.button>
        ))}
      </div>

      {/* ── 공지사항 상세 모달 ── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
              onClick={() => setSelected(null)}
            />

            {/* 모달 카드 (모바일: 하단 시트, PC: 중앙 모달) */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
                         md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                         md:max-w-lg md:w-full md:rounded-3xl"
              style={{ maxHeight: '80vh' }}
            >
              {/* 모바일 핸들 바 */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-blue-500" />
                  <span className="font-bold text-gray-800 text-base">공지사항</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="모달 닫기"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* 모달 본문 (스크롤 가능) */}
              <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
                {/* 날짜 */}
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(selected.created_at)}
                </p>

                {/* 제목: 굵게 크게 표시 */}
                {selected.title?.trim() && (
                  <h2 className="text-base font-bold text-gray-800 mb-3 leading-snug">
                    {selected.title}
                  </h2>
                )}

                {/* 본문 구분선 (제목이 있을 때만 표시) */}
                {selected.title?.trim() && (
                  <hr className="border-gray-100 mb-3" />
                )}

                {/* 전체 본문: 줄바꿈 보존 */}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>
              </div>

              {/* 모달 하단 닫기 버튼 */}
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold
                             hover:bg-gray-200 transition-colors active:scale-[0.98]"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
