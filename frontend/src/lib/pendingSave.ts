// 게스트(비로그인) 계산 결과를 localStorage에 임시 저장하고,
// 로그인 후 Supabase에 자동 저장하는 유틸리티
//
// 흐름:
//   1. 게스트가 계산 → "저장하기" 클릭 → storePendingSave() 호출 → GuestGate 팝업
//   2. 게스트가 로그인 → auth/callback.tsx → executePendingSave(userId) 자동 호출
//   3. 저장 완료 → localStorage 정리 + 완료 플래그 설정 → 홈에서 알림 표시

import { supabase } from './supabase'

// ── 상수 정의 ───────────────────────────────────────────────────────────────

/** localStorage 키 — 대기 중인 저장 데이터 */
const PENDING_SAVE_KEY = 'catch_pending_save'

/** localStorage 키 — 자동 저장 완료 알림용 플래그 */
const PENDING_SAVE_DONE_KEY = 'catch_pending_save_done'

/** 대기 저장 유효기간: 30분 (너무 오래된 데이터는 무시) */
const PENDING_SAVE_TTL_MS = 30 * 60 * 1000

// ── 타입 정의 ────────────────────────────────────────────────────────────────

/** 대기 저장 서비스 유형 (4개 계산기) */
export type PendingSaveType = 'severance' | 'unemployment' | 'weekly_allowance' | 'annual_leave'

/** localStorage에 임시 저장되는 계산 결과 구조 */
export interface PendingSave {
  type: PendingSaveType
  title: string                    // 마이페이지에 표시될 제목 (예: "쿠팡 퇴직금 계산 결과")
  company_name: string | null      // 회사명 (없으면 null)
  payload: Record<string, unknown> // 계산 결과 상세 데이터 (Supabase reports.payload)
  savedAt: string                  // ISO 타임스탬프 (유효기간 계산용)
}

// ── 핵심 함수 ────────────────────────────────────────────────────────────────

/**
 * 계산 결과를 localStorage에 임시 저장합니다.
 * 게스트 사용자가 "저장하기" 버튼을 클릭했을 때 호출됩니다.
 * 기존 데이터가 있으면 덮어씁니다 (1개만 유지).
 */
export function storePendingSave(data: Omit<PendingSave, 'savedAt'>): void {
  try {
    const save: PendingSave = { ...data, savedAt: new Date().toISOString() }
    localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(save))
  } catch (err) {
    // localStorage 쓰기 실패 (시크릿 모드 등)는 조용히 무시
    console.warn('[pendingSave] localStorage 저장 실패:', err)
  }
}

/**
 * localStorage에서 대기 중인 저장 데이터를 읽습니다.
 * 유효기간(30분) 초과 시 자동 삭제하고 null을 반환합니다.
 */
export function loadPendingSave(): PendingSave | null {
  try {
    const raw = localStorage.getItem(PENDING_SAVE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw) as PendingSave
    const age = Date.now() - new Date(data.savedAt).getTime()

    // 30분이 지난 데이터는 만료 처리
    if (age > PENDING_SAVE_TTL_MS) {
      localStorage.removeItem(PENDING_SAVE_KEY)
      return null
    }

    return data
  } catch {
    // JSON 파싱 실패 등의 경우 데이터를 정리하고 null 반환
    localStorage.removeItem(PENDING_SAVE_KEY)
    return null
  }
}

/**
 * 대기 중인 계산 결과를 Supabase reports 테이블에 저장하고 localStorage를 정리합니다.
 * 로그인 콜백(auth/callback.tsx)에서 세션 확인 직후 자동 호출됩니다.
 *
 * @param userId - 로그인 완료된 사용자 ID
 * @returns 저장 성공 여부 (대기 데이터가 없으면 false)
 */
export async function executePendingSave(userId: string): Promise<boolean> {
  const pending = loadPendingSave()
  // 대기 데이터가 없거나 supabase 클라이언트가 없으면 종료
  if (!pending || !supabase) return false

  try {
    const { error } = await supabase.from('reports').insert({
      user_id: userId,
      title: pending.title,
      company_name: pending.company_name,
      payload: pending.payload,
    })

    if (!error) {
      // 저장 성공 → pending 데이터 삭제 + 완료 플래그 설정
      localStorage.removeItem(PENDING_SAVE_KEY)
      localStorage.setItem(PENDING_SAVE_DONE_KEY, '1')
      return true
    } else {
      // 저장 실패 → pending 데이터는 유지 (다음 로그인 때 재시도 가능)
      console.warn('[pendingSave] Supabase 저장 실패:', error.message)
      return false
    }
  } catch (err) {
    console.warn('[pendingSave] executePendingSave 오류:', err)
    return false
  }
}

/**
 * 자동 저장 완료 알림 플래그를 읽고 삭제합니다.
 * Home.tsx 등에서 한 번만 알림을 표시하기 위해 사용합니다.
 * 플래그가 있으면 true를 반환하고 즉시 삭제합니다 (중복 표시 방지).
 */
export function consumePendingSaveDone(): boolean {
  try {
    const done = localStorage.getItem(PENDING_SAVE_DONE_KEY)
    if (done) {
      localStorage.removeItem(PENDING_SAVE_DONE_KEY)
      return true
    }
    return false
  } catch {
    return false
  }
}
