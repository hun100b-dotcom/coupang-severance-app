// ServerLogsMenu.tsx — 서버/시스템 로그
// system_logs 테이블: 배포, 마이그레이션, 오류, 보안 이벤트 자동 기록
import { useCallback, useEffect, useState } from 'react'
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

declare const __APP_VERSION__: string

const TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  DEPLOY:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'DEPLOY'    },
  FIX:       { color: '#f08c00', bg: 'rgba(240,140,0,0.12)',   label: 'FIX'       },
  ERROR:     { color: '#f04040', bg: 'rgba(240,64,64,0.12)',   label: 'ERROR'     },
  SECURITY:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'SECURITY'  },
  MIGRATION: { color: '#00c48c', bg: 'rgba(0,196,140,0.12)',   label: 'MIGRATION' },
  INFO:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'INFO'      },
  WARNING:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'WARNING'   },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const PAGE_SIZE = 30
const ACTION_OPTIONS = ['', 'inquiry.answer', 'inquiry.status', 'settings.update', 'ip.block', 'ip.unblock', 'template.create', 'template.delete']

export default function ServerLogsMenu() {
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>('system')

  // ── System Logs (system_logs 테이블)
  const [sysLogs, setSysLogs] = useState<SystemLog[]>([])
  const [sysTotal, setSysTotal] = useState(0)
  const [sysPage, setSysPage] = useState(1)
  const [sysTypeFilter, setSysTypeFilter] = useState('')
  const [sysLoading, setSysLoading] = useState(false)

  // ── Audit Logs (audit_logs 백엔드)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditAction, setAuditAction] = useState('')
  const [auditStart, setAuditStart] = useState('')
  const [auditEnd, setAuditEnd] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)

  // ── 앱 버전 자동 감지 → 신규 배포 시 system_logs에 자동 기록
  useEffect(() => {
    if (!supabase) return
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : null
    if (!currentVersion) return
    ;(async () => {
      try {
        // 최신 DEPLOY 로그의 버전과 비교
        const { data: latest } = await supabase
          .from('system_logs')
          .select('app_version')
          .eq('type', 'DEPLOY')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (latest?.app_version !== currentVersion) {
          // 새 배포 감지 → 자동 기록
          await supabase.from('system_logs').insert({
            type: 'DEPLOY',
            title: `새 버전 배포 감지: ${currentVersion}`,
            detail: { auto: 'true', prev_version: latest?.app_version ?? 'unknown' },
            app_version: currentVersion,
            created_by: 'auto-detect',
          })
        }
      } catch { /* 조용히 무시 */ }
    })()
  }, [])

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
  const totalAuditPages = Math.ceil(auditTotal / 50)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>🖥️ Server Logs</h2>
          <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            배포 이력 · 시스템 이벤트 · 관리자 작업 로그
          </p>
        </div>
        <button
          onClick={() => activeTab === 'system' ? loadSysLogs() : loadAuditLogs()}
          style={{ marginLeft: 'auto', ...outlineBtn }}
        >
          ↻ 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'system', label: '🔧 시스템 / 배포 로그' },
          { key: 'audit',  label: '📋 관리자 작업 로그'   },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as 'system' | 'audit')} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? '#3182f6' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 시스템 로그 탭 ── */}
      {activeTab === 'system' && (
        <>
          {/* 타입 필터 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <select value={sysTypeFilter} onChange={e => { setSysTypeFilter(e.target.value); setSysPage(1) }} style={selectSt}>
              <option value="">전체 타입</option>
              {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {sysTypeFilter && (
              <button onClick={() => { setSysTypeFilter(''); setSysPage(1) }} style={outlineBtn}>초기화</button>
            )}
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginLeft: 'auto' }}>
              총 {sysTotal}건
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            {/* 컬럼 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px 90px', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>타입</span><span>내용</span><span>버전</span><span>일시</span>
            </div>

            {sysLoading ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로딩 중...</p>
            ) : sysLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로그 없음</p>
            ) : sysLogs.map(log => {
              const meta = TYPE_META[log.type] ?? TYPE_META.INFO
              return (
                <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px 90px', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'start' }}>
                  <span style={{ padding: '2px 6px', borderRadius: 999, fontSize: '0.63rem', fontWeight: 700, color: meta.color, background: meta.bg, textAlign: 'center', width: 'fit-content' }}>
                    {meta.label}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.4 }}>{log.title}</div>
                    {log.detail?.desc && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{log.detail.desc}</div>
                    )}
                    {log.created_by && log.created_by !== 'system' && (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>by {log.created_by}</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: log.app_version ? '#60a5fa' : 'rgba(255,255,255,0.25)' }}>
                    {log.app_version ?? '—'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{fmtDate(log.created_at)}</span>
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
