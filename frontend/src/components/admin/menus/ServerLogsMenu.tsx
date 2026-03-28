// ServerLogsMenu.tsx — 서버/시스템 로그 (실시간 연동)
// system_logs: DB 트리거 기반 자동 기록 + Supabase Realtime 구독
import { useCallback, useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { getAuditLogs } from '../../../lib/api'
import type { AuditLog } from '../../../types/admin'
import AuditLogTable from '../logs/AuditLogTable'

interface SystemLog {
  id: string
  type: string
  title: string
  detail: Record<string, string> | null
  app_version: string | null
  created_by: string | null
  created_at: string
}

const TYPE_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  DEPLOY:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'DEPLOY',    icon: '🚀' },
  FIX:       { color: '#f08c00', bg: 'rgba(240,140,0,0.12)',   label: 'FIX',       icon: '🔧' },
  ERROR:     { color: '#f04040', bg: 'rgba(240,64,64,0.12)',   label: 'ERROR',     icon: '❌' },
  SECURITY:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'SECURITY',  icon: '🔒' },
  MIGRATION: { color: '#00c48c', bg: 'rgba(0,196,140,0.12)',   label: 'MIGRATION', icon: '📦' },
  INFO:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'INFO',      icon: 'ℹ️' },
  WARNING:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'WARNING',   icon: '⚠️' },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 10) return '방금 전'
  if (secs < 60) return `${secs}초 전`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return fmtDate(iso)
}

const PAGE_SIZE = 30
const ACTION_OPTIONS = ['', 'inquiry.answer', 'inquiry.status', 'settings.update', 'ip.block', 'ip.unblock', 'template.create', 'template.delete']

