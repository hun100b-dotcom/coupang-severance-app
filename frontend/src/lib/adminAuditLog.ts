// 관리자 행동 감사 로그 유틸리티
// 개인정보의 안전성 확보조치 기준 제7조: 관리자의 개인정보 접근 기록 보관

import { supabase } from './supabase'

type AdminAction =
  | 'admin.login'          // 관리자 페이지 접근
  | 'admin.view_dashboard' // 대시보드 조회
  | 'admin.view_target'    // 타겟 분석 조회
  | 'admin.view_inquiries' // 문의 목록 조회
  | 'admin.view_members'   // 회원 관리 조회
  | 'admin.view_settings'  // 설정 조회
  | 'admin.view_logs'      // 로그 조회
  | 'unmask_members'       // 회원 정보 마스킹 해제
  | 'view_inquiry'         // 문의 상세 조회
  | 'answer_inquiry'       // 문의 답변
  | 'delete_inquiry'       // 문의 삭제
  | 'create_account'       // 관리자 계정 생성
  | 'update_account'       // 관리자 계정 수정
  | 'delete_account'       // 관리자 계정 삭제
  | 'update_settings'      // 시스템 설정 변경
  | 'create_notice'        // 공지사항 생성
  | 'update_notice'        // 공지사항 수정
  | 'delete_notice'        // 공지사항 삭제

/**
 * 관리자 행동 감사 로그 기록
 * audit_logs 테이블에 직접 INSERT (RLS: is_admin() 필수)
 */
export async function logAdminAction(
  action: AdminAction,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    await supabase.from('audit_logs').insert({
      admin_email: user.email,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      before_val: null,
      after_val: details || null,
      ip_address: null,
    })
  } catch {
    // 로그 기록 실패는 관리자 작업을 방해하지 않음
  }
}
