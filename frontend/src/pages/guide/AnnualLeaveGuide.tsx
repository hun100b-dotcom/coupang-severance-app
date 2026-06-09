import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── 연차수당 가이드 — FAQPage JSON-LD (구글 FAQ 리치 스니펫) ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '일용직도 연차수당을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 일용직도 동일 사업장에서 1년 이상 근무하고 출근율이 80% 이상이면 연차휴가가 발생합니다. 미사용 연차는 연차수당으로 정산받을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '연차수당 계산 방법이 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '연차수당 = 1일 통상임금 × 미사용 연차일수입니다. 1일 통상임금은 월급을 월 소정근로시간(보통 209시간)으로 나눈 후 8시간을 곱합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '회사에서 연차를 못 쓰게 하면 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '불법입니다. 근로자가 연차 사용을 신청하면 회사는 특별한 경영상 사유 없이 거절할 수 없습니다. 거절하더라도 미사용 연차는 수당으로 지급받을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직할 때 미사용 연차는 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직 시 미사용 연차는 연차수당으로 정산받을 수 있습니다. 퇴직일 기준으로 남은 연차일수 × 1일 통상임금을 청구하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '연차수당이 퇴직금과 다른가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 다릅니다. 퇴직금은 근로자퇴직급여보장법에 따른 별도 급여이고, 연차수당은 미사용 연차휴가를 금전으로 정산하는 것입니다. 둘 다 별도로 청구해야 합니다.',
      },
    },
  ],
}

// ── BreadcrumbList JSON-LD (페이지 계층 구조) ──
const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://catch-daily-worker.vercel.app/home' },
    { '@type': 'ListItem', position: 2, name: '가이드', item: 'https://catch-daily-worker.vercel.app/guide' },
    { '@type': 'ListItem', position: 3, name: '연차수당 가이드', item: 'https://catch-daily-worker.vercel.app/guide/annual-leave' },
  ],
}

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition', label: '연차수당이란?' },
  { id: 'generation', label: '연차 발생' },
  { id: 'application', label: '일용직 적용' },
  { id: 'calculation', label: '계산 방법' },
  { id: 'settlement', label: '정산 방법' },
  { id: 'faq', label: 'FAQ' },
]

// ── Framer Motion 애니메이션 설정 ──
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// ── 정보 박스 컴포넌트 ──
function InfoBox({ title, children, variant = 'default' }: { title: string; children: React.ReactNode; variant?: 'default' | 'warning' | 'tip' }) {
  const variantStyles = {
    default: 'bg-amber-50 border-amber-200',
    warning: 'bg-amber-50 border-amber-200',
    tip: 'bg-yellow-50 border-yellow-200',
  }
  return (
    <div className={`border-l-4 ${variant === 'warning' ? 'border-amber-500' : variant === 'tip' ? 'border-yellow-500' : 'border-amber-500'} ${variantStyles[variant]} rounded-lg p-4 mb-4`}>
      <h4 className="font-bold text-sm mb-2 text-gray-900">{title}</h4>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  )
}

