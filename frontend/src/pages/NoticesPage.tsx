// NoticesPage.tsx — 공지사항 전체 목록 페이지
// - 홈 화면의 공지사항 배너 클릭 시 이동하는 페이지
// - 공지사항을 카드 형식으로 나열
// - 각 카드 클릭 시 모달에서 전체 내용 표시
// - TopNav 뒤로가기 버튼으로 홈으로 복귀 (서비스 플로우 방해하지 않음)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Megaphone, X, Clock } from 'lucide-react'
import { useNotices } from '../hooks/useNotices'
import type { Notice } from '../types/supabase'

export default function NoticesPage() {
  const navigate = useNavigate()
  // 공지사항 목록을 Supabase에서 가져오는 훅 (is_active=true, priority desc 정렬)
  const { notices, loading } = useNotices()

  // 모달에서 표시할 공지사항 (null이면 모달 닫힘)
  const [selected, setSelected] = useState<Notice | null>(null)

  // 날짜를 "YYYY.MM.DD" 형식으로 변환
  function formatDate(isoString: string) {
    const d = new Date(isoString)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  }

  return (
    // 전체 페이지: 흰 배경, 최소 높이 전체 화면
    <div className="relative z-[1] min-h-screen bg-gray-50">

      {/* ── 커스텀 상단 헤더 (TopNav 대신 사용) ──
          TopNav는 이미 Layout에 포함되어 있으므로,
          이 페이지는 Layout 안에 들어가 pt-14 패딩이 적용됨.
          하지만 뒤로가기 UI를 명확히 제공하기 위해 별도 헤더 추가. */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {/* 뒤로가기 버튼: 홈으로 이동 */}
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

        {/* 로딩 중: 스켈레톤 카드 표시 */}
        {loading && (
          <>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </>
        )}

        {/* 공지사항 없음 */}
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
            // 카드 스타일: 흰 배경, 둥근 모서리, 그림자, 클릭 시 강조
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                       hover:border-blue-200 hover:shadow-md active:scale-[0.98]
                       transition-all duration-150"
          >
            {/* 카드 상단: 공지 번호 배지 + 날짜 */}
            <div className="flex items-center justify-between mb-2">
              {/* 공지 번호 배지 */}
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600
                               bg-blue-50 px-2 py-0.5 rounded-full">
                <Megaphone size={10} />
                공지 {idx + 1}
              </span>
              {/* 등록 날짜 */}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={10} />
                {formatDate(notice.created_at)}
              </span>
            </div>

            {/* 공지 내용: 3줄까지 미리보기, 넘치면 말줄임 */}
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
              {notice.content}
            </p>

            {/* 전체보기 힌트 (내용이 길 때) */}
            {notice.content.length > 80 && (
              <p className="text-xs text-blue-400 mt-1.5 font-medium">전체보기 →</p>
            )}
          </motion.button>
        ))}
      </div>

      {/* ── 공지사항 상세 모달 ──
          선택된 공지사항이 있을 때만 표시 */}
      <AnimatePresence>
        {selected && (
          <>
            {/* 모달 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
              onClick={() => setSelected(null)} // 배경 클릭 시 닫기
            />

            {/* 모달 카드 */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              // 모바일: 하단에서 올라오는 시트 스타일
              // PC: 화면 중앙 모달 스타일
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
                         md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                         md:max-w-lg md:w-full md:rounded-3xl"
              style={{ maxHeight: '80vh' }}
            >
              {/* 모달 상단 핸들 (모바일 바텀시트 스타일) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-blue-500" />
                  <span className="font-bold text-gray-800 text-base">공지사항</span>
                </div>
                {/* 닫기 버튼 */}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="모달 닫기"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* 모달 본문: 전체 공지 내용 스크롤 가능 */}
              <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                {/* 날짜 표시 */}
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(selected.created_at)}
                </p>

                {/* 전체 내용: whitespace-pre-wrap으로 줄바꿈 보존 */}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>
              </div>

              {/* 모달 하단 닫기 버튼 (모바일에서 터치하기 쉽도록) */}
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
