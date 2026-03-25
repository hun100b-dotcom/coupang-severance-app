// ServerLogsMenu.tsx — 서버 로그 (배포, 오류, 시스템 이벤트)
import { useCallback, useEffect, useState } from 'react'
import { getAuditLogs } from '../../../lib/api'
import type { AuditLog } from '../../../types/admin'
import AuditLogTable from '../logs/AuditLogTable'

// 서버 로그 = 관리자 액션 로그 (audit_logs 백엔드 테이블)
// 배포/업데이트 이력은 아래 DEPLOY_LOG에서 수동 관리
const DEPLOY_LOG = [
  { date: '2026-03-26', type: 'DEPLOY', desc: '어드민 대시보드 모바일 최적화, 회원 마스킹, 권한 관리 기능 추가 (v2.5)' },
  { date: '2026-03-25', desc: '공지사항 배너 + 팝업 CMS 연동, 레이아웃 TopNav/BottomNav 통합 (v2.4)', type: 'DEPLOY' },
  { date: '2026-03-20', desc: 'Server Logs / Audit Logs 분리, 슈퍼어드민 접근제한 적용 (v2.3)', type: 'DEPLOY' },
  { date: '2026-03-15', desc: '어드민 공지사항 CRUD, 회원관리 소셜 프로바이더 표시 (v2.2)', type: 'DEPLOY' },
  { date: '2026-03-10', desc: '어드민 401 오류 수정, PostgREST 206 대응, 클릭 카운터 Supabase URL 검증 (v2.1)', type: 'FIX' },
  { date: '2026-03-01', desc: '주휴수당·연차수당·나의혜택 페이지 글래스모피즘 리디자인 (v2.0)', type: 'DEPLOY' },
]

const ACTION_OPTIONS = [
  '', 'inquiry.answer', 'inquiry.status', 'settings.update',
  'ip.block', 'ip.unblock', 'template.create', 'template.delete',
]

export default function ServerLogsMenu() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'system' | 'deploy'>('system')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs({ page, limit: 50, action, start, end })
      setLogs(res.logs ?? [])
      setTotal(res.total ?? 0)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, action, start, end])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>🖥️ Server Logs</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>시스템 이벤트 · 관리자 작업 로그 · 배포 이력</p>
        </div>
        <button onClick={load} style={{ marginLeft: 'auto', ...outlineBtn }}>↻ 새로고침</button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ key: 'system', label: '🔧 시스템 작업 로그' }, { key: 'deploy', label: '🚀 배포/업데이트 이력' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as 'system' | 'deploy')} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? '#3182f6' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'system' && (
        <>
          {/* 필터 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }} style={selectSt}>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a || '전체 액션'}</option>)}
            </select>
            <input type="date" value={start} onChange={e => { setStart(e.target.value); setPage(1) }} style={selectSt} />
            <input type="date" value={end} onChange={e => { setEnd(e.target.value); setPage(1) }} style={selectSt} />
            <button onClick={() => { setAction(''); setStart(''); setEnd(''); setPage(1) }} style={outlineBtn}>초기화</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, overflow: 'hidden' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로딩 중...</p>
            ) : (
              <AuditLogTable logs={logs} total={total} page={page} onPageChange={setPage} />
            )}
          </div>
        </>
      )}

      {activeTab === 'deploy' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            배포/업데이트 이력 (최신순)
          </div>
          {DEPLOY_LOG.map((entry, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginTop: 1,
                color: entry.type === 'FIX' ? '#f08c00' : '#22c55e',
                background: entry.type === 'FIX' ? 'rgba(240,140,0,0.12)' : 'rgba(34,197,94,0.12)',
              }}>{entry.type}</span>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 500, lineHeight: 1.5 }}>{entry.desc}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer' }
const selectSt: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', outline: 'none', cursor: 'pointer' }
