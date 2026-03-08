import { ReactNode, ButtonHTMLAttributes } from 'react'

interface PrimaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
}

export function PrimaryButton({ children, loading, disabled, className = '', ...rest }: PrimaryProps) {
  return (
    <button
      className={`btn-primary ${className}`}
      disabled={disabled || loading}
      style={disabled || loading ? { opacity: 0.6, cursor: 'not-allowed', transform: 'none' } : {}}
      {...rest}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="loading-ring" style={{ width: 20, height: 20, borderWidth: 2 }} />
          잠깐만요...
        </span>
      ) : children}
    </button>
  )
}

interface SecondaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function SecondaryButton({ children, className = '', ...rest }: SecondaryProps) {
  return (
    <button className={`btn-secondary ${className}`} {...rest}>
      {children}
    </button>
  )
}

interface ChoiceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  selected?: boolean
  icon?: string
}

export function ChoiceButton({ children, selected, icon, className = '', ...rest }: ChoiceProps) {
  return (
    <button className={`choice-btn ${selected ? 'selected' : ''} ${className}`} {...rest}>
      {icon && <span style={{ fontSize: '1.4rem' }}>{icon}</span>}
      <span>{children}</span>
      {selected && (
        <span style={{ marginLeft: 'auto', color: 'var(--toss-blue)', fontSize: '1.1rem' }}>✓</span>
      )}
    </button>
  )
}
