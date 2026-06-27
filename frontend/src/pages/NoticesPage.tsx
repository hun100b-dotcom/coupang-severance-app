// NoticesPage.tsx — 공지사항 전체 목록 페이지 (2026 리디자인 "B-fixed")
// - Layout 안 페이지(TopNav/BottomNav는 Layout 제공)
// - 색: 블루 메인 + 회색 중립 (무지개 없음, 토큰화)
// - 반응형: 모바일 1열 / 데스크톱 2열 카드 그리드
// - 상세 모달: 모바일 바텀시트 / 데스크톱 중앙 다이얼로그, createPortal(body)로 z-[1] 컨텍스트 탈출(BottomNav 위 표시)
// - 카드 클릭 시 모달에서 제목 + 전체 본문 표시

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Megaphone, X, Clock } from 'lucide-react'
import { useNotices } from '../hooks/useNotices'
import Container from '../components/ui/Container'
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
    <div className="relative z-[1] min-h-screen">

      {/* ── 상단 헤더 — TopNav 아래 sticky 배치 ── */}
      <div className="sticky top-14 z-40 bg-page/85 backdrop-blur-md border-b border-line">
        <Container className="h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-md hover:bg-[#F2F4F6] transition-colors"
            aria-label="홈으로 돌아가기"
          >
            <ArrowLeft size={18} className="text-ink-700" />
          </button>
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-brand" />
            <h1 className="text-[17px] font-extrabold text-ink-900 tracking-tight">공지사항</h1>
          </div>
        </Container>
      </div>

      {/* ── 공지사항 카드 목록 ── */}
      <Container className="py-5">
        {/* 로딩 — 스켈레톤 그리드 */}
        {loading && (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-card border border-line">
                <div className="h-4 bg-line rounded w-2/3 mb-3 animate-pulse" />
                <div className="h-3 bg-line/70 rounded w-full mb-1.5 animate-pulse" />
                <div className="h-3 bg-line/70 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && notices.length === 0 && (
          <div className="bg-white rounded-xl border border-line shadow-card text-center py-16 px-6">
            <Megaphone size={36} className="mx-auto mb-3 text-ink-400" strokeWidth={1.5} />
            <p className="text-[15px] font-semibold text-ink-700">등록된 공지사항이 없어요</p>
            <p className="text-[13px] text-ink-500 mt-1">새 소식이 올라오면 여기에 표시됩니다</p>
          </div>
        )}

        {/* 목록 — 반응형 2열 그리드 */}
        {!loading && notices.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 items-stretch">
            {notices.map((notice, idx) => (
              <motion.button
                key={notice.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 8) * 0.05, duration: 0.25 }}
                onClick={() => setSelected(notice)}
                className="w-full h-full min-w-0 text-left bg-white rounded-xl p-4 shadow-card border border-line
                           hover:border-brand-200 hover:shadow-float hover:-translate-y-0.5 active:scale-[0.98]
                           transition-all duration-200"
              >
                {/* 상단: 공지 번호 배지 + 날짜 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-strong
                                   bg-brand-bg px-2 py-0.5 rounded-pill">
                    <Megaphone size={10} />
                    공지 {idx + 1}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-600 tabular-nums">
                    <Clock size={10} />
                    {formatDate(notice.created_at)}
                  </span>
                </div>

                {/* 제목 */}
                <p className="text-[14px] font-bold text-ink-900 mb-1.5 leading-snug line-clamp-1 break-words">
                  {notice.title?.trim() || notice.content.slice(0, 30)}
                </p>

                {/* 본문 미리보기 (최대 2줄) */}
                <p className="text-[13px] text-ink-600 leading-relaxed line-clamp-2 break-words">
                  {notice.content}
                </p>

                {/* 길 때 전체보기 힌트 */}
                {notice.content.length > 60 && (
                  <p className="text-[12px] text-brand mt-1.5 font-semibold">전체보기 →</p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </Container>

      {/* ── 상세 모달 (portal로 body 렌더 → BottomNav 위 표시) ──
          flex 중앙정렬 패턴: 모바일=하단 시트(items-end) / 데스크톱=중앙(md:items-center).
          ⚠️ Framer Motion이 인라인 transform을 주입하므로 Tailwind translate 중앙정렬을 쓰면 덮어써짐 →
             absolute+translate 대신 flex 컨테이너로 중앙정렬해야 데스크톱에서 안 치우침 */}
      {createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-[2px] md:p-4"
              onClick={() => setSelected(null)}
            >
              {/* 모달 카드 (모바일: 하단 시트, PC: 중앙 모달) */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="w-full md:max-w-lg bg-white rounded-t-xl md:rounded-xl shadow-float flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
              >
                {/* 모바일 핸들 바 */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                  <div className="w-10 h-1 rounded-full bg-line" />
                </div>

                {/* 모달 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                  <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-brand" />
                    <span className="font-bold text-ink-900 text-[15px]">공지사항</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#F2F4F6] transition-colors"
                    aria-label="모달 닫기"
                  >
                    <X size={16} className="text-ink-600" />
                  </button>
                </div>

                {/* 모달 본문 (세로 스크롤 가능, 가로 폭발 방지 min-w-0) */}
                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-5 py-4">
                  <p className="text-[12px] text-ink-600 mb-3 flex items-center gap-1 tabular-nums">
                    <Clock size={10} />
                    {formatDate(selected.created_at)}
                  </p>

                  {selected.title?.trim() && (
                    <h2 className="text-[16px] font-bold text-ink-900 mb-3 leading-snug break-words">
                      {selected.title}
                    </h2>
                  )}

                  {selected.title?.trim() && <hr className="border-line mb-3" />}

                  <p className="text-[14px] text-ink-700 leading-relaxed whitespace-pre-wrap break-words">
                    {selected.content}
                  </p>
                </div>

                {/* 하단 닫기 버튼 */}
                <div
                  className="px-5 py-4 border-t border-line shrink-0"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="w-full min-h-[48px] rounded-md bg-[#F2F4F6] text-ink-700 text-[14px] font-semibold
                               hover:bg-line transition-colors active:scale-[0.98]"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
