// 대시보드 서브탭 — 새 DS(Aurora Light) 세그먼트 컨트롤 (S1)
//   ★축소: 기존 5탭(개요/방문자/계산기/채용/타겟) → 3탭. '채용'은 상단 코어 '채용',
//     '타겟'은 '시스템'으로 이전(중복 제거). 대시보드는 서비스 운영 지표에 집중.
import { DS, RAD } from './ds/adminDS'

export type DashboardSubTab = 'overview' | 'visitors' | 'calc_stats'

const TABS: { key: DashboardSubTab; icon: string; label: string }[] = [
  { key: 'overview',   icon: '🏠', label: '개요' },
  { key: 'visitors',   icon: '👁️', label: '방문자' },
  { key: 'calc_stats', icon: '📊', label: '계산기' },
]

interface Props {
  activeTab: DashboardSubTab
  onTabChange: (tab: DashboardSubTab) => void
}

export default function DashboardSubTabs({ activeTab, onTabChange }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 6, padding: 'clamp(14px,3vw,28px)', paddingBottom: 0,
      flexWrap: 'wrap', maxWidth: 1440, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    }}>
      {TABS.map(tab => {
        const on = tab.key === activeTab
        return (
          <button key={tab.key} onClick={() => onTabChange(tab.key)} className="text-a13"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: RAD.pill, cursor: 'pointer',
              border: `1px solid ${on ? DS.accentLine : DS.line}`,
              background: on ? DS.accentSoft : DS.panel,
              color: on ? DS.accentStrong : DS.sub, fontWeight: on ? 800 : 600,
              boxShadow: on ? '0 1px 4px rgba(49,130,246,0.15)' : 'none', transition: 'all 0.12s',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
