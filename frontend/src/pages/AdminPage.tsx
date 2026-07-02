// Admin OS — 전문 관리자 대시보드 (라이트 모드 / 캐치퀀트봇 스타일)
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logAdminAction } from '../lib/adminAuditLog'
import { type AdminMenu } from '../components/admin/AdminSidebar'
import { UP } from '../components/admin/shared/adminTheme'
import { DS, RAD, CANVAS_BG, FROST_BAR } from '../components/admin/ds/adminDS'
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

// ── 새 IA: 상단 프라이머리 탭 = 5 코어 그룹, 각 그룹의 서브 항목 ──
//   (플랜 §5-1. 채용분석·감사·타겟 통합은 이후 스텝에서 화면 단위로 진행; S0은 IA 골격만)
interface CoreGroup { key: string; label: string; icon: string; items: { menu: AdminMenu; label: string }[] }
const CORES: CoreGroup[] = [
  { key: 'ops',     label: '운영',   icon: '📊', items: [{ menu: 'dashboard', label: '대시보드' }] },
  { key: 'recruit', label: '채용',   icon: '💼', items: [
    { menu: 'job_postings', label: '공고' }, { menu: 'applicants', label: '지원자' },
    { menu: 'confirmed', label: '현황' }, { menu: 'recruit_summary', label: '분석' },
  ] },
  { key: 'support', label: '소통',   icon: '💬', items: [
    { menu: 'inquiries', label: '문의' }, { menu: 'notices', label: '공지' },
  ] },
  { key: 'people',  label: '인원',   icon: '👥', items: [
    { menu: 'members', label: '회원' }, { menu: 'accounts', label: '관리자' },
  ] },
  { key: 'system',  label: '시스템', icon: '⚙️', items: [
    { menu: 'settings', label: '설정' }, { menu: 'security', label: '보안' },
    { menu: 'server_logs', label: '서버로그' }, { menu: 'audit_logs', label: '감사' },
    { menu: 'target', label: '타겟' },
  ] },
]

