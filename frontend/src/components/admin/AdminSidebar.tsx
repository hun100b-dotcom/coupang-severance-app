// 어드민 사이드바 — 라이트 모드 / 캐치퀀트봇 스타일
// 흰 배경 + slate-200 테두리 + 파란 액티브 left-border
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { UP, numeric } from './shared/adminTheme'

export type AdminMenu =
  | 'dashboard' | 'target'
  | 'job_postings' | 'applicants' | 'confirmed' | 'recruit_summary'
  | 'inquiries' | 'notices' | 'members' | 'accounts'
  | 'settings' | 'audit_logs' | 'server_logs'

export const SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'

interface MenuItem {
  key: AdminMenu
  icon: string
  label: string
  superOnly?: boolean
  badge?: boolean
}

interface MenuGroup {
  groupKey: string
  groupLabel: string
  groupIcon: string
  singleMenu?: AdminMenu
  children?: MenuItem[]
  defaultOpen?: boolean
}

const MENU_TREE: MenuGroup[] = [
  {
    groupKey: 'dashboard-group',
    groupLabel: '대시보드',
    groupIcon: '📊',
    singleMenu: 'dashboard',
  },
  {
    groupKey: 'recruit-group',
    groupLabel: '채용 및 인원 관리',
    groupIcon: '👥',
    defaultOpen: true,
    children: [
      { key: 'job_postings',    icon: '💼', label: '채용공고' },
      { key: 'applicants',      icon: '📋', label: '지원자' },
      { key: 'confirmed',       icon: '📈', label: '채용현황' },
      { key: 'recruit_summary', icon: '📊', label: 'Summary' },
    ],
  },
  {
    groupKey: 'content-group',
    groupLabel: '콘텐츠 관리',
    groupIcon: '📋',
    children: [
      { key: 'notices',   icon: '📢', label: '공지사항' },
      { key: 'inquiries', icon: '💬', label: '문의', badge: true },
    ],
  },
  {
    groupKey: 'system-group',
    groupLabel: '시스템',
    groupIcon: '⚙️',
    children: [
      { key: 'target',      icon: '🎯', label: 'Target' },
      { key: 'members',     icon: '👥', label: '회원 관리' },
      { key: 'accounts',    icon: '🔑', label: '관리자 계정' },
      { key: 'server_logs', icon: '🖥️', label: '서버 로그' },
      { key: 'audit_logs',  icon: '🔍', label: 'Audit Logs', superOnly: true },
      { key: 'settings',    icon: '⚙️', label: '설정' },
    ],
  },
]

interface PermLevel { label: string; color: string; permissions: Record<string, boolean> }

const DEFAULT_PERMS: Record<string, PermLevel> = {
  super_admin: {
    label: '슈퍼 관리자', color: '#e11d48',
    permissions: {
      dashboard: true, target: true,
      job_postings: true, applicants: true, confirmed: true, recruit_summary: true,
      inquiries: true, notices: true, members: true, accounts: true,
      settings: true, audit_logs: true, server_logs: true,
    },
  },
  admin: {
    label: '관리자', color: '#3182f6',
    permissions: {
      dashboard: true, target: true,
      job_postings: true, applicants: true, confirmed: true, recruit_summary: true,
      inquiries: true, notices: true, members: true, accounts: false,
      settings: false, audit_logs: false, server_logs: false,
    },
  },
}

interface Props {
  active: AdminMenu
  onChange: (menu: AdminMenu) => void
  adminEmail: string
  isSuperAdmin: boolean
  onLogout: () => void
}

