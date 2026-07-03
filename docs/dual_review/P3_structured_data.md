# P3 구조화 데이터 — 더블리뷰 아카이브

- 스텝: **SEO P3 — per-page 구조화 데이터 크롤러 노출**
- 대상 커밋: `3b12c5e`
- 리뷰 일자: 2026-07-03 / 라이브 반영 확인

## 1. 무엇을 했나
P1 리뷰어B 발견(per-page JSON-LD가 프리렌더/크롤러에 미포함) 해결.
- **원인**: `PageMeta.tsx`가 JSON-LD를 `<script dangerouslySetInnerHTML>`로 렌더 →
  react-helmet-async가 이 형식을 클라이언트 head 주입 시 누락(title/meta는 주입되나 ld+json만 빠짐).
- **수정1**: children 문자열 형식(`<script>{JSON.stringify(x).replace(/</g,'<')}</script>`)으로 교체. `<` 이스케이프로 `</script>` 조기종료·XSS 차단.
- **수정2(prerender)**: 비홈 라우트에서 정적 index.html의 콘텐츠 스키마(FAQPage/HowTo=홈 전용)를 제거해 중복·불일치 방지. site-wide(WebApplication/Organization/WebSite)·per-page(Helmet)는 유지.

## 2. 검증 (측정 원본)
로컬 프리렌더 + 라이브 curl:

| 라우트 | 스키마 구성 | ld+json |
|---|---|---|
| `/`(홈) | FAQPage·HowTo + site-wide 3 (정적) | 5 |
| `/cfs` | site-wide 3 + **per-page Article·FAQPage**(홈FAQ 제거) | 5 |
| `/guide/severance` | site-wide 3 + **per-page FAQPage·HowTo** | 7 |

라이브 확인: `/cfs` 서버제공 HTML에 `"@type":"Article"`=1·컴팩트 `"@type":"FAQPage"`=1, `/guide/severance` `"@type":"HowTo"`=1 (폴 try8 반영).

## 3. 회귀 (규칙3)
`PageMeta.tsx`는 react-helmet-async로 **`<head>`에만 주입 → 가시 DOM 렌더 0** → 폰트/레이아웃 영향 구조적 불가. `prerender.mjs`는 빌드 스크립트(앱 소스 아님). 계산 로직·운영 DB 불변.

## 4. 리뷰어 A (5축)
| 축 | 판정 | 근거 |
|---|---|---|
| 디자인 | PASS(해당없음) | head 메타. 시각 무변경 |
| UI | PASS | 가시 DOM 무변경 |
| UX | PASS | 크롤러 UX: per-page 리치결과 스키마(FAQ/Article/HowTo) 노출 |
| 코드 | PASS | 원인 주석 명시·이스케이프 안전·중복정리 근거 |
| 회귀 | PASS | head 전용 → 폰트 영향 0 |

**A 종합: PASS.**

## 5. 리뷰어 B (Adversarial)
- **런타임 주입 실검증**: 로컬+라이브 모두 per-page 스키마 실제 노출 확인. children 형식은 프리렌더뿐 아니라 실사용자 클라이언트 렌더에도 적용(부수효과: 실사용자 페이지도 올바른 JSON-LD 획득).
- **중복 FAQPage 리스크 검증**: 홈 정적 FAQ가 하위에 오염되던 문제를 strip으로 해소. 홈은 FAQ/HowTo 유지, 하위는 자체 스키마만.
- **strip이 per-page(컴팩트)를 오제거하지 않나?**: 휴리스틱 `isStatic=줄바꿈 포함`. Helmet 컴팩트(JSON.stringify)는 줄바꿈 없음 → 안전. `/cfs` 컴팩트 FAQPage 보존 확인.
- **놓친 취약점**: strip 휴리스틱이 향후 index.html JSON-LD 미니파이 시 깨질 수 있음(현재 pretty-print라 유효) → 문서화. site-wide 스키마는 전 페이지 유지가 의도.

**B 종합: PASS** + 문서화 1건(strip 휴리스틱 취약성).

## 6. 합의·이견·최종결정
| 항목 | 내용 |
|---|---|
| 합의 | 둘 다 PASS. per-page 구조화 데이터 크롤러 노출 달성(라이브 확인). |
| 이견 | 없음. B가 strip 휴리스틱 취약성 문서화 추가. |
| 최종결정 | **P3 PASS·배포유지.** 잔여: strip 휴리스틱은 index.html JSON-LD를 pretty-print로 유지하는 전제(문서화). |
