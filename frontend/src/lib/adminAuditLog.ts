// 관리자 행동 감사 로그 유틸리티
// 개인정보의 안전성 확보조치 기준 제7조: 관리자의 개인정보 접근 기록 보관

import { supabase } from './supabase'

// 감사 로그에 기록할 수 있는 모든 액션 타입 목록
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
  // 채용공고 관련 액션 (Phase 1)
  | 'job_create'           // 채용공고 등록
  | 'job_update'           // 채용공고 수정
  | 'job_delete'           // 채용공고 삭제 (soft delete)
  | 'job_section_change'   // 채용공고 섹션 변경 (오늘추가/내일긴급/상시)
  | 'application_status_change' // 지원자 상태 변경 (확정/완료/취소/거절)

/**
 * 관리자 행동 감사 로그 기록
 * audit_logs 테이블에 직접 INSERT (RLS: is_admin() 필수)
 *
 * @param action    - 수행한 액션 타입 (AdminAction)
 * @param targetType - 대상 리소스 종류 (예: 'job_posting', 'inquiry')
 * @param targetId  - 대상 리소스 ID
 * @param afterVal  - 변경 후 값 (after_val 컬럼) — 등록/수정 시 새 데이터
 * @param beforeVal - 변경 전 값 (before_val 컬럼) — 수정/삭제 시 기존 데이터
 */
export async function logAdminAction(
  action: AdminAction,
  targetType?: string,
  targetId?: string,
  afterVal?: Record<string, unknown>,
  beforeVal?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    await supabase.from('audit_logs').insert({
      admin_email: user.email,
      action,
      target_type: targetType ?? null,
      target_id:   targetId  ?? null,
      before_val:  beforeVal ?? null, // 변경 전 스냅샷 (없으면 null)
      after_val:   afterVal  ?? null, // 변경 후 스냅샷 또는 상세 정보
      ip_address:  null,              // 보안 정책상 현재 미수집 (향후 백엔드로 이동 예정)
    })
  } catch {
    // 로그 기록 실패는 관리자 작업을 방해하지 않도록 조용히 처리
  }
}
