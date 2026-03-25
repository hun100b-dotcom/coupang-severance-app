// 전역 레이아웃 컴포넌트
// - 상단 네비바(TopNav) + 페이지 콘텐츠(Outlet) + 하단 네비바(BottomNav)를 묶어줍니다.
// - React Router v6의 중첩 라우트(Outlet) 패턴을 사용합니다.
// - TopNav 높이(56px)만큼 상단 패딩, BottomNav 높이(60px)만큼 하단 패딩을 적용합니다.

import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <>
      {/* 상단 고정 네비바 */}
      <TopNav />

      {/* 페이지 콘텐츠 영역
          - pt-14: TopNav(h-14=56px) 높이만큼 상단 여백
          - pb-[60px]: BottomNav(60px) 높이만큼 하단 여백
          - min-h-screen: 짧은 페이지도 화면 전체 채우기 */}
      {/* pb-[72px]: BottomNav 높이(64px) + 여유 8px */}
      <main className="pt-14 pb-[72px] min-h-screen">
        <Outlet />
      </main>

      {/* 하단 고정 탭 네비바 */}
      <BottomNav />
    </>
  )
}
