import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// ============================================================
// RelatedLinks — SEO 내부 링크 메시(P5)
//   목적: 랜딩/가이드가 서로·계산기와 크롤 가능한 <a href>(react-router Link)로 연결되게 한다.
//         기존 랜딩은 navigate() 버튼만 있어 크롤러가 페이지 간 이동경로를 못 따라가 고립됐다.
//         Link는 실제 <a href>를 렌더 → 크롤러 순회 + 링크에쿼티 전달 + 프리렌더에 정적 캡처.
//   디자인: 앱 토큰(up-*)만 사용(블루/그린/회색). 무지개색 금지. 흰 카드 + 소프트 보더.
// ============================================================

type RelLink = { to: string; label: string; desc: string }

// 라우트별 관련 링크맵 — 계산기 + 가이드 + 형제 랜딩으로 메시 구성
const LINK_MAP: Record<string, RelLink[]> = {
  '/coupang-cfs-severance-calculation': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/guide/severance', label: '퇴직금 완전 가이드', desc: '조건·계산식·청구법 총정리' },
    { to: '/coupang-severance-calculator', label: '쿠팡 퇴직금 계산기', desc: '일용직 2026년 최신 기준' },
    { to: '/coupang-part-time-severance-method', label: '쿠팡 알바 퇴직금 받는 법', desc: '신청 절차 완전 가이드' },
  ],
  '/coupang-severance-calculator': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/guide/severance', label: '퇴직금 완전 가이드', desc: '조건·계산식·청구법 총정리' },
    { to: '/coupang-cfs-severance-calculation', label: '쿠팡 CFS 퇴직금 계산', desc: '재판 이후 청구 방법' },
    { to: '/day-worker-severance-guide', label: '일용직 퇴직금 가이드', desc: '조건·계산·청구법' },
  ],
  '/coupang-unemployment-calculator': [
    { to: '/unemployment', label: '실업급여 계산기', desc: '수급액·조건 3분 자동 계산' },
    { to: '/guide/unemployment', label: '실업급여 완전 가이드', desc: '조건·금액·신청법 총정리' },
    { to: '/coupang-severance-calculator', label: '쿠팡 퇴직금 계산기', desc: '일용직 2026년 최신 기준' },
  ],
  '/day-worker-severance-guide': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/guide/severance', label: '퇴직금 완전 가이드', desc: '조건·계산식·청구법 총정리' },
    { to: '/daily-worker-severance-28days', label: '일용직 퇴직금 28일 계산', desc: '블록 알고리즘 완전 해석' },
    { to: '/coupang-part-time-severance-method', label: '쿠팡 알바 퇴직금 받는 법', desc: '신청 절차 완전 가이드' },
  ],
  '/coupang-part-time-severance-method': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/guide/severance', label: '퇴직금 완전 가이드', desc: '조건·계산식·청구법 총정리' },
    { to: '/coupang-severance-calculator', label: '쿠팡 퇴직금 계산기', desc: '일용직 2026년 최신 기준' },
    { to: '/coupang-cfs-severance-calculation', label: '쿠팡 CFS 퇴직금 계산', desc: '재판 이후 청구 방법' },
  ],
  '/daily-worker-severance-28days': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/guide/severance', label: '퇴직금 완전 가이드', desc: '조건·계산식·청구법 총정리' },
    { to: '/day-worker-severance-guide', label: '일용직 퇴직금 가이드', desc: '조건·계산·청구법' },
  ],
  // 가이드 → 계산기·랜딩 역링크(상호 연결 보강)
  '/guide/severance': [
    { to: '/severance', label: '퇴직금 계산기', desc: '28일 블록 자동·PDF 업로드·3분' },
    { to: '/coupang-cfs-severance-calculation', label: '쿠팡 CFS 퇴직금 계산', desc: '재판 이후 청구 방법' },
    { to: '/day-worker-severance-guide', label: '일용직 퇴직금 가이드', desc: '조건·계산·청구법' },
  ],
  '/guide/unemployment': [
    { to: '/unemployment', label: '실업급여 계산기', desc: '수급액·조건 3분 자동 계산' },
    { to: '/coupang-unemployment-calculator', label: '쿠팡 실업급여', desc: '조건·금액·신청법 2026' },
  ],
  '/guide/weekly-allowance': [
    { to: '/weekly-allowance', label: '주휴수당 계산기', desc: '알바·일용직 자동 계산' },
    { to: '/guide/annual-leave', label: '연차수당 가이드', desc: '조건·계산법 완전 정리' },
  ],
  '/guide/annual-leave': [
    { to: '/annual-leave', label: '연차수당 계산기', desc: '미사용 연차수당 자동 계산' },
    { to: '/guide/weekly-allowance', label: '주휴수당 가이드', desc: '조건·계산법 완전 정리' },
  ],
}

interface RelatedLinksProps {
  /** 현재 페이지 경로(LINK_MAP 키) */
  current: string
}

/**
 * 현재 페이지의 관련 SEO 페이지들을 크롤 가능한 <Link>(=<a href>) 카드로 렌더.
 * current가 맵에 없으면 아무것도 렌더하지 않음(안전).
 */
export default function RelatedLinks({ current }: RelatedLinksProps) {
  const links = LINK_MAP[current]
  if (!links || links.length === 0) return null

  return (
    <nav aria-label="관련 계산기 및 가이드" className="mt-8">
      {/* 섹션 제목 — 헤딩 위계상 h2(페이지 h1 하위) */}
      <h2 className="text-base font-bold text-up-navy mb-3">관련 계산기 · 가이드</h2>
      <ul className="grid gap-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="flex items-center gap-3 rounded-2xl bg-white border border-up-hair px-4 py-3.5 hover:border-brand hover:shadow-sm transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-up-navy truncate">{l.label}</p>
                <p className="text-xs text-up-sub truncate">{l.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-brand shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
