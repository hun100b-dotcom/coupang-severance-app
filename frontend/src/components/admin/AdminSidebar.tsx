// ============================================================
// AdminSidebar — 어드민 좌측 내비게이션 (업비트풍 라이트)
//   - 레이아웃 재설계: 신원/로그아웃 블록은 상단바(AdminPage 토픽바)로 이전했습니다.
//     사이드바는 "브랜드 + 내비게이션"에만 집중합니다.
//   - 접기(collapsed) 지원: 펼침(232px, 그룹 아코디언) / 접힘(64px, 아이콘 전용 플랫 리스트).
//   - 그룹 헤더·활성 표시(좌측 바 + 옅은 블루 배경)를 정돈했습니다.
//   - ⚠️ 메뉴 구성/권한 의미는 불변. security(보안 현황) 메뉴만 신규 추가.
// ============================================================
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { UP, numeric } from './shared/adminTheme'

export type AdminMenu =
  | 'dashboard' | 'target'
  | 'job_postings' | 'applicants' | 'confirmed' | 'recruit_summary'
  | 'inquiries' | 'notices' | 'members' | 'accounts'
  | 'settings' | 'audit_logs' | 'server_logs' | 'security'

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
  singleIcon?: string
  children?: MenuItem[]
  defaultOpen?: boolean
}

const MENU_TREE: MenuGroup[] = [
  {
    groupKey: 'dashboard-group',
    groupLabel: '대시보드',
    groupIcon: '📊',
    singleMenu: 'dashboard',
    singleIcon: '📊',
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
      { key: 'security',    icon: '🛡️', label: '보안 현황', superOnly: true },
      { key: 'server_logs', icon: '🖥️', label: '서버 로그' },
      { key: 'audit_logs',  icon: '🔍', label: 'Audit Logs', superOnly: true },
      { key: 'settings',    icon: '⚙️', label: '설정' },
    ],
  },
]

// 접힘 모드에서 사용할 평탄화된 리프 메뉴 목록 (대시보드 + 각 그룹 자식)
const FLAT_LEAVES: MenuItem[] = MENU_TREE.flatMap(g =>
  g.singleMenu
    ? [{ key: g.singleMenu, icon: g.singleIcon ?? g.groupIcon, label: g.groupLabel } as MenuItem]
    : (g.children ?? [])
)

interface Props {
  active: AdminMenu
  onChange: (menu: AdminMenu) => void
  collapsed?: boolean
}

export default function AdminSidebar({ active, onChange, collapsed = false }: Props) {
  const [waitingCount, setWaitingCount] = useState(0)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    MENU_TREE.forEach(g => { init[g.groupKey] = g.defaultOpen ?? false })
    return init
  })

  // 문의 대기 건수 실시간 구독 (사이드바 배지)
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

  const width = collapsed ? 64 : 232

  return (
    <aside style={{
      width,
      minHeight: '100vh',
      background: UP.surface,
      borderRight: `1px solid ${UP.hair}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.18s ease',
    }}>

      {/* ── 브랜드 로고 ── */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 8,
        padding: collapsed ? 0 : '0 18px',
        borderBottom: `1px solid ${UP.hairSoft}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚡</span>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '0.6rem', color: UP.caption, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
              Admin OS
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: UP.navy, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              CATCH
            </div>
          </div>
        )}
      </div>

      {/* ── 내비게이션 ── */}
      <nav style={{ flex: 1, padding: collapsed ? '10px 8px' : '10px 10px', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* 접힘: 아이콘 전용 플랫 리스트 */}
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {FLAT_LEAVES.map(item => {
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  title={item.label}
                  style={{
                    position: 'relative',
                    width: 44, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10,
                    border: 'none',
                    background: isActive ? UP.brandBg : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = UP.sunken }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '1.05rem', opacity: isActive ? 1 : 0.78 }}>{item.icon}</span>
                  {/* 활성 좌측 바 */}
                  {isActive && (
                    <span style={{ position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: 999, background: UP.brand }} />
                  )}
                  {/* 문의 대기 배지(점) */}
                  {item.badge && waitingCount > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: UP.amber, border: `1.5px solid ${UP.surface}` }} />
                  )}
                  {item.superOnly && (
                    <span style={{ position: 'absolute', top: 5, right: 5, fontSize: '0.4rem', color: UP.danger }}>●</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          /* 펼침: 그룹 아코디언 */
          MENU_TREE.map(group => {
            const isOpen = openGroups[group.groupKey]

            // 단일 메뉴(대시보드)
            if (group.singleMenu) {
              const isActive = active === group.singleMenu
              return (
                <button
                  key={group.groupKey}
                  onClick={() => onChange(group.singleMenu!)}
                  style={{
                    ...leafBtn,
                    marginBottom: 4,
                    background: isActive ? UP.brandBg : 'transparent',
                    color: isActive ? UP.strong : UP.body,
                    fontWeight: isActive ? 700 : 600,
                    borderLeft: isActive ? `3px solid ${UP.brand}` : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = UP.sunken }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '0.98rem', flexShrink: 0 }}>{group.singleIcon ?? group.groupIcon}</span>
                  <span style={{ flex: 1 }}>{group.groupLabel}</span>
                </button>
              )
            }

            // 아코디언 그룹
            return (
              <div key={group.groupKey} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => toggleGroup(group.groupKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: 'transparent', color: UP.caption,
                    fontSize: '0.66rem', fontWeight: 800, cursor: 'pointer',
                    textAlign: 'left', letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}
                >
                  <span style={{ fontSize: '0.72rem' }}>{group.groupIcon}</span>
                  <span style={{ flex: 1 }}>{group.groupLabel}</span>
                  <span style={{
                    fontSize: '0.6rem', transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    display: 'inline-block', color: UP.caption,
                  }}>▾</span>
                </button>

                {isOpen && (
                  <div style={{ marginTop: 2, marginBottom: 2 }}>
                    {group.children?.map(item => {
                      const isActive = active === item.key
                      return (
                        <button
                          key={item.key}
                          onClick={() => onChange(item.key)}
                          style={{
                            ...leafBtn,
                            paddingLeft: 22,
                            marginBottom: 1,
                            background: isActive ? UP.brandBg : 'transparent',
                            color: isActive ? UP.strong : UP.sub,
                            fontWeight: isActive ? 700 : 500,
                            borderLeft: isActive ? `3px solid ${UP.brand}` : '3px solid transparent',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = UP.sunken }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >
                          <span style={{ fontSize: '0.82rem', flexShrink: 0 }}>{item.icon}</span>
                          <span style={{ flex: 1 }}>{item.label}</span>

                          {/* 문의 대기 배지 */}
                          {item.badge && waitingCount > 0 && (
                            <span style={{
                              background: UP.amber, color: '#fff', borderRadius: 999,
                              padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800, ...numeric,
                            }}>
                              {waitingCount}
                            </span>
                          )}
                          {/* 슈퍼 전용 빨간 점 */}
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
          })
        )}
      </nav>
    </aside>
  )
}

// 리프 버튼 공통 스타일 (펼침 모드)
const leafBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: 'none',
  fontSize: '0.85rem',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.12s, color 0.12s',
  position: 'relative',
}
