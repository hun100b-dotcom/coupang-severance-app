// ============================================================
// AdminSidebar — 딥 네이비 프리미엄 레일 (2026-07-02 월드클래스 리디자인)
//   컨셉: 라이트 흰 사이드바 → 딥 잉크 그라디언트 레일(Linear/Vercel/Stripe 톤).
//         브랜드 로고 글로우 + 그룹 라벨 + 아이콘 타일 + 활성 블루 글로우/좌측 바.
//   ⚠️ 데이터/로직 불변: MENU_TREE·권한 의미·문의 대기 실시간 구독·collapsed·onChange 그대로.
//      프레젠테이션(JSX/스타일)만 새 비주얼 언어로 교체. 폰트 크기는 text-a* 유틸.
// ============================================================
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { numeric } from './shared/adminTheme'
import { INK, RAIL_BG, BRAND, R } from './shared/adminUI'

export type AdminMenu =
  | 'dashboard' | 'target'
  | 'job_postings' | 'applicants' | 'confirmed' | 'recruit_summary'
  | 'inquiries' | 'notices' | 'members' | 'accounts'
  | 'settings' | 'audit_logs' | 'server_logs' | 'security'

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

  // 문의 대기 건수 실시간 구독 (사이드바 배지) — 로직 불변
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

  // 활성 메뉴가 속한 그룹 자동 열기 — 로직 불변
  useEffect(() => {
    MENU_TREE.forEach(group => {
      if (group.children?.some(c => c.key === active)) {
        setOpenGroups(prev => ({ ...prev, [group.groupKey]: true }))
      }
    })
  }, [active])

  const width = collapsed ? 76 : 248

  return (
    <aside style={{
      width,
      minHeight: '100vh',
      background: RAIL_BG,
      borderRight: `1px solid ${INK.line}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      color: INK.text,
    }}>

      {/* ── 브랜드 로고 ── */}
      <div style={{
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 11,
        padding: collapsed ? 0 : '0 20px',
        borderBottom: `1px solid ${INK.line}`,
        flexShrink: 0,
      }}>
        {/* 글로우 로고 마크 */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${BRAND} 0%, ${'#1B64DA'} 100%)`,
          boxShadow: `0 6px 18px rgba(49,130,246,0.45)`,
          fontSize: '1.15rem',
        }}>
          ⚡
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1 }}>
            <div className="text-a18" style={{ fontWeight: 900, color: INK.textBright, letterSpacing: '-0.02em' }}>
              CATCH
            </div>
            <div className="text-a10" style={{
              color: INK.textDim, fontWeight: 700, letterSpacing: '0.14em', marginTop: 3,
            }}>
              ADMIN&nbsp;OS
            </div>
          </div>
        )}
      </div>

      {/* ── 내비게이션 ── */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 10px' : '14px 12px', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* 접힘: 아이콘 타일 전용 리스트 */}
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {FLAT_LEAVES.map(item => {
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  title={item.label}
                  style={{
                    position: 'relative',
                    width: 48, height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: R.chip,
                    border: 'none',
                    background: isActive ? 'rgba(49,130,246,0.18)' : 'transparent',
                    boxShadow: isActive ? `inset 0 0 0 1px rgba(49,130,246,0.5)` : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = INK.soft }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span className="text-a16" style={{ opacity: isActive ? 1 : 0.72 }}>{item.icon}</span>
                  {isActive && (
                    <span style={{ position: 'absolute', left: -10, top: 9, bottom: 9, width: 3, borderRadius: 999, background: BRAND, boxShadow: `0 0 10px ${BRAND}` }} />
                  )}
                  {item.badge && waitingCount > 0 && (
                    <span style={{ position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#E08600', border: `1.5px solid ${INK.base}` }} />
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          /* 펼침: 그룹 + 리프 */
          MENU_TREE.map(group => {
            const isOpen = openGroups[group.groupKey]

            // 단일 메뉴(대시보드)
            if (group.singleMenu) {
              const isActive = active === group.singleMenu
              return (
                <button
                  key={group.groupKey}
                  onClick={() => onChange(group.singleMenu!)}
                  style={{ ...leafBtn(isActive), marginBottom: 10 }}
                  onMouseEnter={hoverOn(isActive)}
                  onMouseLeave={hoverOff(isActive)}
                >
                  <span className="text-a16" style={{ flexShrink: 0 }}>{group.singleIcon ?? group.groupIcon}</span>
                  <span className="text-a14" style={{ flex: 1, fontWeight: isActive ? 800 : 600 }}>{group.groupLabel}</span>
                  {isActive && <ActiveBar />}
                </button>
              )
            }

            // 그룹 헤더 + 자식(항상 노출; 클릭 시 접기)
            return (
              <div key={group.groupKey} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => toggleGroup(group.groupKey)}
                  className="text-a10"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 12px 6px', border: 'none',
                    background: 'transparent', color: INK.textDim, fontWeight: 800, cursor: 'pointer',
                    textAlign: 'left', letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}
                >
                  <span style={{ flex: 1 }}>{group.groupLabel}</span>
                  <span className="text-a10" style={{
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'none' : 'rotate(-90deg)',
                    display: 'inline-block', opacity: 0.6,
                  }}>▾</span>
                </button>

                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {group.children?.map(item => {
                      const isActive = active === item.key
                      return (
                        <button
                          key={item.key}
                          onClick={() => onChange(item.key)}
                          style={leafBtn(isActive)}
                          onMouseEnter={hoverOn(isActive)}
                          onMouseLeave={hoverOff(isActive)}
                        >
                          {/* 아이콘 타일 */}
                          <span style={{
                            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isActive ? 'rgba(49,130,246,0.22)' : 'rgba(255,255,255,0.05)',
                          }}>
                            <span className="text-a13">{item.icon}</span>
                          </span>
                          <span className="text-a13" style={{ flex: 1, fontWeight: isActive ? 800 : 500 }}>{item.label}</span>

                          {/* 문의 대기 배지 */}
                          {item.badge && waitingCount > 0 && (
                            <span className="text-a10" style={{
                              background: '#E08600', color: '#fff', borderRadius: 999,
                              padding: '1px 7px', fontWeight: 800, ...numeric,
                            }}>
                              {waitingCount}
                            </span>
                          )}
                          {item.superOnly && !isActive && (
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F04452', opacity: 0.85 }} />
                          )}
                          {isActive && <ActiveBar />}
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

      {/* ── 하단 상태 표시 ── */}
      {!collapsed && (
        <div style={{
          padding: '12px 18px', borderTop: `1px solid ${INK.line}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#06BE7B', boxShadow: '0 0 8px #06BE7B' }} />
          <span className="text-a11" style={{ color: INK.textDim, fontWeight: 600 }}>실시간 연결됨</span>
        </div>
      )}
    </aside>
  )
}

// 활성 좌측 글로우 바
function ActiveBar() {
  return <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 999, background: BRAND, boxShadow: `0 0 12px ${BRAND}` }} />
}

// 리프 버튼 공통 스타일 (펼침) — 활성=블루 글로우 배경
function leafBtn(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 12px', borderRadius: R.chip, border: 'none',
    background: isActive ? 'rgba(49,130,246,0.16)' : 'transparent',
    color: isActive ? INK.textBright : INK.text,
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.12s, color 0.12s',
    position: 'relative',
  }
}
// 다크 레일 호버 — 비활성만 은은한 잉크 배경(활성은 항상 블루 글로우 유지)
const hoverOn = (isActive: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = INK.soft
}
const hoverOff = (isActive: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
}
