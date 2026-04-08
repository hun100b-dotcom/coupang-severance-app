import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Briefcase, ShieldCheck, Clock, CalendarDays, Calculator, ChevronRight } from 'lucide-react'

// ── 가이드 데이터 ──
const GUIDES = [
  {
    id: 'severance',
    title: '퇴직금 가이드',
    description: '일용직도 받을 수 있어요. 조건, 계산법, 청구 절차를 알려드립니다.',
    icon: Briefcase,
    href: '/guide/severance',
    color: 'bg-blue-50',
    accentColor: 'text-blue-600',
  },
  {
    id: 'unemployment',
    title: '실업급여 가이드',
    description: '퇴직 후 생활을 지킬 수 있어요. 수급 조건과 신청 방법을 알려드립니다.',
    icon: ShieldCheck,
    href: '/guide/unemployment',
    color: 'bg-cyan-50',
    accentColor: 'text-cyan-600',
  },
  {
    id: 'weekly',
    title: '주휴수당 가이드',
    description: '주 15시간 이상 일하면 발생해요. 계산 방법과 미지급 대처법을 알려드립니다.',
    icon: Clock,
    href: '/guide/weekly-allowance',
    color: 'bg-emerald-50',
    accentColor: 'text-emerald-600',
  },
  {
    id: 'annual',
    title: '연차수당 가이드',
    description: '미사용 연차를 돈으로 받을 수 있어요. 발생 조건과 계산법을 알려드립니다.',
    icon: CalendarDays,
    href: '/guide/annual-leave',
    color: 'bg-amber-50',
    accentColor: 'text-amber-600',
  },
]

// ── 메인 가이드 허브 ──
export default function GuideHub() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'CATCH 가이드 - 노동법 정보'
  }, [])

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28 bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="w-full max-w-[460px] flex flex-col gap-6">

        {/* ── 상단 네비게이션 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-1"
        >
          <button
            onClick={() => navigate('/home')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-sm font-medium text-gray-500">가이드</span>
          <div className="w-9" />
        </motion.div>

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-8 text-white overflow-hidden relative"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl -z-10" />

          <div className="relative z-10 flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <h1 className="text-3xl font-black mb-3 tracking-tight">CATCH 노동법 가이드</h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            일용직 근로자를 위한 핵심 노동법 정보를 한눈에 확인하세요.
          </p>
        </motion.div>

        {/* ── 가이드 카드 그리드 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDES.map((guide, i) => {
            const Icon = guide.icon
            return (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Link
                  to={guide.href}
                  className={`flex flex-col h-full ${guide.color} rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-blue-200/30`}
                >
                  {/* 아이콘 */}
                  <div className={`w-10 h-10 rounded-xl ${guide.accentColor} bg-white mb-3 flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* 내용 */}
                  <h3 className="text-base font-bold text-gray-900 mb-2 flex-1">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-4 flex-1">
                    {guide.description}
                  </p>

                  {/* 링크 */}
                  <div className={`flex items-center gap-2 ${guide.accentColor} text-sm font-semibold`}>
                    자세히 보기
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* ── 하단 CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="pt-2 pb-4"
        >
          <button
            onClick={() => navigate('/severance')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 계산해보기
          </button>
        </motion.div>
      </div>
    </div>
  )
}
