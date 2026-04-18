// 어드민 사이드바 — 아코디언 트리 구조
// 4대 그룹: 대시보드 / 채용 및 인원 관리 / 콘텐츠 관리 / 시스템
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// ── 어드민 메뉴 ID 전체 목록 (AdminPage에서도 사용) ──
export type AdminMenu =
  | 'dashboard' | 'target'
  | 'job_postings' | 'applicants' | 'confirmed' | 'recruit_summary'
  | 'inquiries' | 'notices' | 'members' | 'accounts'
  | 'settings' | 'audit_logs' | 'server_logs'

export const SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'

// 사이드바 메뉴 한 항목
interface MenuItem {
  key: AdminMenu
  icon: string
  label: string
  superOnly?: boolean  // 슈퍼어드민 전용 (붉은 점 표시)
  badge?: boolean      // 문의 대기 건수 배지 표시 여부
}

// 아코디언 그룹
interface MenuGroup {
  groupKey: string
  groupLabel: string
  groupIcon: string
  singleMenu?: AdminMenu   // 단일 메뉴 그룹 (자식 없음)
  children?: MenuItem[]
  defaultOpen?: boolean
}

// ── 4대 그룹 트리 정의 ──
const MENU_TREE: MenuGroup[] = [
  {
    groupKey: 'dashboard-group',
    groupLabel: '대시보드',
    groupIcon: '📊',
    singleMenu: 'dashboard',  // 자식 없이 바로 메뉴로 이동
  },
  {
    groupKey: 'recruit-group',
    groupLabel: '채용 및 인원 관리',
    groupIcon: '👥',
    defaultOpen: true,        // 기본값: 펼쳐진 상태
    children: [
      { key: 'job_postings',    icon: '💼', label: '채용공고' },
      { key: 'applicants',      icon: '📋', label: '지원자' },
      { key: 'confirmed',       icon: '✅', label: '확정인원' },
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
      { key: 'members',    icon: '👥', label: '회원 관리' },
      { key: 'accounts',   icon: '🔑', label: '관리자 계정' },
      { key: 'server_logs',icon: '🖥️', label: '서버 로그' },
      { key: 'audit_logs', icon: '🔍', label: 'Audit Logs', superOnly: true },
      { key: 'settings',   icon: '⚙️', label: '설정' },
    ],
  },
]

interface PermLevel {
  label: string
  color: string
  permissions: Record<string, boolean>
}

