# P1 프리렌더 — 더블리뷰 아카이브

- 스텝: **SEO P1 — 정적 프리렌더 도입** (크롤러에 완성 HTML 제공)
- 대상 커밋: `eac8bd3`(도입) → `9d17d8c`·`d245155`·`834fa81`·`1ee4797`·`e19ae79`(수정 5) / P2 `067bc99` 동반
- 최종 배포: `e19ae79` (Vercel READY, 프로덕션 반영 확인)
- 리뷰 일자: 2026-07-03

---

## 1. 무엇을 했나 (요약)

순수 SPA라 크롤러가 받던 body가 `<div id=root>`뿐이던 문제를, **앱 코드 무변경**으로 해결.
빌드 후 `scripts/prerender.mjs`가 dist를 로컬 정적서버로 띄우고 헤드리스 크로미움으로
공개 SEO 라우트 17개(홈·랜딩6·가이드5·계산기5)를 렌더 → 각 `dist/<route>/index.html`로 저장.

이번 세션 수정(핵심):
- **워치독이 파일기록 전에 죽이던 버그 해결**: 전체 렌더 후 일괄기록 → **라우트별 즉시 기록(writeRoute)**.
- **대기 축소**: `networkidle0`(서버리스에서 라우트당 15~24s) → `'load'` + 셀렉터 8s/5s + settle 600ms.
- 워치독 150s → 300s. 미사용 `results` 배열(죽은코드) 제거.

---

## 2. 라이브 검증 (측정 원본)

프로덕션 `https://catch-daily-worker.vercel.app` 17라우트 전수 (curl, 서버제공 HTML):

| 결과 | 지표 |
|---|---|
| **17/17** | per-page `<title>` 고유 반영 (SPA 기본 title 아님) |
| **17/17** | per-page canonical/description 단일화 (중복 head 제거 동작) |
| **15/17** | `<h1>` ≥1 존재 |
| 예외 2 | `/guide/weekly-allowance`, `/guide/annual-leave` → h1=0 |
| 예외 1 | `/severance` → h1=2 (이중 H1) |

예외 3건은 **프리렌더 버그가 아님**을 로컬 대조로 확정:
- weekly/annual 가이드: 로컬 프리렌더도 h1=0. 두 가이드 컴포넌트가 히어로 제목을 `<h2>`로 마크업(형제 severance/unemployment 가이드는 h1=1). → **페이지 마크업 문제 = P4(H1) 이관**.
- `/severance` 이중 H1: TopNav 헤더가 `<h1>`("퇴직금 계산기") + SEO 콘텐츠 `<h1>`. 기존 앱 SPA 구조를 프리렌더가 충실히 캡처. → **P4 이관**.

---

## 3. 회귀 (규칙3) — 증거형 판정

SEO P1+P2가 변경한 파일 전량(`git diff --name-only 7be3cce..HEAD`):
`.puppeteerrc.cjs · package.json · package-lock.json · robots.txt · sitemap.xml · scripts/prerender.mjs · vercel.json`

→ **앱 소스(CSS/tsx/ts) 변경 0건.** `index.css` 전역 폰트 `+1.5px !important` override 무관.
→ 폰트 회귀 **구조적으로 불가**(측정 대상 자체가 없음). 계산 로직·운영 DB 불변.

---

## 4. 리뷰어 A (총괄 5축)

| 축 | 판정 | 근거 |
|---|---|---|
| 1 디자인 | PASS(해당없음) | 빌드 인프라. UI/토큰/색 무변경 |
| 2 UI | PASS | 앱 UI 소스 0건 변경 |
| 3 UX | PASS | 크롤러 UX: 빈 body→완성 HTML. 빌드 실패 시 SPA graceful(`\|\| echo skip`+exit 0) |
| 4 코드 | PASS | 한국어 주석 충실, writeRoute 헬퍼 분리, 죽은코드(results) 제거, 대기 근거 주석 |
| 5 회귀 | PASS | 앱 소스 0건 → 폰트 회귀 불가. 계산/DB 불변 |

**A 종합: PASS.** 발견 이관: `/severance` 이중H1·가이드2건 H1부재 → P4.

## 5. 리뷰어 B (Adversarial — A 재검토 + 놓친 영역)

- **A의 "17/17" 주장 검증**: 실제 h1은 15/17. B가 나머지 2건이 프리렌더 실패인지 추궁 → 로컬 대조로 페이지 마크업(P4)임을 확인, 프리렌더는 정상. **A 판정 유지하되 수치 정정**.
- **A가 놓친 결정적 발견 — per-page JSON-LD 미캡처**: `/cfs` 프리렌더 HTML의 스키마 타입이 홈과 완전 동일(정적 5블록). CoupangCfsSeverance가 PageMeta로 넘기는 **FAQPage(7문답)·Article 스키마가 프리렌더에 미포함**. react-helmet-async가 title/meta/canonical은 head 주입(캡처됨)하나 `jsonLd <script>`는 미캡처. → **P3(구조화 데이터)의 구체 과제로 확정**.
- **stale 리스크**: 프리렌더는 빌드시점 콘텐츠를 정적고정. 가이드/랜딩은 정적이라 무방하나, 향후 동적 콘텐츠 라우트 추가 시 프리렌더 대상서 제외 필요 → 문서화.
- **cleanUrls×rewrites 상호작용**: `/route`→`/route/index.html` 서빙이 라이브 per-page title 15/17로 입증. OK.
- **워치독 300s 안전성**: Vercel 빌드 45분 한도 내 여유. + 즉시기록으로 부분완료 보존 → 워치독 리스크 완화. OK.

**B 종합: PASS**(P1 인프라 목표 달성) + **이관 발견 추가**: P3(Helmet JSON-LD 미캡처), P4(H1 정리).

---

## 6. 합의 · 이견 · 최종결정

| 항목 | 내용 |
|---|---|
| **합의** | 둘 다 PASS. 프리렌더 인프라 완료(17/17 파일 생성·서빙, per-page title/meta/canonical/본문). |
| **이견** | 없음. B가 A 미발견 1건(per-page JSON-LD 미캡처→P3) 추가. A의 "17/17 h1" 수치는 "15/17"로 정정. |
| **최종결정** | **P1 PASS · 배포 유지.** 후속 이관 3건: ①per-page JSON-LD 미캡처→**P3** ②`/severance` 이중H1·③가이드2건 H1부재→**P4**. |

---

## 7. 후속 스텝 이관 목록 (추적용)

- [ ] **P3**: 프리렌더가 per-page `jsonLd <script>`(FAQPage/Article 등)를 캡처하도록 수정 — Helmet 주입분이 head에 안 담기는 원인 해결(정적 주입 or 캡처 방식 개선).
- [ ] **P4**: `/severance` 이중 H1 해소(TopNav 제목 h1→적정 태그) + weekly/annual 가이드 히어로 `<h2>`→`<h1>` 승격.
