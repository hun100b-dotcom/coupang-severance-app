// 사용자 접근 로그 기록 유틸리티
// 개인정보의 안전성 확보조치 기준 제7조: 접속 기록의 보관

import { supabase } from './supabase'

type AccessAction =
  | 'view_profile'       // 프로필 조회
  | 'update_profile'     // 프로필 수정
  | 'view_report'        // 계산 결과 조회
  | 'create_inquiry'     // 문의 작성
  | 'delete_account'     // 회원 탈퇴
  | 'view_inquiry'       // 문의 조회

/**
 * 사용자 접근 로그 기록
 * @param action 행동 종류
 * @param targetId 조회한 리소스 ID (선택)
 */
export async function logAccess(action: AccessAction, targetId?: string): Promise<void> {
  if (!supabase) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // 비로그인 사용자는 로그 미기록

    await supabase.from('user_access_logs').insert({
      user_id: user.id,
      action,
      target_id: targetId || null,
      ip_address: null, // Supabase에서 IP 수집 제한적
      user_agent: navigator.userAgent,
    })
  } catch (error) {
    // 로그 기록 실패는 사용자 경험에 영향 없음 (조용히 무시)
    console.warn('[Access Log] 기록 실패:', error)
  }
}
