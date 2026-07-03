// 쿠팡 일용직 실업급여 전용 SEO 랜딩 페이지
// 검색어: "쿠팡 일용직 실업급여", "쿠팡 CFS 실업급여", "쿠팡 알바 실업급여"
// 목적: 검색 유입 → 실업급여 계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, CheckCircle, XCircle, AlertTriangle, Briefcase } from 'lucide-react'
import PageMeta from '../../components/PageMeta'
import RelatedLinks from '../../components/seo/RelatedLinks'

// ── FAQ JSON-LD ──────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '쿠팡 일용직도 실업급여를 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 고용보험에 가입된 쿠팡·CFS 일용직 근로자라면 최근 18개월 내 피보험단위기간이 180일 이상이고, 최근 1개월 근로일수가 10일 미만이며, 비자발적으로 이직(계약 만료 포함)한 경우 실업급여를 신청할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 일용직 실업급여 얼마나 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '일용직 실업급여는 기초일액(평균임금 × 60%) × 수급일수로 계산합니다. 2026년 상한액은 하루 68,100원, 하한액은 66,048원/일(최저임금 10,320원 × 80% × 8h)입니다. 수급 기간은 피보험기간과 나이에 따라 120~270일입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 계약 만료 후 실업급여 신청할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 계약 만료는 "자발적 이직"이 아니므로 실업급여 신청 대상입니다. 단, 재계약을 거부한 경우는 자발적 이직으로 분류될 수 있어 주의가 필요합니다. 계약 종료 후 12개월 이내에 신청해야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '고용보험 미가입 일용직도 실업급여를 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡·CFS에서 정식 근로계약서를 작성하고 일한 경우 사업주가 고용보험에 의무 가입해야 합니다. 미가입 상태였다면 고용보험료 소급 납부 후 신청이 가능합니다. 고용노동부(1350)에 문의하거나 고용24(www.work.go.kr)에서 확인하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '실업급여 신청 기간이 지나면 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '이직일(퇴직일) 다음 날부터 12개월 이내에 신청해야 합니다. 12개월이 지나면 수급 자격이 소멸합니다. 빠른 신청을 권장합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '실업급여 받으면서 아르바이트를 해도 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '실업급여 수급 중에도 취업·알바는 가능하지만 반드시 신고해야 합니다. 미신고 시 부정수급으로 처리되어 지급된 금액의 2배 이상을 반환해야 합니다. 수입이 있는 날은 그날의 실업급여가 공제됩니다.',
      },
    },
  ],
}

// ── Article JSON-LD ──────────────────────────────────────────
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 일용직 실업급여 — 조건·금액·신청법 2026년 완전 정리',
  description: '쿠팡·CFS 일용직 실업급여 수급 조건, 예상 금액 계산법, 신청 절차를 알기 쉽게 정리했습니다. CATCH 실업급여 계산기로 내 예상 금액을 지금 바로 확인하세요.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-05-10',
  dateModified: '2026-05-10',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://catch-daily-worker.vercel.app/coupang-unemployment-calculator' },
}

// ── 수급 조건 ───────────────────────────────────────────────
const CONDITIONS_OK = [
  '최근 18개월 내 고용보험 피보험단위기간 180일 이상',
  '최근 1개월 근로일수 10일 미만인 상태',
  '비자발적 이직: 계약 만료, 권고사직, 해고',
  '재취업 활동 의사가 있는 경우',
]

const CONDITIONS_NO = [
  '스스로 그만두거나 재계약을 거부한 경우',
  '중대한 귀책사유(무단결근, 업무 비위 등)로 해고된 경우',
  '이직일부터 12개월이 경과한 경우',
]

// ── 신청 절차 ───────────────────────────────────────────────
const STEPS = [
  { step: '1', title: '워크넷 구직 등록', desc: '고용24(work.go.kr)에서 구직 신청 먼저 하기' },
  { step: '2', title: '수급자격 신청', desc: '관할 고용센터 방문 또는 고용24 온라인 신청' },
  { step: '3', title: '수급자격자 교육', desc: '온라인 교육(40분) 수강 — 수급자격 인정 전 1회' },
  { step: '4', title: '실업인정 신청', desc: '2주마다 고용24에서 구직활동 실적 보고' },
  { step: '5', title: '급여 수령', desc: '실업인정 후 1~2일 내 지정 계좌로 입금' },
]