export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('dashboard')
  const [permLevels, setPermLevels] = useState<Record<string, PermLevel>>(DEFAULT_PERMS)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [adminChecked, setAdminChecked] = useState(false)
  const loginLogged = useRef(false)

  // ── 어드민 진입 판정 — DB(admin_accounts)로만 실제 관리자 여부 검증 ──
  // ⚠️ 보안 강화(2026-07-01): 과거엔 프론트 하드코딩 이메일(SUPER_ADMIN_EMAIL)·
  //   VITE_ADMIN_EMAIL 만으로 통과시켜, admin_accounts 에 등록 안 된 이메일도
  //   어드민 셸(화면)에 들어왔습니다(데이터는 RLS 로 막혀도 화면은 뜸).
  //   → "하드코딩/환경변수 단독 통과"를 제거하고, DB 에 is_active=true 로 등록된
  //     관리자만 입장할 수 있게 막습니다. (RLS·DB·어드민 기능은 불변, 입장 판정만 교체)
  useEffect(() => {
    if (loading) return  // 세션 확인이 끝날 때까지 대기(이 동안 아래에서 스피너 표시)

    // 비로그인(게스트 포함)/이메일 없음 → 확인 절차를 "완료(true)"로 표시해
    //   아래 리다이렉트 effect 가 로그인 페이지로 안전하게 내보내도록 합니다.
    //   (과거 하얀 화면 버그: 여기서 adminChecked 를 안 올리면 영구 null 화면)
    if (!isLoggedIn || !user?.email) { setAdminRole(null); setAdminChecked(true); return }

    // supabase 클라이언트가 없으면 DB 검증 자체가 불가 → 안전하게 관리자 아님으로 차단.
    if (!supabase) { setAdminRole(null); setAdminChecked(true); return }

    const email = user.email
    const client = supabase
    let cancelled = false
    setAdminChecked(false)  // 이메일(세션) 바뀌면 재검증 — 스피너 재표시

    ;(async () => {
      try {
        // admin_accounts 에서 "본인 이메일 행"을 조회.
        //   비관리자 이메일은 이 테이블에 없어 0행 → maybeSingle()=null → 입장 차단.
        //   관리자라도 is_active=false 면 차단. 역할(super/admin/viewer)은 DB 값을 그대로 사용.
        //   → DB 등록 여부가 유일한 입장 근거. (하드코딩/VITE_ADMIN_EMAIL 단독 통과 완전 제거)
        const { data } = await client
          .from('admin_accounts')
          .select('role, is_active')
          .eq('email', email)
          .maybeSingle()  // 행 없을 때 406(PGRST116) 콘솔오염 방지(비관리자 진입 시)
        if (cancelled) return
        setAdminRole(data?.is_active ? data.role : null)
      } catch {
        // 조회 실패(네트워크 등) → 안전측(관리자 아님)으로 처리해 입장 차단
        if (!cancelled) setAdminRole(null)
      }
      if (!cancelled) setAdminChecked(true)
    })()

    return () => { cancelled = true }  // 세션 전환 중 늦게 도착한 응답 무시(레이스 방지)
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

  // 로딩(세션 확인 or DB 검증 중) — 하얀 화면 금지: 스피너 표시(과거 사고 재발 방지)
  if (loading || !adminChecked) return <AdminGateLoading />
  // 확인 완료했는데 관리자 아님 — 위 리다이렉트 effect 가 곧 내보냄.
  //   그 찰나에 하얀 화면 대신 "권한 없음" 안내를 보여줍니다.
  if (!isAdmin) return <AdminGateDenied loggedIn={isLoggedIn} />

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

  // ── 새 IA 계산: 권한 필터된 코어 그룹 + 활성 코어/서브 ──
  const visibleCores = CORES
    .map(c => ({ ...c, items: c.items.filter(it => currentPerms[it.menu] !== false) }))
    .filter(c => c.items.length > 0)
  const activeCore = visibleCores.find(c => c.items.some(it => it.menu === activeMenu)) ?? visibleCores[0]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: CANVAS_BG, color: DS.body,
      position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto',
    }}>
      {/* ═══ 상단 프라이머리 바 (프로스트 화이트) ═══ */}
      <header style={{ ...FROST_BAR, position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
        {/* 1행: 브랜드 + 코어 탭 + 신원 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, height: 60, padding: '0 clamp(14px,2.5vw,28px)' }}>
          {/* 브랜드 마크 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #3182F6, #1B64DA)', color: '#fff', fontSize: '1.05rem',
              boxShadow: '0 4px 14px rgba(49,130,246,0.35)',
            }}>⚡</span>
            <div style={{ lineHeight: 1 }} className="hidden sm:block">
              <div className="text-a16" style={{ fontWeight: 900, color: DS.ink, letterSpacing: '-0.02em' }}>CATCH</div>
              <div className="text-a10" style={{ color: DS.faint, fontWeight: 700, letterSpacing: '0.14em', marginTop: 2 }}>ADMIN</div>
            </div>
          </div>

          {/* 코어 탭 (데스크탑) */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flex: 1, minWidth: 0, overflowX: 'auto' }}>
            {visibleCores.map(core => {
              const on = activeCore?.key === core.key
              return (
                <button key={core.key}
                  onClick={() => handleMenuChange(core.items[0].menu)}
                  className="text-a14"
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '18px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                    color: on ? DS.ink : DS.sub, fontWeight: on ? 800 : 600, whiteSpace: 'nowrap',
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.color = DS.ink }}
                  onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.color = DS.sub }}
                >
                  <span style={{ fontSize: '1rem', opacity: on ? 1 : 0.8 }}>{core.icon}</span>
                  {core.label}
                  {on && <span style={{
                    position: 'absolute', left: 12, right: 12, bottom: 0, height: 3, borderRadius: '3px 3px 0 0',
                    background: DS.accent, boxShadow: `0 0 10px ${DS.accent}`,
                  }} />}
                </button>
              )
            })}
          </nav>

          {/* 모바일 메뉴 셀렉트 */}
          <select
            className="md:hidden text-a13"
            value={activeMenu}
            onChange={e => handleMenuChange(e.target.value as AdminMenu)}
            style={{
              flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: RAD.sm,
              border: `1px solid ${DS.line}`, background: DS.panel, color: DS.ink, fontWeight: 700, outline: 'none',
            }}
          >
            {FLAT_MENUS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>

          {/* 우측: 신원 + 역할 + 로그아웃 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span className="hidden lg:inline text-a12" style={{ color: DS.sub, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </span>
            <span className="text-a11 hidden sm:inline" style={{
              fontWeight: 800, color: currentRoleColor,
              background: `${currentRoleColor}14`, border: `1px solid ${currentRoleColor}33`,
              padding: '4px 11px', borderRadius: RAD.pill, whiteSpace: 'nowrap',
            }}>✦ {currentRoleLabel}</span>
            <button onClick={handleLogout} className="text-a13"
              style={{
                padding: '7px 14px', borderRadius: RAD.sm,
                border: `1px solid ${DS.badLine}`, background: DS.badSoft, color: DS.bad,
                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >로그아웃</button>
          </div>
        </div>

        {/* 2행: 활성 코어의 서브 세그먼트 (항목 2개 이상일 때만) */}
        {activeCore && activeCore.items.length > 1 && (
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6, padding: '0 clamp(14px,2.5vw,28px) 12px', flexWrap: 'wrap' }}>
            {activeCore.items.map(it => {
              const on = it.menu === activeMenu
              return (
                <button key={it.menu} onClick={() => handleMenuChange(it.menu)} className="text-a13"
                  style={{
                    padding: '7px 15px', borderRadius: RAD.pill, cursor: 'pointer',
                    border: `1px solid ${on ? DS.accentLine : DS.line}`,
                    background: on ? DS.accentSoft : DS.panel,
                    color: on ? DS.accentStrong : DS.sub, fontWeight: on ? 800 : 600,
                    boxShadow: on ? '0 1px 4px rgba(49,130,246,0.15)' : 'none', transition: 'all 0.12s',
                  }}
                >{it.label}</button>
              )
            })}
          </div>
        )}
      </header>

      {/* ═══ 메인 캔버스 ═══ */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* 전환 시 진입 모션(CSS forwards). ★framer variants 미사용 */}
        <div key={activeMenu} className="animate-staggered-fade">
          {renderMenu()}
        </div>
      </main>
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

