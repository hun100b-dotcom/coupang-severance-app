// 앱의 최상위 컴포넌트로, 라우터와 AuthProvider를 감싸 전체 화면 구성을 정의합니다.

// ── React 핵심 임포트 ────────────────────────────────────────────────────────
// lazy: 컴포넌트를 처음 렌더링할 때만 동적으로 불러옵니다 (지연 로딩).
// Suspense: lazy 컴포넌트가 로딩 중일 때 대신 보여줄 fallback UI를 지정합니다.
import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom' // 브라우저 라우팅을 위해 react-router-dom을 가져옵니다.
import { GoogleOAuthProvider } from '@react-oauth/google' // Google Identity Services 제공자
import { AuthProvider } from './contexts/AuthContext' // 전역 로그인 상태를 제공하는 AuthProvider를 가져옵니다.
import AnimatedBackground from './components/AnimatedBackground' // 배경 애니메이션 컴포넌트를 가져옵니다.
import Layout from './components/Layout' // 상단/하단 네비바를 포함한 전역 레이아웃 컴포넌트입니다.
import ProtectedRoute from './components/ProtectedRoute' // 로그인 필요 페이지를 보호하는 래퍼 컴포넌트를 가져옵니다.
import OnboardingGuard from './components/OnboardingGuard' // 온보딩 미완료 사용자 리다이렉트 가드
import LoadingOverlay from './components/LoadingOverlay' // lazy 로딩 중 보여줄 스피너 컴포넌트
import SplashScreen from './components/SplashScreen'   // 앱 최초 접속 시 스플래시 화면

// ── 즉시 로딩 페이지 (앱 시작 시 항상 필요한 페이지) ────────────────────────
// 아래 4개 페이지는 사용자가 앱을 열자마자 마주칠 수 있으므로 번들에 포함합니다.
import Intro from './pages/Intro'           // 첫 진입 스플래시 (/ 경로)
import LoginPage from './pages/Login'        // 로그인 페이지 (/login)
import AuthCallbackPage from './pages/auth/callback' // OAuth 콜백 (/auth/callback)
import OnboardingPage from './pages/Onboarding'      // 온보딩 (/onboarding)

// ── 지연 로딩 페이지 (lazy import) ──────────────────────────────────────────
// 사용자가 해당 페이지로 실제 이동할 때만 JS 파일을 내려받습니다.
// 이를 통해 초기 번들 크기(1,662KB → 300~500KB)를 크게 줄여
// 첫 화면이 빨리 뜨게 됩니다 (FCP 개선).
// Vite는 자동으로 각 lazy 페이지를 별도 청크(chunk) 파일로 분리합니다.
const Home                   = lazy(() => import('./pages/Home'))
const SeveranceFlow          = lazy(() => import('./pages/SeveranceFlow'))
const UnemploymentFlow       = lazy(() => import('./pages/UnemploymentFlow'))
const MyPage                 = lazy(() => import('./pages/MyPage'))
const ReportDetail           = lazy(() => import('./pages/ReportDetail'))
const PaymentGuide           = lazy(() => import('./pages/PaymentGuide'))
const AdminPage              = lazy(() => import('./pages/AdminPage'))          // 관리자 페이지 (매우 무거움)
const WeeklyAllowancePage    = lazy(() => import('./pages/WeeklyAllowancePage'))
const AnnualLeaveAllowancePage = lazy(() => import('./pages/AnnualLeaveAllowancePage'))
const MyBenefitsPage         = lazy(() => import('./pages/MyBenefitsPage'))
const NoticesPage            = lazy(() => import('./pages/NoticesPage'))
const JobsPage               = lazy(() => import('./pages/JobsPage'))
const CalculatorPage         = lazy(() => import('./pages/CalculatorPage'))
const PrivacyPolicyPage      = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfServicePage     = lazy(() => import('./pages/TermsOfService'))
const SettingsPage           = lazy(() => import('./pages/SettingsPage'))   // 설정 페이지
const InquiryPage            = lazy(() => import('./pages/InquiryPage'))    // 문의하기 페이지
const LandingV1              = lazy(() => import('./pages/LandingV1'))       // 비교 버전 1: 밝은 배경
const LandingV2              = lazy(() => import('./pages/LandingV2'))       // 비교 버전 2: 검정+줄무늬
const LandingV3              = lazy(() => import('./pages/LandingV3'))       // 비교 버전 3: 검정+스포트라이트
const LandingV4              = lazy(() => import('./pages/LandingV4'))       // 비교 버전 4: 볼드/임팩트 (오렌지)
const LandingV5              = lazy(() => import('./pages/LandingV5'))       // 비교 버전 5: 매거진/뉴스레터 (크림+레드)

