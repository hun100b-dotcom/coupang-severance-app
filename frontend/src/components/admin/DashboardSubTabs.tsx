// 대시보드 서브탭 네비게이션 — 업비트 톤 (헤어라인 + 활성 언더라인)
import { UP } from './shared/adminTheme'

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
      borderBottom: `1px solid ${UP.hair}`,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      background: UP.surface,
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
              color: isActive ? UP.strong : UP.sub,
              transition: 'color 0.12s',
            }}
          >
            <span className="text-a15">{tab.icon}</span>
            <span className="text-a12" style={{
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
            <span className="text-a10" style={{
              color: isActive ? UP.brand : UP.caption,
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
                background: UP.brand,
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
