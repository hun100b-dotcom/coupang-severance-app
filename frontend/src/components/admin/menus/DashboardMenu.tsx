// ============================================================
// DashboardMenu: 어드민 대시보드 진입점 (S1 축소)
// ★서브탭 3개(개요/방문자/계산기)로 축소 — '채용'은 상단 코어 '채용', '타겟'은 '시스템'으로
//   이전(중복 제거). 대시보드는 서비스 운영 지표에 집중.
// ============================================================

import { useState, lazy, Suspense } from 'react'
import DashboardSubTabs, { type DashboardSubTab } from '../DashboardSubTabs'
import { AdminLoading } from '../shared/AdminState' // 공통 로딩 상태(인라인 스피너+@keyframes 대체)

// 탭별 콘텐츠 컴포넌트를 lazy로 로딩 (대시보드가 무거우므로 코드 분할)
const OverviewTab   = lazy(() => import('../tabs/OverviewTab'))
const VisitorTab    = lazy(() => import('../tabs/VisitorTab'))
const CalcStatsTab  = lazy(() => import('../tabs/CalcStatsTab'))

// 탭 로딩 중 보여줄 스피너 — 공통 AdminLoading 재사용
function TabLoading() {
  return <AdminLoading label="탭을 불러오는 중이에요…" />
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
        </Suspense>
      </div>
    </div>
  )
}
