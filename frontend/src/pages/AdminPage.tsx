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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0d0d1a',
      color: '#fff',
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflow: 'auto',
    }}>
      <AdminSidebar
        active={activeMenu}
        onChange={setActiveMenu}
        adminEmail={user?.email ?? ''}
        onLogout={handleLogout}
      />
      <main style={{
        flex: 1,
        overflow: 'auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d0d1a 0%, #111125 100%)',
      }}>
        {renderMenu()}
      </main>
    </div>
  )
}
