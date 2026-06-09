// Admin OS — 전문 관리자 대시보드 (라이트 모드 / 캐치퀀트봇 스타일)
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
import JobPostingsMenu from '../components/admin/menus/JobPostingsMenu'
import ApplicantsMenu from '../components/admin/menus/ApplicantsMenu'
import ConfirmedMenu from '../components/admin/menus/ConfirmedMenu'
import RecruitSummaryMenu from '../components/admin/menus/RecruitSummaryMenu'

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
  viewer: {
    label: '뷰어', color: '#64748b',
    permissions: {
      dashboard: true, target: false,
      job_postings: false, applicants: false, confirmed: false, recruit_summary: false,
      inquiries: true, notices: false, members: false, accounts: false,
      settings: false, audit_logs: false, server_logs: false,
    },
  },
}

// 모바일 드롭다운용 평탄화 메뉴 목록
const FLAT_MENUS: { key: AdminMenu; label: string }[] = [
  { key: 'dashboard',       label: '📊 대시보드' },
  { key: 'target',          label: '🎯 타겟 분석' },
  { key: 'job_postings',    label: '💼 채용공고' },
  { key: 'applicants',      label: '📋 지원자 관리' },
  { key: 'confirmed',       label: '✅ 확정인원' },
  { key: 'recruit_summary', label: '📈 채용 Summary' },
  { key: 'notices',         label: '📢 공지사항' },
  { key: 'inquiries',       label: '💬 문의' },
  { key: 'members',         label: '👥 회원 관리' },
  { key: 'accounts',        label: '🔑 관리자 계정' },
  { key: 'settings',        label: '⚙️ 설정' },
  { key: 'audit_logs',      label: '🔍 Audit Logs' },
  { key: 'server_logs',     label: '🖥️ 서버 로그' },
]

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

    if (email === SUPER_ADMIN_EMAIL) {
      setAdminRole('super_admin')
      setAdminChecked(true)
      return
    }

    const envAdminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? ''
    if (envAdminEmail && email === envAdminEmail) {
      setAdminRole('super_admin')
      setAdminChecked(true)
      return
    }

    if (!supabase) { setAdminChecked(true); return }
    ;(async () => {
      try {
        const { data } = await supabase
          .from('admin_accounts')
          .select('role, is_active')
          .eq('email', email)
          .single()
        if (data?.is_active) setAdminRole(data.role)
      } catch { /* 관리자 아님 */ }
      setAdminChecked(true)
    })()
  }, [loading, isLoggedIn, user?.email])

  const isAdmin = adminChecked && adminRole !== null
  const isSuperAdmin = adminRole === 'super_admin'

  useEffect(() => {
    if (isAdmin && !loginLogged.current) {
      loginLogged.current = true
      logAdminAction('admin.login', 'admin_page', undefined, { role: adminRole })
    }
  }, [isAdmin, adminRole])

  useEffect(() => {
    if (adminChecked && !isAdmin) navigate('/home')
  }, [adminChecked, isAdmin, navigate])

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

  const currentRole = adminRole ?? 'admin'
  const currentPerms = permLevels[currentRole]?.permissions ?? DEFAULT_PERMS.admin.permissions
  const currentRoleLabel = permLevels[currentRole]?.label ?? '관리자'
  const currentRoleColor = permLevels[currentRole]?.color ?? '#3182f6'

  const handleMenuChange = (menu: AdminMenu) => setActiveMenu(menu)

  const renderMenu = () => {
    if (currentPerms[activeMenu] === false) {
      return (
        <AccessDenied
          label={`'${FLAT_MENUS.find(m => m.key === activeMenu)?.label}' 메뉴에 접근할 권한이 없습니다.`}
        />
      )
    }
    switch (activeMenu) {
      case 'dashboard':       return <DashboardMenu />
      case 'target':          return <TargetMenu />
      case 'job_postings':    return <JobPostingsMenu />
      case 'applicants':      return <ApplicantsMenu />
      case 'confirmed':       return <ConfirmedMenu />
      case 'recruit_summary': return <RecruitSummaryMenu />
      case 'inquiries':       return <InquiriesMenu />
      case 'notices':         return <NoticesMenu />
      case 'members':         return <MembersMenu isSuperAdmin={isSuperAdmin} />
      case 'accounts':        return <AccountsMenu isSuperAdmin={isSuperAdmin} />
      case 'settings':        return <SettingsMenu isSuperAdmin={isSuperAdmin} />
      case 'audit_logs':      return <AuditLogsMenu />
      case 'server_logs':     return <ServerLogsMenu />
      default: return null
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#f8fafc',   // slate-50 라이트 배경
      color: '#0f172a',        // slate-900 텍스트
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflow: 'auto',
    }}>
      {/* 모바일 상단 헤더 바 */}
      <div
        className="md:hidden"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        {/* CATCH Admin 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 0 }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3182f6', whiteSpace: 'nowrap' }}>
            CATCH
          </span>
        </div>

        {/* 메뉴 드롭다운 */}
        <select
          value={activeMenu}
          onChange={e => handleMenuChange(e.target.value as AdminMenu)}
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: '0.85rem',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {FLAT_MENUS.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>

        {/* 역할 뱃지 */}
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 800,
          color: currentRoleColor,
          background: `${currentRoleColor}14`,
          border: `1px solid ${currentRoleColor}33`,
          padding: '3px 8px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {currentRoleLabel}
        </span>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #fecdd3',
            background: '#fff1f2',
            color: '#e11d48',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          🚪
        </button>
      </div>

      {/* 데스크탑: 사이드바 + 메인 콘텐츠 */}
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

        {/* 메인 콘텐츠 영역 */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          background: '#f8fafc',
        }}>
          {renderMenu()}
        </main>
      </div>
    </div>
  )
}

function AccessDenied({ label }: { label: string }) {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: '1.6rem' }}>🔒</span>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>접근 제한</div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{label}</div>
    </div>
  )
}
