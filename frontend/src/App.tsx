// 앱의 최상위 컴포넌트로, 라우터와 AuthProvider를 감싸 전체 화면 구성을 정의합니다.

import { BrowserRouter, Routes, Route } from 'react-router-dom' // 브라우저 라우팅을 위해 react-router-dom을 가져옵니다.
import { AuthProvider } from './contexts/AuthContext' // 전역 로그인 상태를 제공하는 AuthProvider를 가져옵니다.
import AnimatedBackground from './components/AnimatedBackground' // 배경 애니메이션 컴포넌트를 가져옵니다.
import Layout from './components/Layout' // 상단/하단 네비바를 포함한 전역 레이아웃 컴포넌트입니다.
import ProtectedRoute from './components/ProtectedRoute' // 로그인 필요 페이지를 보호하는 래퍼 컴포넌트를 가져옵니다.
import Intro from './pages/Intro' // 인트로(홈) 페이지 컴포넌트를 가져옵니다.
import Home from './pages/Home' // 기존 메인 화면 컴포넌트를 가져옵니다.
import SeveranceFlow from './pages/SeveranceFlow' // 퇴직금 계산 플로우 페이지를 가져옵니다.
import UnemploymentFlow from './pages/UnemploymentFlow' // 실업급여 계산 플로우 페이지를 가져옵니다.
import MyPage from './pages/MyPage' // 마이페이지 컴포넌트를 가져옵니다.
import ReportDetail from './pages/ReportDetail' // 리포트 상세 페이지 컴포넌트를 가져옵니다.
import PaymentGuide from './pages/PaymentGuide' // 결제 안내 페이지 컴포넌트를 가져옵니다.
import AuthCallbackPage from './pages/auth/callback' // 새로 만든 인증 콜백 페이지를 가져옵니다.
import LoginPage from './pages/Login' // 새로 만들 로그인 페이지 컴포넌트를 가져옵니다.
import AdminPage from './pages/AdminPage' // 관리자 전용 문의 관리 페이지를 가져옵니다.
import WeeklyAllowancePage from './pages/WeeklyAllowancePage' // 주휴수당 계산 페이지
import AnnualLeaveAllowancePage from './pages/AnnualLeaveAllowancePage' // 연차수당 계산 페이지
import MyBenefitsPage from './pages/MyBenefitsPage' // 나의 혜택 페이지
import NoticesPage from './pages/NoticesPage' // 공지사항 전체 목록 페이지

export default function App() {
  return (
    <BrowserRouter>
      {/* 전체 앱을 BrowserRouter로 감싸 라우팅 기능을 활성화합니다. */}
      <AuthProvider>
        {/* AuthProvider 안에서만 useAuth 훅을 사용할 수 있으므로, 라우트 전체를 감싸 줍니다. */}
        <AnimatedBackground /> {/* 모든 페이지 뒤에 공통으로 깔릴 배경 애니메이션입니다. */}

        <Routes>
          {/* ── 네비바 없는 독립 페이지 ── */}
          {/* / 경로: 첫 진입용 인트로 스플래시 (6초 후 자동 이동) */}
          <Route path="/" element={<Intro />} />
          {/* OAuth 콜백: 로그인 처리 후 리다이렉트 */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* 로그인 페이지: 독립 UI로 표시 */}
          <Route path="/login" element={<LoginPage />} />
          {/* 관리자 페이지: 자체 사이드바 네비 보유 */}
          <Route path="/admin" element={<AdminPage />} />

          {/* ── 네비바(TopNav + BottomNav)가 있는 일반 페이지 ──
              Layout 컴포넌트가 Outlet을 통해 중첩 라우트를 렌더링합니다. */}
          <Route element={<Layout />}>
            {/* 메인 홈 화면 */}
            <Route path="/home" element={<Home />} />
            {/* 퇴직금 계산 플로우 */}
            <Route path="/severance" element={<SeveranceFlow />} />
            {/* 실업급여 계산 플로우 */}
            <Route path="/unemployment" element={<UnemploymentFlow />} />
            {/* 마이페이지 (로그인 없이도 접근, 내부에서 로그인 유도) */}
            <Route path="/mypage" element={<MyPage />} />
            {/* 리포트 상세 (로그인 필수) */}
            <Route
              path="/report/:id"
              element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              }
            />
            {/* 결제 안내 */}
            <Route path="/payment" element={<PaymentGuide />} />
            {/* 주휴수당 계산기 */}
            <Route path="/weekly-allowance" element={<WeeklyAllowancePage />} />
            {/* 연차수당 계산기 */}
            <Route path="/annual-leave" element={<AnnualLeaveAllowancePage />} />
            {/* 나의 혜택 */}
            <Route path="/my-benefits" element={<MyBenefitsPage />} />
            {/* 공지사항 전체 목록: 배너 클릭 시 이동 */}
            <Route path="/notices" element={<NoticesPage />} />
            {/* 정의되지 않은 경로는 메인 화면으로 */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </AuthProvider>

      {/* 배포 버전과 빌드 날짜를 화면 오른쪽 아래에 작게 표시합니다.
          BottomNav(60px) 위에 표시되도록 bottom-[68px]로 조정합니다. */}
      <div
        className="fixed bottom-[76px] right-2 text-[10px] text-slate-400/80 select-none pointer-events-none z-[1]"
        aria-hidden
      >
        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}
        {typeof __BUILD_DATE__ !== 'undefined' && ` · ${__BUILD_DATE__}`}
      </div>
    </BrowserRouter>
  ) // 라우터, 인증, 공통 배경을 모두 포함한 앱 전체를 반환합니다.
}

