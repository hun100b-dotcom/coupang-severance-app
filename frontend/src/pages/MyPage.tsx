// 마이페이지 화면입니다.
// 전역 Auth 상태에서 유저 정보를 가져와 이름과 프로필 이미지를 보여주고,
// 가입일(또는 유사한 날짜)을 이용해 "오늘 - 가입일" 형태의 간단한 퇴직금 게이지 숫자를 표시합니다.

import { useEffect } from 'react' // 로그인 여부에 따라 리다이렉트를 처리하기 위해 useEffect를 사용합니다.
import { useNavigate } from 'react-router-dom' // 로그인 안 된 경우 로그인 페이지로 보내기 위해 useNavigate를 사용합니다.
import { User, Clock } from 'lucide-react' // 프로필과 게이지에 사용할 아이콘을 가져옵니다.
import { useAuth } from '../contexts/AuthContext' // 전역 로그인 상태와 유저 정보를 가져오기 위해 useAuth 훅을 사용합니다.

// 가입일(ISO 문자열)로부터 오늘까지 경과한 일수를 계산하는 함수입니다.
function calculateDaysFrom(joinedAt: string | null | undefined): number | null {
  if (!joinedAt) {
    // 가입일 정보가 없으면 null을 반환해 "알 수 없음" 상태로 취급합니다.
    return null
  }
  const start = new Date(joinedAt) // 가입일 문자열을 Date 객체로 변환합니다.
  const today = new Date() // 오늘 날짜를 새 Date 객체로 가져옵니다.
  start.setHours(0, 0, 0, 0) // 가입일의 시간 정보를 0시로 맞춰 일 단위 비교를 용이하게 합니다.
  today.setHours(0, 0, 0, 0) // 오늘 날짜도 마찬가지로 0시로 맞춥니다.
  const diffMs = today.getTime() - start.getTime() // 두 날짜의 밀리초 차이를 계산합니다.
  if (diffMs < 0) {
    // 가입일이 미래라면 잘못된 데이터로 보고 null을 반환합니다.
    return null
  }
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) // 밀리초를 일(day) 단위 숫자로 변환해 반환합니다.
}

export default function MyPage() {
  const navigate = useNavigate() // 다른 페이지로 이동하기 위한 훅입니다.
  const { isLoggedIn, user, loading, logout } = useAuth() // 전역 Auth 컨텍스트에서 로그인 여부와 유저 정보를 가져옵니다.

  useEffect(() => {
    // 로그인 상태가 아닌데 로딩이 끝났다면 로그인 페이지로 보냅니다.
    if (!loading && !isLoggedIn) {
      navigate('/login', { replace: true }) // 뒤로 가기로 돌아오지 않도록 replace 옵션을 사용합니다.
    }
  }, [loading, isLoggedIn, navigate]) // 로딩 여부나 로그인 상태가 바뀔 때마다 이 로직을 다시 확인합니다.

  if (loading) {
    // 아직 초기 세션 확인 중이라면 간단한 로딩 화면을 보여줍니다.
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  if (!isLoggedIn || !user) {
    // 로딩은 끝났지만 유저가 없다면(로그아웃 상태) 실제 화면은 잠깐도 보이지 않게 최소한의 문구만 보여줍니다.
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-sm text-[#8B95A1]">로그인이 필요합니다. 로그인 페이지로 이동 중...</p>
      </div>
    )
  }

  const rawMeta = user.raw.user_metadata ?? {} // Supabase 유저의 user_metadata를 가져옵니다(없으면 빈 객체로 둡니다).
  const displayName: string =
    rawMeta.full_name ?? rawMeta.name ?? user.name ?? '사용자' // full_name → name → 기존 name 순서로 화면에 보여줄 이름을 정합니다.
  const avatarUrl: string | undefined =
    rawMeta.avatar_url ?? rawMeta.picture ?? user.avatarUrl // metadata의 프로필 이미지 → 기존 avatarUrl 순으로 이미지를 정합니다.

  const joinedAtRaw: string | null =
    (rawMeta.joined_at as string | undefined) ??
    (user.raw.created_at ?? null) // 가입일로 사용할 값을 user_metadata.joined_at이 우선, 없으면 계정 생성일(created_at)을 사용합니다.

  const workedDays = calculateDaysFrom(joinedAtRaw) // 위에서 만든 함수로 (오늘 - 가입일) 일수를 계산합니다.

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-8 relative z-10">
      {/* 상단 헤더: 단순한 타이틀과 로그아웃 버튼을 배치합니다. */}
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/catch-logo.png" alt="" className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold text-[#191F28]">마이페이지</h1>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs text-[#8B95A1]"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 본문: 프로필 정보와 간단한 퇴직금 게이지 정보를 표시합니다. */}
      <main className="max-w-[460px] mx-auto px-4 pt-4 space-y-4">
        {/* 프로필 카드: 이름과 프로필 이미지를 보여줍니다. */}
        <section className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-5 flex items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#191F28] truncate">{displayName}</p>
            <p className="text-xs text-[#8B95A1]">소셜 계정으로 로그인 중입니다.</p>
          </div>
        </section>

        {/* 아주 단순한 퇴직금 게이지: 오늘 - 가입일 일수만 숫자로 확인합니다. */}
        <section className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3182F6]" />
              <p className="text-sm font-semibold text-[#191F28]">퇴직금 근무일 수</p>
            </div>
          </div>
          {workedDays === null ? (
            <p className="text-sm text-[#8B95A1]">
              가입일 정보를 찾을 수 없어 근무일 수를 계산할 수 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[#4E5968]">오늘 기준 근무일 수는 다음과 같아요.</p>
              <p className="text-2xl font-extrabold text-[#3182F6]">
                {workedDays.toLocaleString()}일
              </p>
            </div>
          )}
        </section>

        {/* 홈으로 돌아가는 보조 버튼입니다. */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3 text-sm text-[#8B95A1]"
        >
          ← 홈으로
        </button>
      </main>
    </div>
  ) // 마이페이지 전체 레이아웃을 반환합니다.
}

