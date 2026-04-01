// 계산기 허브 — 각 서비스를 풀너비 카드로 스크롤 형태 배치
// 홈과 차별화: 각 카드가 독립적인 "서비스 소개 + CTA" 형태
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, ShieldCheck, Clock, CalendarDays, ArrowRight } from 'lucide-react'

// 서비스별 고유 컬러 + 설명 + 히어로 스타일
const SERVICES = [
  {
    id: 'severance',
    label: '퇴직금 계산기',
    headline: '내 퇴직금,\n얼마나 받을 수 있을까?',
    desc: 'PDF 한 장이면 정밀 계산 완료. 28일 역산 블록 알고리즘으로 정확한 금액을 알려드려요.',
    stats: [
      { label: '평균 수령액', value: '250만원' },
      { label: '미청구율', value: '70%', accent: true },
    ],
    icon: Briefcase,
    gradient: 'from-[#3182F6] via-[#2570e0] to-[#1b5fd4]',
    path: '/severance',
  },
  {
    id: 'unemployment',
    label: '실업급여 계산기',
    headline: '실업급여,\n나도 받을 수 있을까?',
    desc: '고용보험 가입 이력과 퇴직 사유를 분석해서 수급 자격과 예상 금액을 계산해드려요.',
    stats: [
      { label: '수급 기간', value: '최대 270일' },
      { label: '일 수급액', value: '최대 6.6만원' },
    ],
    icon: ShieldCheck,
    gradient: 'from-[#0ea5e9] via-[#0284c7] to-[#0369a1]',
    path: '/unemployment',
  },
  {
    id: 'weekly',
    label: '주휴수당 계산기',
    headline: '주휴수당,\n매주 빠짐없이 받고 있나요?',
    desc: '주 15시간 이상 근무하면 발생하는 주휴수당. 한 주도 빠짐없이 확인하세요.',
    stats: [
      { label: '발생 조건', value: '주 15시간+' },
      { label: '계산 기준', value: '근로기준법 55조' },
    ],
    icon: Clock,
    gradient: 'from-[#10b981] via-[#059669] to-[#047857]',
    path: '/weekly-allowance',
  },
  {
    id: 'annual',
    label: '연차수당 계산기',
    headline: '남은 연차,\n돈으로 받을 수 있어요',
    desc: '미사용 연차를 수당으로 정산. 발생일수, 남은일수, 미지급 청구까지 한번에 계산.',
    stats: [
      { label: '첫해 연차', value: '최대 11일' },
      { label: '이후 매년', value: '최대 25일' },
    ],
    icon: CalendarDays,
    gradient: 'from-[#f59e0b] via-[#d97706] to-[#b45309]',
    path: '/annual-leave',
  },
]

export default function CalculatorPage() {
  const navigate = useNavigate()

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28">
      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 페이지 타이틀 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-1 mb-1"
        >
          <h1 className="text-[22px] font-black text-[#191f28] tracking-tight">계산기</h1>
          <p className="text-[13px] text-[#8b95a1] mt-0.5">무료로 정확하게, PDF 정밀계산 또는 간편 입력</p>
        </motion.div>

        {/* ── 서비스 카드 스택 ── */}
        {SERVICES.map((svc, i) => {
          const Icon = svc.icon
          return (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[28px] overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${svc.gradient} p-5 relative`}>
                {/* 장식 블러 원 */}
                <div className="absolute top-3 right-3 w-24 h-24 rounded-full bg-white/[0.06] blur-2xl pointer-events-none" />

                {/* 상단: 아이콘 + 라벨 */}
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[12px] font-bold text-white/70">{svc.label}</span>
                </div>

                {/* 헤드라인 */}
                <h2 className="text-[20px] font-black text-white leading-tight tracking-tight mb-2 whitespace-pre-line relative z-10">
                  {svc.headline}
                </h2>

                {/* 설명 */}
                <p className="text-[13px] text-white/60 leading-relaxed mb-4 relative z-10">{svc.desc}</p>

                {/* 수치 뱃지 */}
                <div className="flex gap-2 mb-4 relative z-10">
                  {svc.stats.map(st => (
                    <div key={st.label} className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm">
                      <p className="text-[10px] text-white/50">{st.label}</p>
                      <p className={`text-[14px] font-extrabold ${st.accent ? 'text-yellow-300' : 'text-white'}`}>{st.value}</p>
                    </div>
                  ))}
                </div>

                {/* CTA 버튼 */}
                <motion.button
                  type="button"
                  onClick={() => navigate(svc.path)}
                  className="w-full py-3.5 rounded-2xl bg-white/95 backdrop-blur-sm font-bold text-[15px] flex items-center justify-center gap-2
                    shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-transform relative z-10"
                  style={{ color: svc.gradient.includes('3182F6') ? '#3182F6' : svc.gradient.includes('0ea5e9') ? '#0284c7' : svc.gradient.includes('10b981') ? '#059669' : '#d97706' }}
                  whileTap={{ scale: 0.97 }}
                >
                  계산하기
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )
        })}

      </div>
    </div>
  )
}
