// Admin OS — 전문 관리자 대시보드
// 접근 조건: 로그인 + VITE_ADMIN_EMAIL과 동일한 이메일

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminSidebar, { type AdminMenu } from '../components/admin/AdminSidebar'
import DashboardMenu from '../components/admin/menus/DashboardMenu'
import TargetMenu from '../components/admin/menus/TargetMenu'
import InquiriesMenu from '../components/admin/menus/InquiriesMenu'
import SettingsMenu from '../components/admin/menus/SettingsMenu'
import LogsMenu from '../components/admin/menus/LogsMenu'
import NoticesMenu from '../components/admin/menus/NoticesMenu'

const MENUS: { key: AdminMenu; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '🏠', label: 'Dashboard'  },
  { key: 'target',     icon: '🎯', label: 'Target'      },
  { key: 'inquiries',  icon: '💬', label: 'Inquiries'   },
  { key: 'notices',    icon: '📢', label: '공지사항'     },
  { key: 'settings',   icon: '⚙️', label: 'Settings'    },
  { key: 'logs',       icon: '📋', label: 'Logs'        },
]

export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? ''
  const isAdmin = isLoggedIn && !!user?.email && user.email === adminEmail

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard')

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/home')
    }
  }, [loading, isAdmin, navigate])

  if (loading) return null
  if (!isAdmin) return null

  const handleLogout = () => {
    logout()
    navigate('/home')
  }

  const renderMenu = () => {
    switch (activeMenu) {
      case 'dashboard':  return <DashboardMenu />
      case 'target':     return <TargetMenu />
      case 'inquiries':  return <InquiriesMenu />
      case 'notices':    return <NoticesMenu />
      case 'settings':   return <SettingsMenu />
      case 'logs':       return <LogsMenu />
    }
  }

  const activeMenuInfo = MENUS.find(m => m.key === activeMenu)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0d0d1a',
      color: '#fff',
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflow: 'auto',
    }}>
      {/* 모바일 상단 탭 네비 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: 'rgba(10,10,20,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}
        className="md:hidden"
      >
        <select
          value={activeMenu}
          onChange={e => setActiveMenu(e.target.value as AdminMenu)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {MENUS.map(m => (
            <option key={m.key} value={m.key} style={{ background: '#16162a', color: '#fff' }}>
              {m.icon} {m.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          CATCH Admin
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(240,68,82,0.1)',
            color: '#cc2233',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          🚪
        </button>
      </div>

      {/* 데스크탑: 사이드바 + 메인 나란히 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 사이드바: 데스크탑에서만 표시 */}
        <div className="hidden md:block" style={{ flexShrink: 0 }}>
          <AdminSidebar
            active={activeMenu}
            onChange={setActiveMenu}
            adminEmail={user?.email ?? ''}
            onLogout={handleLogout}
          />
        </div>

        {/* 메인 콘텐츠 */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          background: 'linear-gradient(135deg, #0d0d1a 0%, #111125 100%)',
        }}>
          {/* 모바일: 현재 메뉴 타이틀 표시 */}
          <div className="md:hidden" style={{
            padding: '12px 16px 0',
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.35)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {activeMenuInfo?.icon} {activeMenuInfo?.label}
          </div>
          {renderMenu()}
        </main>
      </div>
    </div>
  )
}
