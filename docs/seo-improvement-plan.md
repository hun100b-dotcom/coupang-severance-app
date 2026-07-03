# CATCH SEO 개선 상세 실행 플랜 — 2026-07-03

> **성격**: 플랜(설계 문서)만. **코드·커밋·구현 없음.** 승인 후 별도 스텝에서 구현.
> **감사 근거**: `frontend/index.html`, `frontend/src/components/PageMeta.tsx`, `frontend/vercel.json`, `frontend/vite.config.*`, `frontend/public/{sitemap.xml,robots.txt}`, `frontend/src/App.tsx`, `frontend/src/pages/landing/*`, `docs/seo-rank-history.md`.
> **⛔ 불변**: 28일 블록 등 **계산 로직 · 운영 DB · `index.css` 전역 폰트 +1.5px override** 미변경. 기존 라우팅·기능 보존.

---

## 0. 핵심 진단 (한 줄)

> **온페이지 SEO(메타·OG·JSON-LD·키워드 랜딩 6개·가이드 5개·sitemap·robots)는 이미 잘 갖춰져 있다. 그런데 79일 10회 측정 내내 6개 타깃 키워드가 전부 미노출(개선 0%)인 이유는 하나 — 순수 클라이언트 렌더링 SPA라 크롤러가 받는 HTML `<body>`가 `<div id="root"></div>` 하나뿐이기 때문이다.** 페이지별 제목·본문(H1/H2)·per-page 메타(Helmet)·per-page JSON-LD가 **서빙 HTML에 없고 JS 실행 후에야 생성**된다. → **프리렌더링(빌드 시 라우트별 정적 HTML 생성)이 이번 개선의 1순위 레버.** 나머지는 이미 있는 것을 크롤러에게 "보이게" 하는 보조 작업.

근거: 빌드 산출물 `frontend/dist/index.html` 의 `<body>` = `<div id="root"></div>` 뿐(실측). 랜딩 `CoupangCfsSeverance.tsx`(328줄, H1+FAQ+ARTICLE JSON-LD)는 소스엔 풍부하나 서빙 HTML엔 미포함.

---

## 1. 현황 진단표

| 영역 | 상태 | 근거(파일·라인) |
|------|------|-----------------|
| 전역 메타(title/desc/keywords/canonical) | ✅ 있음(우수) | `index.html` title·description·keywords·canonical |
| GSC·Naver 소유권 인증 | ✅ 있음 | `index.html` google-site-verification / naver-site-verification |
| OG/Twitter 카드 | ✅ 있음(og-image 1200×630) | `index.html` og:* / twitter:* · `public/og-image.png` |
| 전역 JSON-LD | ✅ 5종(WebApplication·Organization·WebSite+SearchAction·**FAQPage 8문답**·**HowTo 4스텝**) | `index.html` `<script type=application/ld+json>` ×5 |
| 페이지별 메타 주입 | ✅ `react-helmet-async`+`PageMeta` (title/desc/canonical/OG/Twitter/JSON-LD/noIndex) | `PageMeta.tsx` · `main.tsx:43 HelmetProvider` · 18개 페이지 사용 |
| 키워드 랜딩 페이지 | ✅ 6개(URL 키워드화) | `App.tsx:189~199` `/coupang-severance-calculator` `/coupang-cfs-severance-calculation` 등 |
| 가이드(블로그성) 페이지 | ✅ 5개 | `App.tsx:235~239` `/guide` `/guide/severance` 등 |
| sitemap.xml | ⚠️ 있으나 정리 필요 | `public/sitemap.xml`(21 URL, 아래 문제) |
| robots.txt | ✅ 있음(admin/auth/mypage 차단+sitemap 명시) | `public/robots.txt` |
| **프리렌더링/SSR** | ❌ **없음 (핵심 결함)** | `vite.config`=`plugins:[react()]`만 · `vercel.json` rewrites `/(.*)→/index.html` · dist body 빈 셸 |
| 크롤러 관점 본문 | ❌ **빈 body** | `dist/index.html` `<body><div id=root></div>` |
| 실측 순위 | ❌ 6키워드 전부 미노출(79일 0%) | `docs/seo-rank-history.md`(10차) |

