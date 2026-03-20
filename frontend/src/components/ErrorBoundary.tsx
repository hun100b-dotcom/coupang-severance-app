import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  showDetail: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetail: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] to-[#f8fafc] flex flex-col items-center justify-center p-6">
          {/* 로고 */}
          <div className="w-16 h-16 rounded-[22px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.1)] flex items-center justify-center mb-6">
            <img src="/catch-logo.png" alt="CATCH" className="w-8 h-8 object-contain" />
          </div>

          {/* 아이콘 */}
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>

          {/* 메시지 */}
          <h2 className="text-lg font-extrabold text-[#191F28] tracking-tight mb-2">
            일시적인 오류가 발생했어요
          </h2>
          <p className="text-sm text-[#8B95A1] mb-6 text-center max-w-xs leading-relaxed">
            새로고침하거나 잠시 후 다시 시도해 주세요.
            <br />
            문제가 지속되면 고객센터로 문의해 주세요.
          </p>

          {/* 새로고침 버튼 */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary max-w-[200px] text-center"
          >
            새로고침
          </button>

          {/* 기술 정보 토글 (개발 모드에서만 기본 표시) */}
          <button
            type="button"
            onClick={() => this.setState(s => ({ showDetail: !s.showDetail }))}
            className="mt-6 text-xs text-[#8B95A1] hover:text-[#4E5968] transition-colors"
          >
            {this.state.showDetail ? '기술 정보 숨기기' : '기술 정보 보기'}
          </button>

          {this.state.showDetail && (
            <pre className="w-full max-w-lg mt-3 p-4 bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl text-left text-xs text-[#4E5968] overflow-auto max-h-40 shadow-sm">
              {err.message}
              {err.stack ? `\n\n${err.stack}` : ''}
            </pre>
          )}

          {import.meta.env.DEV && (
            <p className="mt-4 text-[10px] text-[#8B95A1] font-mono">
              [DEV] {err.message?.slice(0, 100)}
            </p>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
