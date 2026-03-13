import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AnimatedBackground from './components/AnimatedBackground'
import Intro from './pages/Intro'
import SeveranceFlow from './pages/SeveranceFlow'
import UnemploymentFlow from './pages/UnemploymentFlow'

export default function App() {
  return (
    <BrowserRouter>
      {/* 항상 살아있는 애니메이션 배경 */}
      <AnimatedBackground />

      <Routes>
        <Route path="/"            element={<Intro />} />
        <Route path="/severance"   element={<SeveranceFlow />} />
        <Route path="/unemployment" element={<UnemploymentFlow />} />
        <Route path="*"            element={<Intro />} />
      </Routes>

      {/* 배포 확인용 버전 표시 (화면 하단 고정) */}
      <div
        className="fixed bottom-2 right-2 text-[10px] text-slate-400/80 select-none pointer-events-none z-[1]"
        aria-hidden
      >
        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}
        {typeof __BUILD_DATE__ !== 'undefined' && ` · ${__BUILD_DATE__}`}
      </div>
    </BrowserRouter>
  )
}
