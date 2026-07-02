// ============================================================
// SecurityMenu — 보안 현황 대시보드 (신규)
//   - 슈퍼관리자 전용 권장. "읽기 전용"으로만 동작합니다(쓰기/변경 없음).
//   - 데이터는 모두 기존 테이블/엔드포인트에서 그대로 읽어옵니다:
//       · 관리자 수·역할 분포  → supabase.admin_accounts (role, is_active)
//       · 차단 IP 수            → GET /admin/blocked-ips
//       · 마스킹 키 설정 여부   → GET /admin/members/unmask-key/status
//       · 최근 감사로그 N건     → GET /admin/logs
//       · 최근 마스킹 해제 이력 → GET /admin/logs?action=unmask_members
//   - 모든 호출은 try/catch 로 감싸 실패해도 콘솔 오염/화면 깨짐이 없습니다.
//   - ⚠️ 보안 로직(권한/RLS/CRUD/감사)은 일절 건드리지 않습니다. 이 화면은 "보기"만 합니다.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { getAuditLogs, getBlockedIps, getUnmaskKeyStatus } from '../../../lib/api'
import { UP, numeric, adminCard, btnSecondary, badge } from '../shared/adminTheme'
import { PageHead } from '../ds/DSKit'

// 감사로그 한 행(필요한 필드만)
interface AuditRow {
  id: string
  admin_email: string
  action: string
  target_type: string | null
  created_at: string
}

// 역할 라벨/색 매핑 (사이드바 권한 레벨과 톤 일치)
const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: '슈퍼 관리자', color: UP.danger }, // (P5) 리터럴 #e11d48 → 팔레트 위험톤 토큰
  admin:       { label: '관리자',      color: UP.brand },
  viewer:      { label: '뷰어',        color: UP.sub },
}

// 액션 → 한글 라벨 (감사로그 메뉴와 동일 규칙)
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'admin.login': '관리자 접속',
    'admin.view_members': '회원 관리 조회',
    'admin.view_settings': '설정 조회',
    'admin.view_logs': '로그 조회',
    'unmask_members': '마스킹 해제',
    'update_settings': '설정 변경',
    'settings.update': '설정 변경',
    'create_account': '계정 생성',
    'update_account': '계정 수정',
    'delete_account': '계정 삭제',
    'ip.block': 'IP 차단',
    'ip.unblock': 'IP 해제',
    'answer_inquiry': '문의 답변',
    'delete_inquiry': '문의 삭제',
    'create_notice': '공지 생성',
    'update_notice': '공지 수정',
    'delete_notice': '공지 삭제',
  }
  return map[action] ?? action
}

