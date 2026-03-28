// Admin OS — 전문 관리자 대시보드
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logAdminAction } from '../lib/adminAuditLog'
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

interface PermLevel { label: string; color: string; permissions: Record<string, boolean> }

// 기본 권한 폴백
const DEFAULT_PERMS: Record<string, PermLevel> = {
  super_admin: {
    label: '슈퍼 관리자', color: '#f04040',
    permissions: { dashboard:true, target:true, inquiries:true, notices:true, members:true, accounts:true, settings:true, audit_logs:true, server_logs:true },
  },
  admin: {
    label: '관리자', color: '#3182f6',
    permissions: { dashboard:true, target:true, inquiries:true, notices:true, members:true, accounts:false, settings:false, audit_logs:false, server_logs:false },
  },
  viewer: {
    label: '뷰어', color: '#8b95a1',
    permissions: { dashboard:true, target:false, inquiries:true, notices:false, members:false, accounts:false, settings:false, audit_logs:false, server_logs:false },
  },
}

export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard')
  const [permLevels, setPermLevels] = useState<Record<string, PermLevel>>(DEFAULT_PERMS)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [adminChecked, setAdminChecked] = useState(false)
  const loginLogged = useRef(false)

  // DB admin_accounts 테이블에서 관리자 여부 확인
  useEffect(() => {
    if (loading || !isLoggedIn || !user?.email) return
    const email = user.email

    // 슈퍼 관리자 이메일은 항상 허용
    if (email === SUPER_ADMIN_EMAIL) {
      setAdminRole('super_admin')
      setAdminChecked(true)
      return
    }

    // VITE_ADMIN_EMAIL 환경변수 체크 (하위 호환)
    const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? ''
    if (envAdminEmail && email === envAdminEmail) {
      setAdminRole('super_admin')
      setAdminChecked(true)
      return
    }

    // DB에서 admin_accounts 조회
    if (!supabase) { setAdminChecked(true); return }
    ;(async () => {
      try {
        const { data } = await supabase
          .from('admin_accounts')
          .select('role, is_active')
          .eq('email', email)
          .single()
        if (data?.is_active) {
          setAdminRole(data.role)
        }
      } catch { /* 관리자 아님 */ }
      setAdminChecked(true)
    })()
  }, [loading, isLoggedIn, user?.email])

  const isAdmin = adminChecked && adminRole !== null
  const isSuperAdmin = adminRole === 'super_admin'

  // 관리자 접속 감사 로그
  useEffect(() => {
    if (isAdmin && !loginLogged.current) {
      loginLogged.current = true
      logAdminAction('admin.login', 'admin_page', undefined, { role: adminRole })
    }
  }, [isAdmin, adminRole])

  useEffect(() => {
    if (adminChecked && !isAdmin) navigate('/home')
  }, [adminChecked, isAdmin, navigate])

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
        if (data?.value) setPermLevels({ ...DEFAULT_PERMS, ...JSON.parse(data.value) })
      } catch { /* 기본값 유지 */ }
    })()
  }, [])

  if (loading || !adminChecked) return null
  if (!isAdmin) return null

  const handleLogout = () => { logout(); navigate('/home') }

  // 현재 사용자 역할 + 권한
  const currentRole = adminRole ?? 'admin'
  const currentPerms = permLevels[currentRole]?.permissions ?? DEFAULT_PERMS.admin.permissions
  const currentRoleLabel = permLevels[currentRole]?.label ?? '관리자'
  const currentRoleColor = permLevels[currentRole]?.color ?? '#3182f6'

  // 모든 메뉴 표시 (권한 체크는 renderMenu()에서 수행)
  const visibleMenus = ALL_MENUS

  const handleMenuChange = (menu: AdminMenu) => {
    // 탭 클릭은 항상 허용 (접근 제한은 renderMenu에서 처리)
    setActiveMenu(menu)
  }

  const renderMenu = () => {
    // 권한 없는 메뉴 접근 시 차단
    if (currentPerms[activeMenu] === false) {
      return <AccessDenied label={`'${ALL_MENUS.find(m=>m.key===activeMenu)?.label}' 메뉴에 접근할 권한이 없습니다.`} />
    }
    switch (activeMenu) {
      case 'dashboard':   return <DashboardMenu />
      case 'target':      return <TargetMenu />
      case 'inquiries':   return <InquiriesMenu />
      case 'notices':     return <NoticesMenu />
      case 'members':     return <MembersMenu isSuperAdmin={isSuperAdmin} />
      case 'accounts':    return <AccountsMenu isSuperAdmin={isSuperAdmin} />
      case 'settings':    return <SettingsMenu isSuperAdmin={isSuperAdmin} />
      case 'audit_logs':  return <AuditLogsMenu />
      case 'server_logs': return <ServerLogsMenu />
      default: return null
    }
  }

  const activeMenuInfo = ALL_MENUS.find(m => m.key === activeMenu)

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
        <span style={{
          fontSize: '0.62rem', fontWeight: 800,
          color: currentRoleColor,
          background: `${currentRoleColor}1a`,
          border: `1px solid ${currentRoleColor}33`,
          padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap',
        }}>
          {currentRoleLabel}
        </span>
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
