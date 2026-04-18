// ============================================================
// CalcStatsTab: 어드민 대시보드 [계산기 통계] 탭
// reports 테이블 기반으로 서비스별 사용량을 분석합니다.
// - 서비스별(퇴직금/실업급여/주휴수당/연차수당) 사용 건수 KPI
// - 적격률 및 평균 퇴직금 KPI
// - 일별 계산 트렌드 (최근 30일)
// - 퇴직금 구간별 분포
// - 엑셀 다운로드
// ============================================================

import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../../../lib/supabase'
import { exportXlsx } from '../../../lib/exportXlsx'

// reports 테이블 조회 결과 타입
interface Report {
  id: string
  service_type: string | null
  qualifying_days: number | null
  severance_amount: number | null
  created_at: string
}

// 일별 집계 타입
interface DailyCount {
  date: string
  count: number
}

// ── 금액 포맷 헬퍼 ─────────────────────────────────────────
function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

// ── 날짜 범위 계산 ─────────────────────────────────────────
function getFromDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// 퇴직금 구간 분류
const SEVERANCE_RANGES = [
  { label: '0원 (비적격)', min: 0,       max: 1,       color: '#6b7280' },
  { label: '~50만원',      min: 1,       max: 500000,  color: '#3182f6' },
  { label: '~200만원',     min: 500000,  max: 2000000, color: '#00c48c' },
  { label: '~500만원',     min: 2000000, max: 5000000, color: '#eab308' },
  { label: '500만원+',     min: 5000000, max: Infinity, color: '#f08c00' },
]

const TT: React.CSSProperties = {
  background: '#12122a', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, fontSize: 11,
}

export default function CalcStatsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!supabase) throw new Error('Supabase 클라이언트 없음')
      const { data, error: err } = await supabase
        .from('reports')
        .select('id, service_type, qualifying_days, severance_amount, created_at')
        .gte('created_at', getFromDate(range))
        .order('created_at', { ascending: false })
        .limit(2000)
      if (err) throw err
      setReports(data ?? [])
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 집계 계산 ──────────────────────────────────────────────
  // 서비스별 분류 (service_type이 null이면 퇴직금으로 가정)
  const byService = {
    severance: reports.filter(r => !r.service_type || r.service_type === 'severance').length,
    unemployment: reports.filter(r => r.service_type === 'unemployment').length,
    weekly: reports.filter(r => r.service_type === 'weekly_allowance').length,
    annual: reports.filter(r => r.service_type === 'annual_leave').length,
  }

  // 퇴직금 서비스 기준 적격/비적격
  const severanceReports = reports.filter(r => !r.service_type || r.service_type === 'severance')
  const eligible = severanceReports.filter(r => (r.qualifying_days ?? 0) >= 365).length
  const eligibleRate = severanceReports.length > 0 ? Math.round(eligible / severanceReports.length * 100) : 0

  // 평균 퇴직금 (적격자 기준)
  const eligibleAmounts = severanceReports
    .filter(r => (r.qualifying_days ?? 0) >= 365 && (r.severance_amount ?? 0) > 0)
    .map(r => r.severance_amount ?? 0)
  const avgSeverance = eligibleAmounts.length > 0
    ? Math.round(eligibleAmounts.reduce((a, b) => a + b, 0) / eligibleAmounts.length) : 0

  // 일별 계산 트렌드
  const dailyMap = new Map<string, number>()
  reports.forEach(r => {
    const date = r.created_at.slice(0, 10)
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  })
  const dailyData: DailyCount[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date: date.slice(5), count })) // MM-DD 형식

  // 퇴직금 구간 분포
  const rangeData = SEVERANCE_RANGES.map(rng => ({
    label: rng.label,
    count: reports.filter(r => {
      const amt = r.severance_amount ?? 0
      return amt >= rng.min && amt < rng.max
    }).length,
    color: rng.color,
  }))

  // 엑셀 다운로드
  const handleDownload = () => {
    const data = reports.map(r => ({
      생성일시: r.created_at.replace('T', ' ').slice(0, 19),
      서비스: r.service_type ?? '퇴직금',
      근무일수: r.qualifying_days ?? 0,
      퇴직금액: r.severance_amount ?? 0,
      적격여부: (r.qualifying_days ?? 0) >= 365 ? '적격' : '비적격',
    }))
    exportXlsx(data, `calc_stats_${range}일_${new Date().toISOString().slice(0, 10)}`)
  }

  // ── 로딩/에러 ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3182f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>계산기 통계 로딩 중...</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24, color: '#fca5a5' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>계산기 통계</h2>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {reports.length.toLocaleString()}건
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신`}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: range === d ? 'linear-gradient(135deg, #3182f6, #2563eb)' : 'rgba(255,255,255,0.06)',
              color: range === d ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
            }}>{d}일</button>
          ))}
          <button onClick={load} style={{
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer',
          }}>↻</button>
          <button onClick={handleDownload} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(34,197,94,0.15)',
            color: '#4ade80', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
          }}>⬇ 엑셀</button>
        </div>
      </div>

      {/* ── KPI 카드 ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '퇴직금', value: byService.severance.toLocaleString(), color: '#3182f6', icon: '💰' },
          { label: '실업급여', value: byService.unemployment.toLocaleString(), color: '#00c48c', icon: '🏦' },
          { label: '주휴수당', value: byService.weekly.toLocaleString(), color: '#f08c00', icon: '📅' },
          { label: '연차수당', value: byService.annual.toLocaleString(), color: '#8b5cf6', icon: '📆' },
        ].map(k => (
          <div key={k.label} style={{
            background: `linear-gradient(145deg, ${k.color}14 0%, ${k.color}05 100%)`,
            border: `1px solid ${k.color}22`, borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800, color: '#fff' }}>{k.value}</div>
            <div style={{ fontSize: '0.6rem', color: `${k.color}aa`, marginTop: 3 }}>계산 건수</div>
          </div>
        ))}
      </div>

      {/* ── 퇴직금 적격 KPI ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div style={{
          background: 'linear-gradient(145deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
          border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>✅ 퇴직금 적격률</div>
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 800, color: '#22c55e' }}>{eligibleRate}%</div>
          <div style={{ fontSize: '0.6rem', color: '#22c55e88', marginTop: 3 }}>
            {eligible.toLocaleString()}건 / {severanceReports.length.toLocaleString()}건
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(145deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>💎 평균 퇴직금</div>
          <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', fontWeight: 800, color: '#a78bfa' }}>{fmtMoney(avgSeverance)}</div>
          <div style={{ fontSize: '0.6rem', color: '#a78bfa88', marginTop: 3 }}>적격자 기준</div>
        </div>
      </div>

      {/* ── 일별 트렌드 차트 ──────────────────────────────── */}
      {dailyData.length > 1 && (
        <div style={{ ...CARD, marginBottom: 12 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>일별 계산 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="calc-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3182f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3182f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}건`, '계산']} />
              <Area type="monotone" dataKey="count" stroke="#3182f6" fill="url(#calc-grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 퇴직금 구간 분포 ──────────────────────────────── */}
      <div style={CARD}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>퇴직금 구간 분포</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={rangeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
            <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}건`, '계산 건수']} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {rangeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16, padding: 'clamp(14px, 3vw, 20px)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3182f6, #2563eb)', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
