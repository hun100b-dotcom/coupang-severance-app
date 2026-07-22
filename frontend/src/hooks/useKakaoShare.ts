/**
 * useKakaoShare.ts
 * 카카오톡 공유 기능 커스텀 훅
 *
 * - Kakao JavaScript SDK 초기화 및 공유 함수 제공
 * - SDK 미설정(localhost) 환경에서는 URL 클립보드 복사 fallback
 * - 퇴직금 결과, 실업급여 결과, 채용공고 3가지 공유 타입 지원
 */

import { useEffect, useRef, useCallback } from 'react'
import { SITE_URL, OG_IMAGE as SITE_OG_IMAGE } from '../config/site'

// ── 앱 기본 정보 상수 (도메인 기준값은 config/site.ts 에서 관리) ──
const APP_URL = SITE_URL
const OG_IMAGE = SITE_OG_IMAGE
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

// ── window.Kakao 타입 선언 (글로벌 SDK) ──────────────────────
// Kakao SDK가 index.html의 script 태그로 로드되므로 window에 존재
// TypeScript가 인식하지 못하므로 인터페이스를 직접 선언
declare global {
  interface Window {
    Kakao?: {
      /** SDK 초기화 여부 확인 */
      isInitialized: () => boolean
      /** SDK 초기화 (appKey: JavaScript 앱 키) */
      init: (appKey: string) => void
      Share: {
        /**
         * 카카오톡 기본 템플릿으로 공유
         * objectType: 'feed' | 'list' | 'location' | 'commerce' | 'text'
         */
        sendDefault: (options: KakaoShareFeedOptions) => void
      }
    }
  }
}

// ── Kakao Share Feed 옵션 타입 ────────────────────────────────
interface KakaoShareLinkObject {
  /** 클릭 시 이동할 웹 URL */
  webUrl: string
  /** 카카오 앱에서 실행 시 이동할 URL (없으면 webUrl 사용) */
  mobileWebUrl: string
}

interface KakaoShareContent {
  /** 카드 제목 */
  title: string
  /** 카드 설명 */
  description: string
  /** 썸네일 이미지 URL */
  imageUrl: string
  /** 썸네일 이미지 가로 px */
  imageWidth?: number
  /** 썸네일 이미지 세로 px */
  imageHeight?: number
  /** 링크 정보 */
  link: KakaoShareLinkObject
}

interface KakaoShareButton {
  /** 버튼 라벨 텍스트 */
  title: string
  /** 버튼 클릭 시 이동 링크 */
  link: KakaoShareLinkObject
}

interface KakaoShareFeedOptions {
  /** 템플릿 타입 — 피드형 */
  objectType: 'feed'
  /** 메인 콘텐츠 (썸네일 + 제목 + 설명 + 링크) */
  content: KakaoShareContent
  /** 하단 버튼 목록 (최대 2개) */
  buttons?: KakaoShareButton[]
}

// ── 퇴직금 공유 파라미터 ──────────────────────────────────────
export interface ShareSeveranceParams {
  /** 퇴직금 금액 (원, 정수) */
  amount: number
  /** 회사명 */
  company?: string
}

// ── 실업급여 공유 파라미터 ────────────────────────────────────
export interface ShareUnemploymentParams {
  /** 실업급여 총액 (원, 정수) */
  totalAmount: number
  /** 회사명 */
  company?: string
  /** 수급 가능 여부 */
  eligible: boolean
}

// ── 채용공고 공유 파라미터 ────────────────────────────────────
export interface ShareJobParams {
  /** 회사명 */
  companyName: string
  /** 직종/업무 */
  jobTitle?: string
  /** 지역 */
  region?: string
  /** 시급 (원/시간) */
  hourlyWage?: number
  /** 일급 (원/일) */
  dailyWage?: number
  /** 회사 로고 URL (없으면 OG 이미지 사용) */
  logoUrl?: string
}

/**
 * 금액을 "XX만원" 형식으로 포맷
 * 예: 1_500_000 → "150만원", 500_000 → "50만원"
 */
function formatAmountKorean(amount: number): string {
  const manwon = Math.round(amount / 10000)
  return `${manwon.toLocaleString('ko-KR')}만원`
}

/**
 * Kakao SDK 초기화 시도
 * - 환경변수 VITE_KAKAO_JS_KEY가 없으면 아무 것도 하지 않음
 * - 이미 초기화됐으면 중복 호출 방지
 */
function initKakaoSDK(): boolean {
  // vite-env.d.ts에 VITE_KAKAO_JS_KEY가 string | undefined로 선언됨
  const appKey = import.meta.env.VITE_KAKAO_JS_KEY

  // 환경변수 미설정이면 초기화 불가
  if (!appKey) return false

  // window.Kakao SDK 로드 여부 확인
  if (!window.Kakao) return false

  // 이미 초기화된 경우 다시 호출하지 않음
  if (window.Kakao.isInitialized()) return true

  try {
    window.Kakao.init(appKey)
    return window.Kakao.isInitialized()
  } catch {
    // 초기화 실패 (잘못된 앱 키 등) — fallback으로 진행
    return false
  }
}

/**
 * 클립보드에 URL 복사 후 alert 안내
 * - Kakao SDK 사용 불가 환경(localhost, 앱 키 미설정)에서 fallback으로 사용
 */
