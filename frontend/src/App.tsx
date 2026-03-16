// 앱의 최상위 컴포넌트로, 라우터와 AuthProvider를 감싸 전체 화면 구성을 정의합니다.

import { BrowserRouter, Routes, Route } from 'react-router-dom' // 브라우저 라우팅을 위해 react-router-dom을 가져옵니다.
import { AuthProvider } from './contexts/AuthContext' // 전역 로그인 상태를 제공하는 AuthProvider를 가져옵니다.
import AnimatedBackground from './components/AnimatedBackground' // 배경 애니메이션 컴포넌트를 가져옵니다.
import ProtectedRoute from './components/ProtectedRoute' // 로그인 필요 페이지를 보호하는 래퍼 컴포넌트를 가져옵니다.
import Intro from './pages/Intro' // 인트로(홈) 페이지 컴포넌트를 가져옵니다.
import SeveranceFlow from './pages/SeveranceFlow' // 퇴직금 계산 플로우 페이지를 가져옵니다.
import UnemploymentFlow from './pages/UnemploymentFlow' // 실업급여 계산 플로우 페이지를 가져옵니다.
import MyPage from './pages/MyPage' // 마이페이지 컴포넌트를 가져옵니다.
import ReportDetail from './pages/ReportDetail' // 리포트 상세 페이지 컴포넌트를 가져옵니다.
import PaymentGuide from './pages/PaymentGuide' // 결제 안내 페이지 컴포넌트를 가져옵니다.
import AuthCallbackPage from './pages/auth/callback' // 새로 만든 인증 콜백 페이지를 가져옵니다.
import LoginPage from './pages/Login' // 새로 만들 로그인 페이지 컴포넌트를 가져옵니다.

export default function App() {
  return (
    <BrowserRouter>
      {/* 전체 앱을 BrowserRouter로 감싸 라우팅 기능을 활성화합니다. */}
      <AuthProvider>
        {/* AuthProvider 안에서만 useAuth 훅을 사용할 수 있으므로, 라우트 전체를 감싸 줍니다. */}
        <AnimatedBackground /> {/* 모든 페이지 뒤에 공통으로 깔릴 배경 애니메이션입니다. */}

        <Routes>
          {/* / 경로는 인트로 페이지로 연결합니다. */}
          <Route path="/" element={<Intro />} />
          {/* 퇴직금 계산 페이지 라우트입니다. */}
          <Route path="/severance" element={<SeveranceFlow />} />
          {/* 실업급여 계산 페이지 라우트입니다. */}
          <Route path="/unemployment" element={<UnemploymentFlow />} />
          {/* 로그인한 사용자의 마이페이지 라우트입니다. */}
          <Route path="/mypage" element={<MyPage />} />
          {/* 소셜 로그인 이후 돌아오는 인증 콜백 라우트입니다. */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* 새로 만드는 전용 로그인 페이지 라우트입니다. */}
          <Route path="/login" element={<LoginPage />} />
          {/* 리포트 상세 페이지는 ProtectedRoute로 감싸 로그인 여부를 확인합니다. */}
          <Route
            path="/report/:id"
            element={
              <ProtectedRoute>
                <ReportDetail />
              </ProtectedRoute>
            }
          />
          {/* 결제 안내 페이지 라우트입니다. */}
          <Route path="/payment" element={<PaymentGuide />} />
          {/* 정의되지 않은 경로는 모두 인트로 페이지로 돌려보냅니다. */}
          <Route path="*" element={<Intro />} />
        </Routes>
      </AuthProvider>

      {/* 배포 버전과 빌드 날짜를 화면 오른쪽 아래에 작게 표시합니다. */}
      <div
        className="fixed bottom-2 right-2 text-[10px] text-slate-400/80 select-none pointer-events-none z-[1]"
        aria-hidden
      >
        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}
        {typeof __BUILD_DATE__ !== 'undefined' && ` · ${__BUILD_DATE__}`}
      </div>
    </BrowserRouter>
  ) // 라우터, 인증, 공통 배경을 모두 포함한 앱 전체를 반환합니다.
}

