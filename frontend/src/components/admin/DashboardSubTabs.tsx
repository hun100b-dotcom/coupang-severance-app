// 대시보드 서브탭 네비게이션 — 라이트 모드 전환 (캐치퀀트봇 스타일)
export type DashboardSubTab = 'overview' | 'visitors' | 'calc_stats' | 'recruit' | 'target'

const TABS: { key: DashboardSubTab; icon: string; label: string; desc: string }[] = [
  { key: 'overview',    icon: '🏠', label: '개요',   desc: 'KPI + 차트' },
  { key: 'visitors',   icon: '👁️', label: '방문자', desc: '유입 분석' },
  { key: 'calc_stats', icon: '📊', label: '계산기', desc: '서비스 통계' },
  { key: 'recruit',    icon: '💼', label: '채용',   desc: '공고 현황' },
  { key: 'target',     icon: '🎯', label: '타겟',   desc: '인사이트' },
]

interface Props {
  activeTab: DashboardSubTab
  onTabChange: (tab: DashboardSubTab) => void
}

export default function DashboardSubTabs({ activeTab, onTabChange }: Props) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      padding: '0 24px',
      borderBottom: '1px solid #e2e8f0',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      background: '#fff',
      flexShrink: 0,
    }}>
      {TABS.map(tab => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '12px 16px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative',
              color: isActive ? '#1d4ed8' : '#64748b',
              transition: 'color 0.12s',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
            <span style={{
              fontSize: '0.73rem',
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: '0.58rem',
              color: isActive ? '#3182f6' : '#94a3b8',
              lineHeight: 1,
            }}>
              {tab.desc}
            </span>

            {/* 활성 탭 하단 파란 바 */}
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '10%',
                right: '10%',
                height: 2,
                borderRadius: '2px 2px 0 0',
                background: '#3182f6',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
