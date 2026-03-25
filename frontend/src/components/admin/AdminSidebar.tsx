import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type AdminMenu =
  | 'dashboard' | 'target' | 'inquiries' | 'notices'
  | 'members' | 'accounts' | 'settings'
  | 'audit_logs' | 'server_logs'

export const SUPER_ADMIN_EMAIL = 'catchmarsterdmin@gmail.com'

interface Props {
  active: AdminMenu
  onChange: (menu: AdminMenu) => void
  adminEmail: string
  isSuperAdmin: boolean
  onLogout: () => void
}

// 모든 메뉴 정의 (순서 = 표시 순서)
const ALL_MENUS: { key: AdminMenu; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '🏠', label: 'Dashboard'   },
  { key: 'target',     icon: '🎯', label: 'Target'       },
  { key: 'inquiries',  icon: '💬', label: 'Inquiries'    },
  { key: 'notices',    icon: '📢', label: '공지사항'      },
  { key: 'members',    icon: '👥', label: '회원 관리'     },
  { key: 'accounts',   icon: '🔑', label: '관리자 계정'   },
  { key: 'settings',   icon: '⚙️', label: 'Settings'     },
  { key: 'audit_logs', icon: '🔍', label: 'Audit Logs'  },
  { key: 'server_logs',icon: '🖥️', label: 'Server Logs' },
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
    permissions: { dashboard:true, target:true, inquiries:true, notices:true, members:true, accounts:true, settings:true, audit_logs:true, server_logs:true },
  },
  admin: {
    label: '관리자', color: '#3182f6',
    permissions: { dashboard:true, target:true, inquiries:true, notices:true, members:true, accounts:false, settings:false, audit_logs:false, server_logs:false },
  },
}

export default function AdminSidebar({ active, onChange, adminEmail, isSuperAdmin, onLogout }: Props) {
  const [waitingCount, setWaitingCount] = useState(0)
  const [permLevels, setPermLevels] = useState<Record<string, PermLevel>>(DEFAULT_PERMS)

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
      .channel('admin-inquiries-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetch)
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  // DB에서 권한 레벨 로드 → 메뉴 제어에 동적 반영
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
          const parsed = JSON.parse(data.value)
          setPermLevels({ ...DEFAULT_PERMS, ...parsed })
        }
      } catch { /* 기본값 유지 */ }
    })()
  }, [])

  // 현재 사용자 역할 결정
  const currentRole = isSuperAdmin ? 'super_admin' : 'admin'
  const currentPerms = permLevels[currentRole]?.permissions ?? DEFAULT_PERMS.admin.permissions
  const currentRoleLabel = permLevels[currentRole]?.label
  const currentRoleColor = permLevels[currentRole]?.color ?? '#3182f6'

  // DB 권한 기반으로 메뉴 필터링
  const visibleMenus = ALL_MENUS.filter(m => currentPerms[m.key] !== false)

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      background: 'rgba(10,10,20,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 0', flexShrink: 0,
    }}>
      {/* 로고/프로필 */}
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

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {visibleMenus.map(m => {
          const isActive = m.key === active
          // audit_logs는 슈퍼어드민 전용 표시
          const isSuperOnly = m.key === 'audit_logs'
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
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
              <span style={{ fontSize: '1.05rem' }}>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.key === 'inquiries' && waitingCount > 0 && (
                <span style={{
                  background: '#f08c00', color: '#fff',
                  borderRadius: 999, padding: '1px 6px',
                  fontSize: '0.68rem', fontWeight: 800,
                }}>
                  {waitingCount}
                </span>
              )}
              {isSuperOnly && (
                <span style={{ fontSize: '0.58rem', color: '#f04040', opacity: 0.8 }}>●</span>
              )}
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%',
                  height: '60%', width: 3, borderRadius: 3, background: '#3182f6',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* 로그아웃 */}
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
