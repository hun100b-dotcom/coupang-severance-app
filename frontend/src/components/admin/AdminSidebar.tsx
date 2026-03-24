import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type AdminMenu = 'dashboard' | 'target' | 'inquiries' | 'notices' | 'settings' | 'logs'

interface Props {
  active: AdminMenu
  onChange: (menu: AdminMenu) => void
  adminEmail: string
  onLogout: () => void
}

const MENUS: { key: AdminMenu; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '🏠', label: 'Dashboard'  },
  { key: 'target',     icon: '🎯', label: 'Target'      },
  { key: 'inquiries',  icon: '💬', label: 'Inquiries'   },
  { key: 'notices',    icon: '📢', label: '공지사항'     },
  { key: 'settings',   icon: '⚙️', label: 'Settings'    },
  { key: 'logs',       icon: '📋', label: 'Logs'        },
]

export default function AdminSidebar({ active, onChange, adminEmail, onLogout }: Props) {
  const [waitingCount, setWaitingCount] = useState(0)

  // Realtime — 미처리 문의 배지
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

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'rgba(10,10,20,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      flexShrink: 0,
    }}>
      {/* 로고 */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
          CATCH Admin OS
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          관리자 콘솔
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4, wordBreak: 'break-all' }}>
          {adminEmail}
        </div>
      </div>

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {MENUS.map(m => {
          const isActive = m.key === active
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                marginBottom: 2,
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'rgba(49,130,246,0.18)' : 'transparent',
                color: isActive ? '#3182f6' : 'rgba(255,255,255,0.55)',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.key === 'inquiries' && waitingCount > 0 && (
                <span style={{
                  background: '#f08c00',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                }}>
                  {waitingCount}
                </span>
              )}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  height: '60%',
                  width: 3,
                  borderRadius: 3,
                  background: '#3182f6',
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
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'rgba(240,68,82,0.1)',
            color: '#cc2233',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          🚪 로그아웃
        </button>
      </div>
    </aside>
  )
}
