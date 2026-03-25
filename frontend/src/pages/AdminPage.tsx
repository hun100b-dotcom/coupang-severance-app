// Admin OS — 전문 관리자 대시보드
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminSidebar, { type AdminMenu, SUPER_ADMIN_EMAIL } from '../components/admin/AdminSidebar'
import DashboardMenu from '../components/admin/menus/DashboardMenu'
import TargetMenu from '../components/admin/menus/TargetMenu'
import InquiriesMenu from '../components/admin/menus/InquiriesMenu'
import SettingsMenu from '../components/admin/menus/SettingsMenu'
import ServerLogsMenu from '../components/admin/menus/ServerLogsMenu'
import AuditLogsMenu from '../components/admin/menus/AuditLogsMenu'
import NoticesMenu from '../components/admin/menus/NoticesMenu'
import MembersMenu from '../components/admin/menus/MembersMenu'
import AccountsMenu from '../components/admin/menus/AccountsMenu'

const MENUS: { key: AdminMenu; icon: string; label: string; superAdminOnly?: boolean }[] = [
  { key: 'dashboard',  icon: '🏠', label: 'Dashboard'     },
  { key: 'target',     icon: '🎯', label: 'Target'         },
  { key: 'inquiries',  icon: '💬', label: 'Inquiries'      },
  { key: 'notices',    icon: '📢', label: '공지사항'        },
  { key: 'members',    icon: '👥', label: '회원 관리'       },
  { key: 'accounts',   icon: '🔑', label: '관리자 계정'     },
  { key: 'settings',   icon: '⚙️', label: 'Settings'       },
  { key: 'audit_logs', icon: '🔍', label: 'Audit Logs',  superAdminOnly: true },
  { key: 'server_logs',icon: '🖥️', label: 'Server Logs'   },
]

export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? ''
  const isAdmin = isLoggedIn && !!user?.email && user.email === adminEmail
  const isSuperAdmin = isAdmin && user?.email === SUPER_ADMIN_EMAIL

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard')

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/home')
  }, [loading, isAdmin, navigate])

  if (loading) return null
  if (!isAdmin) return null

  const handleLogout = () => { logout(); navigate('/home') }

  // 슈퍼어드민 전용 메뉴 접근 차단
  const handleMenuChange = (menu: AdminMenu) => {
    const menuDef = MENUS.find(m => m.key === menu)
    if (menuDef?.superAdminOnly && !isSuperAdmin) return
    setActiveMenu(menu)
  }

  const renderMenu = () => {
    switch (activeMenu) {
      case 'dashboard':  return <DashboardMenu />
      case 'target':     return <TargetMenu />
      case 'inquiries':  return <InquiriesMenu />
      case 'notices':    return <NoticesMenu />
      case 'members':    return <MembersMenu isSuperAdmin={isSuperAdmin} />
      case 'accounts':   return <AccountsMenu isSuperAdmin={isSuperAdmin} />
      case 'settings':   return <SettingsMenu isSuperAdmin={isSuperAdmin} />
      case 'audit_logs': return isSuperAdmin
        ? <AuditLogsMenu />
        : <AccessDenied label="Audit Logs는 최고관리자(catchmarsterdmin@gmail.com)만 접근할 수 있습니다." />
      case 'server_logs': return <ServerLogsMenu />
      default: return null
    }
  }

  const activeMenuInfo = MENUS.find(m => m.key === activeMenu)
  const visibleMenus = MENUS.filter(m => !m.superAdminOnly || isSuperAdmin)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', background: '#0d0d1a',
      color: '#fff', position: 'fixed', inset: 0,
      zIndex: 100, overflow: 'auto',
    }}>
      {/* 모바일 상단 탭 네비 */}
      <div
        className="md:hidden"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          background: 'rgba(10,10,20,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <select
          value={activeMenu}
          onChange={e => handleMenuChange(e.target.value as AdminMenu)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: '#fff',
            fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'pointer',
          }}
        >
          {visibleMenus.map(m => (
            <option key={m.key} value={m.key} style={{ background: '#16162a', color: '#fff' }}>
              {m.icon} {m.label}
            </option>
          ))}
        </select>
        {isSuperAdmin && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 800,
            color: '#f04040', background: 'rgba(240,64,64,0.12)',
            border: '1px solid rgba(240,64,64,0.2)',
            padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
          }}>
            최고관리자
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 10px', borderRadius: 8, border: 'none',
            background: 'rgba(240,68,82,0.1)', color: '#cc2233',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          🚪
        </button>
      </div>

      {/* 데스크탑: 사이드바 + 메인 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block" style={{ flexShrink: 0 }}>
          <AdminSidebar
            active={activeMenu}
            onChange={handleMenuChange}
            adminEmail={user?.email ?? ''}
            isSuperAdmin={isSuperAdmin}
            onLogout={handleLogout}
          />
        </div>

        <main style={{
          flex: 1, overflow: 'auto', minHeight: 0,
          background: 'linear-gradient(135deg, #0d0d1a 0%, #111125 100%)',
        }}>
          <div className="md:hidden" style={{
            padding: '12px 16px 0',
            fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)',
            fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {activeMenuInfo?.icon} {activeMenuInfo?.label}
          </div>
          {renderMenu()}
        </main>
      </div>
    </div>
  )
}

function AccessDenied({ label }: { label: string }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>접근 제한</div>
      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{label}</div>
    </div>
  )
}