// 입장 검증 중 로딩 화면 — 하얀 화면 대신 스피너를 꽉 채워 표시(과거 하얀화면 사고 방지)
function AdminGateLoading() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, background: UP.page, color: UP.sub,
    }}>
      <div
        className="animate-spin"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          border: `3px solid ${UP.hair}`, borderTopColor: UP.brand,
        }}
      />
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: UP.sub }}>관리자 권한 확인 중…</div>
    </div>
  )
}

// 관리자 아님(미등록/비활성/비로그인) — 리다이렉트 직전 잠깐 보이는 "권한 없음" 안내
//   loggedIn: true=로그인했으나 미등록 관리자 → 홈으로, false=비로그인 → 로그인으로
function AdminGateDenied({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '0 24px', textAlign: 'center', background: UP.page,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: '50%',
        background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, marginBottom: 4,
      }}>
        <span style={{ fontSize: '1.6rem' }}>🔒</span>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: UP.navy }}>접근 권한이 없습니다</div>
      <div style={{ fontSize: '0.85rem', color: UP.sub, lineHeight: 1.6 }}>
        등록된 관리자만 입장할 수 있습니다.<br />
        {loggedIn ? '홈으로 이동합니다…' : '로그인 페이지로 이동합니다…'}
      </div>
    </div>
  )
}
