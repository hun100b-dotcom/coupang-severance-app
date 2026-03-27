// 관리자 행동 감사 로그 유틸리티
// 개인정보의 안전성 확보조치 기준 제7조: 관리자의 개인정보 접근 기록 보관

import { supabase } from './supabase'

type AdminAction =
  | 'unmask_members'      // 회원 정보 마스킹 해제
  | 'view_inquiry'        // 문의 조회
  | 'answer_inquiry'      // 문의 답변
  | 'delete_inquiry'      // 문의 삭제
  | 'create_account'      // 관리자 계정 생성
  | 'update_account'      // 관리자 계정 수정
  | 'delete_account'      // 관리자 계정 삭제
  | 'update_settings'     // 시스템 설정 변경

/**
 * 관리자 행동 감사 로그 기록
 * @param action 행동 종류
 * @param targetId 대상 리소스 ID (선택)
 * @param details 추가 상세 정보 (선택)
 */
export async function logAdminAction(
  action: AdminAction,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // 비로그인 사용자는 로그 미기록

    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action,
      target_id: targetId || null,
      details: details || null,
      ip_address: null, // Supabase에서 IP 수집 제한적
      user_agent: navigator.userAgent,
    })
  } catch (error) {
    // 로그 기록 실패는 관리자 작업을 방해하지 않음 (조용히 무시)
    console.warn('[Admin Audit Log] 기록 실패:', error)
  }
}
