// Admin OS — 전문 관리자 대시보드 (라이트 모드 / 캐치퀀트봇 스타일)
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logAdminAction } from '../lib/adminAuditLog'
import AdminSidebar, { type AdminMenu, SUPER_ADMIN_EMAIL } from '../components/admin/AdminSidebar'
import { UP } from '../components/admin/shared/adminTheme'
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
import SecurityMenu from '../components/admin/menus/SecurityMenu'

interface PermLevel { label: string; color: string; permissions: Record<string, boolean> }

const DEFAULT_PERMS: Record<string, PermLevel> = {
  super_admin: {
    label: '슈퍼 관리자', color: '#e11d48',
    permissions: {
      dashboard: true, target: true,
      job_postings: true, applicants: true, confirmed: true, recruit_summary: true,
      inquiries: true, notices: true, members: true, accounts: true,
      settings: true, audit_logs: true, server_logs: true, security: true,
    },
  },
  admin: {
    label: '관리자', color: '#3182f6',
    permissions: {
      dashboard: true, target: true,
      job_postings: true, applicants: true, confirmed: true, recruit_summary: true,
      inquiries: true, notices: true, members: true, accounts: false,
      settings: false, audit_logs: false, server_logs: false, security: false,
    },
  },
  viewer: {
    label: '뷰어', color: '#64748b',
    permissions: {
      dashboard: true, target: false,
      job_postings: false, applicants: false, confirmed: false, recruit_summary: false,
      inquiries: true, notices: false, members: false, accounts: false,
      settings: false, audit_logs: false, server_logs: false, security: false,
    },
  },
}

// 메뉴별 메타(상단바 타이틀/모바일 드롭다운 라벨 공통 출처)
const MENU_META: Record<AdminMenu, { title: string; icon: string }> = {
  dashboard:       { title: '대시보드',       icon: '📊' },
  target:          { title: 'Target 분석',    icon: '🎯' },
  job_postings:    { title: '채용공고',        icon: '💼' },
  applicants:      { title: '지원자 관리',     icon: '📋' },
  confirmed:       { title: '채용현황',        icon: '📈' },
  recruit_summary: { title: '채용 Summary',    icon: '📊' },
  notices:         { title: '공지사항',        icon: '📢' },
  inquiries:       { title: '문의',           icon: '💬' },
  members:         { title: '회원 관리',       icon: '👥' },
  accounts:        { title: '관리자 계정',     icon: '🔑' },
  security:        { title: '보안 현황',       icon: '🛡️' },
  server_logs:     { title: '서버 로그',       icon: '🖥️' },
  audit_logs:      { title: 'Audit Logs',     icon: '🔍' },
  settings:        { title: '설정',           icon: '⚙️' },
}

// 모바일 드롭다운용 평탄화 메뉴 목록(MENU_META 기반)
const FLAT_MENUS: { key: AdminMenu; label: string }[] = (Object.keys(MENU_META) as AdminMenu[])
  .map(key => ({ key, label: `${MENU_META[key].icon} ${MENU_META[key].title}` }))