export default function AdminSidebar({ active, onChange, adminEmail, isSuperAdmin, onLogout }: Props) {
  const [waitingCount, setWaitingCount] = useState(0)
  const [permLevels, setPermLevels] = useState<Record<string, PermLevel>>(DEFAULT_PERMS)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    MENU_TREE.forEach(g => { init[g.groupKey] = g.defaultOpen ?? false })
    return init
  })

  // 문의 대기 건수 실시간 구독
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const fetch = async () => {
      const { count } = await sb
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
      setWaitingCount(count ?? 0)
    }
    fetch()
    const channel = sb
      .channel('admin-sidebar-inquiries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetch)
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'permission_levels')
          .single()
        if (data?.value) setPermLevels({ ...DEFAULT_PERMS, ...JSON.parse(data.value) })
      } catch { /* 기본값 유지 */ }
    })()
  }, [])

  const currentRole = isSuperAdmin ? 'super_admin' : 'admin'
  const currentRoleLabel = permLevels[currentRole]?.label
  const currentRoleColor = permLevels[currentRole]?.color ?? '#3182f6'

  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  // 활성 메뉴가 속한 그룹 자동 열기
  useEffect(() => {
    MENU_TREE.forEach(group => {
      if (group.children?.some(c => c.key === active)) {
        setOpenGroups(prev => ({ ...prev, [group.groupKey]: true }))
      }
    })
  }, [active])

  return (
    <aside style={{
      width: 232,
      minHeight: '100vh',
      background: UP.surface,
      borderRight: `1px solid ${UP.hair}`,  // 헤어라인 구분선
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>

      {/* ── 로고 + 프로필 ── */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${UP.hairSoft}`,
      }}>
        {/* CATCH Admin 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: '0.65rem', color: UP.caption, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Admin OS
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: UP.navy, letterSpacing: '-0.02em', lineHeight: 1 }}>
              CATCH
            </div>
          </div>
        </div>

        {/* 이메일 */}
        <div style={{
          fontSize: '0.7rem',
          color: UP.sub,
          wordBreak: 'break-all',
          lineHeight: 1.4,
          marginBottom: 6,
        }}>
          {adminEmail}
        </div>

        {/* 역할 뱃지 */}
        {currentRoleLabel && (
          <span style={{
            display: 'inline-block',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: currentRoleColor,
            background: `${currentRoleColor}14`,
            border: `1px solid ${currentRoleColor}33`,
            padding: '2px 8px',
            borderRadius: 999,
          }}>
            ✦ {currentRoleLabel}
          </span>
        )}
      </div>

      {/* ── 아코디언 메뉴 트리 ── */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {MENU_TREE.map(group => {
          const isOpen = openGroups[group.groupKey]

          // 단일 메뉴 (대시보드)
          if (group.singleMenu) {
            const isActive = active === group.singleMenu
            return (
              <button
                key={group.groupKey}
                onClick={() => onChange(group.singleMenu!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 2,
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? UP.brandBg : 'transparent',
                  color: isActive ? UP.strong : UP.body,
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s',
                  position: 'relative',
                  // 활성 시 왼쪽 파란 바
                  borderLeft: isActive ? `3px solid ${UP.brand}` : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{group.groupIcon}</span>
                <span style={{ flex: 1 }}>{group.groupLabel}</span>
              </button>
            )
          }

          // 아코디언 그룹
          return (
            <div key={group.groupKey} style={{ marginBottom: 2 }}>
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggleGroup(group.groupKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: UP.caption,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'color 0.12s',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{group.groupIcon}</span>
                <span style={{ flex: 1 }}>{group.groupLabel}</span>
                <span style={{
                  fontSize: '0.6rem',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  display: 'inline-block',
                  color: UP.caption,
                }}>▾</span>
              </button>

              {/* 자식 메뉴 */}
              {isOpen && (
                <div style={{ paddingLeft: 6, marginTop: 1, marginBottom: 4 }}>
                  {group.children?.map(item => {
                    const isActive = active === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => onChange(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          marginBottom: 1,
                          borderRadius: 8,
                          border: 'none',
                          background: isActive ? UP.brandBg : 'transparent',
                          color: isActive ? UP.strong : UP.sub,
                          fontSize: '0.845rem',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.12s',
                          position: 'relative',
                          borderLeft: isActive ? `3px solid ${UP.brand}` : '3px solid transparent',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>

                        {/* 문의 대기 배지 */}
                        {item.badge && waitingCount > 0 && (
                          <span style={{
                            background: UP.amber,
                            color: '#fff',
                            borderRadius: 999,
                            padding: '1px 6px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            ...numeric,
                          }}>
                            {waitingCount}
                          </span>
                        )}

                        {/* 슈퍼어드민 전용 빨간 점 */}
                        {item.superOnly && (
                          <span style={{ fontSize: '0.45rem', color: UP.danger, opacity: 0.85 }}>●</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── 로그아웃 ── */}
      <div style={{
        padding: '12px 10px',
        borderTop: `1px solid ${UP.hairSoft}`,
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${UP.dangerLine}`,
            background: UP.dangerBg,
            color: UP.danger,
            fontSize: '0.845rem',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FBDDDF' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = UP.dangerBg }}
        >
          🚪 로그아웃
        </button>
      </div>
    </aside>
  )
}
