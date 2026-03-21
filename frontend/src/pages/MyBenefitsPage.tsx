// 나의 혜택 페이지 — 일용직 근로자가 받을 수 있는 지원금·수당
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Gift, X, ExternalLink, ChevronRight } from 'lucide-react'

interface Benefit {
  id: string; emoji: string; title: string; subtitle: string
  tag: string; tagColor: string; summary: string; detail: string
  target: string; amount: string; howToApply: string; link?: string
}

const BENEFITS: Benefit[] = [
  {
    id: 'durunuri', emoji: '🛡️', title: '두루누리 사회보험', subtitle: '국민연금·고용보험 최대 80% 지원',
    tag: '보험료 지원', tagColor: 'bg-blue-50 text-blue-600',
    summary: '소규모 사업장 일용직 근로자의 국민연금·고용보험료를 국가가 최대 80% 대신 납부해줍니다.',
    target: '근로자 수 10인 미만 사업장 + 월평균 보수 270만원 미만',
    amount: '국민연금·고용보험 보험료의 80% (신규 가입 기준)',
    howToApply: '사업주가 근로복지공단에 신청. 근로자도 요청 가능.',
    detail: '두루누리 사회보험은 국민연금과 고용보험에 신규 가입하는 10인 미만 사업장 근로자(월보수 270만원 미만)에게 보험료를 지원하는 제도입니다.\n\n일용직 근로자도 사업주가 신청하면 지원을 받을 수 있으며, 국민연금·고용보험 각각 80%까지 지원됩니다(기존 가입자는 40%).\n\n보험료 지원을 통해 사업주 부담을 줄이고, 근로자는 고용보험 피보험자격을 확보해 실업급여 등의 혜택을 받을 수 있습니다.',
    link: 'https://insurancesupport.or.kr',
  },
  {
    id: 'eitc', emoji: '💰', title: '근로장려금 (EITC)', subtitle: '연간 최대 330만원 현금 지급',
    tag: '현금 지원', tagColor: 'bg-emerald-50 text-emerald-600',
    summary: '일정 소득 이하 근로자 가구에게 국가가 장려금을 현금으로 지급합니다. 일용직도 해당됩니다.',
    target: '소득·재산 요건 충족 단독/홑벌이/맞벌이 가구 (단독: 소득 2,200만원 미만)',
    amount: '단독 최대 165만원 / 홑벌이 최대 285만원 / 맞벌이 최대 330만원',
    howToApply: '매년 5월 홈택스(hometax.go.kr) 또는 세무서에서 신청. 국세청이 사전 안내.',
    detail: '근로장려금(EITC)은 열심히 일하지만 소득이 낮은 근로자 가구를 지원하는 제도입니다.\n\n일용직 근로자도 소득·재산·가구원 요건만 충족하면 신청 가능합니다.\n\n근로장려금 외에 자녀장려금도 함께 확인해보세요. 자녀가 있다면 자녀 1명당 최대 100만원을 추가로 받을 수 있습니다.\n\n신청 기간: 매년 5월 (반기 신청: 9월/3월).',
    link: 'https://www.hometax.go.kr',
  },
  {
    id: 'unemployment', emoji: '🏦', title: '실업급여 (구직급여)', subtitle: '퇴직 후 최대 270일 지급',
    tag: '고용보험', tagColor: 'bg-violet-50 text-violet-600',
    summary: '비자발적으로 이직한 경우 이직 전 18개월 중 피보험단위기간 180일 이상이면 신청 가능합니다.',
    target: '고용보험 가입 + 비자발적 이직 + 이직 전 18개월 중 180일 이상 근무',
    amount: '이직 전 평균임금의 60% × 수급일수 (나이·보험기간에 따라 120~270일)',
    howToApply: '이직 후 고용24(work24.go.kr) 또는 고용센터 방문 신청. 수급자격 인정 후 구직활동 의무.',
    detail: '일용직 근로자는 피보험단위기간 계산 방법이 상용직과 다릅니다.\n\n일용직의 피보험단위기간: 수급자격 신청일 이전 18개월 동안 고용보험에 가입된 상태로 근무한 일수가 180일 이상이어야 합니다.\n\n단, 마지막 이직일이 속한 달의 직전달 말일 기준으로 3개월(일부 조건에서는 1개월) 내에 고용된 날이 있어야 하며, 수급자격 신청일 전 1개월 동안 근로한 일수가 10일 미만이어야 합니다.\n\n두루누리 지원을 통해 고용보험에 가입되어 있어야 수급 자격이 생깁니다.',
  },
  {
    id: 'industrial', emoji: '⛑️', title: '산재보험', subtitle: '업무 중 사고·질병 100% 보상',
    tag: '필수 보험', tagColor: 'bg-rose-50 text-rose-600',
    summary: '일용직을 포함한 모든 근로자는 법적으로 산재보험에 가입됩니다. 업무상 재해 시 치료비·휴업급여 지급.',
    target: '모든 근로자 (일용직 포함, 사업주 가입 의무)',
    amount: '치료비 전액 + 휴업급여(평균임금 70%) + 장해급여 등',
    howToApply: '업무 중 부상 시 즉시 산재 신청. 근로복지공단(1588-0075) 또는 고용24 신청.',
    detail: '산재보험은 근로자가 업무 수행 중 발생한 사고나 질병에 대해 치료비와 소득 손실을 보상하는 제도입니다.\n\n일용직 근로자도 당연히 적용됩니다. 사업주가 산재보험 가입을 누락했더라도 근로복지공단에서 보상을 받을 수 있습니다.\n\n주요 급여:\n• 요양급여: 치료비 전액\n• 휴업급여: 치료 중 평균임금의 70%\n• 장해급여: 장해 등급에 따라 지급\n• 유족급여: 사망 시 유족에게 지급',
  },
  {
    id: 'naeil', emoji: '📚', title: '내일배움카드', subtitle: '직업훈련비 최대 500만원 지원',
    tag: '교육 지원', tagColor: 'bg-sky-50 text-sky-600',
    summary: '고용24에서 발급받아 직업 훈련 비용을 국가가 최대 500만원까지 지원합니다.',
    target: '실업자·재직자 (일부 제한 있음). 고용보험 가입 여부 무관 신청 가능',
    amount: '훈련비의 45~85% 지원 (최대 500만원, 5년 한도)',
    howToApply: '고용24(work24.go.kr)에서 온라인 신청 후 직업훈련기관 수강.',
    detail: '국민내일배움카드는 직업훈련을 통해 취업·창업을 돕는 제도입니다.\n\n일용직 근로자도 신청 가능하며, 카드 발급 후 5년간 최대 500만원의 훈련비 지원을 받을 수 있습니다.\n\n건설기계, 용접, 전기, 조리, IT 등 다양한 국가공인 자격증 취득 과정을 저렴하게 수강할 수 있어 경력 전환에 활용하는 분들이 많습니다.\n\n취업 후 단기 실직자, 비정규직 등도 신청 가능합니다.',
    link: 'https://www.work24.go.kr',
  },
  {
    id: 'wage-default', emoji: '⚖️', title: '임금체불 구제', subtitle: '체당금 제도로 최대 2,100만원 선지급',
    tag: '권리 구제', tagColor: 'bg-orange-50 text-orange-600',
    summary: '사업주가 임금을 주지 않으면 국가가 대신 지급하는 체당금 제도를 이용할 수 있습니다.',
    target: '임금·퇴직금 체불 근로자. 폐업·도산 사업장 근로자',
    amount: '일반 체당금: 최대 2,100만원 / 소액 체당금: 최대 1,000만원',
    howToApply: '고용노동부 진정 접수 후 체불 확정 → 근로복지공단에 체당금 신청.',
    detail: '임금체불 구제 방법:\n\n1. 고용노동부 진정: 가까운 지방고용노동청(지청)에 진정서 제출. 무료이며 처리기간 25일 이내.\n\n2. 소액체당금: 법원 확정 판결 없이도 최대 1,000만원 선지급. 신청 후 2주 이내 지급.\n\n3. 일반 체당금: 사업주 도산 시 최대 2,100만원 대위변제.\n\n일용직 근로자도 임금체불 진정이 가능하며, 임금 외 퇴직금·주휴수당 미지급도 진정 대상입니다.\n\n관련 법: 근로기준법 제43조, 임금채권보장법.',
  },
  {
    id: 'maternity', emoji: '🍼', title: '모성보호급여', subtitle: '출산·육아휴직급여 고용보험 지원',
    tag: '출산·육아', tagColor: 'bg-pink-50 text-pink-600',
    summary: '고용보험 가입 일용직 여성도 출산전후휴가급여와 육아휴직급여를 신청할 수 있습니다.',
    target: '고용보험 가입 근로자 (출산 전 180일 이상 피보험단위기간)',
    amount: '출산전후휴가: 최대 210만원/월 × 90일 / 육아휴직: 통상임금 80% (상한 월 150만원)',
    howToApply: '출산 후 고용24(work24.go.kr) 또는 고용센터에서 신청.',
    detail: '일용직 여성 근로자도 고용보험 피보험단위기간 180일 이상이면 출산전후휴가급여를 받을 수 있습니다.\n\n출산전후휴가급여: 출산 전후 90일(다태아 120일) 동안 통상임금 100% 지급 (상한 월 210만원).\n\n육아휴직급여: 만 8세 이하 또는 초등학교 2학년 이하 자녀를 위해 사용 가능. 통상임금 80% (첫 3개월은 100%, 상한 250만원).\n\n두루누리 사회보험으로 고용보험에 가입되어 있어야 혜택을 받을 수 있습니다.',
  },
  {
    id: 'health', emoji: '🏥', title: '건강보험 피부양자 등재', subtitle: '보험료 0원으로 건강보험 유지',
    tag: '의료 지원', tagColor: 'bg-teal-50 text-teal-600',
    summary: '가족 중 직장가입자가 있다면 피부양자로 등재해 건강보험료를 내지 않을 수 있습니다.',
    target: '소득·재산 요건 충족 + 직장가입자 가족',
    amount: '건강보험료 면제 (피부양자 등재 시)',
    howToApply: '국민건강보험공단(1577-1000) 또는 건강보험 앱에서 피부양자 등재 신청.',
    detail: '일용직으로 소득이 낮다면 가족 중 직장가입자(배우자, 부모, 자녀 등)의 피부양자로 등재해 건강보험료를 내지 않을 수 있습니다.\n\n피부양자 요건(2024년 기준):\n• 연 소득 2,000만원 이하\n• 재산세 과세표준 5.4억원 이하\n• 직장가입자와 동일 세대이거나 부양관계일 것\n\n피부양자 자격이 안 된다면 지역가입자로 보험료를 납부하는데, 소득이 낮을수록 납부액이 줄어듭니다. 소득이 없으면 최저 보험료(월 약 1만 9천원)만 납부합니다.',
  },
]

