// ──────────────────────────────────────────────────────────────────────────
// referral.ts — 추천인 시스템 유틸 함수 모음
//
// 사용 흐름:
//  1. Login 페이지: URL ?ref= 파라미터 → localStorage['pending_ref_code'] 저장
//  2. Onboarding 완료: saveReferral() 호출 → user_referrals 테이블 INSERT
//  3. MyRewardsTab: getReferralStats() 호출 → 내 코드 + 추천 수 표시
// ──────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { SITE_URL } from '../config/site'

// localStorage 키 상수
export const PENDING_REF_CODE_KEY = 'pending_ref_code'

// 앱 기본 URL (도메인 기준값은 config/site.ts 에서 관리)
const APP_BASE_URL = SITE_URL

// ── 추천 링크 생성 ──────────────────────────────────────────────────────────
// 코드를 받아 공유 가능한 전체 URL로 변환
export function buildReferralLink(code: string): string {
  return `${APP_BASE_URL}?ref=${code}`
}

// ── URL에서 추천 코드 추출 ──────────────────────────────────────────────────
// 현재 페이지 URL의 ?ref= 파라미터 값을 반환 (없으면 null)
export function extractRefCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('ref')
  // 6자리 영숫자만 유효한 코드로 허용 (XSS 방지)
  if (code && /^[A-Z0-9]{6}$/i.test(code)) {
    return code.toUpperCase()
  }
  return null
}

// ── 추천 코드 localStorage 임시 저장 ──────────────────────────────────────
// OAuth 리다이렉트 중에도 코드가 유지되도록 localStorage에 보관
export function savePendingRefCode(code: string): void {
  localStorage.setItem(PENDING_REF_CODE_KEY, code)
}

// ── localStorage에서 추천 코드 읽기 ────────────────────────────────────────
export function getPendingRefCode(): string | null {
  return localStorage.getItem(PENDING_REF_CODE_KEY)
}

// ── localStorage에서 추천 코드 삭제 ────────────────────────────────────────
// 온보딩 완료 후 반드시 정리
export function clearPendingRefCode(): void {
  localStorage.removeItem(PENDING_REF_CODE_KEY)
}

// ── 내 추천 코드 확인 + 없으면 자동 생성 ─────────────────────────────────
// profiles.referral_code가 비어있는 기존 사용자를 위한 폴백
// 마이그레이션 SQL에서 일괄 생성하므로 일반적으로는 항상 코드가 있음
export async function ensureReferralCode(userId: string): Promise<string | null> {
  if (!supabase) return null

  // 1) 현재 코드 조회
  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[referral] 프로필 조회 실패:', fetchErr.message)
    return null
  }

  // 코드가 이미 있으면 그대로 반환
  if (profile?.referral_code) {
    return profile.referral_code as string
  }

  // 2) 코드가 없으면 클라이언트 측에서 임시 생성 후 저장
  // (DB 함수가 없는 환경 대비 — 실제로는 마이그레이션 SQL이 처리함)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let newCode = ''
  for (let i = 0; i < 6; i++) {
    newCode += chars[Math.floor(Math.random() * chars.length)]
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ referral_code: newCode })
    .eq('id', userId)
    // referral_code가 여전히 NULL인 행만 업데이트 (동시성 충돌 방지)
    .is('referral_code', null)

  if (updateErr) {
    // UNIQUE 충돌 가능성 — 재조회로 폴백
    console.warn('[referral] 코드 저장 충돌, 재조회 시도:', updateErr.message)
    const { data: retry } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle()
    return (retry?.referral_code as string) ?? null
  }

  return newCode
}

// ── 추천 관계 저장 ─────────────────────────────────────────────────────────
// 온보딩 완료 시 호출: refCode로 referrer 찾아 user_referrals에 INSERT
// 중복 INSERT는 ON CONFLICT DO NOTHING (referred_id UNIQUE 제약)
export async function saveReferral(referredId: string, refCode: string): Promise<void> {
  if (!supabase) return

  // 1) 추천 코드로 추천인(referrer) ID 조회
  const { data: referrer, error: lookupErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', refCode)
    .maybeSingle()

  if (lookupErr) {
    console.error('[referral] 추천인 조회 실패:', lookupErr.message)
    return
  }

  // 유효하지 않은 코드이거나 자기 자신을 추천한 경우 무시
  if (!referrer || referrer.id === referredId) {
    console.info('[referral] 유효하지 않은 추천 코드 또는 자기 추천:', refCode)
    return
  }

  // 2) 추천 관계 INSERT (중복 시 무시)
  const { error: insertErr } = await supabase
    .from('user_referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: referredId,
      referral_code: refCode,
    })

  // referred_id UNIQUE 충돌(이미 추천받은 사용자)은 정상 케이스이므로 경고만
  if (insertErr && !insertErr.message.includes('duplicate')) {
    console.error('[referral] 추천 관계 저장 실패:', insertErr.message)
  } else if (!insertErr) {
    console.info('[referral] 추천 관계 저장 완료:', refCode, '→', referredId)
  }
}

// ── 추천 현황 조회 ─────────────────────────────────────────────────────────
// 내 추천 코드 + 내가 추천한 사람 수를 한 번에 반환
export interface ReferralStats {
  myCode: string | null       // 내 추천 코드
  referralCount: number       // 내가 추천한 사람 수
  referralLink: string | null // 공유 가능한 전체 URL
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  if (!supabase) return { myCode: null, referralCount: 0, referralLink: null }

  // 내 코드 + 추천 수 동시 조회
  const [profileResult, countResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId),
  ])

  const myCode = (profileResult.data?.referral_code as string) ?? null
  const referralCount = countResult.count ?? 0

  // 코드가 없으면 자동 생성 시도
  const resolvedCode = myCode ?? (await ensureReferralCode(userId))

  return {
    myCode: resolvedCode,
    referralCount,
    referralLink: resolvedCode ? buildReferralLink(resolvedCode) : null,
  }
}