### sitemap 세부 문제
| 문제 | 근거 |
|---|---|
| `/landing` 포함(→`/`로 redirect되는 URL, 중복 신호) | sitemap loc `/landing` vs `vercel.json redirects /landing→/` |
| `/my-benefits`·`/notices` 포함(로그인 필요·크롤러 무가치) | sitemap loc + `App.tsx` Layout 내부(인증) |
| `lastmod` 고정(2026-05-20 등 과거) | 재크롤 우선순위 신호 약화 |
| 키워드 랜딩/가이드는 대부분 포함(양호) | — |

### 리치 스니펫 관점
- FAQPage/HowTo JSON-LD가 전역+페이지별로 있으나, **프리렌더 전에는 크롤러가 per-page JSON-LD를 초기 HTML에서 못 봄**(전역 index.html JSON-LD만 확실히 수집). 프리렌더 시 per-page FAQ가 각 페이지 URL에 정확히 실려 리치 스니펫 가능성↑.

---

## 2. 솔루션별 상세 실행안

### ① 페이지별 메타 + 프리렌더링 (★최우선)

**목표**: 크롤러가 각 공개 URL에서 **완성된 HTML(제목·H1·본문·per-page 메타·JSON-LD 포함)** 을 즉시 받게 한다.

**기술 선택지 & 트레이드오프**

| 안 | 방식 | 장점 | 단점/리스크 | Vercel 적합성 | 권장 |
|----|------|------|-------------|---------------|------|
| **A. 프리렌더(puppeteer 스냅샷)** `@prerenderer/rollup-plugin` or `vite-plugin-prerender` or postbuild `react-snap` 류 | 빌드 후 헤드리스 크롬으로 지정 라우트 렌더→정적 HTML 저장. **SPA 코드 거의 무변경**, Helmet/본문 그대로 캡처 | 빌드에 헤드리스 크롬 필요(시간·메모리), 동적 데이터 페이지(계산기 API 호출)는 스냅샷 시점 데이터 주의 | 빌드에 `@sparticuz/chromium` 등 필요 · 정적 콘텐츠 라우트만 대상이면 안전 | **✅ 최소변경 1순위** |
| B. SSG(`vite-react-ssg`) | React Router 라우트를 빌드시 정적 생성. Helmet-async 지원 | 깔끔한 정적화·성능↑ | 라우트 정의 방식 리팩터(엔트리/route config 변경) 필요 | 순수 정적 output → Vercel 친화 | △(중기 정공법) |
| C. `vike`/`vite-plugin-ssr` | 파일기반 SSR/SSG 프레임워크 | 강력·유연 | 구조 대공사 | 가능하나 과함 | ❌(과대) |
| D. Next.js 이관 | 완전 SSR | SEO 최강 | 전면 재작성 | — | ❌(범위 밖) |

**권장**: **A안(프리렌더 스냅샷)** — 지금의 잘 만든 SPA·PageMeta·랜딩을 **코드 거의 그대로 두고** 크롤러에게만 완성 HTML을 제공. 계산기 상호작용은 hydration 후 그대로 동작.

**프리렌더 대상 라우트(공개·정적 콘텐츠 위주)**
- 랜딩: `/`, `/coupang-severance-calculator`, `/coupang-unemployment-calculator`, `/day-worker-severance-guide`, `/coupang-part-time-severance-method`, `/daily-worker-severance-28days`, `/coupang-cfs-severance-calculation`
- 가이드: `/guide`, `/guide/severance`, `/guide/unemployment`, `/guide/weekly-allowance`, `/guide/annual-leave`
- 계산기 진입(콘텐츠 있는 셸): `/severance`, `/unemployment`, `/weekly-allowance`, `/annual-leave`, `/calculator`
- **제외**: `/admin`·`/auth/*`·`/mypage`·`/login`·`/onboarding`·`/settings`·`/my-benefits`·`/notices`·`/payment`(인증/무가치, robots도 차단).

