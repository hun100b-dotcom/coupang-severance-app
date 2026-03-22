// 마이페이지 — 토스/당근마켓 스타일로 전면 개편
// 프로필 카드 · 계산 기록 · 빠른 계산 · 고객지원 · 계정 관리

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { notifyNewInquiry } from '../lib/api'
import { ProfileCard } from '../components/mypage/ProfileCard'
import { SavedResultsList } from '../components/mypage/SavedResultsList'
import { SavedResultDetail } from '../components/mypage/SavedResultDetail'
import { QuickActions } from '../components/mypage/QuickActions'
import { SupportSection } from '../components/mypage/SupportSection'
import { InquiryModal } from '../components/mypage/InquiryModal'
import type { InquiryItem } from '../components/mypage/InquiryHistory'
import type { ReportRow } from '../types/supabase'

// 가입일로부터 경과 일수 계산
function calcDaysFrom(iso: string | null | undefined): number | null {
  if (!iso) return null
  const start = new Date(iso)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const ms = today.getTime() - start.getTime()
  if (ms < 0) return null
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export default function MyPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, loading, logout } = useAuth()

  // ── 모달 상태
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)

  // ── 문의 내역
  const [inquiries, setInquiries] = useState<InquiryItem[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)

  // ── 저장된 계산 기록 (최대 50건)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  // 로그인되지 않으면 로그인 페이지로 이동
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [loading, isLoggedIn, navigate])

  // ── 문의 내역 조회
  const refreshInquiries = useCallback(async () => {
    if (!supabase || !isLoggedIn || !user) {
      setInquiries([]); setLoadingInquiries(false); return
    }
    setLoadingInquiries(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('id, title, content, status, created_at, answer')
        .eq('user_id', user.raw.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setInquiries((data as InquiryItem[]) ?? [])
    } catch {
      setInquiries([])
    } finally {
      setLoadingInquiries(false)
    }
  }, [isLoggedIn, user])

  useEffect(() => { refreshInquiries() }, [refreshInquiries])

  // ── 저장된 계산 기록 조회 (최대 50건, 최신순)
  useEffect(() => {
    if (!supabase || !isLoggedIn || !user) { setReports([]); setLoadingReports(false); return }
    const fetch = async () => {
      try {
        const { data } = await supabase!
          .from('reports')
          .select('id, title, company_name, created_at, payload')
          .eq('user_id', user.raw.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setReports((data as ReportRow[]) ?? [])
      } catch {
        setReports([])
      } finally {
        setLoadingReports(false)
      }
    }
    fetch()
  }, [isLoggedIn, user])

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  // 로그인 안 됨
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인이 필요합니다. 이동 중...</p>
      </div>
    )
  }

  const rawMeta    = user.raw.user_metadata ?? {}
  const displayName: string = rawMeta.full_name ?? rawMeta.name ?? user.name ?? '사용자'
  const avatarUrl: string | undefined = rawMeta.avatar_url ?? rawMeta.picture ?? user.avatarUrl
  const joinedAt: string | null = (rawMeta.joined_at as string | undefined) ?? (user.raw.created_at ?? null)
  const daysWithCatch = calcDaysFrom(joinedAt)

  // ── 1:1 문의 저장 핸들러
  const handleCreateInquiry = async (payload: { title: string; content: string }) => {
    if (!supabase) return
    await supabase.from('inquiries').insert({
      user_id: user.raw.id,
      title: payload.title,
      category: '기타',
      content: payload.content,
      status: '대기중',
    })
    notifyNewInquiry({ title: payload.title, content: payload.content, userId: user.raw.id, userName: displayName })
    await refreshInquiries()
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-16 relative z-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/home')}
              className="p-1.5 rounded-xl hover:bg-black/5 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#191f28]" />
            </button>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">내 정보</h1>
          </div>
          <button type="button" onClick={() => logout()}
            className="flex items-center gap-1.5 text-[12px] text-[#8B95A1] hover:text-[#4e5968] transition-colors px-2 py-1 rounded-lg hover:bg-black/5">
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-[460px] mx-auto px-4 pt-4 space-y-3 pb-6">

        {/* ① 프로필 카드 */}
        <ProfileCard
          name={displayName}
          email={user.email}
          avatarUrl={avatarUrl}
          joinedAt={joinedAt}
          daysWithCatch={daysWithCatch}
        />

        {/* ② 계산 기록 */}
        <SavedResultsList
          reports={reports}
          loading={loadingReports}
          onSelectReport={r => setSelectedReport(r)}
          onGoCalculate={() => navigate('/severance')}
        />

        {/* ③ 빠른 계산 바로가기 */}
        <QuickActions onOpenInquiry={() => setInquiryModalOpen(true)} />

        {/* ④ 고객지원 */}
        <SupportSection
          inquiries={inquiries}
          loadingInquiries={loadingInquiries}
          onOpenInquiry={() => setInquiryModalOpen(true)}
        />

        {/* ⑤ 계정 관리 */}
        <div className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-5">
          <p className="text-[15px] font-extrabold text-[#191f28] tracking-tight mb-3">계정 관리</p>
          <button type="button" onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 text-[13px] font-semibold text-[#4e5968] hover:bg-slate-50 active:scale-[0.98] transition-all">
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
          <p className="text-[10px] text-[#8b95a1] text-center mt-4 leading-relaxed">
            계정 탈퇴가 필요하시면 1:1 문의로 요청해 주세요.
          </p>
        </div>

      </main>

      {/* 계산결과 상세 모달 */}
      <SavedResultDetail
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* 1:1 문의 모달 */}
      <InquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={handleCreateInquiry}
      />
    </div>
  )
}
