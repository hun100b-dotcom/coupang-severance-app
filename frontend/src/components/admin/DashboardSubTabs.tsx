// ============================================================
// DashboardSubTabs: 어드민 대시보드 서브탭 네비게이션 컴포넌트
// 5개 탭(개요/방문자/계산기/채용/타겟)을 가로 스크롤 가능한 탭 바로 렌더링합니다.
// ============================================================

// JSX transform(Vite)이 React를 자동으로 주입하므로 명시적 import 불필요

// 서브탭 타입: 각 탭을 고유한 문자열로 식별합니다.
export type DashboardSubTab = 'overview' | 'visitors' | 'calc_stats' | 'recruit' | 'target'

// 탭 정의: 아이콘 + 레이블 + 설명
const TABS: { key: DashboardSubTab; icon: string; label: string; desc: string }[] = [
  { key: 'overview',    icon: '🏠', label: '개요',     desc: 'KPI + 차트' },
  { key: 'visitors',   icon: '👁️', label: '방문자',   desc: '유입 분석' },
  { key: 'calc_stats', icon: '📊', label: '계산기',   desc: '서비스 통계' },
  { key: 'recruit',    icon: '💼', label: '채용',     desc: '공고 현황' },
  { key: 'target',     icon: '🎯', label: '타겟',     desc: '인사이트' },
]

interface Props {
  activeTab: DashboardSubTab
  onTabChange: (tab: DashboardSubTab) => void
}

export default function DashboardSubTabs({ activeTab, onTabChange }: Props) {
  return (
    <div style={{
      // 탭 바 전체 컨테이너: 좌우 스크롤 가능하도록 overflow-x: auto
      display: 'flex',
      gap: 4,
      padding: '0 clamp(12px, 3vw, 24px)',
      marginBottom: 0,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      overflowX: 'auto',
      // 스크롤바 숨김 (webkit 계열)
      scrollbarWidth: 'none',
    }}>
      <style>{`
        /* 파이어폭스 스크롤바 숨김 */
        .dash-subtabs::-webkit-scrollbar { display: none; }
      `}</style>

      {TABS.map(tab => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              // 탭 버튼 공통 스타일
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '12px 16px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,         // 탭이 줄어들지 않도록 고정
              position: 'relative',
              // 활성 탭은 흰색, 비활성 탭은 반투명
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.15s',
            }}
          >
            {/* 탭 아이콘 */}
            <span style={{ fontSize: '1rem' }}>{tab.icon}</span>

            {/* 탭 레이블 */}
            <span style={{
              fontSize: '0.75rem',
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
            }}>{tab.label}</span>

            {/* 탭 설명 (소형 텍스트) */}
            <span style={{
              fontSize: '0.58rem',
              color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              lineHeight: 1,
            }}>{tab.desc}</span>

            {/* 활성 탭 하단 강조 바 */}
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '10%',
                right: '10%',
                height: 2,
                borderRadius: '2px 2px 0 0',
                background: 'linear-gradient(90deg, #3182f6, #60a5fa)',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
