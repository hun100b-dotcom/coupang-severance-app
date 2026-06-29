# 더블리뷰 — 폴리시 패스 #1: 모바일 내비 (BottomNav 320px + nav 글래스 통일)

날짜: 2026-06-29 · 브랜치: main · 범위: 디자인 디테일(UI만), 계산 로직 무변경

## 변경 요약
- **P0-1 BottomNav 320px 잘림 수정**: 탭 `flex-shrink-0 flex-1` + `minWidth:72px`/padding 6px → `flex-1` + `minWidth:56px`/padding 4px. 5탭 × 56 = 280 ≤ 320 이라 `flex-1`이 균등 분배 → 가로 스크롤(스크롤바 숨김)·마지막 탭 잘림 해소.
- **P2-2 nav 글래스 통일**: TopNav `bg-white/95 backdrop-blur-sm`, BottomNav `bg-white/97 backdrop-blur-md` → 둘 다 `bg-white`(솔리드). 리디자인 전역 솔리드 방향(세션15-8)과 일치, 두 nav 처리 통일.

파일: `frontend/src/components/BottomNav.tsx`, `frontend/src/components/TopNav.tsx` (2파일)

## 실측 증거 (preview MCP, dev 5173)
- 320px: 5탭 각 64px, 총 320px, `scrollable:false`, `anyClip:false`, 모든 라벨("마이페이지" 포함) 표시, 터치 높이 64px(≥44px).
- 375px: 5탭 각 75px, 모든 라벨 박스 내 fit, 스크롤 없음.
- 두 nav computed `backgroundColor: rgb(255,255,255)`, `backdropFilter: none`.
- 데스크톱 1280px: 홈/채용/계산기 오버플로 0(회귀 없음). 콘솔 에러 0. `npm run build`(tsc) 통과.

## A 총괄 리뷰 — VERDICT: PASS
- 5탭 균등분배 회귀 없음 / 자동 중앙스크롤 useEffect는 스크롤 폭 0일 때 clamp 되어 무해 / 솔리드 통일이 z-index·보더·가독성 정상 / 접근성(aria-label·aria-current·터치타깃) 유지 / md:hidden 분기 영향 없음.
- 블로커·메이저 0.

## B 적대 리뷰 — VERDICT: PASS
- 6개 공격 포인트(긴 라벨/i18n, 인디케이터 정렬, 초소형 truncate, 중앙스크롤 부작용, 솔리드 경계, WCAG 대비) 전부 블로커 재현 실패. 320px 하한·현재 5탭 라벨 기준 무결.
- **보너스 지적(반영함)**: 인라인 `minWidth:56px`가 Tailwind `min-w-0` 클래스를 이겨 `min-w-0`가 죽은 코드 → 제거하고 의도(56px floor) 주석화.
- 잔여 비차단: 6탭 이상 추가/280px 미만 기기에서는 라벨 truncate 없음(명세 하한 320 밖). 향후 탭 증설 시 재검토.

## 결론
A·B 모두 PASS. B의 죽은 코드 지적 반영 후 커밋.