async function copyToClipboardFallback(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    alert('링크가 클립보드에 복사됐어요!\n카카오톡에 직접 붙여넣기 해주세요.')
  } catch {
    // clipboard API 미지원 환경 대비
    alert(`아래 링크를 카카오톡에 공유해 주세요:\n${url}`)
  }
}

// ── 메인 훅 ──────────────────────────────────────────────────
export function useKakaoShare() {
  // SDK 초기화 성공 여부를 ref로 추적 (렌더링 불필요)
  const isSDKReady = useRef(false)

  // 컴포넌트 마운트 시 SDK 초기화 시도
  useEffect(() => {
    // DOM + Kakao 스크립트 로드 완료 후 초기화
    // index.html에서 동기 로드되므로 바로 사용 가능하지만
    // 안전을 위해 setTimeout으로 마이크로태스크 이후 실행
    const timer = setTimeout(() => {
      isSDKReady.current = initKakaoSDK()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  /**
   * 퇴직금 결과 공유
   * 공유 메시지: "나의 퇴직금은 XX만원! CATCH에서 무료로 계산해보세요"
   */
  const shareSeverance = useCallback(async (params: ShareSeveranceParams) => {
    const { amount, company } = params
    const amountStr = formatAmountKorean(amount)
    const title = `나의 퇴직금은 ${amountStr}!`
    const description = company
      ? `${company} 근무 퇴직금 계산 결과예요. CATCH에서 무료로 계산해보세요.`
      : '일용직 근로자 퇴직금 무료 계산기 CATCH에서 내 퇴직금을 확인해보세요.'
    const link: KakaoShareLinkObject = {
      webUrl: APP_URL,
      mobileWebUrl: APP_URL,
    }

    // SDK 준비 안 됐으면 fallback
    if (!isSDKReady.current || !window.Kakao) {
      await copyToClipboardFallback(APP_URL)
      return
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: OG_IMAGE,
        imageWidth: OG_IMAGE_WIDTH,
        imageHeight: OG_IMAGE_HEIGHT,
        link,
      },
      buttons: [
        {
          title: '나도 계산해보기',
          link,
        },
      ],
    })
  }, [])

  /**
   * 실업급여 결과 공유
   * 공유 메시지: "나의 실업급여는 XX만원! CATCH에서 무료로 계산해보세요"
   */
  const shareUnemployment = useCallback(async (params: ShareUnemploymentParams) => {
    const { totalAmount, company, eligible } = params
    const amountStr = formatAmountKorean(totalAmount)

    // 수급 불가인 경우에도 공유 가능 (계산기 홍보 목적)
    const title = eligible
      ? `나의 실업급여는 ${amountStr}!`
      : '실업급여 수급 조건이 충족되지 않았어요'
    const description = company
      ? `${company} 근무 실업급여 계산 결과예요. CATCH에서 무료로 계산해보세요.`
      : '일용직 근로자 실업급여 무료 계산기 CATCH에서 내 실업급여를 확인해보세요.'
    const link: KakaoShareLinkObject = {
      webUrl: APP_URL,
      mobileWebUrl: APP_URL,
    }

    // SDK 준비 안 됐으면 fallback
    if (!isSDKReady.current || !window.Kakao) {
      await copyToClipboardFallback(APP_URL)
      return
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: OG_IMAGE,
        imageWidth: OG_IMAGE_WIDTH,
        imageHeight: OG_IMAGE_HEIGHT,
        link,
      },
      buttons: [
        {
          title: '나도 계산해보기',
          link,
        },
      ],
    })
  }, [])

  /**
   * 채용공고 공유
   * 공유 메시지: "[회사명] 채용 중 🔥 시급 XX원 | 지역 | CATCH에서 자세히 보기"
   */
  const shareJob = useCallback(async (params: ShareJobParams) => {
    const { companyName, jobTitle, region, hourlyWage, dailyWage, logoUrl } = params
    const jobsUrl = `${APP_URL}/jobs`

    // 임금 표시 문자열 조합
    const wagePart = hourlyWage
      ? `시급 ${hourlyWage.toLocaleString('ko-KR')}원`
      : dailyWage
        ? `일급 ${dailyWage.toLocaleString('ko-KR')}원`
        : ''

    const descParts = [wagePart, region].filter(Boolean)
    const description = descParts.length > 0
      ? `${descParts.join(' | ')} | CATCH에서 자세히 보기`
      : 'CATCH 채용정보에서 자세히 확인하세요.'

    const title = jobTitle
      ? `[${companyName}] ${jobTitle} 채용 중 🔥`
      : `[${companyName}] 채용 중 🔥`

    // 회사 로고가 있으면 사용, 없으면 기본 OG 이미지
    const imageUrl = logoUrl ?? OG_IMAGE

    const link: KakaoShareLinkObject = {
      webUrl: jobsUrl,
      mobileWebUrl: jobsUrl,
    }

    // SDK 준비 안 됐으면 fallback
    if (!isSDKReady.current || !window.Kakao) {
      await copyToClipboardFallback(jobsUrl)
      return
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl,
        imageWidth: OG_IMAGE_WIDTH,
        imageHeight: OG_IMAGE_HEIGHT,
        link,
      },
      buttons: [
        {
          title: '채용공고 보기',
          link,
        },
      ],
    })
  }, [])

  return { shareSeverance, shareUnemployment, shareJob }
}
