// 일용직 퇴직금 가이드 전용 SEO 랜딩 페이지 (정보성 long-tail)
// 검색어: "일용직 퇴직금 가이드", "일용직 퇴직금 조건", "일용직 근로자 권리"
// 목적: 정보 검색 유입 → 신뢰 형성 → 계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, Book, Scale, ShieldCheck, TrendingUp } from 'lucide-react'
import PageMeta from '../../components/PageMeta'
import RelatedLinks from '../../components/seo/RelatedLinks'

// ── FAQ JSON-LD ──────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '일용직 근로자도 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. "일용직"이라는 계약 형태와 관계없이 ① 동일 사업장에서 365일 이상 계속 근무하고 ② 최근 4주 평균 주 15시간 이상 근무한 근로자는 근로자퇴직급여보장법에 따라 퇴직금을 받을 법적 권리가 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 퇴직금 계산 방법은 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 = (1일 평균임금 × 30일) × (재직일수 ÷ 365). 1일 평균임금은 퇴직 직전 3개월 급여 합계를 90일로 나눈 값입니다. 최저임금 기준 일급보다 낮으면 최저 기준을 적용합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 주휴수당이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주휴수당은 1주에 소정 근로일수를 개근한 근로자에게 주는 유급 휴일 수당입니다. 주 15시간 이상 근무 시 발생하며, 일용직도 해당됩니다. 계산: (1주 소정근로시간 ÷ 40) × 8시간 × 시급.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 연차수당은 어떻게 계산하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '1년 미만 근무자는 매월 1일 연차 발생(최대 11일). 1년 이상은 15일 연차 발생. 퇴직 시 미사용 연차일수 × 1일 통상임금을 수당으로 받을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직이 4대 보험에 가입되어 있어야 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '아닙니다. 퇴직금은 4대 보험 가입 여부와 무관하게 실제 근로 관계(출근 기록, 임금 지급 내역)가 있으면 청구할 수 있습니다. 다만 고용보험에 가입되어 있어야 실업급여 신청이 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금을 안 주면 어디에 신고하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '고용노동부 민원마당(moel.go.kr) 또는 고용노동부 고객상담센터(1350)에 진정을 제기할 수 있습니다. 관할 지방고용노동청을 직접 방문해도 됩니다. 진정 접수 후 일반적으로 2~3개월 내에 처리됩니다.',
      },
    },
  ],
}

// ── Article JSON-LD ──────────────────────────────────────────
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '일용직 퇴직금 완전 가이드 — 조건·계산·청구법 2026',
  description: '일용직 근로자의 퇴직금, 실업급여, 주휴수당, 연차수당 권리를 2026년 최신 기준으로 정리했습니다. 쿠팡·컬리·CJ 일용직 근로자 필독 가이드.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-05-10',
  dateModified: '2026-05-10',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://catch-daily-worker.vercel.app/day-worker-severance-guide' },
}

// ── 4대 권리 카드 ────────────────────────────────────────────
const RIGHTS = [
  {
    icon: <Scale size={20} />,
    color: '#3182f6',
    bg: '#EFF6FF',
    title: '퇴직금',
    subtitle: '1년 이상 근무 시',
    desc: '(1일 평균임금 × 30) × (재직일수 ÷ 365)',
    action: '/severance',
    actionLabel: '퇴직금 계산하기',
  },
  {
    icon: <ShieldCheck size={20} />,
    color: '#0f8456',
    bg: '#EFFAF5',
    title: '실업급여',
    subtitle: '고용보험 180일 이상',
    desc: '기초일액 × 60% × 수급일수 (최대 270일)',
    action: '/unemployment',
    actionLabel: '실업급여 계산하기',
  },
  {
    icon: <TrendingUp size={20} />,
    color: '#9B5CF6',
    bg: '#F5F3FF',
    title: '주휴수당',
    subtitle: '주 15시간 이상 근무 시',
    desc: '(주 소정근로시간 ÷ 40) × 8 × 시급',
    action: '/weekly-allowance',
    actionLabel: '주휴수당 계산하기',
  },
  {
    icon: <Book size={20} />,
    color: '#F09800',
    bg: '#FFF8EE',
    title: '연차수당',
    subtitle: '1년 미만: 월 1일 / 1년 이상: 연 15일',
    desc: '미사용 연차일수 × 1일 통상임금',
    action: '/annual-leave',
    actionLabel: '연차수당 계산하기',
  },
]

// ── 사례별 퇴직금 시뮬레이션 ─────────────────────────────────
const CASES = [
  { label: '시급 10,030원 / 1년 근무', amount: '약 24만 원', note: '최저임금 기준' },
  { label: '월 200만 원 / 2년 근무', amount: '약 131만 원', note: '' },
  { label: '월 250만 원 / 3년 근무', amount: '약 247만 원', note: '' },
  { label: '월 280만 원 / 5년 근무', amount: '약 459만 원', note: '5년 장기 근무자' },
]