// ── 목차 바 ──
function TableOfContents({ activeSection }: { activeSection: string }) {
  const [showContents, setShowContents] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6 sticky top-4 z-20"
    >
      <button
        onClick={() => setShowContents(!showContents)}
        className="w-full text-left font-bold text-gray-900 flex items-center justify-between mb-2"
      >
        <span className="text-sm">목차</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${showContents ? 'rotate-90' : ''}`} />
      </button>
      {showContents && (
        <div className="space-y-2">
          {TABLE_OF_CONTENTS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block text-sm py-1 px-2 rounded transition-colors ${
                activeSection === item.id
                  ? 'bg-amber-100 text-amber-700 font-semibold'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── 가이드 카드 (하단 추천 가이드) ──
function GuideCard({ title, icon: Icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <Link
      to={href}
      className="block bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{Icon}</div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600 mt-1">가이드 보기</p>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-600 ml-auto" />
      </div>
    </Link>
  )
}

// ── 메인 페이지 ──
export default function AnnualLeaveGuide() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('definition')

  useEffect(() => {
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거

    // ── 스크롤 위치 감지 ──
    const handleScroll = () => {
      const sections = TABLE_OF_CONTENTS.map((item) => document.getElementById(item.id)).filter(Boolean)
      for (const section of sections) {
        if (!section) continue
        const rect = section.getBoundingClientRect()
        if (rect.top < 200) {
          setActiveSection(section.id)
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-8 bg-gray-50">
      {/* ── SEO 메타태그: title, description, canonical, JSON-LD 구조화 데이터 ── */}
      <PageMeta
        title="연차수당 가이드 — 일용직 연차수당 조건·계산법 완전 정리 | CATCH"
        description="1년 이상 근무한 일용직 근로자도 연차수당을 받을 수 있습니다. 연차 발생 조건, 계산 방법, 미지급 대처법을 안내합니다."
        canonical="https://catch-daily-worker.vercel.app/guide/annual-leave"
        jsonLd={[FAQ_SCHEMA, BREADCRUMB_SCHEMA]}
      />

      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-600 p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
          <h2 className="text-2xl font-black mb-2">미사용 연차를 돈으로 받아요</h2>
          <p className="text-amber-100 text-sm mb-4">첫해 최대 11일 | 이후 최대 25일</p>
          <div className="text-3xl font-black">퇴직 시 정산</div>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션: 연차수당이란? ── */}
        <motion.section
          id="definition"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">연차수당이란?</h2>
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            연차수당은 근로자가 <span className="font-semibold">미사용 연차휴가를 돈으로 정산받는 것</span>입니다. <br />
            근로기준법 제60조에서 보장하는 법정 권리입니다.
          </p>
          <InfoBox
            title="정의 (근로기준법 제60조)"
            variant="default"
          >
            3년 이상 계속 근무한 근로자는 해마다 <br />
            30일의 유급휴가를 얻습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 연차 발생 ── */}
        <motion.section
          id="generation"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">연차 발생</h2>

          <p className="text-sm text-gray-700 mb-4">연차는 근무 기간과 출근율에 따라 발생합니다.</p>

          <div className="space-y-3 mb-4">
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">첫 해 (1년)</p>
              <p className="text-gray-600">80% 이상 출근 시 15일 발생</p>
              <p className="text-gray-500 text-[10px] mt-1">※ 일반적으로 퇴직 시 최대 11일 정산</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">2~2년 11개월</p>
              <p className="text-gray-600">80% 이상 출근 시 15일</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">3년 이상</p>
              <p className="text-gray-600">2년마다 +1일씩 증가 (최대 25일)</p>
              <p className="text-gray-500 text-[10px] mt-1">3년: 20일, 5년: 21일, 7년: 22일...</p>
            </div>
          </div>

          <InfoBox
            title="💡 출근율 기준"
            variant="tip"
          >
            출근율 = (실제 근무일 ÷ 소정근로일) × 100%<br />
            80% 미만이면 그 연도 연차는 발생하지 않습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 일용직 적용 ── */}
        <motion.section
          id="application"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">일용직 적용</h2>

          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            일용직도 조건을 충족하면 연차수당을 받을 수 있습니다.
          </p>

          <div className="space-y-3 mb-4">
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">✓ 연차 발생 조건</p>
              <p className="text-gray-600">1년 이상 근무 + 80% 이상 출근</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">주의사항</p>
              <p className="text-gray-600">일용직은 출근율 계산이 정규직과 다를 수 있습니다.<br />
              회사가 별도 규정을 가지고 있을 수 있으므로 확인이 필요합니다.</p>
            </div>
          </div>

          <InfoBox
            title="⚠️ 중요"
            variant="warning"
          >
            일용직의 경우 고용 형태에 따라 <br />
            연차 적용 여부가 달라질 수 있습니다.<br />
            회사와 협의하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 계산 방법 ── */}
        <motion.section
          id="calculation"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">계산 방법</h2>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">계산 공식</h3>
            <InfoBox
              title="미지급 연차수당 = 1일 통상임금 × 미사용 연차일수"
              variant="default"
            >
              <div className="space-y-2 text-xs">
                <p><span className="font-semibold">1일 통상임금</span> = 월급 ÷ 월 평균 근로일수</p>
                <p><span className="font-semibold">미사용 연차일수</span> = 발생 연차 - 사용 연차</p>
              </div>
            </InfoBox>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">계산 예시</h3>
            <div className="bg-amber-50 rounded-lg p-3 text-xs space-y-1 text-gray-700">
              <p>• 근무 기간: 2년</p>
              <p>• 월 급여: 200만원</p>
              <p>• 월 평균 근로일: 22일</p>
              <p>• 1일 통상임금: 200만원 ÷ 22일 = 90,909원</p>
              <p className="mt-3">• 연차 발생: 15일 (첫해 기준)</p>
              <p>• 사용한 연차: 3일</p>
              <p>• 미사용 연차: 15일 - 3일 = 12일</p>
              <p className="font-bold text-amber-700 pt-2">
                → 연차수당: 90,909원 × 12일 = 1,090,908원
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── 섹션: 정산 방법 ── */}
        <motion.section
          id="settlement"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">정산 방법</h2>

          <p className="text-sm text-gray-700 mb-4">연차수당은 퇴직할 때 함께 정산합니다.</p>

          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">연차 사용 계획</h4>
                <p className="text-xs text-gray-600 mt-1">남은 연차를 사용할지 정산받을지 결정</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">미사용 연차 확인</h4>
                <p className="text-xs text-gray-600 mt-1">회사에서 미사용 연차 일수 확인</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">정산금 청구</h4>
                <p className="text-xs text-gray-600 mt-1">내용증명으로 미지급 연차수당 청구</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm font-bold flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">수령</h4>
                <p className="text-xs text-gray-600 mt-1">퇴직금 및 최종 급여와 함께 수령</p>
              </div>
            </div>
          </div>

          <InfoBox
            title="⏰ 청구 기한"
            variant="warning"
          >
            연차수당 청구권은 3년으로 제한됩니다.<br />
            퇴직 후 빨리 청구하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: FAQ ── */}
        <motion.section
          id="faq"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">자주 묻는 질문</h2>
          <div className="space-y-3">
            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                회사에서 연차를 쓸 수 없게 하면?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">불법입니다. 근로자가 연차 사용을 신청하면 회사는 특별한 사유 없이 거절할 수 없습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                일용직은 연차가 없다고 해도 되나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">아니요. 일용직도 조건을 충족하면 연차가 발생합니다. 다만 일용직은 고용 형태에 따라 적용 여부가 다를 수 있으니 회사에 확인하세요.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                퇴직 전에 연차를 모두 써야 하나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">아니요. 미사용 연차는 연차수당으로 정산받을 수 있습니다. 법인이 소멸시효로 인정하지 않는 한 청구할 수 있습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                연차수당이 퇴직금과 다른가요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">네, 다릅니다. 퇴직금은 근로자퇴직급여보장법에 따르고, 연차수당은 미사용 연차를 돈으로 정산하는 것입니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                1년 미만은 정말 연차가 없나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">법정 기준으로는 1년 이상 근무해야 연차가 발생합니다. 다만 회사 규정으로 더 빨리 주기도 합니다.</p>
            </details>
          </div>
        </motion.section>

        {/* ── 하단 CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-5 mt-2"
        >
          <button
            onClick={() => navigate('/annual-leave')}
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-4"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 연차수당 계산하기
          </button>

          <h3 className="font-bold text-sm text-gray-900 mb-3">다른 가이드</h3>
          <div className="space-y-2">
            <GuideCard
              title="퇴직금 가이드"
              icon="💼"
              href="/guide/severance"
            />
            <GuideCard
              title="실업급여 가이드"
              icon="🛡️"
              href="/guide/unemployment"
            />
            <GuideCard
              title="주휴수당 가이드"
              icon="⏰"
              href="/guide/weekly-allowance"
            />
          </div>
        </motion.div>

        {/* ── 가이드 허브로 돌아가기 ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-4 mb-4"
        >
          <button
            onClick={() => navigate('/guide')}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← 전체 가이드 목록 보기
          </button>
        </motion.div>

      </div>
    </div>
  )
}
