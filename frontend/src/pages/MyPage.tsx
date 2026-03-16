// 마이페이지 화면입니다.
// Toss / Apple Card 스타일을 참고해, 프로필·퇴직금 위젯·서비스 카드·1:1 문의 내역을 한 화면에 배치합니다.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ProfileSection } from '../components/mypage/ProfileSection'
import { RetirementWidget } from '../components/mypage/RetirementWidget'
import { ServiceCards } from '../components/mypage/ServiceCards'
import { InquiryModal } from '../components/mypage/InquiryModal'
import { InquiryHistory, InquiryItem } from '../components/mypage/InquiryHistory'
import { notifyNewInquiry } from '../lib/api'

// 가입일(ISO 문자열)로부터 오늘까지 경과한 일수를 계산하는 순수 함수입니다.
function calculateDaysFrom(joinedAt: string | null | undefined): number | null {
  if (!joinedAt) return null
  const start = new Date(joinedAt)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - start.getTime()
  if (diffMs < 0) return null
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

export default function MyPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, loading, logout } = useAuth()

  const [inquiryModalOpen, setInquiryModalOpen] = useState(false) // 1:1 문의 작성 모달 표시 여부입니다.
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]) // 사용자의 문의 히스토리 목록입니다.
  const [loadingInquiries, setLoadingInquiries] = useState(true) // 문의 목록 로딩 상태입니다.

  // 로그인 상태가 아닌데 로딩이 끝났다면 로그인 페이지로 보냅니다.
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [loading, isLoggedIn, navigate])

  // 아직 초기 세션 확인 중이라면 간단한 로딩 화면을 반환합니다.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  // 로그인되지 않은 상태라면 안내 문구만 표시합니다.
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인이 필요합니다. 로그인 페이지로 이동 중...</p>
      </div>
    )
  }

  const rawMeta = user.raw.user_metadata ?? {}
  const displayName: string =
    rawMeta.full_name ?? rawMeta.name ?? user.name ?? '사용자'
  const avatarUrl: string | undefined =
    rawMeta.avatar_url ?? rawMeta.picture ?? user.avatarUrl

  const joinedAtRaw: string | null =
    (rawMeta.joined_at as string | undefined) ?? (user.raw.created_at ?? null)

  const workedDays = calculateDaysFrom(joinedAtRaw)

  // 사용자의 1:1 문의 내역을 Supabase `inquiries` 테이블에서 불러오는 함수입니다.
  const refreshInquiries = async () => {
    if (!supabase) {
      setInquiries([])
      return
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
  }

  useEffect(() => {
    refreshInquiries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 1:1 문의 작성 모달에서 호출하는 저장 함수입니다.
  const handleCreateInquiry = async (payload: { title: string; content: string }) => {
    if (!supabase) return
    // 1) Supabase inquiries 테이블에 문의를 저장합니다.
    await supabase.from('inquiries').insert({
      user_id: user.raw.id,
      title: payload.title,
      content: payload.content,
      status: 'waiting',
    })
    // 2) 관리자 알림(Discord Webhook 등)을 비동기로 호출합니다.
    notifyNewInquiry({
      title: payload.title,
      content: payload.content,
      userId: user.raw.id,
      userName: displayName,
    })
    // 3) 최신 상담 내역을 다시 가져옵니다.
    await refreshInquiries()
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-10 relative z-10">
      {/* 상단 헤더: 앱 로고와 로그아웃 버튼을 오른쪽에 배치합니다. */}
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/catch-logo.png" alt="" className="w-7 h-7 object-contain" />
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">
              내 정보
            </h1>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs text-[#8B95A1] hover:text-[#4e5968]"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 본문: 프로필 · 퇴직금 위젯 · 서비스 카드 · 상담 내역 순서로 구성합니다. */}
      <main className="max-w-[460px] mx-auto px-4 pt-4 space-y-4 pb-6">
        <ProfileSection name={displayName} avatarUrl={avatarUrl} />

        <RetirementWidget
          workDays={workedDays}
          onGoCalculate={() => navigate('/severance')}
        />

        <ServiceCards onOpenInquiry={() => setInquiryModalOpen(true)} />

        {loadingInquiries ? (
          <section className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-6">
            <p className="text-sm text-[#8b95a1]">나의 상담 내역을 불러오는 중입니다...</p>
          </section>
        ) : (
          <InquiryHistory items={inquiries} />
        )}

        {/* 홈으로 돌아가는 보조 버튼 */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3 text-sm text-[#8B95A1]"
        >
          ← 홈으로
        </button>
      </main>

      {/* 1:1 문의 작성 모달 */}
      <InquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={handleCreateInquiry}
      />
    </div>
  )
}