// 기본 권한 (DB 로드 실패 시 폴백)
const DEFAULT_PERMS: Record<string, PermLevel> = {
  super_admin: {
    label: '슈퍼 관리자', color: '#f04040',
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
  // 아코디언 열림/닫힘 상태 (groupKey → boolean)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // 기본 펼침: recruit-group만 true
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

  // DB에서 권한 레벨 로드
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'permission_levels')
          .single()
        if (data?.value) {
          setPermLevels({ ...DEFAULT_PERMS, ...JSON.parse(data.value) })
        }
      } catch { /* 기본값 유지 */ }
    })()
  }, [])

  // 현재 사용자 역할 + 표시 정보
  const currentRole = isSuperAdmin ? 'super_admin' : 'admin'
  const currentRoleLabel = permLevels[currentRole]?.label
  const currentRoleColor = permLevels[currentRole]?.color ?? '#3182f6'

  // 그룹 아코디언 토글
  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  // 활성 메뉴가 속한 그룹이 닫혀 있으면 자동으로 열기
  useEffect(() => {
    MENU_TREE.forEach(group => {
      if (group.children?.some(c => c.key === active)) {
        setOpenGroups(prev => ({ ...prev, [group.groupKey]: true }))
      }
    })
  }, [active])

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: 'rgba(10,10,20,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 0', flexShrink: 0,
    }}>

      {/* ── 로고 + 프로필 ── */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
          CATCH Admin OS
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          관리자 콘솔
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 4, wordBreak: 'break-all' }}>
          {adminEmail}
        </div>
        {currentRoleLabel && (
          <div style={{
            display: 'inline-block', marginTop: 6,
            fontSize: '0.65rem', fontWeight: 800,
            color: currentRoleColor,
            background: `${currentRoleColor}1a`,
            border: `1px solid ${currentRoleColor}44`,
            padding: '2px 8px', borderRadius: 999,
          }}>
            ✦ {currentRoleLabel}
          </div>
        )}
      </div>

      {/* ── 아코디언 메뉴 트리 ── */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {MENU_TREE.map(group => {
          const isOpen = openGroups[group.groupKey]

          // 단일 메뉴 (대시보드 등 자식 없는 그룹)
          if (group.singleMenu) {
            const isActive = active === group.singleMenu
            return (
              <button
                key={group.groupKey}
                onClick={() => onChange(group.singleMenu!)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', marginBottom: 2,
                  borderRadius: 10, border: 'none',
                  background: isActive ? 'rgba(49,130,246,0.18)' : 'transparent',
                  color: isActive ? '#3182f6' : 'rgba(255,255,255,0.55)',
                  fontSize: '0.88rem', fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s', position: 'relative',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{group.groupIcon}</span>
                <span style={{ flex: 1 }}>{group.groupLabel}</span>
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%',
                    height: '60%', width: 3, borderRadius: 3, background: '#3182f6',
                  }} />
                )}
              </button>
            )
          }

          // 아코디언 그룹 (자식 있음)
          return (
            <div key={group.groupKey} style={{ marginBottom: 4 }}>
              {/* 그룹 헤더 버튼 */}
              <button
                onClick={() => toggleGroup(group.groupKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 12px',
                  borderRadius: 10, border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '0.78rem', fontWeight: 700,
                  cursor: 'pointer', textAlign: 'left',
                  letterSpacing: '0.02em',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{group.groupIcon}</span>
                <span style={{ flex: 1 }}>{group.groupLabel}</span>
                {/* 아코디언 화살표 */}
                <span style={{
                  fontSize: '0.7rem',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  display: 'inline-block',
                }}>▾</span>
              </button>

              {/* 자식 메뉴 목록 (접히면 렌더링 안 함) */}
              {isOpen && (
                <div style={{ paddingLeft: 8, marginTop: 2 }}>
                  {group.children?.map(item => {
                    const isActive = active === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => onChange(item.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          width: '100%', padding: '8px 12px', marginBottom: 1,
                          borderRadius: 8, border: 'none',
                          background: isActive ? 'rgba(49,130,246,0.18)' : 'transparent',
                          color: isActive ? '#3182f6' : 'rgba(255,255,255,0.52)',
                          fontSize: '0.85rem', fontWeight: isActive ? 700 : 400,
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.15s', position: 'relative',
                        }}
                      >
                        {/* 트리 연결 선 */}
                        <span style={{
                          fontSize: '0.6rem',
                          color: isActive ? '#3182f6' : 'rgba(255,255,255,0.2)',
                        }}>
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>

                        {/* 문의 대기 배지 */}
                        {item.badge && waitingCount > 0 && (
                          <span style={{
                            background: '#f08c00', color: '#fff',
                            borderRadius: 999, padding: '1px 6px',
                            fontSize: '0.65rem', fontWeight: 800,
                          }}>
                            {waitingCount}
                          </span>
                        )}

                        {/* 슈퍼어드민 전용 표시 */}
                        {item.superOnly && (
                          <span style={{ fontSize: '0.55rem', color: '#f04040', opacity: 0.8 }}>●</span>
                        )}

                        {/* 활성 상태 좌측 바 */}
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: 0, top: '20%',
                            height: '60%', width: 3, borderRadius: 3, background: '#3182f6',
                          }} />
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
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: 'none', background: 'rgba(240,68,82,0.1)',
            color: '#cc2233', fontSize: '0.85rem', fontWeight: 700,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          🚪 로그아웃
        </button>
      </div>
    </aside>
  )
}
