# 더블 리뷰 기록 — 결제가이드 / 문의 / 설정 클러스터

- 브랜치: `redesign/web-layout` · 색: 블루 메인 + 회색 중립 + 의미색(danger/warning). 무지개·글래스 제거
- 대상: `/payment`(PaymentGuide, Layout 내·다크 프리미엄 카드) · `/inquiry`(InquiryPage, 독립) · `/settings`(SettingsPage→공유 MySettingsTab)
- 검증: Playwright 320/375/768/1280px, WCAG 대비 실측, DOM 무지개/글래스 스캔
- 작성일: 2026-06-28 · **최종 판정: PASS (양 리뷰어 FAIL → 지적 전건 수정 후 재실측)** · tsc 0 · 로직 무관(UI)

## 1. 변경
- InquiryPage: 보라 그라데(`from-blue-50 via-white to-purple-50`)→`from-brand-bg via-white to-white`, 카드 글래스(`border-gray-100/50` 반투명·rounded-[28px])→솔리드 `border-line` rounded-xl, 하드코딩 hex→토큰, amber 안내→warning 의미색
- PaymentGuide: 골드(비팔레트)→다크 중립 카드 + 브랜드 블루 액센트, Container narrow, 헤더 top-14
- SettingsPage: max-w 640, 뒤로버튼 44px, 토큰화. MySettingsTab(공유 컴포넌트) 전면 토큰화

## 2. 더블리뷰 — 양 리뷰어 ❌ 배포 불가 → 수정
| # | 결함 (실측) | 리뷰어 | 수정 |
|---|------------|--------|------|
| 1 | PaymentGuide 결제버튼 `bg-brand`(#3182f6) 흰텍스트 대비 **3.71** < 5.41 | A | `bg-brand-strong`(#1B64DA, 5.41) / hover brand-700 |
| 2 | Settings·Payment **헤더 글래스**(`backdrop-blur-xl/md`) 잔존 | B 차단 | 두 헤더 `bg-[#F2F4F6]`/`bg-page` **솔리드**(blur 제거) |
| 3 | MySettingsTab 비팔레트: `text-emerald-500`·`bg-blue-50`·`bg-[#3182f6]`·`text-red-400/500`·slate | B 중대 | emerald→accent-600, blue-50→brand-bg, 흰텍스트 저장버튼→brand-strong, "보기"링크→brand-strong, red→danger, slate→line/page/ink |
| 4 | 텍스트 대비 AA 미달: 문의 캡션 `ink-500`(#8B95A1) **3.04**, 필수표시 `*` `text-brand` **3.71** | B 중대 | 캡션→`ink-600`(4.62), 별표→`brand-strong`(5.41) |
| 5 | PaymentGuide top-14 vs TopNav 1px 겹침 | B 경미 | 비차단(앱 전역 top-14 통일 유지) |

## 3. 수정 후 실측
- 문의 필수표시 `*` `rgb(27,100,218)` 흰배경 대비 **5.41** ✅ / 캡션 `rgb(107,118,132)` 대비 **4.62** ✅
- PaymentGuide 결제버튼 배경 `#1B64DA`(B 재측정 13.94 다크카드 위), 헤더 `backdrop-blur` 정적 0건 솔리드 ✅
- SettingsPage 헤더 솔리드(blur 0), MySettingsTab 비팔레트 클래스 **0** ✅
- 3페이지 320/375/768/1280 가로 오버플로 0, 무지개 클래스 0, 동일색 0, tsc 0

## 4. 결정·남은 개선점(비차단)
- **헤더 blur 정책**: 공유 nav(TopNav `bg-white/95 backdrop-blur-sm`·BottomNav)는 iOS식 패턴이라 이번 범위 외 유지. 페이지 헤더(Settings/Payment)는 솔리드로 통일. 향후 nav 글래스 제거는 전역 단일 결정으로 별도 처리 권장
- `/settings`는 가짜 세션을 인증으로 인정 안 해 로컬 렌더 시 로그인 화면으로 폴백(리뷰어는 실세션 목으로 렌더 확인). 코드 레벨 토큰화는 grep·tsc로 확정
