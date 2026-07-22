// 계산기 허브 (/calculator) — 2026 리디자인 v2 "구분 강화"
// - Layout 안 페이지(TopNav/BottomNav는 Layout이 제공) → 콘텐츠만 렌더
// - 피드백 반영: "실업/주휴/연차가 다 똑같아 보임" → 구별 강화
//   ① 2개 의미 그룹으로 섹션 분리 (퇴사 후 정산 / 재직 중 수당)
//   ② 그룹별 색(블루 / 그린) + ③ 크고 뚜렷한 서로 다른 아이콘 + ④ 라벨 확대
//   ⚠️ 무지개 금지 — 사용 색은 사문화된 블루·그린 2색만(그룹 단위로 통제)
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Banknote, ShieldCheck, CalendarClock, Palmtree, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageMeta from '../components/PageMeta'
import Container from '../components/ui/Container'
import { CardButton } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'

interface Service {
  id: string
  label: string
  desc: string
  stats: { label: string; value: string }[]
  icon: LucideIcon
  path: string
  featured?: boolean
}

interface Group {
  key: string
  title: string
  subtitle: string
  tone: 'brand' | 'accent'        // SectionHeader 액센트 바
  accent: string                   // 아이콘/상단보더 색 (hex)
  chip: string                     // 아이콘 칩 배경 (hex)
  services: Service[]
}

// ── 2개 의미 그룹 ──
const GROUPS: Group[] = [
  {
    key: 'leave',
    title: '퇴사 후 정산',
    subtitle: '퇴직·실직 시 받는 돈',
    tone: 'brand',
    accent: '#1B64DA',
    chip: '#EAF2FE',
    services: [
      {
        id: 'severance', label: '퇴직금', featured: true,
        desc: 'PDF 한 장이면 28일 블록 알고리즘으로 정밀 계산',
        stats: [{ label: '평균 수령액', value: '250만원' }, { label: '미청구율', value: '70%' }],
        icon: Banknote, path: '/severance',
      },
      {
        id: 'unemployment', label: '실업급여',
        desc: '고용보험 이력·퇴직 사유로 수급 자격과 금액 확인',
        stats: [{ label: '수급 기간', value: '최대 270일' }, { label: '일 상한', value: '6.6만원' }],
        icon: ShieldCheck, path: '/unemployment',
      },
    ],
  },
  {
    key: 'inwork',
    title: '재직 중 수당',
    subtitle: '일하는 동안 챙기는 돈',
    tone: 'accent',
    accent: '#05A56C',
    chip: '#E6F8F1',
    services: [
      {
        id: 'weekly', label: '주휴수당',
        desc: '주 15시간 이상 근무 시 발생하는 유급휴일 수당',
        stats: [{ label: '발생 조건', value: '주 15시간+' }, { label: '기준', value: '근기법 55조' }],
        icon: CalendarClock, path: '/weekly-allowance',
      },
      {
        id: 'annual', label: '연차수당',
        desc: '미사용 연차를 수당으로 — 발생·사용·미지급 정산',
        stats: [{ label: '첫해', value: '최대 11일' }, { label: '이후 매년', value: '최대 25일' }],
        icon: Palmtree, path: '/annual-leave',
      },
    ],
  },
]

export default function CalculatorPage() {
  const navigate = useNavigate()

  return (
    <div className="relative z-[1]">
      <PageMeta
        title="일용직 계산기 허브 — 퇴직금·실업급여·주휴수당·연차수당 | CATCH"
        description="퇴직금, 실업급여, 주휴수당, 연차수당 4가지 계산기를 한 곳에서. 쿠팡·컬리 일용직 근로자 전용 무료 계산 서비스."
        canonical="https://coucatch.com/calculator"
      />

      <Container className="flex flex-col gap-7 md:gap-9 pt-4 pb-8">

        {/* ── 페이지 헤더 ── */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-1"
        >
          <h1 className="text-[26px] md:text-[30px] font-black text-ink-900 tracking-tight">계산기</h1>
          <p className="text-[15px] text-ink-700 mt-1 break-keep">
            무료로 정확하게 — PDF 정밀계산 또는 간편 입력으로 내 권리를 확인하세요.
          </p>
        </motion.header>

        {/* ── 그룹별 섹션 ── */}
        {GROUPS.map((group, gi) => (
          <section key={group.key}>
            <SectionHeader title={group.title} subtitle={group.subtitle} tone={group.tone} />

            <div className="grid sm:grid-cols-2 gap-4 items-stretch">
              {group.services.map((svc, si) => {
                const Icon = svc.icon
                return (
                  <motion.div
                    key={svc.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (gi * 2 + si) * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full"
                  >
                    {/* 카드: 상단 3px 그룹 액센트 보더로 그룹 소속을 시각화 */}
                    <CardButton
                      padding="lg"
                      onClick={() => navigate(svc.path)}
                      className="flex flex-col h-full border-t-[3px]"
                      style={{ borderTopColor: group.accent }}
                    >
                      {/* 큰 아이콘 + 라벨 */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: group.chip }}
                        >
                          <Icon className="w-7 h-7" strokeWidth={1.9} style={{ color: group.accent }} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-[19px] font-black text-ink-900 tracking-tight leading-none">{svc.label}</h3>
                            {svc.featured && <Badge tone="brand">대표</Badge>}
                          </div>
                          <p className="text-[13px] text-ink-600 leading-relaxed mt-1.5 break-keep">{svc.desc}</p>
                        </div>
                      </div>

                      {/* 수치 뱃지 */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {svc.stats.map(st => (
                          <div key={st.label} className="px-2.5 py-1.5 rounded-md" style={{ background: group.chip }}>
                            <p className="text-[11px] text-ink-700 leading-tight">{st.label}</p>
                            <p className="text-[14px] font-extrabold leading-tight tabular-nums" style={{ color: group.accent }}>{st.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* CTA — 그룹 색 버튼, 카드 하단 고정 (업비트풍 업스케일: 56px·16px) */}
                      <span
                        className="mt-5 inline-flex items-center justify-center gap-2 w-full min-h-[56px] rounded-lg text-white font-bold text-[16px] transition-transform active:scale-[0.98]"
                        style={{ background: group.accent }}
                      >
                        계산하기
                        <ArrowRight className="w-[18px] h-[18px]" />
                      </span>
                    </CardButton>
                  </motion.div>
                )
              })}
            </div>
          </section>
        ))}

      </Container>
    </div>
  )
}
