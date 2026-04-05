// 설정 탭 컴포넌트
// - 마이페이지 ⚙️ 탭과 /settings 페이지 양쪽에서 공유하는 공통 컴포넌트
// - 섹션: 프로필 / 알림 설정 / 앱 정보 / 계정

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Info, Shield, LogOut, ChevronRight, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// 소셜 프로바이더 이름을 한국어로 변환
function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'google': return 'Google'
    case 'kakao': return '카카오'
    default: return provider
  }
}

// 소셜 프로바이더 아이콘 (이모지)
function getProviderEmoji(provider: string): string {
  switch (provider) {
    case 'google': return '🔵'
    case 'kakao': return '🟡'
    default: return '🔗'
  }
}

// 토글 스위치 컴포넌트 (재사용)
function Toggle({ value, onToggle, label }: {
  value: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        value ? 'bg-[#3182f6]' : 'bg-slate-200'
      }`}
      aria-label={label}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function MySettingsTab() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // ── 닉네임 편집 상태
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameLoading, setNicknameLoading] = useState(false)
  const [nicknameError, setNicknameError] = useState('')

  // ── 알림 설정 (localStorage에 저장, 기본값 ON)
  const [jobNotification, setJobNotification] = useState(() =>
    localStorage.getItem('notif_job') !== 'false'
  )
  const [workNotification, setWorkNotification] = useState(() =>
    localStorage.getItem('notif_work') !== 'false'
  )

  // 초기 닉네임: profiles 테이블 full_name 우선, 없으면 user_metadata에서
  useEffect(() => {
    if (!user) return

    const loadNickname = async () => {
      if (!supabase) {
        // Supabase 없으면 메타데이터에서 fallback
        const meta = user.raw.user_metadata ?? {}
        setNickname(meta.full_name ?? meta.name ?? user.name ?? '')
        return
      }

      try {
        // profiles 테이블에서 full_name 조회
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.raw.id)
          .maybeSingle()

        const meta = user.raw.user_metadata ?? {}
        setNickname(
          data?.full_name ?? meta.full_name ?? meta.name ?? user.name ?? ''
        )
      } catch {
        // 조회 실패 시 메타데이터 fallback
        const meta = user.raw.user_metadata ?? {}
        setNickname(meta.full_name ?? meta.name ?? user.name ?? '')
      }
    }

    loadNickname()
  }, [user])

  // 알림 토글 — localStorage 즉시 반영
  function toggleJobNotification() {
    const next = !jobNotification
    setJobNotification(next)
    localStorage.setItem('notif_job', String(next))
  }

  function toggleWorkNotification() {
    const next = !workNotification
    setWorkNotification(next)
    localStorage.setItem('notif_work', String(next))
  }

  // 닉네임 저장 → profiles.full_name 업데이트
  async function saveNickname() {
    if (!supabase || !user) return
    const trimmed = nickname.trim()
    if (!trimmed) { setNicknameError('닉네임을 입력해주세요.'); return }
    if (trimmed.length > 20) { setNicknameError('닉네임은 20자 이하로 입력해주세요.'); return }

    setNicknameLoading(true)
    setNicknameError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.raw.id)

      if (error) throw error
      setNickname(trimmed)
      setEditingNickname(false)
    } catch {
      setNicknameError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setNicknameLoading(false)
    }
  }

  // 회원 탈퇴 — 확인 다이얼로그 → 데이터 삭제 → 로그아웃
  async function handleDeleteAccount() {
    if (!supabase || !user) return

    const confirmed = window.confirm(
      '정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.\n\n' +
      '- 저장된 계산 결과\n- 1:1 문의 내역\n- 개인정보\n\n' +
      '이 작업은 되돌릴 수 없습니다.'
    )
    if (!confirmed) return

    try {
      // 유저 관련 데이터 삭제 (순서 중요: 외래키 참조 순)
      await supabase.from('reports').delete().eq('user_id', user.raw.id)
      await supabase.from('inquiries').delete().eq('user_id', user.raw.id)
      await supabase.from('user_access_logs').delete().eq('user_id', user.raw.id)
      await supabase.from('profiles').delete().eq('id', user.raw.id)
      // 로그아웃 처리
      await logout()
      navigate('/login')
    } catch {
      alert('탈퇴 처리 중 오류가 발생했습니다. 1:1 문의로 요청해 주세요.')
    }
  }

  // 연결된 소셜 계정 목록 (Supabase identities에서 추출)
  const providers = (user?.raw.identities ?? [])
    .map((i: { provider?: string }) => i.provider)
    .filter(Boolean) as string[]

  // 앱 버전 (vite-env.d.ts에 전역 선언됨)
  const appVersion = __APP_VERSION__ ?? '1.0.0'

  return (
    <div className="space-y-4">

      {/* ════ [프로필] 섹션 ════ */}
      <section className="bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#3182f6]" />
            <p className="text-[14px] font-extrabold text-[#191f28] tracking-tight">프로필</p>
          </div>

          {/* 이모지 아바타 + 닉네임 편집 */}
          <div className="flex items-center gap-4 mb-4">
            {/* 기본 이모지 아바타 (이미지 업로드는 추후 구현) */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
              👤
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#8b95a1] mb-0.5">닉네임</p>
              {editingNickname ? (
                /* 닉네임 편집 모드 */
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => { setNickname(e.target.value); setNicknameError('') }}
                    maxLength={20}
                    className="w-full px-3 py-2 text-[13px] border border-[#3182f6] rounded-xl outline-none bg-blue-50/30 focus:ring-2 focus:ring-blue-100"
                    placeholder="닉네임 입력 (최대 20자)"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveNickname() }}
                  />
                  {/* 에러 메시지 */}
                  {nicknameError && (
                    <p className="text-[11px] text-red-500">{nicknameError}</p>
                  )}
                  {/* 저장/취소 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={saveNickname}
                      disabled={nicknameLoading}
                      className="flex-1 py-1.5 text-[12px] font-bold text-white bg-[#3182f6] rounded-xl disabled:opacity-50 active:scale-[0.97] transition-all"
                    >
                      {nicknameLoading ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => { setEditingNickname(false); setNicknameError('') }}
                      className="flex-1 py-1.5 text-[12px] font-semibold text-[#8b95a1] bg-slate-100 rounded-xl active:scale-[0.97] transition-all"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* 닉네임 표시 모드 */
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[#191f28] truncate">
                    {nickname || '닉네임 없음'}
                  </p>
                  <button
                    onClick={() => setEditingNickname(true)}
                    className="text-[11px] text-[#3182f6] font-semibold px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0"
                  >
                    변경
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 이메일 (읽기 전용) */}
          <div className="px-3 py-2.5 bg-slate-50 rounded-xl">
            <p className="text-[11px] text-[#8b95a1] mb-0.5">이메일</p>
            <p className="text-[13px] text-[#4e5968] font-medium truncate">
              {user?.email ?? '-'}
            </p>
          </div>
        </div>
      </section>

      {/* ════ [알림 설정] 섹션 ════ */}
      <section className="bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-[#3182f6]" />
            <p className="text-[14px] font-extrabold text-[#191f28] tracking-tight">알림 설정</p>
          </div>
          <p className="text-[11px] text-[#8b95a1] mb-3">기기 알림 설정에서도 허용해야 정상 작동합니다</p>
        </div>

        {/* 새 채용공고 알림 토글 */}
        <div className="px-5 py-3.5 flex items-center justify-between border-t border-slate-50">
          <div>
            <p className="text-[13px] font-semibold text-[#191f28]">새 채용공고 알림</p>
            <p className="text-[11px] text-[#8b95a1] mt-0.5">맞춤 채용공고가 등록되면 알려드려요</p>
          </div>
          <Toggle
            value={jobNotification}
            onToggle={toggleJobNotification}
            label="새 채용공고 알림 토글"
          />
        </div>

        {/* 출근확정 알림 토글 */}
        <div className="px-5 py-3.5 flex items-center justify-between border-t border-slate-50">
          <div>
            <p className="text-[13px] font-semibold text-[#191f28]">출근확정 알림</p>
            <p className="text-[11px] text-[#8b95a1] mt-0.5">지원한 공고의 출근이 확정되면 알려드려요</p>
          </div>
          <Toggle
            value={workNotification}
            onToggle={toggleWorkNotification}
            label="출근확정 알림 토글"
          />
        </div>
      </section>

      {/* ════ [앱 정보] 섹션 ════ */}
      <section className="bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#3182f6]" />
            <p className="text-[14px] font-extrabold text-[#191f28] tracking-tight">앱 정보</p>
          </div>
        </div>

        {/* 앱 버전 표시 */}
        <div className="px-5 py-3.5 flex items-center justify-between border-t border-slate-50">
          <p className="text-[13px] font-semibold text-[#191f28]">앱 버전</p>
          <span className="text-[12px] text-[#8b95a1] font-mono font-medium">v{appVersion}</span>
        </div>

        {/* 이용약관 → /terms/service */}
        <button
          onClick={() => navigate('/terms/service')}
          className="w-full px-5 py-3.5 flex items-center justify-between border-t border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <p className="text-[13px] font-semibold text-[#191f28]">이용약관</p>
          <ChevronRight className="w-4 h-4 text-[#c0c8d2]" />
        </button>

        {/* 개인정보처리방침 → /terms/privacy */}
        <button
          onClick={() => navigate('/terms/privacy')}
          className="w-full px-5 py-3.5 flex items-center justify-between border-t border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <p className="text-[13px] font-semibold text-[#191f28]">개인정보처리방침</p>
          <ChevronRight className="w-4 h-4 text-[#c0c8d2]" />
        </button>

        {/* 고객센터 / 문의하기 → 이메일 링크 */}
        <a
          href="mailto:catchmasterdmin@gmail.com?subject=CATCH 앱 문의"
          className="w-full px-5 py-3.5 flex items-center justify-between border-t border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <p className="text-[13px] font-semibold text-[#191f28]">고객센터 / 문의하기</p>
          <ChevronRight className="w-4 h-4 text-[#c0c8d2]" />
        </a>
      </section>

      {/* ════ [계정] 섹션 ════ */}
      <section className="bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#3182f6]" />
            <p className="text-[14px] font-extrabold text-[#191f28] tracking-tight">계정</p>
          </div>
        </div>

        {/* 연결된 소셜 계정 표시 */}
        <div className="px-5 py-3.5 border-t border-slate-50">
          <p className="text-[12px] text-[#8b95a1] mb-2">연결된 소셜 계정</p>
          {providers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {providers.map(provider => (
                <span
                  key={provider}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[12px] font-semibold text-[#4e5968]"
                >
                  <span>{getProviderEmoji(provider)}</span>
                  {getProviderLabel(provider)}
                  <Check className="w-3 h-3 text-emerald-500" />
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[#c0c8d2]">연결된 계정 없음</p>
          )}
        </div>

        {/* 로그아웃 버튼 */}
        <div className="px-5 py-3.5 border-t border-slate-50">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 text-[13px] font-semibold text-[#4e5968] hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>

        {/* 회원탈퇴 — 맨 하단 작은 회색 링크 스타일 */}
        <div className="px-5 pb-5 pt-2 text-center border-t border-slate-50">
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="text-[11px] text-[#c0c8d2] hover:text-red-400 transition-colors underline underline-offset-2"
          >
            회원 탈퇴
          </button>
          <p className="text-[10px] text-[#c0c8d2] mt-1">탈퇴 시 모든 데이터가 즉시 삭제되며 복구할 수 없습니다</p>
        </div>
      </section>

    </div>
  )
}