export default function ServerLogsMenu() {
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>('system')

  // ── System Logs
  const [sysLogs, setSysLogs] = useState<SystemLog[]>([])
  const [sysTotal, setSysTotal] = useState(0)
  const [sysPage, setSysPage] = useState(1)
  const [sysTypeFilter, setSysTypeFilter] = useState('')
  const [sysLoading, setSysLoading] = useState(false)
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set())
  const [isLive, setIsLive] = useState(true)

  // ── Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditAction, setAuditAction] = useState('')
  const [auditStart, setAuditStart] = useState('')
  const [auditEnd, setAuditEnd] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)

  // ── Supabase Realtime 구독 (system_logs INSERT)
  useEffect(() => {
    if (!supabase || !isLive) return

    const channel = supabase
      .channel('system_logs_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_logs' },
        (payload) => {
          const newLog = payload.new as SystemLog
          // 첫 페이지이고 필터에 맞으면 실시간 삽입
          if (sysPage === 1 && (!sysTypeFilter || newLog.type === sysTypeFilter)) {
            setSysLogs(prev => [newLog, ...prev].slice(0, PAGE_SIZE))
            setSysTotal(prev => prev + 1)
            // 새 로그 하이라이트 (3초 후 제거)
            setNewLogIds(prev => new Set(prev).add(newLog.id))
            setTimeout(() => {
              setNewLogIds(prev => {
                const next = new Set(prev)
                next.delete(newLog.id)
                return next
              })
            }, 3000)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isLive, sysPage, sysTypeFilter])

  // ── System Logs 로드
  const loadSysLogs = useCallback(async () => {
    if (!supabase) return
    setSysLoading(true)
    try {
      let q = supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((sysPage - 1) * PAGE_SIZE, sysPage * PAGE_SIZE - 1)
      if (sysTypeFilter) q = q.eq('type', sysTypeFilter)
      const { data, count } = await q
      setSysLogs(data ?? [])
      setSysTotal(count ?? 0)
    } catch { /* silent */ }
    finally { setSysLoading(false) }
  }, [sysPage, sysTypeFilter])

  // ── Audit Logs 로드
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res = await getAuditLogs({ page: auditPage, limit: 50, action: auditAction, start: auditStart, end: auditEnd })
      setAuditLogs(res.logs ?? [])
      setAuditTotal(res.total ?? 0)
    } catch { /* silent */ }
    finally { setAuditLoading(false) }
  }, [auditPage, auditAction, auditStart, auditEnd])

  useEffect(() => { if (activeTab === 'system') loadSysLogs() }, [activeTab, loadSysLogs])
  useEffect(() => { if (activeTab === 'audit') loadAuditLogs() }, [activeTab, loadAuditLogs])

  const totalSysPages = Math.ceil(sysTotal / PAGE_SIZE)

  // 타입별 카운트
  const typeCounts = sysLogs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Server Logs</h2>
          <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            배포 이력 · 시스템 이벤트 · 관리자 작업 로그
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* 실시간 토글 */}
          <button
            onClick={() => setIsLive(prev => !prev)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.73rem', fontWeight: 700,
              background: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              color: isLive ? '#22c55e' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: isLive ? '#22c55e' : 'rgba(255,255,255,0.3)',
              marginRight: 5, verticalAlign: 'middle',
              animation: isLive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
          <button
            onClick={() => activeTab === 'system' ? loadSysLogs() : loadAuditLogs()}
            style={{ ...outlineBtn }}
          >
            ↻ 새로고침
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'system', label: '시스템 / 배포 로그', icon: '🔧' },
          { key: 'audit',  label: '관리자 작업 로그',   icon: '📋' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as 'system' | 'audit')} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? '#3182f6' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── 시스템 로그 탭 ── */}
      {activeTab === 'system' && (
        <>
          {/* 필터 + 통계 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <select value={sysTypeFilter} onChange={e => { setSysTypeFilter(e.target.value); setSysPage(1) }} style={selectSt}>
              <option value="">전체 타입</option>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
            </select>
            {sysTypeFilter && (
              <button onClick={() => { setSysTypeFilter(''); setSysPage(1) }} style={outlineBtn}>초기화</button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* 타입별 뱃지 */}
              {Object.entries(typeCounts).map(([type, count]) => {
                const meta = TYPE_META[type] ?? TYPE_META.INFO
                return (
                  <span key={type} style={{
                    fontSize: '0.62rem', fontWeight: 700, color: meta.color,
                    background: meta.bg, padding: '2px 6px', borderRadius: 99,
                  }}>
                    {type} {count}
                  </span>
                )
              })}
              <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)' }}>
                총 {sysTotal}건
              </span>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* 컬럼 헤더 */}
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '80px 1fr 80px 140px',
              gap: 8, padding: '8px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.68rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <span>타입</span><span>내용</span><span>버전</span><span>일시</span>
            </div>

            {sysLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)',
                  borderTopColor: '#3182f6', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>로딩 중...</p>
              </div>
            ) : sysLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로그 없음</p>
            ) : sysLogs.map(log => {
              const meta = TYPE_META[log.type] ?? TYPE_META.INFO
              const isNew = newLogIds.has(log.id)
              const source = log.created_by
              const sourceLabel = source?.startsWith('trigger:') ? source.replace('trigger:', '') + ' 트리거' :
                                  source === 'auto-detect' ? '자동감지' :
                                  source === 'system' ? '' : source

              return (
                <div key={log.id}>
                  {/* PC 행 */}
                  <div className="hidden md:grid" style={{
                    gridTemplateColumns: '80px 1fr 80px 140px',
                    gap: 8, padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'start',
                    background: isNew ? 'rgba(34,197,94,0.06)' : 'transparent',
                    transition: 'background 0.5s',
                  }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6,
                      fontSize: '0.65rem', fontWeight: 700,
                      color: meta.color, background: meta.bg,
                      textAlign: 'center', width: 'fit-content',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      {meta.icon} {meta.label}
                    </span>
                    <div>
                      <div style={{
                        fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)',
                        fontWeight: 500, lineHeight: 1.4,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {log.title}
                        {isNew && (
                          <span style={{
                            fontSize: '0.58rem', fontWeight: 800,
                            color: '#22c55e', background: 'rgba(34,197,94,0.15)',
                            padding: '1px 5px', borderRadius: 4,
                          }}>NEW</span>
                        )}
                      </div>
                      {log.detail?.desc && (
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{log.detail.desc}</div>
                      )}
                      {sourceLabel && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>via {sourceLabel}</div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: log.app_version ? '#60a5fa' : 'rgba(255,255,255,0.2)' }}>
                      {log.app_version ?? '—'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}
                      title={fmtDate(log.created_at)}>
                      {fmtRelative(log.created_at)}
                    </span>
                  </div>

                  {/* 모바일 카드 */}
                  <div className="md:hidden" style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isNew ? 'rgba(34,197,94,0.06)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        color: meta.color, background: meta.bg,
                        padding: '2px 6px', borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        {meta.icon} {meta.label}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{fmtRelative(log.created_at)}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.4 }}>
                      {log.title}
                      {isNew && <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#22c55e', marginLeft: 6 }}>NEW</span>}
                    </div>
                    {log.detail?.desc && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{log.detail.desc}</div>
                    )}
                    {log.app_version && (
                      <span style={{ fontSize: '0.68rem', color: '#60a5fa', marginTop: 2, display: 'inline-block' }}>{log.app_version}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 페이지네이션 */}
          {totalSysPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <button onClick={() => setSysPage(p => Math.max(1, p - 1))} disabled={sysPage === 1} style={outlineBtn}>‹</button>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', alignSelf: 'center' }}>{sysPage} / {totalSysPages}</span>
              <button onClick={() => setSysPage(p => Math.min(totalSysPages, p + 1))} disabled={sysPage === totalSysPages} style={outlineBtn}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── 관리자 작업 로그 탭 ── */}
      {activeTab === 'audit' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <select value={auditAction} onChange={e => { setAuditAction(e.target.value); setAuditPage(1) }} style={selectSt}>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a || '전체 액션'}</option>)}
            </select>
            <input type="date" value={auditStart} onChange={e => { setAuditStart(e.target.value); setAuditPage(1) }} style={selectSt} />
            <input type="date" value={auditEnd} onChange={e => { setAuditEnd(e.target.value); setAuditPage(1) }} style={selectSt} />
            <button onClick={() => { setAuditAction(''); setAuditStart(''); setAuditEnd(''); setAuditPage(1) }} style={outlineBtn}>초기화</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, overflow: 'hidden' }}>
            {auditLoading ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로딩 중...</p>
            ) : (
              <AuditLogTable logs={auditLogs} total={auditTotal} page={auditPage} onPageChange={setAuditPage} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer',
}
const selectSt: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '6px 10px',
  fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)',
  outline: 'none', cursor: 'pointer',
}
