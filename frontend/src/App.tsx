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
    </BrowserRouter>
  )
}
