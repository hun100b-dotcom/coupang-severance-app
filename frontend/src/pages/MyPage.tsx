/**
 * 마이페이지
 * - 비로그인: 로그인 유도 + 리다이렉트 시 "로그인이 필요한 서비스입니다" 안내
 * - 로그인: 프로필(유저 메타데이터), 퇴직금 D-Day 게이지(joined_at), 진단 리포트 목록(reports), CATCH PRO, 카카오 알림(profiles.marketing_agreement)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Settings, User, ChevronRight, FileText, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import type { Profile, ReportRow } from '../types/supabase'

const CARD_CLASS =
  'bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50'

/** 입사일 문자열(YYYY-MM-DD)로부터 경과 일수 계산 */
function getWorkDays(joinedAt: string | null): number | null {
  if (!joinedAt) return null
  const joined = new Date(joinedAt)
  const today = new Date()
  joined.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = today.getTime() - joined.getTime()
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

/** 날짜 포맷 (YY.MM.DD) */
function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso)
    const y = String(d.getFullYear()).slice(2)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  } catch {
    return iso
  }
}

export default function MyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, user, login, logout, refreshUser } = useAuth()

  const [loginLoading, setLoginLoading] = useState<'kakao' | 'google' | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [kakaoNotify, setKakaoNotify] = useState(true)
  const [kakaoNotifyUpdating, setKakaoNotifyUpdating] = useState(false)

  // 닉네임 수정 모달
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 리다이렉트 메시지 (보호 라우트에서 넘어온 경우)
  const redirectMessage = (location.state as { message?: string })?.message

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setLoginLoading(provider)
    try {
      await login(provider)
    } finally {
      setLoginLoading(null)
    }
  }

  // 프로필 조회 (joined_at, marketing_agreement)
  useEffect(() => {
    if (!isLoggedIn || !user?.id || !supabase) {
      setProfileLoading(false)
      setProfile(null)
      return
    }
    let cancelled = false
    const run = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (!cancelled && data) {
        setProfile(data as Profile)
        setKakaoNotify((data as Profile).marketing_agreement ?? true)
      }
      if (!cancelled) setProfileLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [isLoggedIn, user?.id])

  // 진단 리포트 목록 (최신순)
  useEffect(() => {
    if (!isLoggedIn || !user?.id || !supabase) {
      setReportsLoading(false)
      setReports([])
      return
    }
    let cancelled = false
    const run = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setReports((data as ReportRow[]) ?? [])
        setReportsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [isLoggedIn, user?.id])

  // 닉네임 수정 모달 열 때 현재 이름으로 초기화
  const openEditModal = useCallback(() => {
    setEditName(user?.name ?? '')
    setEditModalOpen(true)
  }, [user?.name])

  const saveNickname = useCallback(async () => {
    if (!supabase || !editName.trim()) return
    setEditSaving(true)
    try {
      await supabase.auth.updateUser({ data: { full_name: editName.trim() } })
      await refreshUser()
      setEditModalOpen(false)
    } catch {
      // 실패 시 모달 유지
    } finally {
      setEditSaving(false)
    }
  }, [editName, refreshUser])

  // 카카오 알림 토글 → profiles.marketing_agreement 업데이트
  const toggleKakaoNotify = useCallback(async () => {
    if (!supabase || !user?.id) return
    const next = !kakaoNotify
    setKakaoNotifyUpdating(true)
    try {
      const { error } = await supabase.from('profiles').upsert(
        { id: user.id, marketing_agreement: next, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (!error) setKakaoNotify(next)
    } catch {
      // 토글 롤백은 하지 않음
    } finally {
      setKakaoNotifyUpdating(false)
    }
  }, [user?.id, kakaoNotify])

  // 비로그인: 로그인 유도 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-[400px]">
          {redirectMessage && (
            <p className="text-center text-[#3182F6] font-medium mb-4">{redirectMessage}</p>
          )}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30">
              <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
            </div>
            <h1 className="text-xl font-bold text-[#191F28] mb-2">내 정보</h1>
            <p className="text-sm text-[#4E5968]">로그인하면 D-Day와 진단 리포트를 볼 수 있어요</p>
          </div>
          <div className={`${CARD_CLASS} p-6`}>
            <p className="text-sm font-semibold text-[#191F28] mb-4">간편 로그인</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleLogin('kakao')}
                disabled={!!loginLoading}
                className="w-full h-12 rounded-full bg-[#FEE500] text-[#191600] flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <span className="w-5 h-5 rounded-md bg-[#191600] text-[#FEE500] flex items-center justify-center text-[10px] font-bold">
                  K
                </span>
                {loginLoading === 'kakao' ? '로그인 중...' : '카카오로 로그인'}
              </button>
              <button
                type="button"
                onClick={() => handleLogin('google')}
                disabled={!!loginLoading}
                className="w-full h-12 rounded-full bg-white text-[#191F28] border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <span className="w-5 h-5 rounded-md border border-gray-300 flex items-center justify-center text-[10px] font-bold">
                  G
                </span>
                {loginLoading === 'google' ? '로그인 중...' : 'Google로 로그인'}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 w-full text-sm text-[#8B95A1]"
          >
            ← 홈으로
          </button>
        </div>
      </div>
    )
  }

  // 퇴직금 게이지 계산 (joined_at 기준)
  const workDays = profile?.joined_at ? getWorkDays(profile.joined_at) : null
  const targetDays = 365
  const rate = workDays != null ? Math.min(100, (workDays / targetDays) * 100) : 0
  const dDay = workDays != null ? Math.max(0, targetDays - workDays) : null
  const isEligible = workDays != null && workDays >= targetDays
  const joinedAtFormatted = profile?.joined_at
    ? formatDateShort(profile.joined_at)
    : '—'

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-8 relative z-10">
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/catch-logo.png" alt="" className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold text-[#191F28]">내 정보</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="relative p-1.5 text-[#4E5968]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>
            <button type="button" className="p-1.5 text-[#4E5968]">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[460px] mx-auto px-4 pt-4 space-y-4">
        {/* 프로필 카드: 유저 메타데이터(프로필 사진, 이름) + 수정 모달 */}
        <button
          type="button"
          className={`${CARD_CLASS} w-full p-4 flex items-center gap-3 text-left`}
          onClick={openEditModal}
        >
          <div className="relative">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
            {user?.provider && (
              <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-[#FEE500] flex items-center justify-center text-[9px] font-bold text-[#191600]">
                {user.provider === 'kakao' ? 'K' : 'G'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#191F28] truncate">{user?.name ?? '사용자'}</p>
            <p className="text-xs text-[#8B95A1]">내 정보 수정 (이름 옆 &gt; 클릭)</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>

        {/* 닉네임 수정 모달 */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditModalOpen(false)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-[320px] shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="font-semibold text-[#191F28] mb-3">닉네임 수정</p>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="이름 입력"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#191F28] placeholder:text-gray-400"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-[#4E5968] border border-gray-200 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveNickname}
                  disabled={editSaving || !editName.trim()}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-[#3182F6] rounded-xl disabled:opacity-50"
                >
                  {editSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATCH D-Day 카드: 근무일수·달성률·D-Day·게이지 애니메이션 */}
        <div className={`${CARD_CLASS} p-5`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-[#3182F6] bg-blue-50 px-2.5 py-1 rounded-full">
              CATCH D-Day
            </span>
            <Clock className="w-5 h-5 text-[#3182F6]" />
          </div>
          <p className="text-[#191F28] text-sm mb-0.5">퇴직금 요건 달성까지</p>
          {profileLoading ? (
            <div className="animate-pulse space-y-2 mb-4">
              <div className="h-6 bg-gray-100 rounded w-2/3" />
              <div className="h-2 bg-gray-100 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-1/2 mt-2" />
            </div>
          ) : isEligible ? (
            <p className="text-[#3182F6] font-extrabold text-xl mb-4">퇴직금 수급 대상자입니다</p>
          ) : dDay != null ? (
            <p className="text-[#3182F6] font-extrabold text-xl mb-4">{dDay}일 남았어요!</p>
          ) : (
            <p className="text-[#8B95A1] font-medium text-lg mb-4">입사일을 설정하면 D-Day를 확인할 수 있어요</p>
          )}
          {!profileLoading && (
            <>
              <div className="flex justify-between text-xs text-[#8B95A1] mb-1">
                <span>{workDays != null ? `${Math.round(rate)}% 완료` : '—'}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-[#3182F6] relative transition-[width] duration-700 ease-out"
                  style={{ width: `${rate}%` }}
                >
                  <div className="absolute right-0 inset-y-0 w-8 bg-white/30 rounded-r-full" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-[#8B95A1]">
                <span>첫 출근</span>
                <span>{joinedAtFormatted}</span>
              </div>
            </>
          )}
        </div>

        {/* 내 진단 리포트: reports 테이블 연동, 최신순, 클릭 시 /report/[id] */}
        <div className={`${CARD_CLASS} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#191F28]">내 진단 리포트</h2>
          </div>
          {reportsLoading ? (
            <ul className="space-y-3">
              {[1, 2].map(i => (
                <li key={i} className="flex items-center gap-3 py-2 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : reports.length === 0 ? (
            <p className="text-sm text-[#8B95A1] py-4">아직 진단 리포트가 없어요</p>
          ) : (
            <ul className="space-y-3">
              {reports.map(r => (
                <li
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50/50 rounded-xl -mx-1 px-1"
                  onClick={() => navigate(`/report/${r.id}`)}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/report/${r.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#191F28] truncate">{r.title || '쿠팡 진단 리포트'}</p>
                    <p className="text-xs text-[#8B95A1]">{formatDateShort(r.created_at)} 진단 완료</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => navigate('/severance')}
            className="w-full mt-3 py-3 text-sm font-semibold text-[#3182F6] border border-[#3182F6]/30 rounded-xl hover:bg-blue-50/50"
          >
            + 새 근무 기록 진단하기
          </button>
        </div>

        {/* CATCH PRO 배너: 월 2,900원, 결제 안내 페이지 링크 + 결제 클릭 시 알림 */}
        <div
          className="rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#1c1c1e] p-5 relative"
          role="banner"
        >
          <p className="text-[#E5D88A] text-xs font-bold mb-2">★ CATCH PRO</p>
          <p className="text-white font-bold text-base mb-1">퇴직금 청구, 막막하신가요?</p>
          <p className="text-white/90 text-sm mb-2">전문 노무사가 도와드립니다.</p>
          <p className="text-white/70 text-xs mb-2">서류 준비부터 진정 접수까지 한 번에</p>
          <p className="text-[#E5D88A] font-bold text-sm mb-4">월 2,900원</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/payment')}
              className="flex-1 py-2.5 text-sm font-semibold text-[#1c1c1e] bg-[#E5D88A] rounded-xl hover:bg-[#ddd078]"
            >
              전문가 매칭 · 결제 안내
            </button>
            <button
              type="button"
              onClick={() => window.alert('결제 기능은 준비 중입니다. 곧 만나요!')}
              className="flex-1 py-2.5 text-sm font-semibold text-white border border-white/50 rounded-xl hover:bg-white/10"
            >
              결제하기
            </button>
          </div>
        </div>

        {/* 카카오톡 알림: profiles.marketing_agreement 연동 */}
        <div className={`${CARD_CLASS} p-4 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#191F28]">카카오톡 알림 받기</p>
              <p className="text-xs text-[#8B95A1]">목표 달성 시 제일 먼저 알려드려요</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={kakaoNotify}
            disabled={kakaoNotifyUpdating}
            onClick={toggleKakaoNotify}
            className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${kakaoNotify ? 'bg-[#3182F6]' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${kakaoNotify ? 'left-6 translate-x-[-100%]' : 'left-1'}`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full py-2 text-sm text-[#8B95A1]"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
