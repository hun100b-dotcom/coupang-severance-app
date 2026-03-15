/**
 * 앱 전역 에러 바운더리
 * - 렌더 중 발생한 에러를 잡아 빈 화면 대신 안내 메시지를 표시합니다.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error
      const message = err?.message ?? String(err)
      const stack = err?.stack ?? ''
      return (
        <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
          <p className="text-[#191F28] font-semibold mb-2">일시적인 오류가 발생했어요</p>
          <p className="text-sm text-[#8B95A1] mb-2 text-center">
            새로고침하거나 잠시 후 다시 시도해 주세요.
          </p>
          <pre className="w-full max-w-lg mt-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left text-xs text-red-800 overflow-auto max-h-40">
            {message}
            {stack ? `\n\n${stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#3182F6] text-white text-sm font-medium"
          >
            새로고침
          </button>
          <p className="mt-4 text-xs text-[#8B95A1]">위 빨간 상자에 표시된 오류 내용을 확인해 주세요.</p>
        </div>
      )
    }
    return this.props.children
  }
}
