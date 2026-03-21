// 나의 혜택 — 일용직 근로자를 위한 지원금·혜택 카드뉴스
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Gift, ChevronRight, Sparkles, Users, Home, Heart, BookOpen, Shield } from 'lucide-react'

interface BenefitCard {
  id: string
  badge: string
  badgeColor: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  highlight: string
  conditions: string[]
  amount: string
  amountLabel: string
  tip: string
}

const BENEFITS: BenefitCard[] = [
  {
    id: 'duru',
    badge: '★ 필수 확인',
    badgeColor: 'bg-blue-500 text-white',
    icon: Shield,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: '두루누리 사회보험 지원',
    subtitle: '고용보험·국민연금 보험료 최대 80% 지원',
    highlight: '월 보수 270만 원 미만이면 해당돼요',
    conditions: [
      '10인 미만 사업장 근로자',
      '월 보수액 270만 원 미만',
      '고용보험·국민연금 신규 가입자 (또는 재가입)',
    ],
    amount: '최대 80%',
    amountLabel: '보험료 지원율',
    tip: '일용직도 1개월 이상 근무 예정이면 신청 가능해요.',
  },
  {
    id: 'eitc',
    badge: '💰 현금 지급',
    badgeColor: 'bg-emerald-500 text-white',
    icon: Sparkles,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: '근로장려금 (EITC)',
    subtitle: '저소득 근로자 세금 환급형 지원금',
    highlight: '연 소득 3,800만 원 미만 단독 가구도 신청 가능',
    conditions: [
      '단독: 총소득 3,800만 원 미만',
      '홑벌이: 총소득 4,300만 원 미만',
      '맞벌이: 총소득 5,600만 원 미만',
      '재산 합계 2억 4,000만 원 미만',
    ],
    amount: '최대 330만 원',
    amountLabel: '연간 지급액 (맞벌이 기준)',
    tip: '5월 종합소득세 신고 시 함께 신청하거나, 국세청 홈택스에서 별도 신청해요.',
  },
  {
    id: 'housing',
    badge: '🏠 주거 지원',
    badgeColor: 'bg-violet-500 text-white',
    icon: Home,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    title: '주거급여',
    subtitle: '임차료·수선비 실비 지원',
    highlight: '중위소득 48% 이하이면 매달 임차료 받아요',
    conditions: [
      '소득인정액 기준 중위소득 48% 이하',
      '임차 가구 또는 자가 가구 모두 해당',
      '부양의무자 기준 폐지 (누구나 신청 가능)',
    ],
    amount: '최대 월 64만 원',
    amountLabel: '서울 1인 가구 기준',
    tip: '읍·면·동 주민센터 또는 복지로(bokjiro.go.kr)에서 신청해요.',
  },
  {
    id: 'employment',
    badge: '📋 취업 지원',
    badgeColor: 'bg-amber-500 text-white',
    icon: BookOpen,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: '국민취업지원제도',
    subtitle: '구직 활동 지원금 + 취업 지원 프로그램',
    highlight: '구직촉진수당 월 50만 원, 최대 6개월 지급',
    conditions: [
      '만 15~69세 구직자',
      '소득·재산 기준 충족 시 우선 지원',
      '취업지원 서비스 + 수당 동시 지원',
    ],
    amount: '최대 월 50만 원',
    amountLabel: '구직촉진수당 (최대 6개월)',
    tip: '고용센터 방문 또는 워크넷(work.go.kr)에서 신청해요.',
  },
  {
    id: 'insurance',
    badge: '🛡️ 고용보험',
    badgeColor: 'bg-slate-600 text-white',
    icon: Users,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    title: '고용보험 피보험자 혜택',
    subtitle: '실업급여·출산급여·육아휴직급여 수급 자격',
    highlight: '18개월 중 180일 이상 가입 → 실업급여 자격',
    conditions: [
      '일용직도 1일 단위 고용보험 가입 의무',
      '피보험 단위기간 180일 충족 시 실업급여',
      '출산전후급여: 출산 전 180일 이상 납부',
    ],
    amount: '평균임금 60%',
    amountLabel: '실업급여 지급율 (최대 270일)',
    tip: '사업주가 미가입 시 신고하면 고용보험 소급 가입이 가능해요.',
  },
  {
    id: 'health',
    badge: '💊 건강보험',
    badgeColor: 'bg-rose-500 text-white',
    icon: Heart,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    title: '건강보험료 경감',
    subtitle: '지역가입자 건강보험료 경감 제도',
    highlight: '소득·지역 기준 충족 시 최대 50% 경감',
    conditions: [
      '농어촌 지역 거주: 22~50% 경감',
      '섬·벽지 지역: 50% 경감',
      '재난·재해 피해: 50% 경감 (6개월)',
      '저소득 지역가입자 경감 특례 적용 가능',
    ],
    amount: '최대 50%',
    amountLabel: '보험료 경감율',
    tip: '국민건강보험공단(1577-1000) 또는 지사에서 신청해요.',
  },
]

