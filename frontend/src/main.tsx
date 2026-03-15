import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

// 배포 환경에서 미처리 에러 로그 (원인 파악용)
if (typeof window !== 'undefined') {
  window.onerror = (msg, url, line, col, err) => {
    console.error('[전역 에러]', msg, url, line, col, err)
  }
  window.addEventListener('unhandledrejection', e => {
    console.error('[미처리 Promise]', e.reason)
  })
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;">Root element not found.</p>'
} else {
  try {
    createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
  } catch (e) {
    rootEl.innerHTML = `<div style="padding:2rem;font-family:sans-serif;"><p>앱 로드 실패</p><pre style="background:#fee;padding:1rem;overflow:auto;">${String((e as Error)?.message ?? e)}</pre></div>`
    console.error(e)
  }
}
