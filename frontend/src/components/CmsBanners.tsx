import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCmsBanners } from '../lib/api'
import type { CmsBannersData } from '../lib/api'

// 어드민 "공지/배너 CMS" 실소비 컴포넌트 (2026-07-04 연동 전수조사 신설)
//
// 어드민 설정(system_settings의 announcement_*/popup_banner_* 키)이 그동안
// 사용자 화면 어디에서도 소비되지 않는 미연동 상태였다. 이 컴포넌트가
// 백엔드 공개 API(/cms/banners, 60초 캐시)를 읽어:
//   1) 긴급 공지 띠 — 홈 상단 노란 띠 (어드민 CMS 문구 그대로)
//   2) 팝업 배너 — 진입 시 모달, "오늘 하루 보지 않기" 24시간 localStorage
// 를 렌더링한다. API 실패 시 아무것도 렌더하지 않는다(홈을 막지 않음).

// "오늘 하루 보지 않기" 저장 키 (숨김 만료 시각 epoch ms)
const POPUP_HIDE_KEY = 'cms_popup_hide_until'
const HIDE_HOURS = 24

/** 홈 상단 긴급 공지 띠 (노란 배경 — 의미색 warning) */
export function AnnouncementBar({ data }: { data: CmsBannersData | null }) {
  if (!data || !data.announcement_enabled || !data.announcement_text.trim()) return null
  return (
    <div
      role="status"
      className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5"
    >
      <p className="max-w-[1080px] mx-auto text-[13.5px] leading-snug font-semibold text-amber-900 break-words whitespace-pre-line">
        📢 {data.announcement_text}
      </p>
    </div>
  )
}

/** 진입 팝업 배너 — 24시간 "오늘 하루 보지 않기" 지원 */
export function PopupBanner({ data }: { data: CmsBannersData | null }) {
  const [dismissed, setDismissed] = useState(false)

  const hiddenUntil = (() => {
    try {
      const n = Number(localStorage.getItem(POPUP_HIDE_KEY) ?? 0)
      // 손상된 값(NaN)이면 0 취급 — NaN 비교로 팝업이 영구 숨김되는 엣지 방지(리뷰어 B)
      return Number.isFinite(n) ? n : 0
    } catch { return 0 }
  })()
  const shouldShow =
    !dismissed &&
    !!data?.popup_banner_enabled &&
    !!data?.popup_banner_text.trim() &&
    Date.now() > hiddenUntil

  if (!shouldShow || !data) return null

  const hideToday = () => {
    try {
      localStorage.setItem(POPUP_HIDE_KEY, String(Date.now() + HIDE_HOURS * 3600 * 1000))
    } catch { /* 사생활 보호 모드 등 저장 불가 시에도 이번 세션은 닫힘 */ }
    setDismissed(true)
  }

  // 루트 z-[1] 스택 컨텍스트 탈출을 위해 body 포털 (기존 모달 교훈과 동일 패턴)
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-label="공지 팝업"
      onClick={() => setDismissed(true)}
    >
      <div
        className="w-full max-w-[400px] min-w-0 bg-white rounded-2xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* 15px는 index.css 전역 +1.5px override에 걸려 16.5px로 커짐 — 15.5px 직접 표기로 통일 */}
        <p className="text-[15.5px] font-bold text-gray-900 mb-3">📢 알려드립니다</p>
        <p className="text-[14.5px] leading-relaxed text-gray-700 break-words whitespace-pre-line mb-5">
          {data.popup_banner_text}
        </p>
        <div className="flex gap-2">
          <button
            onClick={hideToday}
            className="flex-1 min-h-[44px] rounded-xl border border-gray-200 bg-white text-[13.5px] font-semibold text-gray-500"
          >
            오늘 하루 보지 않기
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-[#1B64DA] text-[13.5px] font-semibold text-white"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 배너 데이터 로드 훅 — 실패 시 null(배너 미표시) */
export function useCmsBanners(): CmsBannersData | null {
  const [data, setData] = useState<CmsBannersData | null>(null)
  useEffect(() => {
    let alive = true
    getCmsBanners()
      .then(d => { if (alive) setData(d) })
      .catch(() => { /* 배너는 부가 기능 — 실패해도 홈 렌더를 막지 않는다 */ })
    return () => { alive = false }
  }, [])
  return data
}
