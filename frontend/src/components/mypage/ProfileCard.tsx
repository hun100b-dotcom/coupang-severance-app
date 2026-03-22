// 마이페이지 상단 프로필 카드 — 토스 스타일
// 이니셜 아바타, 이름·이메일, 가입일, "CATCH와 함께한 N일" 표시
import { motion } from 'framer-motion'
import { Edit3 } from 'lucide-react'

interface ProfileCardProps {
  name: string
  email?: string
  avatarUrl?: string
  joinedAt: string | null          // ISO 문자열
  daysWithCatch: number | null     // 가입 후 경과 일수
  onEditName?: () => void          // 프로필 편집 버튼 핸들러 (옵션)
}

// 이름의 첫 글자(이니셜)를 추출합니다
function getInitial(name: string): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// ISO 날짜를 "YYYY.MM.DD" 형식으로 변환합니다
function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function ProfileCard({ name, email, avatarUrl, joinedAt, daysWithCatch, onEditName }: ProfileCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.10)] border border-slate-100 overflow-hidden"
    >
      {/* 상단 파란 배경 영역 */}
      <div className="h-20 bg-gradient-to-r from-[#3182f6] to-[#60a5fa] relative" />

      {/* 아바타 + 기본 정보 */}
      <div className="px-5 pb-5">
        {/* 아바타 (배경 위로 올라오는 효과) */}
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt=""
                className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-[0_4px_20px_rgba(15,23,42,0.15)]" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3182f6] to-[#60a5fa] flex items-center justify-center border-4 border-white shadow-[0_4px_20px_rgba(49,130,246,0.4)]">
                <span className="text-2xl font-extrabold text-white">{getInitial(name)}</span>
              </div>
            )}
          </div>
          {onEditName && (
            <button type="button" onClick={onEditName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#4e5968] hover:bg-slate-50 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
              프로필 편집
            </button>
          )}
        </div>

        {/* 이름·이메일 */}
        <p className="text-[20px] font-extrabold text-[#191f28] tracking-tight">{name}</p>
        {email && <p className="text-[12px] text-[#8b95a1] mt-0.5">{email}</p>}

        {/* 가입일 + 함께한 날수 */}
        <div className="mt-3 flex items-center gap-3">
          {joinedAt && (
            <span className="text-[11px] text-[#8b95a1]">가입일 {formatDate(joinedAt)}</span>
          )}
          {daysWithCatch !== null && daysWithCatch >= 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-bold text-[#3182f6]">
              🎯 CATCH와 함께한 {daysWithCatch}일
            </span>
          )}
        </div>
      </div>
    </motion.section>
  )
}
