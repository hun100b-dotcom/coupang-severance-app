// ============================================================
// DashboardMenu: 어드민 대시보드 진입점
// 5개 서브탭(개요/방문자/계산기/채용/타겟) 중 하나를 선택해 콘텐츠를 렌더링합니다.
// 이전 단일 스크롤 구조에서 서브탭 구조로 전면 재구성되었습니다.
// ============================================================

import { useState, lazy, Suspense } from 'react'
import DashboardSubTabs, { type DashboardSubTab } from '../DashboardSubTabs'
import { UP } from '../shared/adminTheme'

// 탭별 콘텐츠 컴포넌트를 lazy로 로딩 (대시보드가 무거우므로 코드 분할)
const OverviewTab   = lazy(() => import('../tabs/OverviewTab'))
const VisitorTab    = lazy(() => import('../tabs/VisitorTab'))
const CalcStatsTab  = lazy(() => import('../tabs/CalcStatsTab'))
const RecruitTab    = lazy(() => import('../tabs/RecruitTab'))
const TargetTab     = lazy(() => import('../tabs/TargetTab'))

// 탭 로딩 중 보여줄 스피너
function TabLoading() {
  return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32,
        border: `3px solid ${UP.hair}`,
        borderTopColor: UP.brand,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: UP.sub, fontSize: '0.85rem' }}>탭 로딩 중...</p>
    </div>
  )
}

export default function DashboardMenu() {
  // 현재 활성 서브탭 (기본값: 개요)
  const [activeTab, setActiveTab] = useState<DashboardSubTab>('overview')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 서브탭 네비게이션 바 */}
      <DashboardSubTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 선택된 탭 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Suspense fallback={<TabLoading />}>
          {activeTab === 'overview'    && <OverviewTab />}
          {activeTab === 'visitors'   && <VisitorTab />}
          {activeTab === 'calc_stats' && <CalcStatsTab />}
          {activeTab === 'recruit'    && <RecruitTab />}
          {activeTab === 'target'     && <TargetTab />}
        </Suspense>
      </div>
    </div>
  )
}
