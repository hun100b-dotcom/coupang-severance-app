// 쿠팡 퇴직금 계산기 전용 SEO 랜딩 페이지
// 검색어: "쿠팡 퇴직금 계산기", "쿠팡 일용직 퇴직금", "쿠팡 CFS 퇴직금"
// 목적: 검색 유입 → 계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── FAQ JSON-LD ──────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '쿠팡 일용직도 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 쿠팡·CFS(쿠팡풀필먼트서비스) 일용직도 동일 사업장에서 1년 이상(365일) 계속 근무하고, 최근 4주 평균 주 15시간 이상 근무했다면 퇴직금 청구 권리가 있습니다. 근로자퇴직급여보장법 제4조에 명시된 권리입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 퇴직금 계산 공식이 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 = (1일 평균임금 × 30일) × (재직일수 ÷ 365). 1일 평균임금은 최근 3개월 급여 총액을 90일로 나눈 값입니다. 예: 월 급여 250만 원, 2년 근무 시 약 164만 원. CATCH 계산기에 PDF를 올리면 자동 계산됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 CFS 28일 블록이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡·CFS 급여 주기는 28일 단위입니다. 마지막 근무일부터 28일씩 역순 블록을 나누고, 각 블록에서 근무일이 8일 이상이면 "적격 블록"으로 인정됩니다. CATCH는 이 알고리즘을 자동 적용해 정확한 적격 근무일수를 계산합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금 소멸시효는 언제까지인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 청구권은 퇴직일로부터 3년입니다(근로기준법 제49조). 3년이 지나면 법적으로 청구할 수 없으므로 지금 바로 확인하시길 권장합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '회사가 퇴직금을 안 줄 때 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '고용노동부 민원마당(moel.go.kr) 또는 관할 고용노동지청에 진정을 제기할 수 있습니다. 회사 파산 시에는 국가 대지급제도(체당금)를 통해 정부가 대신 지급합니다. 퇴직 후 3년 이내에 신청하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '급여명세서 없이도 퇴직금 계산이 가능한가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네. CATCH는 두 가지 방식을 지원합니다. ① PDF 정밀계산: 쿠팡 앱에서 내려받은 급여명세서 PDF 업로드 → 자동 분석. ② 수동 간편계산: 월 근무일수·시급·기간 직접 입력. 명세서 없이도 예상액을 확인할 수 있습니다.',
      },
    },
  ],
}

// ── Article JSON-LD ──────────────────────────────────────────
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 퇴직금 계산기 — 일용직·CFS 2026년 완전정복',
  description: '쿠팡·CFS 일용직 퇴직금 수급 조건, 계산 공식, 28일 블록 알고리즘을 알기 쉽게 설명합니다. CATCH 무료 계산기로 내 퇴직금을 지금 바로 확인하세요.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-05-10',
  dateModified: '2026-05-10',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://catch-daily-worker.vercel.app/coupang-severance-calculator' },
}

// ── 수급 조건 체크리스트 ────────────────────────────────────
const ELIGIBILITY_ITEMS = [
  { ok: true, text: '같은 사업장(쿠팡/CFS 동일 센터)에서 365일 이상 근무' },
  { ok: true, text: '최근 4주 평균 주 15시간 이상 근무' },
  { ok: true, text: '자발적 퇴사 또는 계약 만료 모두 해당' },
  { ok: false, text: '1년 미만 근무 → 퇴직금 해당 없음 (연차·주휴수당은 가능)' },
]

// ── 계산 단계 ───────────────────────────────────────────────
const STEPS = [
  { step: '1', title: '근속 기간 확인', desc: '입사일 ~ 퇴직일이 365일 이상인지 확인' },
  { step: '2', title: '3개월 급여 합산', desc: '퇴직 직전 3개월(90일) 급여 총액 구하기' },
  { step: '3', title: '평균임금 계산', desc: '3개월 급여 합계 ÷ 90일 = 1일 평균임금' },
  { step: '4', title: '퇴직금 산출', desc: '(평균임금 × 30) × (재직일수 ÷ 365)' },
]