export default function MyBenefitsPage() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[#191f28]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center">
              <Gift className="w-4 h-4 text-violet-600" />
            </div>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">나의 혜택</h1>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-3">
        {/* 히어로 배너 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[28px] bg-gradient-to-br from-violet-500 to-purple-700 p-5 text-white shadow-[0_12px_40px_rgba(139,92,246,0.3)]"
        >
          <p className="text-[11px] font-bold opacity-70 mb-1 tracking-widest uppercase">Benefits Guide</p>
          <p className="text-[22px] font-extrabold leading-tight mb-2">
            일용직 근로자가<br />받을 수 있는 혜택
          </p>
          <p className="text-[13px] opacity-80 leading-relaxed">
            놓치고 있는 지원금이 있을 수 있어요.<br />카드를 눌러 내용을 확인해 보세요.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse inline-block" />
            <p className="text-[11px] opacity-70">총 {BENEFITS.length}가지 혜택 안내</p>
          </div>
        </motion.div>

        {/* 혜택 카드 목록 */}
        {BENEFITS.map((benefit, i) => {
          const Icon = benefit.icon
          const isOpen = expanded === benefit.id

          return (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              className="rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(49,130,246,0.06)] overflow-hidden"
            >
              {/* 카드 헤더 */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : benefit.id)}
                className="w-full px-4 pt-4 pb-3 flex items-start gap-3 text-left"
              >
                <div className={`w-10 h-10 ${benefit.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-5 h-5 ${benefit.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${benefit.badgeColor}`}>
                      {benefit.badge}
                    </span>
                  </div>
                  <p className="text-[15px] font-extrabold text-[#191f28] leading-tight">{benefit.title}</p>
                  <p className="text-[12px] text-[#4e5968] mt-0.5">{benefit.subtitle}</p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-[#8b95a1] flex-shrink-0 mt-2 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {/* 핵심 수치 */}
              <div className="px-4 pb-3">
                <div className="rounded-xl bg-white/50 border border-white/60 px-3 py-2 flex items-center justify-between">
                  <p className="text-[11px] text-[#8b95a1]">{benefit.amountLabel}</p>
                  <p className="text-sm font-extrabold text-[#3182f6]">{benefit.amount}</p>
                </div>
              </div>

              {/* 펼쳐진 상세 */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-4 space-y-3 border-t border-white/40 pt-3"
                >
                  <div className="rounded-xl bg-blue-50/80 border border-blue-100/60 px-3 py-2.5">
                    <p className="text-[12px] font-bold text-blue-700">{benefit.highlight}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-[#4e5968] mb-1.5">신청 조건</p>
                    <ul className="space-y-1.5">
                      {benefit.conditions.map((c, ci) => (
                        <li key={ci} className="flex gap-2 text-[12px] text-[#4e5968] leading-relaxed">
                          <span className="text-[#3182f6] font-bold flex-shrink-0">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 border border-amber-100/60 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-amber-700 mb-0.5">💡 신청 방법</p>
                    <p className="text-[12px] text-amber-800 leading-relaxed">{benefit.tip}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}

        {/* 통합 문의처 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-[24px] bg-white/40 backdrop-blur-lg border border-white/50 px-4 py-4"
        >
          <p className="text-[11px] font-bold text-[#4e5968] mb-2.5">📞 통합 문의처</p>
          <div className="space-y-2">
            {[
              ['복지로 (보건복지상담)', '129'],
              ['고용노동부 고객상담', '1350'],
              ['국세청 홈택스', '126'],
              ['건강보험공단', '1577-1000'],
            ].map(([org, tel]) => (
              <div key={org} className="flex justify-between items-center text-[12px]">
                <span className="text-[#4e5968]">{org}</span>
                <span className="font-bold text-[#3182f6]">{tel}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-[#8b95a1] leading-relaxed pb-2">
          지원 기준·금액은 2025년 기준이며 변경될 수 있습니다.<br />
          정확한 내용은 해당 기관에 직접 문의하세요.
        </p>
      </div>
    </div>
  )
}
