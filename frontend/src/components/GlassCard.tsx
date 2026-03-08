import { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  className?: string
  animate?: boolean
  style?: CSSProperties
}

export default function GlassCard({ children, className = '', animate = true, style }: Props) {
  return (
    <div className={`glass-card ${animate ? 'page-enter' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}