export default function CoupangSeveranceLanding() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD */}
      <PageMeta
        title="쿠팡 퇴직금 계산기 | 일용직·CFS 2026년 최신 기준 — CATCH"
        description="쿠팡·CFS(쿠팡풀필먼트서비스) 일용직 퇴직금 수급 조건, 28일 블록 계산법, 예상 금액을 무료로 확인하세요. PDF 업로드 시 3분 안에 정확한 금액이 나옵니다."
        canonical="https://catch-daily-worker.vercel.app/coupang-severance-calculator"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      {/* 전체 배경 */}
      <div className="min-h-screen bg-[#F2F4F6]">

        {/* ── 상단 히어로 ──────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1a6ff4] to-[#3182f6] text-white px-5 pt-14 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 뒤로가기 */}
            <button
              onClick={() => navigate(-1)}
              className="text-white/70 text-sm mb-6 flex items-center gap-1 hover:text-white transition-colors"
            >
              ← 메인으로
            </button>

            {/* H1 — 키워드 정확 매칭 */}
            <h1 className="text-2xl font-bold leading-tight mb-3">
              쿠팡 퇴직금 계산기
            </h1>
            <p className="text-white/85 text-[0.95rem] leading-relaxed mb-6">
              쿠팡·CFS(쿠팡풀필먼트서비스) 일용직 근로자를 위한<br />
              무료 퇴직금 자동 계산기입니다.<br />
              PDF 급여명세서 업로드 한 번으로 <strong>3분 안에</strong> 예상 금액이 나옵니다.
            </p>

            {/* CTA 버튼 */}
            <motion.button
              onClick={() => navigate('/severance')}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-[#3182f6] font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              지금 무료로 계산하기
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        </div>

        <div className="px-5 py-6 space-y-6">

          {/* ── 수급 조건 카드 ─────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-[#191F28] mb-4">
              📋 퇴직금 수급 조건
            </h2>
            <ul className="space-y-3">
              {ELIGIBILITY_ITEMS.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  {item.ok
                    ? <CheckCircle size={18} className="text-[#3182f6] flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={18} className="text-[#F04452] flex-shrink-0 mt-0.5" />
                  }
                  <span className={`text-sm leading-relaxed ${item.ok ? 'text-[#333D4B]' : 'text-[#565D6A]'}`}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-[#F2F4F6] rounded-xl">
              <p className="text-xs text-[#565D6A] leading-relaxed">
                💡 쿠팡·CFS는 공백 3개월 미만이면 하나의 연속 근로로 인정됩니다.
                여러 계약이 이어졌어도 합산 1년 이상이면 퇴직금이 발생합니다.
              </p>
            </div>
          </motion.section>

          {/* ── 계산 공식 카드 ─────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-[#191F28] mb-4">
              🧮 퇴직금 계산 공식
            </h2>

            {/* 공식 박스 */}
            <div className="bg-[#EFF6FF] rounded-xl p-4 mb-4 border border-[#3182f6]/20">
              <p className="text-sm font-mono text-[#1a6ff4] leading-relaxed">
                퇴직금 = (1일 평균임금 × 30일) × (재직일수 ÷ 365)
              </p>
              <p className="text-xs text-[#565D6A] mt-2">
                1일 평균임금 = 최근 3개월 급여 합계 ÷ 90일
              </p>
            </div>

            {/* 예시 계산 */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#565D6A] uppercase tracking-wide">예시 계산</p>
              <div className="flex justify-between items-center py-2 border-b border-[#F2F4F6]">
                <span className="text-sm text-[#333D4B]">월 평균 급여</span>
                <span className="text-sm font-bold text-[#191F28]">250만 원</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#F2F4F6]">
                <span className="text-sm text-[#333D4B]">근무 기간</span>
                <span className="text-sm font-bold text-[#191F28]">2년 (730일)</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-[#3182f6]">예상 퇴직금</span>
                <span className="text-base font-bold text-[#3182f6]">약 164만 원</span>
              </div>
            </div>
          </motion.section>

          {/* ── 계산 단계 ───────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-[#191F28] mb-4">
              📌 계산하는 방법 (4단계)
            </h2>
            <div className="space-y-4">
              {STEPS.map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#3182f6] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#191F28]">{s.title}</p>
                    <p className="text-xs text-[#565D6A] mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── CATCH 특징 카드 ─────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-[#191F28] mb-4">
              ✅ CATCH 계산기가 다른 이유
            </h2>
            <div className="space-y-3">
              {[
                { icon: <FileText size={16} />, title: 'PDF 업로드 자동 분석', desc: '쿠팡 앱 급여명세서 PDF를 올리면 근무일 하나하나를 자동으로 읽습니다' },
                { icon: <Calculator size={16} />, title: '28일 블록 알고리즘 내장', desc: '쿠팡/CFS 전용 계산 방식을 그대로 적용합니다' },
                { icon: <Clock size={16} />, title: '3분 안에 결과', desc: '복잡한 입력 없이 PDF 하나로 끝납니다' },
                { icon: <CheckCircle size={16} />, title: '완전 무료', desc: '광고·결제 없이 계산 결과를 바로 저장하고 공유할 수 있습니다' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-[#3182f6] flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-[#191F28]">{item.title}</p>
                    <p className="text-xs text-[#565D6A] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── FAQ 섹션 ──────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-[1.05rem] font-bold text-[#191F28] mb-4">
              ❓ 자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {FAQ_SCHEMA.mainEntity.map((q, i) => (
                <div key={i} className="border-b border-[#F2F4F6] last:border-0 pb-4 last:pb-0">
                  <p className="text-sm font-bold text-[#333D4B] mb-1.5">Q. {q.name}</p>
                  <p className="text-xs text-[#565D6A] leading-relaxed">{q.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── 하단 CTA ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="pb-8"
          >
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-[#3182f6] text-white font-bold rounded-2xl py-4 text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Calculator size={20} />
              지금 무료로 계산하기
              <ChevronRight size={18} />
            </button>
            <p className="text-center text-xs text-[#565D6A] mt-3">
              완전 무료 · 회원가입 없이도 계산 가능
            </p>
          </motion.div>

        </div>
      </div>
    </>
  )
}
