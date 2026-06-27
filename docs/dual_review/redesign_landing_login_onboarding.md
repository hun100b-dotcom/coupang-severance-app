# 더블 리뷰 기록 — 랜딩(/) + 로그인 + 온보딩 (공개 진입)

- 브랜치: `redesign/web-layout` · 색: 블루 메인 + 그린(채용/긍정) + 회색 + 의미색(danger=손실/긴급). 무지개·글래스 제거
- 대상: LandingV1(`/`, 1333줄 마케팅·자체 nav) · Login(`/login` OAuth) · Onboarding(`/onboarding`)
- 검증: Playwright 320/375/768/1280px, inline-style + computed-style hex 스캔, WCAG 대비, nav 스크롤 동작
- 작성일: 2026-06-28 · **최종 판정: PASS (A PASS / B FAIL → 차단·중대 전건 수정 후 재실측)** · tsc 0 · 빌드 0 · 로직 무관(UI/OAuth)

## 1. 변경 (핵심: 색이 Tailwind 클래스가 아니라 inline style hex)
- LandingV1: **보라(#7c3aed/#a855f7) 24곳 + 주황(#f97316)·청록(#0891b2) 아이콘 그라데 → 블루/그린 전수 치환**, 보라 파스텔 배경(#f5f0ff)→블루 파스텔(#eaf2fe), 보라 blob→블루 blob
- 글래스 제거: 섹션 흰카드 `bg-white/90 backdrop-blur-sm`→솔리드, SectionBridge pill `white/0.85+blur(8px)`→솔리드
- Onboarding: 보라 배경 그라데→brand-bg. Login: OAuth 카카오/구글 브랜드색 유지(예외)
- SplashScreen(전역): 진입 1.8초 보라 프로그레스바/배경 → 블루

## 2. 더블리뷰
| 리뷰어 | 판정 | 핵심 |
|--------|------|------|
| A 총괄 | **PASS** | 본문 무지개0·글래스0·오버플로0·버튼대비≥4.5·tsc0. 단 **SplashScreen:79 보라 프로그레스바** 1건 발견(전역, 동일 PR 처리 권고) |
| B 적대 | **FAIL** | ① **[차단] nav 스크롤 배경전환 죽음** ② 라이트 본문 대비 다수 미달 |

## 3. B 지적 → 수정 (재실측 통과)
| # | 결함 (실측) | 수정 |
|---|------------|------|
| 차단 | nav 스크롤 전환 무력화 — body가 스크롤 컨테이너라 `window.scrollY`=0 고정(line 144) | 스크롤 감지를 `window.scrollY ‖ documentElement.scrollTop ‖ body.scrollTop` + capture 리스너로 → **실측 스크롤 후 nav 투명→rgba(255,255,255,.95)+blur 전환 확인** |
| 중대 | 초록 CTA `#059669` 흰텍스트 **3.77** | 그라데 `#047857→#03664a`(둘 다 ≥5.48) |
| 중대 | 푸터 `#94a3b8` on 라이트 **2.38** | `#475569`(≥7) |
| 중대 | 빨강 경고 텍스트 `#ef4444` 3.49~3.76 | `color:#ef4444`(텍스트 6곳)→`#dc2626`(4.83) |
| 중대 | Login 회색 "비로그인/홈으로" `#8B95A1` 2.76, "(일부 제한)" `#B0BAC5` **1.78**, 약관 "보기" `#3B82F6` 3.52 | ink-700/ink-600/brand-strong 토큰화(전부 ≥4.5) |
| A발견 | SplashScreen 보라 | `#7c3aed→#1d4ed8`, `#f5f0ff→#eaf2fe` |
| 경미 | 주석 "Accent #1d4ed8(보라)" 오기 | "(딥블루)"로 정정 |

## 4. 수정 후 실측
- nav: 스크롤 전 transparent → 후 `rgba(255,255,255,.63→.95)`+blur ✅ 전환 동작
- 초록 CTA: `#047857→#03664a` 흰텍스트, 푸터 대비 16.54
- 보라/주황/청록 inline+computed+gradient 2nd stop **0건**(양 리뷰어 전수 확인), 글래스 0, 320/768/1280 오버플로 0, tsc/build 0

## 5. 남은 개선점(비차단)
- 320px Login 구글 위젯 `width={360}` 고정폭이 컨테이너 우측 클리핑(서드파티 한계, 페이지 가로스크롤 0). 필요 시 `width={300}`/반응형
- 앱 버전표기 `#94a3b8`(전역 공통) 2.56 — 별도 전역 정리 대상
- 공유 nav(TopNav/BottomNav) 글래스는 전역 단일 결정으로 별도 처리 권장
