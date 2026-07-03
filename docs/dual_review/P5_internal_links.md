# P5 내부 링크 — 더블리뷰 아카이브

- 스텝: **SEO P5 — 크롤 가능한 내부 링크 메시**
- 대상 커밋: `5ac23ca`(P5a 랜딩), `a9f29dc`(P5b 가이드)
- 리뷰 일자: 2026-07-03

## 1. 무엇을 했나
문제: 랜딩 6개가 `navigate()` 버튼만 있어 크롤러가 페이지간 경로를 못 따라가 고립(프리렌더 `<a href>` 내부링크 0). 가이드도 계산기·랜딩 미연결.
해결:
- `components/seo/RelatedLinks.tsx` 신설: 라우트별 링크맵을 react-router `<Link>`(=실제 `<a href>`)로 렌더 → 크롤러 순회+링크에쿼티+프리렌더 정적 캡처. 디자인 up-* 토큰(블루/그린/회색)·무지개 금지.
- 랜딩 6종(P5a)·가이드 4종(P5b)에 삽입.

## 2. 검증 (프리렌더 크롤가능 내부링크 수)
| 페이지 | 링크수 | 대상 |
|---|---|---|
| /coupang-cfs-severance-calculation | 4 | /severance·/guide/severance·형제랜딩2 |
| /coupang-severance-calculator | 4 | 계산기·가이드·형제랜딩2 |
| /coupang-unemployment-calculator | 3 | /unemployment·/guide/unemployment·랜딩 |
| /day-worker-severance-guide | 3 | 계산기·가이드·랜딩 |
| /coupang-part-time-severance-method | 4 | 계산기·가이드·랜딩2 |
| /daily-worker-severance-28days | 3 | 계산기·가이드·랜딩 |
| /guide/severance | 6 | 계산기·랜딩2·형제가이드3 |
| /guide/unemployment | 5 | 계산기·랜딩·형제가이드3 |
| /guide/weekly-allowance | 4 | 계산기·형제가이드3 (기존 0→4) |
| /guide/annual-leave | 4 | 계산기·형제가이드3 (기존 0→4) |

→ 랜딩↔계산기↔가이드↔랜딩 내부링크 메시 완성. (라이브 폴 확인)

## 3. 회귀 (규칙3)
`git status`: 변경은 랜딩6·가이드4 tsx + 신규 컴포넌트뿐, **CSS/index.css/tailwind 변경 0건 · 추가 전용**. 기존 요소 computed font-size 불변(구조적). 계산 로직·운영 DB 불변.

## 4. 리뷰어 A (5축)
| 축 | 판정 | 근거 |
|---|---|---|
| 디자인 | PASS | up-* 토큰·흰카드·브랜드 액센트만. 무지개 없음 |
| UI | PASS | 정렬·radius(2xl)·hover 상태 일관. 공용 컴포넌트로 재사용 |
| UX | PASS | 관련 페이지 탐색 동선 추가(막다른 랜딩 해소). aria-label 부여 |
| 코드 | PASS | DRY(중앙 링크맵)·1줄 삽입·한국어 주석·미스맵 시 null 안전 |
| 회귀 | PASS | 추가 전용·CSS 무변경 |

**A 종합: PASS.**

## 5. 리뷰어 B (Adversarial)
- **크롤가능성 실검증**: `navigate()`가 아닌 `<Link>`(=`<a href>`)인지 프리렌더 HTML로 확인 — 전 페이지 `<a href="/...">` 실재. 크롤러 순회 가능.
- **링크맵 정합성**: 모든 `to` 대상이 sitemap 등재된 실존 라우트인지 대조 — 계산기/가이드/랜딩 전부 유효(404 링크 없음).
- **과잉 링크(link farm) 리스크**: 페이지당 3~6개로 절제 — 스팸 신호 아님. 관련성 높은 큐레이션.
- **접근성**: `<nav aria-label>` + `<ul>/<li>` 시맨틱. 스크린리더 순회 가능.
- **놓친 점**: 홈(`/`)은 이번 대상 아님(공개 랜딩 컴포넌트, 별도 버튼 CTA). 향후 홈에도 크롤링크 추가 여지 → 문서화(선택).
- **중복 링크 우려**: 가이드 severance는 기존 형제가이드 링크 + RelatedLinks가 형제가이드 재링크 → 동일 대상 2링크 가능. 무해(첫 링크 우선)하나 인지 → 문서화.

**B 종합: PASS** + 문서화 2건(홈 미포함·형제가이드 중복링크, 둘 다 무해).

## 6. 합의·이견·최종결정
| 항목 | 내용 |
|---|---|
| 합의 | 둘 다 PASS. 내부링크 메시 완성(랜딩 6·가이드 4, 크롤가능 `<a href>`). |
| 이견 | 없음. B가 홈 미포함·형제가이드 중복(무해) 문서화 추가. |
| 최종결정 | **P5 PASS·배포유지.** 선택 후속: 홈 크롤링크(효과 대비 리스크 낮음). |
