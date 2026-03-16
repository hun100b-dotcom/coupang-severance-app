// 마이페이지 상단의 프로필 영역을 담당하는 재사용 가능한 컴포넌트입니다.
// 이름, 프로필 이미지, 간단한 인사 문구를 토스 스타일의 카드로 보여줍니다.

import { motion } from 'framer-motion' // 부드러운 진입 애니메이션을 위해 framer-motion을 사용합니다.
import { User as UserIcon } from 'lucide-react' // 기본 아바타 아이콘으로 사용할 lucide-react 아이콘입니다.

interface ProfileSectionProps {
  name: string // 화면에 표시할 사용자 이름입니다.
  avatarUrl?: string // 소셜 프로필 이미지 주소(없으면 기본 아이콘을 사용합니다).
}

export function ProfileSection({ name, avatarUrl }: ProfileSectionProps) {
  return (
    <motion.section
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.12)] border border-slate-100 px-5 py-6 flex items-center gap-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover shadow-md shadow-slate-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shadow-inner">
            <UserIcon className="w-7 h-7 text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#4e5968] mb-1">반가워요</p>
        <p className="text-[20px] font-extrabold tracking-tight text-[#191f28] truncate">
          {name}님
        </p>
        <p className="text-[11px] text-[#8b95a1] mt-1">
          CATCH가 종훈님의 퇴직금과 혜택을 한 곳에서 정리해 드릴게요.
        </p>
      </div>
    </motion.section>
  )
}

