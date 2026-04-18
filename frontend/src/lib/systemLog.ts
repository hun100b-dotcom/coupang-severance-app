// systemLog.ts — 프론트엔드에서 system_logs 테이블에 이벤트 기록하는 유틸리티
// system_logs 컬럼: id, type, title, detail(jsonb), app_version, created_by, created_at

import { supabase } from './supabase'

// 앱 버전 (package.json과 동기화)
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.0.0'

// system_logs에 기록할 수 있는 로그 타입 목록
export type SystemLogType =
  | 'INFO'      // 일반 정보성 이벤트
  | 'WARNING'   // 주의가 필요한 상황
  | 'ERROR'     // 에러 발생
  | 'DEPLOY'    // 배포 / 앱 시작
  | 'SECURITY'  // 보안 관련 이벤트

/**
 * system_logs 테이블에 이벤트 기록
 *
 * @param type       - 로그 타입 (INFO/WARNING/ERROR/DEPLOY/SECURITY)
 * @param title      - 로그 제목 (짧게, 한 줄)
 * @param detail     - 추가 상세 정보 (jsonb 객체, 선택)
 * @param createdBy  - 발생 주체 (예: 'client', 'error-boundary', 기본값: 'client')
 */
export async function logSystemEvent(
  type: SystemLogType,
  title: string,
  detail?: Record<string, string | number | boolean | null>,
  createdBy?: string
): Promise<void> {
  if (!supabase) return
  // 프로덕션 환경에서만 기록 (개발 중 노이즈 방지)
  // 개발 환경에서도 기록하고 싶으면 조건 제거 가능
  try {
    await supabase.from('system_logs').insert({
      type,
      title,
      detail:      detail ?? null,
      app_version: APP_VERSION,
      created_by:  createdBy ?? 'client',
    })
  } catch {
    // 로그 기록 실패는 사용자 경험에 영향 없도록 조용히 처리
  }
}

/**
 * 앱 첫 로드 시 DEPLOY 로그 기록
 * main.tsx의 앱 마운트 직후에 호출
 * 중복 방지: sessionStorage에 이미 기록했으면 스킵
 */
export function logAppStart(): void {
  // 새로고침할 때마다 중복 기록되지 않도록 sessionStorage로 세션 내 1회 제한
  if (sessionStorage.getItem('app_start_logged')) return
  sessionStorage.setItem('app_start_logged', '1')

  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)

  logSystemEvent(
    'DEPLOY',
    `앱 시작 — v${APP_VERSION}`,
    {
      platform: isMobile ? 'mobile' : 'desktop',
      referrer: document.referrer || '직접 접속',
      url: window.location.pathname,
    },
    'client'
  )
}

/**
 * React ErrorBoundary에서 에러 발생 시 ERROR 로그 기록
 *
 * @param errorMessage - 에러 메시지
 * @param componentStack - React 컴포넌트 스택 (선택)
 */
export function logClientError(errorMessage: string, componentStack?: string): void {
  logSystemEvent(
    'ERROR',
    `클라이언트 에러: ${errorMessage.slice(0, 120)}`,
    {
      message: errorMessage.slice(0, 300),
      stack: componentStack ? componentStack.slice(0, 300) : null,
      url: window.location.pathname,
    },
    'error-boundary'
  )
}
