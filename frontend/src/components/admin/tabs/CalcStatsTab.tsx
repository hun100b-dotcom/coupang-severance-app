// CalcStatsTab: 어드민 대시보드 [계산기 통계] 탭 — 업비트 톤 (색 토큰화, 데이터/로직 불변)
// reports 테이블 기반 서비스별 사용량 분석

import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, ResponsiveContainer, Cell,
} from 'recharts'
import { getAdminReports } from '../../../lib/api'
import { exportXlsx } from '../../../lib/exportXlsx'
import PageHeader from '../shared/PageHeader'
import { UP, numeric, cardBox } from '../shared/adminTheme'
import { AdminLoading } from '../shared/AdminState' // 공통 로딩 상태(인라인 스피너+@keyframes 대체)

interface Report {
  id: string
  title: string | null
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

// 퇴직금 구간 분포 색 — 토큰 기반 (회색→블루→그린→앰버)
const SEVERANCE_RANGES = [
  { label: '0원 (비적격)', min: 0,       max: 1,        color: UP.caption },
  { label: '~50만원',      min: 1,       max: 500000,   color: UP.brand },
  { label: '~200만원',     min: 500000,  max: 2000000,  color: UP.greenChart },
  { label: '~500만원',     min: 2000000, max: 5000000,  color: UP.amberChart },
  { label: '500만원+',     min: 5000000, max: Infinity, color: UP.strong },
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
      // 백엔드(service-role) 경로 — 과거 supabase 직접 조회는 reports RLS(owner-only)에
      // 걸려 "관리자 본인 리포트"만 집계됐다(전체 통계처럼 보이는 과소집계).
      const data = await getAdminReports(range)
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

  if (loading) return <AdminLoading label="계산기 통계를 불러오는 중이에요…" />

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 12, padding: 24, color: UP.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
        <div className="text-a13" style={{ color: UP.sub, marginBottom: 16 }}>{error}</div>
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
                <button key={d} onClick={() => setRange(d)} style={rangeBtn(range === d)}>{d}일</button>
              ))}
            </div>
            <button onClick={load} style={iconBtn}>↻</button>
            <button onClick={handleDownload} style={excelBtn}>⬇ 엑셀</button>
          </>
        }
      />

      {/* 서비스별 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '퇴직금', value: byService.severance.toLocaleString(), color: UP.brand, icon: '💰' },
          { label: '실업급여', value: byService.unemployment.toLocaleString(), color: UP.green, icon: '🏦' },
          { label: '주휴수당', value: byService.weekly.toLocaleString(), color: UP.amber, icon: '📅' },
          { label: '연차수당', value: byService.annual.toLocaleString(), color: UP.strong, icon: '📆' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: 'clamp(14px, 2vw, 18px)' }}>
            <div className="text-a10" style={{ color: UP.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.6rem)', fontWeight: 800, color: k.color, ...numeric }}>{k.value}</div>
            <div className="text-a10" style={{ color: UP.caption, marginTop: 3 }}>계산 건수</div>
          </div>
        ))}
      </div>

      {/* 퇴직금 적격 KPI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div style={{ background: UP.greenBg, border: `1px solid ${UP.greenLine}`, borderRadius: 12, padding: 'clamp(14px, 2vw, 18px)' }}>
          <div className="text-a10" style={{ color: UP.green, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ 퇴직금 적격률</div>
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 800, color: UP.green, ...numeric }}>{eligibleRate}%</div>
          <div className="text-a10" style={{ color: UP.sub, marginTop: 3, ...numeric }}>{eligible.toLocaleString()}건 / {severanceReports.length.toLocaleString()}건</div>
        </div>
        <div style={{ background: UP.brandBg, border: `1px solid ${UP.brandLine}`, borderRadius: 12, padding: 'clamp(14px, 2vw, 18px)' }}>
          <div className="text-a10" style={{ color: UP.strong, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💎 평균 퇴직금</div>
          <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.6rem)', fontWeight: 800, color: UP.strong, ...numeric }}>{fmtMoney(avgSeverance)}</div>
          <div className="text-a10" style={{ color: UP.sub, marginTop: 3 }}>적격자 기준</div>
        </div>
      </div>

      {/* 일별 트렌드 차트 */}
      {dailyData.length > 1 && (
        <div style={{ ...CARD_PAD, marginBottom: 12 }}>
          <p className="text-a13" style={{ fontWeight: 700, color: UP.navy, marginBottom: 14 }}>일별 계산 추이</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="calc-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={UP.brand} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={UP.brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: UP.caption }} />
              <YAxis tick={{ fontSize: 10, fill: UP.caption }} />
              <Tooltip
                contentStyle={{ background: UP.surface, border: `1px solid ${UP.hair}`, borderRadius: 10, fontSize: 11 }}
                formatter={(v: number) => [`${v}건`, '계산']}
              />
              <Area type="monotone" dataKey="count" stroke={UP.brand} fill="url(#calc-grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 퇴직금 구간 분포 */}
      <div style={CARD_PAD}>
        <p className="text-a13" style={{ fontWeight: 700, color: UP.navy, marginBottom: 14 }}>퇴직금 구간 분포</p>
        {severanceReports.length === 0 ? (
          <p className="text-a13" style={{ color: UP.sub, textAlign: 'center', padding: '20px 0' }}>퇴직금 계산 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rangeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: UP.caption }} />
              <YAxis tick={{ fontSize: 10, fill: UP.caption }} />
              <Tooltip
                contentStyle={{ background: UP.surface, border: `1px solid ${UP.hair}`, borderRadius: 10, fontSize: 11 }}
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

// (P3-b) 공용 cardBox 참조 — radius 16 통일. 로컬 중복 정의 제거.
const CARD: React.CSSProperties = cardBox
const CARD_PAD: React.CSSProperties = { ...CARD, padding: 'clamp(14px, 3vw, 20px)' }

function rangeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 8,
    border: `1px solid ${active ? UP.brand : UP.hair}`,
    background: active ? UP.brandBg : UP.surface,
    color: active ? UP.strong : UP.sub,
    fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
  }
}

const iconBtn: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`,
  background: UP.surface, color: UP.sub, fontSize: '0.82rem', cursor: 'pointer',
}

const excelBtn: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 8, border: `1px solid ${UP.greenLine}`,
  background: UP.greenBg, color: UP.green, fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: UP.brand, color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