export default function CoupangUnemploymentLanding() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD */}
      <PageMeta
        title="쿠팡 일용직 실업급여 — 조건·금액·신청법 2026 | CATCH"
        description="쿠팡·CFS 일용직 실업급여 수급 조건(180일 이상), 예상 금액, 신청 절차를 쉽게 정리했습니다. CATCH 실업급여 계산기로 내 예상 금액을 3분 만에 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/coupang-unemployment-calculator"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      {/* 전체 배경 */}
      <div className="min-h-screen bg-up-sunken">

        {/* ── 히어로 ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0f8456] to-[#12a769] text-white px-5 pt-14 pb-10">
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
              쿠팡 일용직 실업급여
            </h1>
            <p className="text-white/85 text-[0.95rem] leading-relaxed mb-6">
              쿠팡·CFS(쿠팡풀필먼트서비스) 일용직 근로자도<br />
              조건만 맞으면 <strong>월 최대 100만 원 이상</strong>의 실업급여를 받을 수 있습니다.<br />
              지금 바로 내 수급 자격과 예상 금액을 확인하세요.
            </p>

            <motion.button
              onClick={() => navigate('/unemployment')}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-[#0f8456] font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              실업급여 지금 계산하기
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        </div>

        <div className="px-5 py-6 space-y-6">

          {/* ── 수급 가능 조건 ─────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              📋 실업급여 수급 조건
            </h2>

            <p className="text-xs font-bold text-[#0f8456] mb-2 uppercase tracking-wide">✅ 아래 모두 해당하면 신청 가능</p>
            <ul className="space-y-2 mb-4">
              {CONDITIONS_OK.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-[#0f8456] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-up-body">{c}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs font-bold text-danger mb-2 uppercase tracking-wide">❌ 아래 해당하면 신청 불가</p>
            <ul className="space-y-2">
              {CONDITIONS_NO.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-up-sub">{c}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* ── 금액 계산 ──────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              💰 실업급여 금액 계산법
            </h2>

            <div className="bg-[#EFFAF5] rounded-xl p-4 mb-4 border border-[#0f8456]/20">
              <p className="text-sm font-mono text-[#0f8456] leading-relaxed">
                1일 실업급여 = 기초일액 × 60%
              </p>
              <p className="text-xs text-up-sub mt-2">
                기초일액 = 퇴직 전 3개월 평균임금
              </p>
            </div>

            {/* 2026년 상·하한액 */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-up-sub uppercase tracking-wide">2026년 기준</p>
              <div className="flex justify-between items-center py-2 border-b border-up-sunken">
                <span className="text-sm text-up-body">1일 상한액</span>
                <span className="text-sm font-bold text-ink-900">68,100원</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-up-sunken">
                <span className="text-sm text-up-body">최대 수급 기간</span>
                <span className="text-sm font-bold text-ink-900">최대 270일</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-[#0f8456]">최대 수령 총액</span>
                <span className="text-base font-bold text-[#0f8456]">약 1,782만 원</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-up-sunken rounded-xl">
              <p className="text-xs text-up-sub leading-relaxed">
                <AlertTriangle size={12} className="inline mr-1" />
                정확한 금액은 나이·피보험기간·임금에 따라 달라집니다.
                CATCH 계산기에서 내 상황에 맞게 계산해보세요.
              </p>
            </div>
          </motion.section>

          {/* ── 신청 절차 ──────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-ink-900 mb-4">
              📌 실업급여 신청 방법 (5단계)
            </h2>
            <div className="space-y-4">
              {STEPS.map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0f8456] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-900">{s.title}</p>
                    <p className="text-xs text-up-sub mt-0.5">{s.desc}</p>
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
              onClick={() => navigate('/unemployment')}
              className="w-full bg-[#0f8456] text-white font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              실업급여 무료 계산하기
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-white text-brand border border-brand/30 font-bold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2"
            >
              <Briefcase size={18} />
              퇴직금도 같이 계산하기
            </button>
            <p className="text-center text-xs text-up-sub">
              완전 무료 · 회원가입 없이도 계산 가능
            </p>
          </motion.div>

          {/* SEO 내부 링크 메시(P5) — 크롤 가능한 관련 계산기·가이드 */}
          <RelatedLinks current="/coupang-unemployment-calculator" />

        </div>
      </div>
    </>
  )
}
