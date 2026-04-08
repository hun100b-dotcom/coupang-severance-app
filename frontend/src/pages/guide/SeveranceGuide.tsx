import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calculator, ChevronRight } from 'lucide-react'

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition', label: '퇴직금이란?' },
  { id: 'conditions', label: '수급 조건' },
  { id: 'calculation', label: '계산 방법' },
  { id: 'claim', label: '청구 절차' },
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
    default: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
    tip: 'bg-green-50 border-green-200',
  }
  return (
    <div className={`border-l-4 ${variant === 'warning' ? 'border-amber-500' : variant === 'tip' ? 'border-green-500' : 'border-blue-500'} ${variantStyles[variant]} rounded-lg p-4 mb-4`}>
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
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-600 hover:text-blue-600'
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
    <a
      href={href}
      className="block bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{Icon}</div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600 mt-1">가이드 보기</p>
        </div>
        <ChevronRight className="w-4 h-4 text-blue-600 ml-auto" />
      </div>
    </a>
  )
}

// ── 메인 페이지 ──
export default function SeveranceGuide() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('definition')

  useEffect(() => {
    document.title = '퇴직금 가이드 - CATCH'

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
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28 bg-gray-50">
      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 상단 네비게이션 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-1"
        >
          <button
            onClick={() => navigate('/guide')}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">퇴직금 가이드</h1>
          <div className="w-9" />
        </motion.div>

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
          <h2 className="text-2xl font-black mb-2">일용직도 받을 수 있어요</h2>
          <p className="text-blue-100 text-sm mb-4">평균 수령액 약 250만원 | 미청구율 70%</p>
          <div className="text-3xl font-black">최대 3년 청구 가능</div>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션: 퇴직금이란? ── */}
        <motion.section
          id="definition"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">퇴직금이란?</h2>
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            퇴직금은 근로자가 근무 기간에 대해 받는 <span className="font-semibold">법정 보상금</span>입니다. <br />
            근로자퇴직급여보장법에 따라 모든 근로자가 받을 권리가 있습니다.
          </p>
          <InfoBox
            title="정의 (근로자퇴직급여보장법)"
            variant="default"
          >
            퇴직금은 근로자가 근무 기간 동안 제공한 노동에 대한 정산금으로, <br />
            퇴직 시 사용자가 반드시 지급해야 하는 법정 급여입니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 수급 조건 ── */}
        <motion.section
          id="conditions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급 조건</h2>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">근로 기간</h4>
                <p className="text-xs text-gray-600 mt-1">1년 이상 근무해야 합니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">주간 근로 시간</h4>
                <p className="text-xs text-gray-600 mt-1">최근 4주 평균 주 15시간 이상 근무해야 합니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">근로 형태</h4>
                <p className="text-xs text-gray-600 mt-1">정규직, 계약직, 일용직 모두 적용됩니다.</p>
              </div>
            </div>
          </div>
          <InfoBox
            title="쿠팡 일용직 퇴직금 적용"
            variant="default"
          >
            쿠팡 일용직 근로자도 위 조건을 충족하면 <br />
            퇴직금을 청구할 수 있습니다.
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
              title="퇴직금 = (1일 평균임금 × 30일) × (재직일수 ÷ 365)"
              variant="default"
            >
              <div className="space-y-2 text-xs">
                <p><span className="font-semibold">1일 평균임금</span> = 최근 3개월 급여 총액 ÷ 90일</p>
                <p><span className="font-semibold">재직일수</span> = 입사일부터 퇴직일까지의 날짜</p>
              </div>
            </InfoBox>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">계산 예시</h3>
            <div className="bg-blue-50 rounded-lg p-3 text-xs space-y-1 text-gray-700">
              <p>• 월 급여: 200만원</p>
              <p>• 최근 3개월 합계: 600만원</p>
              <p>• 1일 평균임금: 600만원 ÷ 90일 = 66,667원</p>
              <p>• 재직일수: 400일</p>
              <p className="font-bold text-blue-700 pt-2">
                = (66,667 × 30) × (400 ÷ 365) = 약 219만원
              </p>
            </div>
          </div>

          <InfoBox
            title="⚠️ 주의사항"
            variant="warning"
          >
            일용직은 급여가 불규칙할 수 있으므로,<br />
            정확한 계산을 위해 근무 기록과 급여 명세서가 필요합니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 청구 절차 ── */}
        <motion.section
          id="claim"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">청구 절차</h2>

          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">증거 자료 수집</h4>
                <p className="text-xs text-gray-600 mt-1">급여 명세서, 근무 기록, 계약서, 통장 사본 등</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">회사에 청구</h4>
                <p className="text-xs text-gray-600 mt-1">내용증명으로 퇴직금 지급을 요청 (권장)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">미지급 시 신청</h4>
                <p className="text-xs text-gray-600 mt-1">고용노동부 → 국가 대지급제</p>
              </div>
            </div>
          </div>

          <InfoBox
            title="소멸시효"
            variant="tip"
          >
            퇴직금 청구권은 퇴직일로부터 <span className="font-bold">3년</span>까지 유효합니다. <br />
            가능한 빨리 청구하세요.
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
                1년 미만 근무했으면 퇴직금을 못 받나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">네, 근로기준법상 1년 이상 근무가 필수입니다. 다만 일부 업체는 자체 규정으로 지급하기도 합니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                급여를 받지 못했으면 퇴직금은?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">퇴직금은 별도로 청구해야 합니다. 근무 기록이 있다면 청구할 권리가 있습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                회사가 준다고 해도 확인해야 하나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">네, 금액이 정확한지 확인하세요. CATCH 계산기로 예상 금액을 확인할 수 있습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                국가 대지급은 어떻게 받나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">회사가 파산하거나 지급 불능일 때 고용노동부에서 대신 지급합니다. 관할 고용센터에 신청하세요.</p>
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
            onClick={() => navigate('/severance')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-4"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 퇴직금 계산하기
          </button>

          <h3 className="font-bold text-sm text-gray-900 mb-3">다른 가이드</h3>
          <div className="space-y-2">
            <GuideCard
              title="실업급여 가이드"
              icon="💼"
              href="/guide/unemployment"
            />
            <GuideCard
              title="주휴수당 가이드"
              icon="⏰"
              href="/guide/weekly-allowance"
            />
            <GuideCard
              title="연차수당 가이드"
              icon="📅"
              href="/guide/annual-leave"
            />
          </div>
        </motion.div>

      </div>
    </div>
  )
}
