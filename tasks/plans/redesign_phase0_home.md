# 기획서 — 디자인 전면 개편 Phase 0(기반) + 홈(/home)

> 브랜치: `redesign/web-layout` · 백업 태그: `pre-redesign-2026-06-27`
> 방향: **B(프리미엄 비주얼) + A(깔끔한 섹션 구분)** = "B-fixed"
> 색 규칙: 블루 메인 · 그린(채용 전용) 보조 · 회색 중립. **무지개색 금지**
> 작성일: 2026-06-27

---

## 0. 현황 진단 (코드 실측)

| 항목 | 현재 상태 | 문제 |
|------|-----------|------|
| 컨테이너 폭 | 모든 페이지 `max-w-[460px]` 고정 | 데스크톱에서 좌우 텅 빔 |
| 내비 | TopNav(로고+로그인만) + BottomNav(5탭) | 데스크톱용 가로 내비 없음 |
| `/home` | **Layout 밖 독립 라우트** (자체 헤더, BottomNav 없음) | 내비 일관성 깨짐 |
| AnimatedBackground | 블루+인디고+퍼플+스카이 5블롭 (`#eef2ff` 베이스) | 무지개·난잡 |
| 공통 컴포넌트 | Button/GlassCard만 존재 | Card/Badge/Chip/SectionHeader 없음 (inline 남발) |
| 홈 색상 | 가이드=인디고/퍼플, 서브카드=violet/amber/emerald | 무지개 |

## 1. 디자인 토큰 (tailwind.config.js)

- **색**: `brand.DEFAULT #3182F6`, `brand.strong #1B64DA`, `brand.bg #EAF2FE`,
  `accent`(그린, 채용 전용) `#06BE7B`/`#05A56C`/`#E6F8F1`,
  중립 `ink.900~400`(텍스트), `line`(보더), `page`(배경),
  의미색 `success/warning/danger`. 기존 `toss.*`는 하위호환 유지.
- **간격**: Tailwind 기본 4px 스케일 = 8pt 그리드 정합(2,3,4,6,8…). 유지.
- **radius**: `sm 8 / md 12 / lg 16 / xl 20 / pill 9999`. (기존 card/btn 유지)
- **shadow**: `card`(은은한 카드), `float`(플로팅 카드 깊이감).

## 2. Pretendard — index.html CDN + tailwind fontFamily 이미 적용. 확인만.

## 3. 반응형 컨테이너 — `<Container>` 컴포넌트 신설
- 모바일: `w-full px-4` 1열
- 태블릿/데스크톱: `max-w-[1080px] mx-auto px-6` + 다단 그리드(페이지가 grid 구성)

## 4. 내비 분기
- **데스크톱(md+)**: TopNav 가로 내비 — 로고 · 홈/채용/계산기/가이드/공지 · 고객센터 · 마이/로그인
- **모바일(<md)**: TopNav 컴팩트(로고+고객센터+로그인) + 기존 BottomNav 유지(`md:hidden`)
- `/home`은 Layout 밖이므로 **Home 내부에서 TopNav/BottomNav 직접 렌더**(App.tsx 라우팅/가드 무수정 → 인증 흐름 리스크 0)

## 5. AnimatedBackground 톤다운
- 5블롭 → 블루 단색 계열 2블롭, 매우 옅게(거의 흰색 `#FBFCFE` 베이스). 퍼플/인디고/스카이 제거.

## 6. 공통 컴포넌트(`src/components/ui/`) 신설 — 토큰 기반
- `Container` · `Card` · `Badge` · `Chip` · `SectionHeader` · `Button`(신규, 기존 Button.tsx는 유지)

## 7. 홈(/home) — "B-fixed"
- **히어로 패널**: 소프트 톤, 좌(카피+CTA)·우(플로팅 결과 미리보기 카드: 누적 카운트/예상금액). 모바일 세로 스택.
- **통계 스트립**: 1분 계산 · 개인정보 보호 · PDF 정밀분석 (라인 아이콘).
- **섹션(A식 구분)**: SectionHeader로 명확히 — `오늘의 채용정보`(그린 액센트) / `계산기`(실업급여·주휴·연차·혜택) / `노동법 가이드`.
- **B 이슈 수정**: 카드 height/baseline 통일(`items-stretch`+동일 패딩), 플로팅 카드가 다음 섹션 침범 안 하게 여백 정리, 그리드 정렬축 통일(동일 gap/컬럼).
- **색 정리**: 서브카드/가이드 무지개 → 블루/그린/중립으로 통일.

## 8. 검증 — 더블 리뷰어
- Reviewer A(총괄): 토큰 일관성·정렬·섹션 구분·반응형(모바일/태블릿/데스크톱)·접근성(명도대비·터치 44px)
- Reviewer B(적대적): 엣지케이스(긴 회사명/주소, 빈 채용, 텍스트 잘림, 하단탭 가림) + A 누락분
- 결과 → `docs/dual_review/redesign_phase0_home.md` (합의/이견 분리). FAIL 시 수정 후 재검수(최대 2회).

## 9. 제약
- main 불가침. `redesign/web-layout`만. dev 서버(localhost:5173) 유지(핫리로드). **Vercel 푸시 금지**(로컬 확인 먼저).

## 10. 변경 파일 (예상)
- 수정: `tailwind.config.js`, `src/styles/index.css`, `src/components/AnimatedBackground.tsx`,
  `src/components/TopNav.tsx`, `src/components/BottomNav.tsx`, `src/components/Layout.tsx`, `src/pages/Home.tsx`
- 신규: `src/components/ui/{Container,Card,Badge,Chip,SectionHeader,Button}.tsx`, `docs/dual_review/redesign_phase0_home.md`