export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard')
  const [collapsed, setCollapsed] = useState(false)   // 데스크탑 사이드바 접기 상태
  const [permLevels, setPermLevels] = useState<Record<string, PermLevel>>(DEFAULT_PERMS)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [adminChecked, setAdminChecked] = useState(false)
  const loginLogged = useRef(false)

  // DB admin_accounts 테이블에서 관리자 여부 확인
  useEffect(() => {
    if (loading) return  // 세션 확인이 끝날 때까지 대기 (이 동안 화면은 의도적으로 null)
    // 비로그인(게스트 모드 포함)이면 관리자 확인 절차 자체를 진행할 수 없습니다.
    // ⚠️ 과거 버그(하얀 화면의 근본 원인): 여기서 그냥 return 하면 adminChecked가
    //   영원히 false로 남아, 아래 `if (loading || !adminChecked) return null` 에서
    //   화면이 null(=하얀 화면)로 멈추고, 리다이렉트 effect(adminChecked && !isAdmin)도
    //   발동하지 못했습니다. 그래서 비로그인/게스트로 /admin 진입 시 영구 하얀 화면이 떴습니다.
    // ✅ 해결: 확인 절차를 "완료(true)"로 표시해, 아래 리다이렉트 effect가
    //   로그인/홈 페이지로 안전하게 내보내도록 합니다.
    if (!isLoggedIn || !user?.email) { setAdminChecked(true); return }
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
          .maybeSingle()  // 행 없을 때 406(PGRST116) 콘솔오염 방지(비관리자 진입 시)
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
    if (!adminChecked || isAdmin) return
    // 관리자 확인이 끝났는데 권한이 없는 경우 적절한 페이지로 내보냅니다.
    //   - 비로그인(게스트 포함) → 로그인 페이지로 보내 관리자 로그인을 유도
    //   - 로그인했지만 관리자 권한이 없음 → 홈으로
    // replace:true 로 히스토리를 덮어써 뒤로가기 시 /admin 으로 되돌아오는 루프를 막습니다.
    navigate(isLoggedIn ? '/home' : '/login', { replace: true })
  }, [adminChecked, isAdmin, isLoggedIn, navigate])

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'permission_levels')
          .maybeSingle()  // 행 없을 때 406(PGRST116) 콘솔오염 방지
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
      case 'security':        return <SecurityMenu />
      default: return null
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: UP.page,      // 옅은 청회색 페이지 배경
      color: UP.body,           // 기본 본문 잉크
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
          background: UP.surface,
          borderBottom: `1px solid ${UP.hair}`,
          flexShrink: 0,
        }}
      >
        {/* CATCH Admin 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 0 }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: UP.strong, whiteSpace: 'nowrap' }}>
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
            border: `1px solid ${UP.hair}`,
            background: UP.sunken,
            color: UP.navy,
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
            border: `1px solid ${UP.dangerLine}`,
            background: UP.dangerBg,
            color: UP.danger,
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          🚪
        </button>
      </div>

      {/* 데스크탑: 사이드바 + (상단바 + 메인 콘텐츠) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block" style={{ flexShrink: 0 }}>
          <AdminSidebar
            active={activeMenu}
            onChange={handleMenuChange}
            collapsed={collapsed}
          />
        </div>

        {/* 우측 컬럼: 상단바 + 콘텐츠 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {/* ── 데스크탑 상단바 ── */}
          <header
            className="hidden md:flex"
            style={{
              alignItems: 'center',
              gap: 12,
              height: 56,
              padding: '0 22px',
              background: UP.surface,
              borderBottom: `1px solid ${UP.hair}`,
              flexShrink: 0,
            }}
          >
            {/* 사이드바 접기 토글 */}
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
              style={{
                width: 34, height: 34, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, border: `1px solid ${UP.hair}`,
                background: UP.surface, color: UP.sub, cursor: 'pointer', fontSize: '1rem',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = UP.sunken }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = UP.surface }}
            >
              ☰
            </button>

            {/* 현재 섹션 (브레드크럼) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{MENU_META[activeMenu].icon}</span>
              <span style={{ fontSize: '0.62rem', color: UP.caption, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                Admin
              </span>
              <span style={{ color: UP.hair, flexShrink: 0 }}>/</span>
              <span style={{
                fontSize: '0.95rem', fontWeight: 800, color: UP.navy,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {MENU_META[activeMenu].title}
              </span>
            </div>

            {/* 우측: 관리자 신원 + 역할 배지 + 로그아웃 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span className="hidden lg:inline" style={{
                fontSize: '0.78rem', color: UP.sub, maxWidth: 200,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </span>
              <span style={{
                fontSize: '0.66rem', fontWeight: 800, color: currentRoleColor,
                background: `${currentRoleColor}14`, border: `1px solid ${currentRoleColor}33`,
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
              }}>
                ✦ {currentRoleLabel}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${UP.dangerLine}`, background: UP.dangerBg, color: UP.danger,
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FBDDDF' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = UP.dangerBg }}
              >
                로그아웃
              </button>
            </div>
          </header>

          {/* 메인 콘텐츠 영역 */}
          <main style={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            background: UP.page,
          }}>
            {renderMenu()}
          </main>
        </div>
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
        background: UP.dangerBg,
        border: `1px solid ${UP.dangerLine}`,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: '1.6rem' }}>🔒</span>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: UP.navy, marginBottom: 8 }}>접근 제한</div>
      <div style={{ fontSize: '0.85rem', color: UP.sub, lineHeight: 1.6 }}>{label}</div>
    </div>
  )
}