// 상대시간 표기
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function SecurityMenu() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 집계 상태
  const [adminTotal, setAdminTotal] = useState(0)
  const [adminActive, setAdminActive] = useState(0)
  const [roleDist, setRoleDist] = useState<Record<string, number>>({})
  const [blockedIpCount, setBlockedIpCount] = useState<number | null>(null)
  const [maskKey, setMaskKey] = useState<{ configured: boolean; updated_at: string | null } | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditRow[]>([])
  const [unmaskLogs, setUnmaskLogs] = useState<AuditRow[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const errs: string[] = []

    // 1) 관리자 수 + 역할 분포 (admin_accounts 읽기)
    try {
      if (supabase) {
        const { data, error: e } = await supabase
          .from('admin_accounts')
          .select('role, is_active')
        if (e) throw e
        const rows = data ?? []
        setAdminTotal(rows.length)
        setAdminActive(rows.filter(r => r.is_active).length)
        const dist: Record<string, number> = {}
        rows.forEach(r => { const k = r.role ?? 'unknown'; dist[k] = (dist[k] ?? 0) + 1 })
        setRoleDist(dist)
      }
    } catch { errs.push('관리자 명단') }

    // 2) 차단 IP 수
    try {
      const res = await getBlockedIps()
      const list = Array.isArray(res) ? res : (res?.blocked_ips ?? [])
      setBlockedIpCount(list.length)
    } catch { errs.push('차단 IP'); setBlockedIpCount(null) }

    // 3) 마스킹 키 설정 여부
    try {
      const status = await getUnmaskKeyStatus()
      setMaskKey(status)
    } catch { errs.push('마스킹 키'); setMaskKey(null) }

    // 4) 최근 감사로그 8건
    try {
      const res = await getAuditLogs({ page: 1, limit: 8 })
      setRecentLogs((res?.logs ?? []) as AuditRow[])
    } catch { errs.push('감사로그') }

    // 5) 최근 마스킹 해제 이력 5건
    try {
      const res = await getAuditLogs({ page: 1, limit: 5, action: 'unmask_members' })
      setUnmaskLogs((res?.logs ?? []) as AuditRow[])
    } catch { errs.push('마스킹 해제 이력') }

    if (errs.length > 0) setError(`일부 데이터를 불러오지 못했습니다: ${errs.join(', ')}`)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── KPI 4종 정의 ──
  const kpis: { label: string; value: string; sub: string; color: string; icon: string }[] = [
    { label: '관리자 계정', value: String(adminTotal), sub: `활성 ${adminActive} / 비활성 ${Math.max(0, adminTotal - adminActive)}`, color: UP.brand, icon: '🔑' },
    { label: '차단 IP', value: blockedIpCount === null ? '–' : String(blockedIpCount), sub: blockedIpCount === null ? '조회 실패' : '현재 차단 중', color: UP.danger, icon: '🚫' },
    { label: '마스킹 키', value: maskKey?.configured ? '설정됨' : '미설정', sub: maskKey?.configured ? `변경 ${fmtDate(maskKey.updated_at)}` : 'PII 해제 키 미등록', color: maskKey?.configured ? UP.green : UP.amber, icon: '🔐' },
    { label: '최근 마스킹 해제', value: String(unmaskLogs.length), sub: unmaskLogs[0] ? `최근 ${fmtRelative(unmaskLogs[0].created_at)}` : '기록 없음', color: unmaskLogs.length > 0 ? UP.amber : UP.green, icon: '👁️' },
  ]

  // ── 보안 점검 체크리스트(참고) — 라이브 데이터로 판정 가능한 항목만 ──
  const checks: { label: string; ok: boolean; note: string }[] = [
    { label: '마스킹 해제 키 등록', ok: !!maskKey?.configured, note: maskKey?.configured ? '서버 해시 보관' : '설정 메뉴에서 등록 필요' },
    { label: '활성 관리자 존재', ok: adminActive > 0, note: `활성 ${adminActive}명` },
    { label: '감사로그 수집', ok: recentLogs.length > 0, note: recentLogs.length > 0 ? '최근 활동 기록됨' : '최근 기록 없음' },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHead
        icon="🛡️"
        title="보안 현황"
        subtitle="관리자·접근통제·마스킹·감사 활동 요약 (읽기 전용)"
        actions={
          <button onClick={fetchAll} style={btnSecondary}>↻ 새로고침</button>
        }
      />

      {/* 일부 조회 실패 안내 */}
      {error && (
        <div className="text-a13" style={{
          background: UP.amberBg, border: `1px solid ${UP.amberLine}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          color: UP.amber, fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-a14" style={{ padding: '60px 0', textAlign: 'center', color: UP.sub, }}>
          보안 현황 로딩 중...
        </div>
      ) : (
        <>
          {/* ── KPI 카드 그리드 ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginBottom: 20,
          }}>
            {kpis.map(k => (
              <div key={k.label} style={{ ...adminCard, padding: 'clamp(14px,2.5vw,18px)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: -12, right: -12, width: 60, height: 60, borderRadius: '50%',
                  background: `radial-gradient(circle, ${k.color}18 0%, transparent 70%)`, pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="text-a10" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: UP.sub, marginBottom: 8 }}>{k.label}</p>
                    <p style={{ fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 800, color: k.color, lineHeight: 1.1, ...numeric }}>{k.value}</p>
                    <p className="text-a10" style={{ color: UP.caption, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</p>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="text-a16" style={{ lineHeight: 1 }}>{k.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── 2열 그리드: 역할 분포 + 보안 점검 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
            {/* 역할 분포 */}
            <section style={{ ...adminCard, padding: 18 }}>
              <h3 style={sectionTitle}>관리자 역할 분포</h3>
              {adminTotal === 0 ? (
                <p style={emptyText}>등록된 관리자 계정이 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {Object.entries(roleDist).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                    const meta = ROLE_META[role] ?? { label: role, color: UP.sub }
                    const pct = adminTotal > 0 ? Math.round((count / adminTotal) * 100) : 0
                    return (
                      <div key={role}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span className="text-a13" style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
                          <span className="text-a12" style={{ color: UP.sub, ...numeric }}>{count}명 · {pct}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: UP.sunken, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 999, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 보안 점검 체크리스트 */}
            <section style={{ ...adminCard, padding: 18 }}>
              <h3 style={sectionTitle}>보안 점검 체크리스트</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {checks.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: UP.sunken }}>
                    <span className="text-a11" style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: c.ok ? UP.greenBg : UP.amberBg, color: c.ok ? UP.green : UP.amber,
                      border: `1px solid ${c.ok ? UP.greenLine : UP.amberLine}`,
                    }}>{c.ok ? '✓' : '!'}</span>
                    <span className="text-a13" style={{ flex: 1, fontWeight: 600, color: UP.body }}>{c.label}</span>
                    <span className="text-a11" style={{ color: UP.caption }}>{c.note}</span>
                  </div>
                ))}
              </div>
              <p className="text-a11" style={{ color: UP.caption, marginTop: 10, lineHeight: 1.5 }}>
                ※ 라이브 데이터 기반 요약입니다. 상세 점검·변경은 각 메뉴(설정·관리자 계정·회원 관리)에서 진행하세요.
              </p>
            </section>
          </div>

          {/* ── 최근 마스킹 해제 이력 ── */}
          <section style={{ ...adminCard, padding: 18, marginBottom: 20 }}>
            <h3 style={sectionTitle}>최근 마스킹 해제 이력</h3>
            {unmaskLogs.length === 0 ? (
              <p style={emptyText}>최근 마스킹 해제 기록이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {unmaskLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: UP.amberBg, border: `1px solid ${UP.amberLine}` }}>
                    <span className="text-a15">👁️</span>
                    <span className="text-a13" style={{ flex: 1, color: UP.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.admin_email}</span>
                    <span className="text-a11" style={{ color: UP.sub }}>{fmtRelative(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 최근 감사 활동 ── */}
          <section style={{ ...adminCard, padding: 18 }}>
            <h3 style={sectionTitle}>최근 감사 활동</h3>
            {recentLogs.length === 0 ? (
              <p style={emptyText}>최근 감사 활동 기록이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
                {recentLogs.map((log, i) => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px',
                    borderTop: i === 0 ? 'none' : `1px solid ${UP.hairSoft}`,
                  }}>
                    <span style={{ ...badge('brand'), whiteSpace: 'nowrap' }}>{actionLabel(log.action)}</span>
                    <span className="text-a13" style={{ flex: 1, color: UP.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.admin_email}</span>
                    {log.target_type && <span className="text-a11" style={{ color: UP.caption }}>{log.target_type}</span>}
                    <span className="text-a11" style={{ color: UP.sub, whiteSpace: 'nowrap' }}>{fmtRelative(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: '0.92rem', fontWeight: 700, color: UP.navy, margin: 0,
}
const emptyText: React.CSSProperties = {
  fontSize: '0.82rem', color: UP.sub, textAlign: 'center', padding: '20px 0', margin: 0,
}
