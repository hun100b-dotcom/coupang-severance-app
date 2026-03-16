// 주요 서비스로 빠르게 이동할 수 있는 카드 그리드입니다.
// 퇴직금 계산, 실업급여 계산, 1:1 상담으로 연결되는 세 개의 카드로 구성됩니다.

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calculator, LifeBuoy, MessageCircle } from 'lucide-react'

interface ServiceCardsProps {
  onOpenInquiry: () => void // 1:1 전문가 상담 카드 클릭 시 호출되는 콜백입니다.
}

export function ServiceCards({ onOpenInquiry }: ServiceCardsProps) {
  const navigate = useNavigate()

  const cards = [
    {
      key: 'severance',
      title: '퇴직금 계산기',
      description: '근무일수와 평균임금으로 예상 퇴직금을 확인하세요.',
      icon: <Calculator className="w-5 h-5 text-[#3182f6]" />,
      onClick: () => navigate('/severance'),
    },
    {
      key: 'unemployment',
      title: '실업급여 계산기',
      description: '내가 받을 수 있는 실업급여 금액과 기간을 확인합니다.',
      icon: <LifeBuoy className="w-5 h-5 text-emerald-500" />,
      onClick: () => navigate('/unemployment'),
    },
    {
      key: 'inquiry',
      title: '1:1 전문가 상담',
      description: '노무사에게 직접 궁금한 점을 물어보세요.',
      icon: <MessageCircle className="w-5 h-5 text-violet-500" />,
      onClick: onOpenInquiry,
    },
  ]

  return (
    <motion.section
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.06 },
        },
      }}
    >
      {cards.map((card, index) => (
        <motion.button
          key={card.key}
          type="button"
          onClick={card.onClick}
          className="bg-white rounded-[28px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] border border-slate-100 px-4 py-4 text-left flex flex-col gap-2 hover:border-[#3182f6]/50 hover:shadow-[0_18px_50px_rgba(49,130,246,0.18)] transition-all"
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.45, delay: index * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
            {card.icon}
          </div>
          <p className="text-sm font-semibold text-[#191f28]">{card.title}</p>
          <p className="text-[11px] text-[#8b95a1] leading-snug">{card.description}</p>
        </motion.button>
      ))}
    </motion.section>
  )
}

