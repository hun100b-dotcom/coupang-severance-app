// ============================================================
// useVisitorTracking: 페이지 방문 기록을 visitor_logs 테이블에 저장하는 훅
// - 앱 전역(App.tsx)에서 단 한 번 마운트합니다.
// - 브라우저 탭 단위로 UUID를 생성해 sessionStorage에 보관합니다.
// - 페이지 경로가 변경될 때마다 Supabase에 INSERT (fire-and-forget)
// ============================================================

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── sessionStorage 키 상수 ─────────────────────────────────
const SESSION_KEY = 'catch_session_id'
const UTM_KEY = 'catch_utm'   // 캠페인 유입 정보(첫 진입 시 1회 캡처해 세션 내내 귀속)

// ── UTM(광고 캠페인) 캡처 ──────────────────────────────────
// 광고/제휴 링크로 들어오면 URL 에 ?utm_source=kakao&utm_medium=cpc&utm_campaign=... 가 붙는다.
// 이 값은 첫 페이지에서만 URL 에 있으므로, 최초 1회 캡처해 sessionStorage 에 저장하고
// 이후 세션 내 모든 방문 기록에 함께 남긴다(= 이 방문자가 어느 캠페인으로 왔는지 세션 전체에 귀속).
interface CapturedUtm { source: string | null; medium: string | null; campaign: string | null; landing: string }
function getOrCaptureUtm(landingPath: string): CapturedUtm {
  try {
    const params = new URLSearchParams(window.location.search)
    const hasUtm = params.has('utm_source') || params.has('utm_campaign') || params.has('utm_medium')
    // ⚠️ URL 에 UTM 이 있으면 세션 도중이라도 그 값으로 '갱신 저장' 한다.
    //   (과거: 첫 진입만 캡처 → 사이트를 먼저 둘러본 뒤 캠페인 링크를 같은 탭에서 열면
    //    옛 빈 값이 고착돼 캠페인 클릭이 안 잡혔다. 이제 캠페인 링크 클릭이 항상 기록됨.)
    if (hasUtm) {
      const utm: CapturedUtm = {
        source: params.get('utm_source'),
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
        landing: landingPath,   // 캠페인 도착 페이지
      }
      try { sessionStorage.setItem(UTM_KEY, JSON.stringify(utm)) } catch { /* 무시 */ }
      return utm
    }
    // URL 에 UTM 이 없으면 세션에 저장된 값(첫 진입 캡처)을 재사용해 세션 전체에 귀속
    const existing = sessionStorage.getItem(UTM_KEY)
    if (existing) return JSON.parse(existing) as CapturedUtm
    return { source: null, medium: null, campaign: null, landing: landingPath }
  } catch {
    // sessionStorage 접근 불가(프라이빗 모드 등) — UTM 없이 진행
    return { source: null, medium: null, campaign: null, landing: landingPath }
  }
}

// ── 봇/자동화 클라이언트 감지 — 방문 기록에서 제외(순방문자 부풀림 방지) ──
// 핵심 오염원: Vercel 빌드 시 prerender(헤드리스 크롬)가 SEO 라우트를 렌더하며 이 훅이
//   실행돼 visitor_logs 에 수천 건을 남겼다(순방문자 6배 부풀림). 헤드리스/자동화는
//   navigator.webdriver=true 또는 UA 에 headless/bot 등이 있어 감지·차단한다.
function isBotClient(): boolean {
  try {
    if (navigator.webdriver) return true   // 프리렌더·Playwright·Puppeteer 등 자동화
    const ua = (navigator.userAgent || '').toLowerCase()
    if (!ua) return true                    // UA 없음 = 정상 브라우저 아님
    return /headless|bot|crawler|spider|phantom|puppeteer|playwright|python|curl|wget|axios|node-fetch|go-http|java\/|http-client|monitor|uptime|pingdom|lighthouse|prerender|electron/.test(ua)
  } catch {
    return false
  }
}

// ── UUID v4 생성 (crypto.randomUUID 미지원 환경 대비 폴백) ──
function generateSessionId(): string {
  // 최신 브라우저는 crypto.randomUUID()를 지원합니다.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // 구형 브라우저 폴백: Math.random 기반 UUID v4 형식
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ── sessionStorage에서 세션 ID 가져오기 (없으면 신규 생성) ──
function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const fresh = generateSessionId()
    sessionStorage.setItem(SESSION_KEY, fresh)
    return fresh
  } catch {
    // sessionStorage 접근 불가(프라이빗 모드 등) 시 임시 ID 반환
    return generateSessionId()
  }
}

// ── 메인 훅 ──────────────────────────────────────────────
export function useVisitorTracking() {
  const location = useLocation()
  // 로그인된 사용자 ID를 함께 기록합니다 (비로그인이면 null)
  const { user } = useAuth()

  useEffect(() => {
    // Supabase 클라이언트가 없으면 조용히 종료
    if (!supabase) return

    const sessionId = getOrCreateSessionId()
    const pagePath = location.pathname

    // 관리자 페이지 방문은 방문자 분석에서 제외합니다.
    // /admin 경로는 내부 운영 데이터이므로 별도로 관리합니다.
    if (pagePath.startsWith('/admin')) return

    // 봇/헤드리스(프리렌더·크롤러·모니터)는 실유저가 아니므로 기록하지 않습니다.
    //   → 순방문자·페이지뷰가 봇으로 부풀려지던 문제(2026-07-06)를 수집 단계에서 차단.
    if (isBotClient()) return

    // 캠페인(UTM) 유입 정보 — URL 에 UTM 있으면 갱신 캡처, 없으면 세션 저장값 사용
    const utm = getOrCaptureUtm(pagePath)

    // fire-and-forget: await 없이 실행해 UI를 블록하지 않습니다.
    // Supabase insert는 PromiseLike를 반환하므로 Promise.resolve()로 감싸
    // .catch()를 사용할 수 있도록 합니다.
    Promise.resolve(
      supabase
        .from('visitor_logs')
        .insert({
          session_id: sessionId,
          user_id: user?.id ?? null,       // 로그인 사용자면 UUID, 비로그인이면 null
          page_path: pagePath,
          referrer: document.referrer || null,  // 이전 페이지 URL
          user_agent: navigator.userAgent || null,
          utm_source: utm.source,          // 캠페인 유입원(kakao/naver/google 등)
          utm_medium: utm.medium,          // 매체(cpc/banner/post 등)
          utm_campaign: utm.campaign,      // 캠페인명
          landing_path: utm.landing,       // 캠페인 도착(첫) 페이지
        })
    ).catch(() => {/* 에러 무시: 방문 기록 실패가 앱 동작에 영향 없도록 */})

  // location.pathname이 바뀔 때마다(페이지 이동) 기록합니다.
  // user.id를 deps에 포함해 로그인 상태 변경 시에도 재실행합니다.
  }, [location.pathname, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
}
