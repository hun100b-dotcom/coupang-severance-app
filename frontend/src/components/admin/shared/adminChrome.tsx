// ============================================================
// adminChrome.tsx — 어드민 월드클래스 재설계 공통 프레젠테이션 프리미티브 (2026-07-02)
//   각 메뉴 상단의 "딥네이비 페이지 히어로"와 콘텐츠 "프로 패널"을 통일해
//   대시보드 셸과 같은 시각 언어를 전 메뉴에 확산한다.
//   ⚠️ framer-motion 미사용(빈 섹션 재발 방지) — 진입은 CSS .animate-staggered-fade(forwards)만.
// ============================================================
import type { ReactNode, CSSProperties } from 'react'
import { UP } from './adminTheme'
import { HERO_BG, ELEV, R, proCard } from './adminUI'

// 메뉴 상단 딥네이비 히어로 헤더 — 아이콘 타일 + 큰 제목 + 부제 + 우측 액션
export function AdminPageHero({
  icon, title, subtitle, actions,
}: { icon?: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-staggered-fade" style={{
      borderRadius: R.hero, background: HERO_BG, boxShadow: ELEV.hero,
      padding: 'clamp(18px,2.5vw,26px) clamp(20px,3vw,30px)', color: '#EAF1FF',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {icon != null && (
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 className="text-a24" style={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
          {subtitle && <div className="text-a12" style={{ color: '#9FB6E6', marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

// 프로 패널 — 흰 카드 + 헤어라인 + 큰 라운드 + 소프트섀도우. 선택적 제목/우측 액션 헤더.
export function Panel({
  title, extra, children, style, bodyPadding = 0,
}: { title?: ReactNode; extra?: ReactNode; children: ReactNode; style?: CSSProperties; bodyPadding?: number | string }) {
  return (
    <div style={{ ...proCard, overflow: 'hidden', ...style }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: `1px solid ${UP.hairSoft}`, gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 4, height: 16, borderRadius: 99, background: UP.brand }} />
            <span className="text-a14" style={{ fontWeight: 800, color: UP.navy, letterSpacing: '-0.01em' }}>{title}</span>
          </div>
          {extra}
        </div>
      )}
      <div style={{ padding: bodyPadding }}>{children}</div>
    </div>
  )
}

// 통계 칩 — 히어로 우측 등에서 쓰는 작은 지표(라벨+값)
export function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{
      padding: '8px 16px', borderRadius: R.chip,
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'right',
    }}>
      <div className="text-a10" style={{ color: '#9FB6E6', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div className="text-a18" style={{ color: '#fff', fontWeight: 900, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  )
}
