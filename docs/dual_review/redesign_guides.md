# 더블 리뷰 기록 — 가이드 허브 + 4가이드(SEO 콘텐츠)

- 브랜치: `redesign/web-layout` · 색: 퇴직/실업=브랜드 블루, 주휴/연차=녹색(accent), 회색/의미색. 무지개·글래스 제거
- 대상: `/guide`(허브) + `/guide/severance · /unemployment · /weekly-allowance · /annual-leave`
- 검증: Playwright — 320/375/768/1280px, 히어로 대비, TOC 활성, sticky 충돌, 무지개/동일색 DOM 스캔
- 작성일: 2026-06-28 · **최종 판정: PASS (양 리뷰어 FAIL 5종 수정 후 실측 통과)** · tsc 0 · **계산 로직 무관(설명 콘텐츠)**

## 1. 변경
- 허브 카드/콘텐츠 그룹색 정렬(퇴직·실업=brand-bg, 주휴·연차=accent-bg), 솔리드 카드, max-w 680/허브 760
- InfoBox 의미색(info=brand / warning=warning / tip=accent)
- `accent.700 = #047857` 토큰 신설(흰 배경 텍스트·녹색 버튼 흰텍스트 AA 5.48) → hex 리터럴 32곳 토큰화

## 2. 더블리뷰 — 양 리뷰어 ❌ 배포 불가 판정 → 수정
| # | 결함 (실측) | 리뷰어 | 수정 |
|---|------------|--------|------|
| 1 | UnemploymentGuide TOC 활성 `bg-brand-strong text-brand-strong` = 동일색 대비 **1.00** (글자 안 보임) | A | `bg-brand-bg text-brand-strong` → 실측 **4.80** ✅ |
| 2 | 숫자 뱃지 `bg-brand-strong text-brand-strong` 동일색(1·2·3 안 보임) 8곳 | A 연장검출 | `text-white`(흰 숫자) |
| 3 | 히어로 메인 제목 흰색 미상속 → 전역 `h1~h6{color:#111827}`에 덮여 **검정 렌더**(대비 3.2) 3곳 | A | 히어로 h1/h2에 `text-white` 명시(우선순위 승) → 4페이지 전부 흰색 ✅ |
| 4 | 실업급여(블루 그룹) 강조 `text-[#047857]`(그린) 1곳 = 그룹색 위반 | B | `text-brand-strong` |
| 5 | 목차 `sticky top-4` → TopNav와 **41px 충돌** / hex 리터럴 `#047857`·`#06BE7B` 32곳 | B | `top-14`(56px, TopNav 클리어) / `accent-700`·`accent` 토큰화 |

## 3. 수정 후 실측 (5페이지)
- 히어로 제목: 4페이지 전부 `rgb(255,255,255)` 흰색 ✅ (녹색 히어로 배경 `linear-gradient #047857→#06BE7B` 정상)
- TOC 활성 대비: 실업 4.80 / 퇴직 5.49 / 주휴·연차 13.13 — 전부 ≥4.5 ✅
- accent-700 텍스트: `rgb(4,120,87)` 흰배경 대비 **5.48** ✅ AA
- 320·1280px 가로 오버플로 **0**, 무지개 클래스 **0**, 동일색(색=배경) 요소 **0** — 5페이지 전부 ✅
- tsc 0

## 4. 남은 개선점(비차단)
- TOC 링크 높이 32px(<44 터치타겟), 인라인 상호참조 링크 작음 — 모바일 탭 정확도 개선 여지
- `accent-700`은 신설 토큰(emerald-700 #047857). 향후 다른 화면의 `#047857` 리터럴도 동일 토큰으로 통일 권고