**대상 파일/변경 범위**: `frontend/vite.config.ts`(플러그인 추가) 또는 `package.json`(postbuild 스크립트) + 프리렌더 대상 라우트 목록 파일 1개. **애플리케이션 컴포넌트 코드는 변경 없음**(A안 핵심 이점).
**리스크**: 계산 로직·라우팅·전역 폰트 override **무관/무변경**. 빌드 시간↑(헤드리스). 동적 데이터 페이지는 "정적 콘텐츠 부분만" 프리렌더(계산 결과는 hydration 후 클라이언트). SPA fallback(`vercel.json` rewrites)은 유지하되, 프리렌더된 정적 파일이 우선 서빙되도록 output 확인.
**검증**: 빌드 후 `dist/<route>/index.html`(또는 `<route>.html`)에 **H1·본문·per-page `<title>`·JSON-LD가 실제로 들어있는지** grep · Google **Rich Results Test**/**URL Inspection(GSC)** 로 "렌더된 HTML" 확인 · `curl`로 JS 없이 본문 노출 확인.

### ② FAQ/HowTo JSON-LD 구조화 데이터 (페이지 매핑 정교화)

**현황**: 전역 FAQPage(8)·HowTo(4)는 index.html에 있음. 랜딩 일부(CFS)는 per-page FAQ+ARTICLE 있음.
**실행**: 프리렌더로 per-page JSON-LD가 각 URL에 실리게 한 뒤, **페이지 주제와 1:1 정합**하도록 스키마 배치.

| 페이지 | 스키마 | 비고 |
|---|---|---|
| `/coupang-cfs-severance-calculation`(공백시장 1순위) | FAQPage(CFS 특화) + Article + HowTo(계산법) + BreadcrumbList | 이미 FAQ+Article 有 → HowTo·Breadcrumb 보강 |
| `/coupang-severance-calculator` | SoftwareApplication(계산기) + FAQPage + Breadcrumb | "진짜 작동 계산기" 차별점 강조 |
| `/severance`·`/unemployment`·`/weekly-allowance`·`/annual-leave` | HowTo(계산 절차) + FAQPage(해당 수당) | 계산기 진입 페이지 |
| `/guide/*` | Article + FAQPage + BreadcrumbList | 블로그성 |
| 전역(index.html) | WebApplication·Organization·WebSite·FAQPage·HowTo | 유지 |

**대상 파일**: 각 `pages/landing/*`·`pages/guide/*`·계산기 페이지의 `PageMeta jsonLd={...}` prop(스키마 상수 추가). **표시 텍스트/기능 무변경**, `<script ld+json>`만.
**리스크**: 낮음(메타데이터). 스키마-본문 불일치 시 구글 무시/경고 → Rich Results Test로 검증.
**검증**: **Google Rich Results Test** · **Schema Markup Validator** 로 각 URL 통과 확인.

### ③ sitemap.xml + robots.txt + Search Console

**실행**:
- sitemap **정리**: `/landing`(redirect) 제거 · `/my-benefits`·`/notices`(인증) 제거 · 키워드 랜딩/가이드 전량 포함 확인 · `lastmod` 최신화 · priority 재배분(공백시장 CFS·계산기 랜딩 상향).
- robots.txt 유지(admin/auth/mypage 차단·sitemap 명시). 필요 시 `/settings`·`/payment`·`/my-benefits`·`/notices` 추가 차단.
- **GSC/Naver 운영**(종훈님 클릭 필요): sitemap 재제출 · 핵심 URL **색인 요청(URL 검사→색인 요청)** · 프리렌더 배포 후 "렌더된 페이지" 재수집 요청.
**대상 파일**: `public/sitemap.xml`·`public/robots.txt`. **리스크 없음**(정적 파일).
**검증**: GSC sitemap 상태 "성공" · URL 검사에서 본문·구조화데이터 인식.

### ④ 기능 키워드 타깃 (브랜드 회피 · 페이지 매핑 · H태그안)

> 근거(rank-history): "CATCH" 단독은 진학사 캐치(catch.co.kr) 점유 → **브랜드 단독 포기**, "쿠팡+기능" 조합 집중. "쿠팡 CFS 퇴직금"은 소송·뉴스만 있는 **공백시장**.

| 우선 | 타깃 키워드 | 매핑 페이지 | H1 안(권장) |
|---|---|---|---|
| 🥇 | 쿠팡 CFS 퇴직금 / 쿠팡풀필먼트 퇴직금 | `/coupang-cfs-severance-calculation` | "쿠팡 CFS 퇴직금 계산 방법 — PDF 명세서로 3분 확인" |
| 🥈 | 쿠팡 퇴직금 계산기 | `/coupang-severance-calculator` | "쿠팡 일용직 퇴직금 계산기 (무료·자동)" |
| 🥉 | 쿠팡 일용직 퇴직금 | `/day-worker-severance-guide` `/severance` | "쿠팡 일용직 퇴직금, 얼마나 받을까 — 조건·계산·청구" |
| — | 일용직 퇴직금 계산기 | `/severance` | "일용직 퇴직금 계산기 — 28일 블록 정밀계산" |
| — | 쿠팡 일용직 실업급여 | `/coupang-unemployment-calculator` `/unemployment` | "쿠팡 일용직 실업급여 조건·금액 계산기" |
| — | 일용직 주휴수당/연차수당 | `/weekly-allowance` `/annual-leave` | "일용직 주휴수당 계산기" / "일용직 연차수당 계산기" |

**실행 원칙**: 각 페이지 **H1 1개(타깃 키워드 자연 포함)** + H2로 하위 의도(조건/계산법/FAQ/청구) 구성 · 본문 300자+ 고유 텍스트 · 키워드 스터핑 금지.
**대상 파일**: 해당 랜딩/계산기 페이지 컴포넌트의 헤딩/카피(텍스트만). **계산 로직·폰트 클래스 무변경**(index.css override 불변).
**리스크**: 낮음(텍스트). H1 중복/누락 주의(페이지당 H1 1개).
**검증**: 프리렌더 HTML에서 H1/H2·본문 확인 · Lighthouse SEO 점수.

### ⑤ 블로그(가이드) 내부링크

**실행**: `/guide/*` 가이드 글 ↔ 계산기/랜딩 상호 내부링크(문맥 앵커텍스트: "쿠팡 CFS 퇴직금 계산기로 확인" 등). 가이드 허브(`/guide`)에서 전 가이드로 링크, 각 가이드 하단에 관련 계산기 CTA + 관련 가이드 3개 링크. 랜딩→가이드→계산기 **링크 자산 흐름** 형성.
**대상 파일**: `pages/guide/*`·`GuideHub.tsx`·랜딩 하단(링크/CTA 추가). **기능 무변경**.
**리스크**: 낮음. 과도한 링크·앵커 반복 회피.
**검증**: 내부링크 그래프 확인 · 크롤러가 링크 따라 전 페이지 도달.

---

## 3. 스텝별 워크플로우 (우선순위·의존순서)

> 각 스텝: **[빌더]→[더블리뷰 5축]→회귀(사용자앱 computed font-size 0px 측정)→커밋·배포**. SEO는 즉효 아님 → 배포 후 GSC 색인·순위는 시차 관찰.

| 스텝 | 범위 | 의존 | 게이트 |
|---|---|---|---|
| **P1 프리렌더 도입(★)** | 프리렌더 플러그인/postbuild + 대상 라우트 목록 + Vercel output 정합 | 없음(기반) | 빌드 HTML에 본문·메타·JSON-LD 실측 · 회귀0px · Rich Results Test |
| **P2 sitemap·robots 정리** | `/landing`·인증 URL 제거·lastmod·priority | 독립 | GSC sitemap 성공 |
| **P3 per-page 구조화데이터 정교화** | 페이지별 FAQ/HowTo/Article/Breadcrumb 정합 | P1(프리렌더로 노출) | Rich Results/Schema Validator 통과 |
| **P4 키워드·H태그 카피** | H1/H2·본문 키워드 정합(공백시장 CFS 우선) | P1 | Lighthouse SEO·H1 유일성 |
| **P5 내부링크** | 가이드↔계산기↔랜딩 링크 | P4 | 링크 도달성 |
| **P6 운영(종훈님)** | GSC/Naver sitemap 재제출·색인 요청·순위 재측정 스케줄 | P1~P5 배포 후 | rank-history 갱신 |

- **의존 근거**: P1(프리렌더)이 나머지(구조화데이터·H태그·내부링크)의 **크롤러 가시성 전제**. 그래서 P1 최우선. P2는 독립(즉시 가능). P6은 배포 후 운영.

---

## 4. 리스크·검증 총괄

| 리스크 | 완화 |
|---|---|
| 계산 로직 변경 | ❌금지 — SEO 작업은 메타/HTML/카피/링크만. 계산기 로직·API 무변경 |
| 운영 DB | 무관(SEO는 정적/프론트) |
| **index.css 전역 폰트 override** | **미변경**. 각 스텝 후 사용자앱 대표요소 computed font-size 0px 측정(1px 차이 시 롤백) |
| 기존 라우팅 파손 | 프리렌더는 SPA fallback 유지 위에 정적 HTML 추가 — 라우팅 로직 무변경. 회귀 렌더 확인 |
| 프리렌더 빌드 실패(Vercel 크롬) | `@sparticuz/chromium` 등 검증된 조합 · 실패 시 SPA로 graceful(기능 유지, SEO만 미개선) |
| 구조화데이터 오류 | Rich Results Test 필수 게이트 |
| 헤드리스 검증 | 각 라우트 HTML을 `curl`/헤드리스로 JS 없이 본문 노출 확인 |

---

## 5. 예상 효과와 한계

- **효과**: 프리렌더 후 크롤러가 per-page 제목·본문·구조화데이터를 즉시 수집 → **색인 품질·리치 스니펫(FAQ/HowTo) 가능성↑**. 특히 "쿠팡 CFS 퇴직금"(공백시장)은 계산기+정보+구조화데이터를 모두 갖춘 유일 후보로 **가장 빠른 상승 여지**.
- **한계(정직)**: SEO는 **즉효 없음**. 프리렌더·색인요청 후에도 구글 재크롤·평가·순위 반영에 **수 주~수개월** 시차. 도메인 신뢰도(백링크·체류)·경쟁(뉴스/블로그 선점)도 변수. rank-history처럼 **꾸준한 측정·개선 반복** 필요. 브랜드 단독("CATCH")은 캐치 점유로 단기 무리 → 조합 키워드 집중.

---

## 6. 승인 요청

1. **프리렌더 방식**: A안(puppeteer 스냅샷·최소변경) 채택 OK? (or B안 vite-react-ssg 정공법)
2. **프리렌더 대상 라우트**: 위 공개·정적 라우트 목록(인증/admin 제외) 동의?
3. **범위**: P1~P5 코드(프론트 메타/HTML/카피/링크) + P6 운영(종훈님 GSC 클릭) 분리 — 동의?
4. **불변 확인**: 계산 로직·운영 DB·index.css override 무변경 — 확인.

> 승인 주시면 **P1(프리렌더 도입)** 부터 착수합니다. **승인 전 구현 없음.**

---
_본 문서는 플랜만 담는다. 코드 수정·커밋·구현은 수행하지 않았다._