export default function DayWorkerSeveranceGuide() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD */}
      <PageMeta
        title="일용직 퇴직금 완전 가이드 2026 — 조건·계산·청구법 | CATCH"
        description="일용직 근로자의 퇴직금·실업급여·주휴수당·연차수당 권리를 2026년 기준으로 완전 정리했습니다. 쿠팡·컬리·CJ 알바생 필독. CATCH 무료 계산기 포함."
        canonical="https://catch-daily-worker.vercel.app/day-worker-severance-guide"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      <div className="min-h-screen bg-up-sunken">

        {/* ── 히어로 ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-up-body to-ink-700 text-white px-5 pt-14 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              onClick={() => navigate(-1)}
              className="text-white/70 text-sm mb-6 flex items-center gap-1 hover:text-white transition-colors"
            >
              ← 메인으로
            </button>

            {/* H1 — 키워드 정확 매칭 */}
            <h1 className="text-2xl font-bold leading-tight mb-3">
              일용직 퇴직금 완전 가이드
            </h1>
            <p className="text-white/85 text-[0.95rem] leading-relaxed mb-6">
              쿠팡·컬리·CJ 일용직 근로자가 받을 수 있는<br />
              <strong>퇴직금·실업급여·주휴수당·연차수당</strong> 권리를<br />
              2026년 최신 기준으로 완전 정리했습니다.
            </p>

            <motion.button
              onClick={() => navigate('/calculator')}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-up-body font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              내 권리 무료로 계산하기
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        </div>

        <div className="px-5 py-6 space-y-6">

          {/* ── 4대 권리 카드 ────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              💼 일용직 근로자가 받을 수 있는 4가지 권리
            </h2>
            <div className="space-y-3">
              {RIGHTS.map((r, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: r.bg, color: r.color }}
                  >
                    {r.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[0.95rem] font-bold text-ink-900">{r.title}</p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: r.bg, color: r.color }}
                      >
                        {r.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-up-sub mb-2">{r.desc}</p>
                    <button
                      onClick={() => navigate(r.action)}
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color: r.color }}
                    >
                      {r.actionLabel}
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── 퇴직금 시뮬레이션 ──────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              📊 근무 조건별 예상 퇴직금
            </h2>
            <div className="space-y-3">
              {CASES.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-up-sunken last:border-0">
                  <div>
                    <p className="text-sm text-up-body">{c.label}</p>
                    {c.note && <p className="text-xs text-up-sub">{c.note}</p>}
                  </div>
                  <span className="text-sm font-bold text-brand">{c.amount}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-up-sunken rounded-xl">
              <p className="text-xs text-up-sub leading-relaxed">
                💡 실제 금액은 근무일 패턴·공백 기간·수당 내역에 따라 달라집니다.
                CATCH 계산기에서 정확하게 계산해보세요.
              </p>
            </div>
          </motion.section>

          {/* ── 핵심 법률 ──────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              ⚖️ 알아두면 유용한 노동 법률
            </h2>
            <div className="space-y-3">
              {[
                { law: '근로자퇴직급여보장법 제4조', desc: '계속 근로 1년 이상 & 주 15시간 이상이면 퇴직금 의무 지급' },
                { law: '근로기준법 제55조', desc: '주 15시간 이상 근무 시 유급 주휴일(주휴수당) 보장' },
                { law: '근로기준법 제60조', desc: '1년 이상 근무 시 15일 이상 연차 유급휴가 보장' },
                { law: '고용보험법 제40조', desc: '피보험단위기간 180일 이상 + 비자발적 이직 시 실업급여 지급' },
                { law: '근로기준법 제49조', desc: '퇴직금 청구권 소멸시효: 퇴직일로부터 3년' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-up-sunken last:border-0">
                  <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-2" />
                  <div>
                    <p className="text-xs font-bold text-brand">{item.law}</p>
                    <p className="text-sm text-up-body mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── FAQ 섹션 ──────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              ❓ 자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {FAQ_SCHEMA.mainEntity.map((q, i) => (
                <div key={i} className="border-b border-up-sunken last:border-0 pb-4 last:pb-0">
                  <p className="text-sm font-bold text-up-body mb-1.5">Q. {q.name}</p>
                  <p className="text-xs text-up-sub leading-relaxed">{q.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── 하단 CTA ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pb-8 space-y-3"
          >
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-brand text-white font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              퇴직금 무료 계산하기
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => navigate('/unemployment')}
              className="w-full bg-white text-[#0f8456] border border-[#0f8456]/30 font-bold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              실업급여 수급 자격 확인하기
            </button>
            <p className="text-center text-xs text-up-sub">
              완전 무료 · 회원가입 없이도 계산 가능
            </p>
          </motion.div>

          {/* SEO 내부 링크 메시(P5) — 크롤 가능한 관련 계산기·가이드 */}
          <RelatedLinks current="/day-worker-severance-guide" />

        </div>
      </div>
    </>
  )
}
