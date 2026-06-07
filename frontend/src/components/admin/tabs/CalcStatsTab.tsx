// CalcStatsTab: 어드민 대시보드 [계산기 통계] 탭 — 라이트 모드 전환
// reports 테이블 기반 서비스별 사용량 분석

import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../../../lib/supabase'
import { exportXlsx } from '../../../lib/exportXlsx'
import PageHeader from '../shared/PageHeader'

interface Report {
  id: string
  title: string
  created_at: string
  payload: Record<string, unknown> | null
}

interface DailyCount { date: string; count: number }

function getServiceType(r: Report): string {
  const type = r.payload?.type as string | undefined
  if (type === 'weekly_allowance') return 'weekly_allowance'
  if (type === 'annual_leave') return 'annual_leave'
  if (type === 'unemployment') return 'unemployment'
  return 'severance'
}

function getQualifyingDays(r: Report): number {
  const days = r.payload?.qualifying_days
  return typeof days === 'number' ? days : 0
}

function getSeveranceAmount(r: Report): number {
  const amt = r.payload?.severance
  return typeof amt === 'number' ? amt : 0
}

function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

function getFromDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const SEVERANCE_RANGES = [
  { label: '0원 (비적격)', min: 0,       max: 1,       color: '#94a3b8' },
  { label: '~50만원',      min: 1,       max: 500000,  color: '#3182f6' },
  { label: '~200만원',     min: 500000,  max: 2000000, color: '#059669' },
  { label: '~500만원',     min: 2000000, max: 5000000, color: '#ca8a04' },
  { label: '500만원+',     min: 5000000, max: Infinity, color: '#d97706' },
]

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
        .select('id, title, created_at, payload')
        .gte('created_at', getFromDate(range))
        .order('created_at', { ascending: false })
        .limit(2000)
      if (err) throw err
      setReports((data ?? []) as Report[])
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const byService = {
    severance:    reports.filter(r => getServiceType(r) === 'severance').length,
    unemployment: reports.filter(r => getServiceType(r) === 'unemployment').length,
    weekly:       reports.filter(r => getServiceType(r) === 'weekly_allowance').length,
    annual:       reports.filter(r => getServiceType(r) === 'annual_leave').length,
  }

  const severanceReports = reports.filter(r => getServiceType(r) === 'severance')
  const eligible = severanceReports.filter(r => getQualifyingDays(r) >= 365).length
  const eligibleRate = severanceReports.length > 0 ? Math.round(eligible / severanceReports.length * 100) : 0
  const eligibleAmounts = severanceReports
    .filter(r => getQualifyingDays(r) >= 365 && getSeveranceAmount(r) > 0)
    .map(r => getSeveranceAmount(r))
  const avgSeverance = eligibleAmounts.length > 0
    ? Math.round(eligibleAmounts.reduce((a, b) => a + b, 0) / eligibleAmounts.length) : 0

  const dailyMap = new Map<string, number>()
  reports.forEach(r => { const date = r.created_at.slice(0, 10); dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1) })
  const dailyData: DailyCount[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date: date.slice(5), count }))

  const rangeData = SEVERANCE_RANGES.map(rng => ({
    label: rng.label,
    count: severanceReports.filter(r => { const amt = getSeveranceAmount(r); return amt >= rng.min && amt < rng.max }).length,
    color: rng.color,
  }))

  const handleDownload = () => {
    exportXlsx(reports.map(r => ({
      생성일시: r.created_at.replace('T', ' ').slice(0, 19), 제목: r.title ?? '',
      서비스: getServiceType(r), 근무일수: getQualifyingDays(r),
      퇴직금액: getSeveranceAmount(r), 적격여부: getQualifyingDays(r) >= 365 ? '적격' : '비적격',
    })), `calc_stats_${range}일_${new Date().toISOString().slice(0, 10)}`)
  }

  if (loading) return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#3182f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>계산기 통계 로딩 중...</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 16, padding: 24, color: '#e11d48' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHeader
        icon="📊" title="계산기 통계"
        subtitle={`${reports.length.toLocaleString()}건${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}`}
        actions={
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setRange(d)} style={{
                  padding: '5px 12px', borderRadius: 8,
                  border: range === d ? '1px solid #3182f6' : '1px solid #e2e8f0',
                  background: range === d ? '#eff6ff' : '#fff',
                  color: range === d ? '#1d4ed8' : '#64748b',
                  fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                }}>{d}일</button>
              ))}
            </div>
            <button onClick={load} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer' }}>↻</button>
            <button onClick={handleDownload} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#059669', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}>⬇ 엑셀</button>
          </>
        }
      />

      {/* 서비스별 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '퇴직금', value: byService.severance.toLocaleString(), color: '#3182f6', icon: '💰' },
          { label: '실업급여', value: byService.unemployment.toLocaleString(), color: '#059669', icon: '🏦' },
          { label: '주휴수당', value: byService.weekly.toLocaleString(), color: '#d97706', icon: '📅' },
          { label: '연차수당', value: byService.annual.toLocaleString(), color: '#7c3aed', icon: '📆' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 'clamp(12px, 2vw, 18px)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 3 }}>계산 건수</div>
          </div>
        ))}
      </div>

      {/* 퇴직금 적격 KPI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 'clamp(12px, 2vw, 18px)' }}>
          <div style={{ fontSize: '0.62rem', color: '#064e3b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ 퇴직금 적격률</div>
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 800, color: '#059669' }}>{eligibleRate}%</div>
          <div style={{ fontSize: '0.62rem', color: '#6ee7b7', marginTop: 3 }}>{eligible.toLocaleString()}건 / {severanceReports.length.toLocaleString()}건</div>
        </div>
        <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 'clamp(12px, 2vw, 18px)' }}>
          <div style={{ fontSize: '0.62rem', color: '#4c1d95', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💎 평균 퇴직금</div>
          <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', fontWeight: 800, color: '#7c3aed' }}>{fmtMoney(avgSeverance)}</div>
          <div style={{ fontSize: '0.62rem', color: '#a78bfa', marginTop: 3 }}>적격자 기준</div>
        </div>
      </div>

      {/* 일별 트렌드 차트 */}
      {dailyData.length > 1 && (
        <div style={{ ...CARD, marginBottom: 12 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>일별 계산 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="calc-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3182f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3182f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }}
                formatter={(v: number) => [`${v}건`, '계산']}
              />
              <Area type="monotone" dataKey="count" stroke="#3182f6" fill="url(#calc-grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 퇴직금 구간 분포 */}
      <div style={CARD}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>퇴직금 구간 분포</p>
        {severanceReports.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>퇴직금 계산 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rangeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11 }}
                formatter={(v: number) => [`${v}건`, '계산 건수']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {rangeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 'clamp(14px, 3vw, 20px)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: '#3182f6', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