export default function MyBenefitsPage() {
  const navigate = useNavigate()
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null)

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
          <button type="button" onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95">
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

      <div className="w-full max-w-[460px] flex flex-col gap-4">
        {/* 히어로 배너 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-[32px] bg-gradient-to-br from-violet-500 to-violet-700 p-5 text-white shadow-[0_12px_40px_rgba(139,92,246,0.25)]"
        >
          <p className="text-xs font-semibold text-violet-200 mb-1">일용직 근로자 전용</p>
          <p className="text-xl font-extrabold tracking-tight mb-1">내가 받을 수 있는<br />혜택을 확인하세요</p>
          <p className="text-[13px] text-violet-200 leading-relaxed">
            일용직 근로자를 위한 국가 지원금·수당 {BENEFITS.length}가지.<br />
            아직 신청 안 했다면 지금 확인해보세요.
          </p>
        </motion.div>

        {/* 혜택 카드 목록 */}
        <div className="flex flex-col gap-3">
          {BENEFITS.map((benefit, idx) => (
            <motion.button
              key={benefit.id} type="button" onClick={() => setSelectedBenefit(benefit)}
              className="w-full rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgba(49,130,246,0.06)] px-4 py-4 text-left flex items-center gap-3 hover:shadow-[0_12px_40px_rgba(49,130,246,0.12)] transition-all active:scale-[0.98]"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center text-2xl flex-shrink-0">
                {benefit.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-extrabold text-[#191f28] tracking-tight">{benefit.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${benefit.tagColor}`}>
                    {benefit.tag}
                  </span>
                </div>
                <p className="text-[12px] text-[#4e5968] font-medium">{benefit.subtitle}</p>
                <p className="text-[11px] text-[#8b95a1] mt-0.5 line-clamp-1">{benefit.summary}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8b95a1] flex-shrink-0" />
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#8b95a1] pb-2">
          위 내용은 참고용입니다. 자격 요건은 변경될 수 있으니<br />각 기관에서 직접 확인하세요.
        </p>
      </div>

      {/* 상세 모달 */}
      <AnimatePresence>
        {selectedBenefit && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col justify-end items-center sm:px-4 sm:pb-4 px-0 pb-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setSelectedBenefit(null)}
            />
            <motion.div
              className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              initial={{ y: '100%', opacity: 0.5 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center text-2xl">
                    {selectedBenefit.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-extrabold text-[#191f28]">{selectedBenefit.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedBenefit.tagColor}`}>
                        {selectedBenefit.tag}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#4e5968]">{selectedBenefit.subtitle}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedBenefit(null)}
                  className="p-2 rounded-full bg-white/60 border border-white/60 hover:bg-white/80 transition-colors">
                  <X className="w-4 h-4 text-[#4e5968]" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
                <p className="text-[13px] text-[#4e5968] leading-relaxed">{selectedBenefit.summary}</p>
                {[
                  { label: '지원 대상', value: selectedBenefit.target },
                  { label: '지원 금액', value: selectedBenefit.amount },
                  { label: '신청 방법', value: selectedBenefit.howToApply },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl bg-white/60 border border-white/60 px-4 py-3 space-y-1">
                    <p className="text-[11px] font-extrabold text-[#3182f6]">{item.label}</p>
                    <p className="text-[13px] text-[#191f28] leading-relaxed font-medium">{item.value}</p>
                  </div>
                ))}
                <div className="rounded-2xl bg-white/60 border border-white/60 px-4 py-4">
                  <p className="text-[11px] font-extrabold text-[#4e5968] mb-2">상세 안내</p>
                  <p className="text-[13px] text-[#4e5968] leading-relaxed whitespace-pre-line">{selectedBenefit.detail}</p>
                </div>
                {selectedBenefit.link && (
                  <a href={selectedBenefit.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#3182f6] text-white text-sm font-bold shadow-[0_8px_24px_rgba(49,130,246,0.3)] hover:bg-[#1b64da] transition-colors"
                  >
                    <span>공식 사이트 바로가기</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
