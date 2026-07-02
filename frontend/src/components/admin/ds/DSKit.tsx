// ============================================================
// DSKit — 새 디자인 언어(Aurora Light) 공용 컴포넌트 키트 (S2~)
//   각 코어 화면이 동일 언어를 쓰도록: PageHead(라이트 헤더)·Panel·DSButton·
//   Toolbar·Table(Th/Td)·Pill 제공. ★framer 미사용, CSS forwards만.
// ============================================================
import type { ReactNode, CSSProperties, ButtonHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { DS, RAD, SHADOW, panel as panelStyle, mono } from './adminDS'

// ── 페이지 헤더(라이트) — 상단 코어탭 아래, 캔버스 위 ──
export function PageHead({ icon, title, subtitle, actions }: { icon?: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-staggered-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', margin: '0 0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {icon != null && (
          <span style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: DS.accentSoft, border: `1px solid ${DS.accentLine}`, fontSize: '1.3rem' }}>{icon}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 className="text-a24" style={{ fontWeight: 900, color: DS.ink, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
          {subtitle && <div className="text-a12" style={{ color: DS.sub, marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

// ── 프로 패널 ──
export function Panel({ title, extra, children, style, bodyPadding = 0 }: { title?: ReactNode; extra?: ReactNode; children: ReactNode; style?: CSSProperties; bodyPadding?: number | string }) {
  return (
    <div style={{ ...panelStyle, overflow: 'hidden', ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${DS.lineSoft}`, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 4, height: 16, borderRadius: 99, background: DS.accent }} />
            <span className="text-a14" style={{ fontWeight: 800, color: DS.ink, letterSpacing: '-0.01em' }}>{title}</span>
          </div>
          {extra}
        </div>
      )}
      <div style={{ padding: bodyPadding }}>{children}</div>
    </div>
  )
}

// ── 섹션 타이틀(액센트 바) ──
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px' }}>
      <span style={{ width: 4, height: 16, borderRadius: 99, background: DS.accent }} />
      <span className="text-a15" style={{ fontWeight: 800, color: DS.ink, letterSpacing: '-0.01em' }}>{children}</span>
    </div>
  )
}

// ── 버튼 ──
type V = 'primary' | 'secondary' | 'ghost' | 'danger'
const BTN: Record<V, CSSProperties> = {
  primary:   { background: DS.accent, color: '#fff', border: '1px solid transparent', boxShadow: '0 2px 8px rgba(49,130,246,0.28)' },
  secondary: { background: DS.panel, color: DS.accentStrong, border: `1px solid ${DS.accentLine}` },
  ghost:     { background: DS.panel, color: DS.body, border: `1px solid ${DS.line}` },
  danger:    { background: DS.badSoft, color: DS.bad, border: `1px solid ${DS.badLine}` },
}
export function DSButton({ variant = 'primary', children, style, ...rest }: { variant?: V; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="text-a13" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '9px 16px', borderRadius: RAD.sm, fontWeight: 800, cursor: 'pointer', lineHeight: 1.4,
      whiteSpace: 'nowrap', ...BTN[variant], ...style,
    }} {...rest}>{children}</button>
  )
}

// ── 필 필터 버튼 ──
export function Pill({ on, children, ...rest }: { on?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="text-a12" style={{
      padding: '7px 15px', borderRadius: RAD.pill, cursor: 'pointer',
      border: `1px solid ${on ? DS.accentLine : DS.line}`, background: on ? DS.accentSoft : DS.panel,
      color: on ? DS.accentStrong : DS.sub, fontWeight: on ? 800 : 600,
      boxShadow: on ? '0 1px 4px rgba(49,130,246,0.15)' : 'none', transition: 'all 0.12s',
    }} {...rest}>{children}</button>
  )
}

// ── 툴바(패널형 필터 줄) ──
export function Toolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...panelStyle, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', ...style }}>{children}</div>
}

// ── 표 (라이트·데이터밀도) ──
export function Table({ children, minWidth, style }: { children: ReactNode; minWidth?: number; style?: CSSProperties }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', ...style }}>{children}</table>
    </div>
  )
}
type Align = 'left' | 'right' | 'center'
export function Th({ children, align = 'left', style, ...rest }: { children?: ReactNode; align?: Align } & ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="text-a11" style={{ textAlign: align, padding: '11px 14px', color: DS.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: DS.sunken, borderBottom: `1px solid ${DS.line}`, whiteSpace: 'nowrap', position: 'sticky', top: 0, ...style }} {...rest}>{children}</th>
}
export function Td({ children, align = 'left', num = false, style, ...rest }: { children?: ReactNode; align?: Align; num?: boolean } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`text-a13 ${num ? 'tabular-nums' : ''}`} style={{ textAlign: align, padding: '11px 14px', color: DS.body, borderBottom: `1px solid ${DS.lineSoft}`, ...(num ? mono : {}), ...style }} {...rest}>{children}</td>
}

// ── 상태 배지 ──
type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral'
const BADGE: Record<Tone, { bg: string; fg: string; ln: string }> = {
  brand:   { bg: DS.accentSoft, fg: DS.accentStrong, ln: DS.accentLine },
  ok:      { bg: DS.okSoft, fg: DS.ok, ln: DS.okLine },
  warn:    { bg: DS.warnSoft, fg: DS.warn, ln: DS.warnLine },
  bad:     { bg: DS.badSoft, fg: DS.bad, ln: DS.badLine },
  neutral: { bg: DS.sunken, fg: DS.sub, ln: DS.line },
}
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const c = BADGE[tone]
  return <span className="text-a10" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: RAD.pill, fontWeight: 800, background: c.bg, color: c.fg, border: `1px solid ${c.ln}`, whiteSpace: 'nowrap' }}>{children}</span>
}

// ── 4상태: 로딩/빈/에러 ──
const CENTER: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 16px', textAlign: 'center' }
export function StateLoading({ label = '불러오는 중이에요…' }: { label?: string }) {
  return <div style={CENTER}><div className="animate-spin" style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid ${DS.line}`, borderTopColor: DS.accent }} /><p className="text-a13" style={{ color: DS.sub }}>{label}</p></div>
}
export function StateEmpty({ title, desc, icon }: { title: string; desc?: string; icon?: ReactNode }) {
  return <div style={CENTER}>{icon}<p className="text-a14" style={{ color: DS.ink, fontWeight: 800 }}>{title}</p>{desc && <p className="text-a13" style={{ color: DS.sub }}>{desc}</p>}</div>
}
export function StateError({ message = '불러오지 못했어요', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div style={CENTER}><p className="text-a13" style={{ color: DS.sub }}>{message}</p>{onRetry && <button className="text-a13" onClick={onRetry} style={{ color: DS.accent, fontWeight: 800, cursor: 'pointer', background: 'none', border: 'none' }}>다시 시도</button>}</div>
}

export { SHADOW }