// ── SEO 콘텐츠 가이드 페이지 (검색엔진 유입용) ──────────────────────────────
const GuideHub               = lazy(() => import('./pages/guide/GuideHub'))               // 가이드 허브 (/guide)
const SeveranceGuide         = lazy(() => import('./pages/guide/SeveranceGuide'))         // 퇴직금 가이드
const UnemploymentGuide      = lazy(() => import('./pages/guide/UnemploymentGuide'))      // 실업급여 가이드
const WeeklyAllowanceGuide   = lazy(() => import('./pages/guide/WeeklyAllowanceGuide'))   // 주휴수당 가이드
const AnnualLeaveGuide       = lazy(() => import('./pages/guide/AnnualLeaveGuide'))       // 연차수당 가이드

export default function App() {
  // 스플래시 화면 표시 여부 (최초 접속 시 true, 2.3초 후 false로 전환)
  const [showSplash, setShowSplash] = useState(true)

  // ── Render 콜드스타트 사전 워밍업 (App 마운트 시 1회 실행) ─────────────────
  // Render 무료 티어는 15분 이상 요청이 없으면 서버를 절전 상태로 전환합니다.
  // 앱이 처음 열리는 순간 즉시 /health를 호출해 서버를 미리 깨워 둡니다.
  // 사용자가 계산 버튼을 누를 때쯤 서버가 이미 준비되어 콜드스타트를 줄입니다.
  // api.ts의 IIFE 워밍업과 이중 보호 역할을 합니다.
  useEffect(() => {
    // VITE_API_URL 환경변수에서 백엔드 주소를 가져옵니다.
    // 개발 환경: 빈 문자열(Vite 프록시가 /api/* → localhost:8000 으로 중계)
    // 프로덕션: https://coupang-severance-api.onrender.com
    const apiUrl =
      typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // 끝 슬래시 제거
        : '/api'

    // fetch는 axios보다 번들 크기 부담이 없어 워밍업 단건 요청에 적합합니다.
    fetch(`${apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000), // 15초 이내 응답 없으면 자동 취소
    }).catch(() => {
      // 워밍업 실패는 조용히 무시합니다.
      // 서버가 이미 깨어 있거나 네트워크 문제여도 앱 동작에는 영향 없습니다.
    })
  }, []) // [] — 앱 마운트 시 딱 한 번만 실행

  return (
    <BrowserRouter>
      {/* 전체 앱을 BrowserRouter로 감싸 라우팅 기능을 활성화합니다. */}
      <GoogleOAuthProvider clientId="500583164090-bonkp1jjnnlnc79psaut6egelreea23l.apps.googleusercontent.com">
        {/* Google Identity Services 제공자로 AuthProvider를 감싸 Google OAuth 기능을 활성화합니다. */}
        <AuthProvider>
          {/* AuthProvider 안에서만 useAuth 훅을 사용할 수 있으므로, 라우트 전체를 감싸 줍니다. */}

        {/* 스플래시 화면: 앱 최초 접속 시 z-index 9999로 모든 UI 위에 표시됩니다.
            2.3초 후 페이드 아웃되며 사라집니다. 뒤의 앱은 정상 렌더링 유지. */}
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

        <AnimatedBackground /> {/* 모든 페이지 뒤에 공통으로 깔릴 배경 애니메이션입니다. */}

        {/* Suspense: lazy 컴포넌트가 아직 로딩 중일 때 LoadingOverlay를 보여줍니다.
            lazy 컴포넌트는 반드시 Suspense 안에 있어야 합니다. */}
        <Suspense fallback={<LoadingOverlay />}>
        <Routes>
          {/* ── 네비바 없는 독립 페이지 ── */}
          {/* / 경로: 랜딩페이지 (마케팅/SEO 진입점) — 첫 방문자가 보는 서비스 소개 페이지 */}
          <Route path="/" element={<LandingV1 />} />
          {/* /intro: 브랜드 인트로 애니메이션 (로고 리빌 6초 스플래시) */}
          <Route path="/intro" element={<Intro />} />
          {/* OAuth 콜백: 로그인 처리 후 리다이렉트 */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* 로그인 페이지: 독립 UI로 표시 */}
          <Route path="/login" element={<LoginPage />} />
          {/* 온보딩 페이지: 최초 로그인 후 추가 정보 입력 */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          {/* 관리자 페이지: 자체 사이드바 네비 보유 */}
          <Route path="/admin" element={<AdminPage />} />
          {/* 약관 페이지 — /terms/* 경로와 /privacy-policy, /terms-of-service 경로 모두 지원 */}
          <Route path="/terms/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms/service" element={<TermsOfServicePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />   {/* MySettingsTab 연결 경로 */}
          <Route path="/terms-of-service" element={<TermsOfServicePage />} /> {/* MySettingsTab 연결 경로 */}
          {/* 문의하기 페이지 — MySettingsTab "고객센터/문의하기" 연결 */}
          <Route path="/inquiry" element={<InquiryPage />} />
          {/* 설정 페이지 — 헤더 드롭다운 "설정" 클릭 시 이동 */}
          <Route path="/settings" element={<SettingsPage />} />
          {/* 랜딩페이지 — Layout 없이 독립 풀페이지, SEO/공유용 (LandingV1 디자인 반영) */}
          <Route path="/landing" element={<LandingV1 />} />
          {/* HERO 비교 버전 — /v1, /v2, /v3, /v4, /v5 로 각각 접근 */}
          <Route path="/v1" element={<LandingV1 />} />
          <Route path="/v2" element={<LandingV2 />} />
          <Route path="/v3" element={<LandingV3 />} />
          <Route path="/v4" element={<LandingV4 />} />
          <Route path="/v5" element={<LandingV5 />} />

          {/* ── 네비바(TopNav + BottomNav)가 있는 일반 페이지 ──
              Layout 컴포넌트가 Outlet을 통해 중첩 라우트를 렌더링합니다. */}
          <Route element={<OnboardingGuard><Layout /></OnboardingGuard>}>
            {/* 메인 홈 화면 */}
            <Route path="/home" element={<Home />} />
            {/* 채용정보 피드 */}
            <Route path="/jobs" element={<JobsPage />} />
            {/* 계산기 허브 (4개 서비스 선택) */}
            <Route path="/calculator" element={<CalculatorPage />} />
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
            {/* ── SEO 콘텐츠 가이드 페이지 — 로그인 불필요, 검색엔진 크롤링 가능 ── */}
            <Route path="/guide" element={<GuideHub />} />
            <Route path="/guide/severance" element={<SeveranceGuide />} />
            <Route path="/guide/unemployment" element={<UnemploymentGuide />} />
            <Route path="/guide/weekly-allowance" element={<WeeklyAllowanceGuide />} />
            <Route path="/guide/annual-leave" element={<AnnualLeaveGuide />} />
            {/* 정의되지 않은 경로는 메인 화면으로 */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
        </Suspense> {/* Suspense 닫기 — Suspense 범위 밖의 컴포넌트는 항상 즉시 렌더링됩니다. */}
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
      </GoogleOAuthProvider>
    </BrowserRouter>
  ) // 라우터, 인증, 공통 배경을 모두 포함한 앱 전체를 반환합니다.
}

