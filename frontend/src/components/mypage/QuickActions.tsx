// 빠른 계산 바로가기 — 2×2 그리드 카드
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface QuickActionsProps {
  onOpenInquiry?: () => void  // 문의 모달 열기 (필요 시)
}

const ACTIONS = [
  {
    key: 'severance',
    icon: '💼',
    label: '퇴직금 계산',
    sub: '내 퇴직금을 계산해요',
    path: '/severance',
    bg: 'from-blue-50 to-blue-100/60',
    accent: 'text-blue-600',
    border: 'border-blue-100',
  },
  {
    key: 'unemployment',
    icon: '🛡️',
    label: '실업급여 계산',
    sub: '수급 가능 금액 확인',
    path: '/unemployment',
    bg: 'from-violet-50 to-violet-100/60',
    accent: 'text-violet-600',
    border: 'border-violet-100',
  },
  {
    key: 'weekly',
    icon: '📅',
    label: '주휴수당 계산',
    sub: '주휴일 수당 계산',
    path: '/weekly-allowance',
    bg: 'from-emerald-50 to-emerald-100/60',
    accent: 'text-emerald-600',
    border: 'border-emerald-100',
  },
  {
    key: 'annual',
    icon: '📋',
    label: '연차수당 계산',
    sub: '미사용 연차수당 확인',
    path: '/annual-leave',
    bg: 'from-amber-50 to-amber-100/60',
    accent: 'text-amber-600',
    border: 'border-amber-100',
  },
]

export function QuickActions({ onOpenInquiry }: QuickActionsProps) {
  void onOpenInquiry  // lint 방지
  const navigate = useNavigate()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-white rounded-[32px] shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-slate-100 px-5 py-5"
    >
      <p className="text-[15px] font-extrabold text-[#191f28] tracking-tight mb-4">빠른 계산</p>

      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action, i) => (
          <motion.button
            key={action.key}
            type="button"
            onClick={() => navigate(action.path)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`bg-gradient-to-br ${action.bg} rounded-[20px] border ${action.border} px-4 py-4 text-left hover:shadow-md active:scale-[0.97] transition-all`}
          >
            <span className="text-2xl block mb-2">{action.icon}</span>
            <p className={`text-[13px] font-extrabold ${action.accent}`}>{action.label}</p>
            <p className="text-[10px] text-[#8b95a1] mt-0.5 leading-tight">{action.sub}</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}
