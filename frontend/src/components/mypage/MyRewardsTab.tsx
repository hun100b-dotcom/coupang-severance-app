// 🎁 포인트/쿠폰 탭 — 포인트 잔액, 이력, 보유 쿠폰 목록
// user_points 테이블: SUM(amount)가 현재 잔액
// user_coupons 테이블: 미사용/사용완료 탭으로 구분
import { useEffect, useState, useMemo } from 'react'
import { Loader2, Coffee, Tag, Coins, Gift, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { UserPoint, UserCoupon } from '../../types/supabase'

interface Props {
  userId: string
}

// ── 포인트 적립 규칙 안내 ──
// 일용직 특성상 연속 7일 근무는 현실적으로 불가능하므로 해당 항목 제외
const POINT_RULES = [
  { icon: '🎯', reason: '최초 지원', points: '+50P', color: 'text-blue-600' },
  { icon: '✅', reason: '출근 완료 1회', points: '+100P', color: 'text-emerald-600' },
  { icon: '🔥', reason: '연속 출근 3일', points: '+200P', color: 'text-orange-600' },
  { icon: '📅', reason: '이번 달 5회 출근', points: '+300P', color: 'text-amber-600' },
]

// 쿠폰 종류별 설정
const COUPON_CONFIG = {
  coffee: { icon: Coffee, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600', label: '커피쿠폰' },
  discount: { icon: Tag, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600', label: '할인쿠폰' },
  cashback: { icon: Coins, bg: 'bg-violet-50', border: 'border-violet-200', iconColor: 'text-violet-600', label: '캐시백' },
} as const

export default function MyRewardsTab({ userId }: Props) {
  const [points, setPoints] = useState<UserPoint[]>([])
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  // 쿠폰 탭: 미사용 / 사용완료
  const [couponTab, setCouponTab] = useState<'unused' | 'used'>('unused')
  // 포인트 규칙 안내 펼치기/접기
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setLoading(false); return }
      setLoading(true)

      // 포인트 이력 + 쿠폰 목록 동시 조회
      const [ptResult, cpResult] = await Promise.all([
        supabase
          .from('user_points')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_coupons')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ])

      setPoints((ptResult.data ?? []) as UserPoint[])
      setCoupons((cpResult.data ?? []) as UserCoupon[])
      setLoading(false)
    }
    load()
  }, [userId])

  // 현재 포인트 잔액 = 전체 이력의 amount 합산
  const totalPoints = useMemo(
    () => points.reduce((sum, p) => sum + p.amount, 0),
    [points]
  )

  // 미사용 쿠폰 / 사용완료 쿠폰 분리
  const unusedCoupons = coupons.filter(c => !c.is_used)
  const usedCoupons = coupons.filter(c => c.is_used)

  // 날짜 포맷
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── 현재 포인트 잔액 (크게 표시) ── */}
      <div className="bg-gradient-to-br from-[#3182F6] to-[#2563eb] rounded-[24px] p-5 text-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-white/[0.07] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-white/70" />
            <p className="text-[13px] font-semibold text-white/80">현재 포인트 잔액</p>
          </div>
          <p className="text-[42px] font-black leading-tight tracking-tight">
            {totalPoints.toLocaleString('ko-KR')}
            <span className="text-[18px] font-bold ml-1">P</span>
          </p>
          <p className="text-[12px] text-white/60 mt-1">1,000P = 커피쿠폰 1장 교환 가능</p>
        </div>
      </div>

      {/* ── 포인트 적립 방법 안내 (접기/펼치기) ── */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden">
        <button
          onClick={() => setRulesOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <span className="text-[14px] font-bold text-[#191f28]">포인트 적립 방법</span>
          <ChevronRight className={`w-4 h-4 text-[#8b95a1] transition-transform ${rulesOpen ? 'rotate-90' : ''}`} />
        </button>
        {rulesOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-slate-50 pt-3">
            {POINT_RULES.map(rule => (
              <div key={rule.reason}
                className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{rule.icon}</span>
                  <span className="text-[13px] text-[#4e5968]">{rule.reason}</span>
                </div>
                <span className={`text-[13px] font-black ${rule.color}`}>{rule.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 보유 쿠폰 ── */}
      <div className="bg-white rounded-[24px] border border-slate-100">
        {/* 탭 헤더 */}
        <div className="flex border-b border-slate-100">
          {[
            { key: 'unused' as const, label: `미사용 (${unusedCoupons.length})` },
            { key: 'used' as const, label: `사용완료 (${usedCoupons.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setCouponTab(tab.key)}
              className={`flex-1 py-3 text-[13px] font-bold transition-colors ${
                couponTab === tab.key
                  ? 'text-[#3182f6] border-b-2 border-[#3182f6]'
                  : 'text-[#8b95a1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 쿠폰 목록 */}
        <div className="p-4">
          {(couponTab === 'unused' ? unusedCoupons : usedCoupons).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Gift className="w-10 h-10 text-gray-200" />
              <p className="text-[14px] font-bold text-[#8b95a1]">
                {couponTab === 'unused' ? '보유한 쿠폰이 없어요' : '사용한 쿠폰이 없어요'}
              </p>
              {couponTab === 'unused' && (
                <p className="text-[12px] text-[#c8cdd2]">출근하면 포인트로 쿠폰을 받을 수 있어요</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(couponTab === 'unused' ? unusedCoupons : usedCoupons).map(coupon => {
                const cfg = COUPON_CONFIG[coupon.coupon_type]
                const Icon = cfg.icon
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()

                return (
                  <div key={coupon.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border ${cfg.bg} ${cfg.border} ${coupon.is_used || isExpired ? 'opacity-60' : ''}`}>
                    {/* 쿠폰 아이콘 */}
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                    </div>

                    {/* 쿠폰 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#191f28]">{coupon.title}</p>
                      {coupon.description && (
                        <p className="text-[11px] text-[#8b95a1] mt-0.5 truncate">{coupon.description}</p>
                      )}
                      {/* 쿠폰 코드 */}
                      {coupon.coupon_code && !coupon.is_used && (
                        <p className="text-[12px] font-mono font-bold text-[#3182f6] mt-1 bg-white/70 px-2 py-0.5 rounded-lg inline-block">
                          {coupon.coupon_code}
                        </p>
                      )}
                      {/* 만료일 */}
                      {coupon.expires_at && (
                        <div className={`flex items-center gap-0.5 mt-0.5 text-[11px] ${isExpired ? 'text-red-400' : 'text-[#8b95a1]'}`}>
                          <Clock className="w-3 h-3" />
                          {isExpired ? '만료됨' : `~${fmtDate(coupon.expires_at)} 까지`}
                        </div>
                      )}
                    </div>

                    {/* 사용 여부 */}
                    {coupon.is_used ? (
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <CheckCircle2 className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] text-[#8b95a1]">사용완료</span>
                      </div>
                    ) : isExpired ? (
                      <span className="text-[11px] font-bold text-red-400 shrink-0">만료</span>
                    ) : (
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${cfg.iconColor} bg-white/80 border ${cfg.border} shrink-0`}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 포인트 이력 ── */}
      <div className="bg-white rounded-[24px] border border-slate-100">
        <p className="text-[14px] font-extrabold text-[#191f28] px-4 pt-4 pb-2">포인트 이력</p>
        {points.length === 0 ? (
          <div className="text-center py-10 pb-6">
            <p className="text-[13px] text-[#8b95a1]">아직 포인트 이력이 없어요</p>
          </div>
        ) : (
          <div className="px-4 pb-4 flex flex-col divide-y divide-slate-50">
            {points.slice(0, 20).map(p => (  /* 최근 20건만 표시 */
              <div key={p.id}
                className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#4e5968]">{p.reason}</p>
                  <p className="text-[11px] text-[#c8cdd2] mt-0.5">{fmtDate(p.created_at)}</p>
                </div>
                {/* 양수: 파란색 / 음수: 빨간색 */}
                <span className={`text-[15px] font-black ${p.amount > 0 ? 'text-[#3182f6]' : 'text-red-500'}`}>
                  {p.amount > 0 ? '+' : ''}{p.amount.toLocaleString('ko-KR')}P
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 포인트 사용처 안내 ── */}
      <div className="bg-white rounded-[24px] p-4 border border-slate-100">
        <p className="text-[14px] font-extrabold text-[#191f28] mb-3">포인트 사용처</p>
        <div className="flex flex-col gap-2">
          {[
            { icon: Coffee, label: '커피쿠폰 교환', desc: '1,000P → 스타벅스/메가커피 1잔', available: true },
            { icon: Tag, label: '할인쿠폰 교환', desc: '500P → 구독 결제 500원 할인', available: true },
            { icon: Coins, label: '현금 캐시백', desc: '추후 업데이트 예정', available: false },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label}
                className={`flex items-center gap-3 p-3 rounded-2xl ${item.available ? 'bg-slate-50' : 'bg-gray-50 opacity-60'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${item.available ? 'text-[#3182f6]' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#191f28]">{item.label}</p>
                  <p className="text-[11px] text-[#8b95a1]">{item.desc}</p>
                </div>
                {!item.available && (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-lg font-bold shrink-0">준비중</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
