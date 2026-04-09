# SEO 블로그 콘텐츠 전략 — 동적 메타태그 + 구조화 데이터 + 블로그 방안

> 작성일: 2026-04-10 | 작업자: Claude Sonnet 4.6

---

## 현황 요약 (코드 분석 결과)

### ✅ 이미 잘 구현된 것 (중복 금지)
| 항목 | 상태 |
|------|------|
| index.html 기본 메타태그 (title, description, keywords) | ✅ 완벽 |
| OG(Open Graph) + Twitter Card | ✅ 완벽 |
| JSON-LD WebApplication 기본 스키마 | ✅ 있음 |
| sitemap.xml (13개 URL) | ✅ 우수 |
| robots.txt (admin/auth/mypage 차단) | ✅ 우수 |
| Google/Naver Search Console 인증 태그 | ✅ 등록됨 |
| 가이드 페이지 5개 (/guide/*) | ✅ 존재 |
| 일부 페이지 document.title 설정 | ✅ 9개 |

### ❌ 미구현 / 개선 필요
| 항목 | 문제 |
|------|------|
| react-helmet-async | 미설치 → 페이지별 동적 og:description, og:image 변경 불가 |
| 가이드 페이지 FAQPage JSON-LD | 없음 → 구글 FAQ 리치 스니펫 미노출 |
| 계산기 페이지 SoftwareApplication JSON-LD | 없음 → 도구 리치 스니펫 미노출 |
| BreadcrumbList JSON-LD | 없음 → /guide/severance 계층 구조 미인식 |
| 페이지별 canonical URL | index.html에만 글로벌 canonical → 중복 콘텐츠 리스크 |
| /calculator, /landing 페이지 sitemap 누락 | 크롤링 사각지대 |
| 20개 페이지 title 미설정 | SEO/UX 약점 |

---

## 요구사항

- [ ] **R1** react-helmet-async 설치 + `<PageMeta>` 재사용 컴포넌트 작성
- [ ] **R2** 핵심 SEO 페이지 10개에 동적 메타태그 적용 (title, description, canonical, og:*)
- [ ] **R3** 가이드 5페이지에 FAQPage JSON-LD 추가 (구글 FAQ 리치 스니펫)
- [ ] **R4** 계산기 4페이지에 SoftwareApplication JSON-LD 추가
- [ ] **R5** 가이드 페이지에 BreadcrumbList JSON-LD 추가
- [ ] **R6** sitemap.xml에 /calculator, /landing 추가
- [ ] **R7** 블로그 플랫폼 결론 및 연동 전략 문서화

---

## 영향 범위

| 파일 | 변경 내용 | 우선순위 |
|------|----------|---------|
| `frontend/package.json` | react-helmet-async 의존성 추가 | 필수 |
| `frontend/src/main.tsx` | HelmetProvider 래핑 | 필수 |
| `frontend/src/components/PageMeta.tsx` | **신규** — 재사용 메타 컴포넌트 | 필수 |
| `frontend/src/pages/guide/SeveranceGuide.tsx` | PageMeta + FAQPage JSON-LD + BreadcrumbList | 핵심 |
| `frontend/src/pages/guide/UnemploymentGuide.tsx` | PageMeta + FAQPage JSON-LD + BreadcrumbList | 핵심 |
| `frontend/src/pages/guide/WeeklyAllowanceGuide.tsx` | PageMeta + FAQPage JSON-LD + BreadcrumbList | 핵심 |
| `frontend/src/pages/guide/AnnualLeaveGuide.tsx` | PageMeta + FAQPage JSON-LD + BreadcrumbList | 핵심 |
| `frontend/src/pages/guide/GuideHub.tsx` | PageMeta + BreadcrumbList | 핵심 |
| `frontend/src/pages/SeveranceFlow.tsx` | PageMeta + SoftwareApplication JSON-LD | 핵심 |
| `frontend/src/pages/UnemploymentFlow.tsx` | PageMeta + SoftwareApplication JSON-LD | 핵심 |
| `frontend/src/pages/WeeklyAllowancePage.tsx` | PageMeta + SoftwareApplication JSON-LD | 핵심 |
| `frontend/src/pages/AnnualLeaveAllowancePage.tsx` | PageMeta + SoftwareApplication JSON-LD | 핵심 |
| `frontend/src/pages/Home.tsx` | PageMeta (기존 document.title 대체) | 보통 |
| `frontend/src/pages/JobsPage.tsx` | PageMeta (기존 document.title 대체) | 보통 |
| `frontend/src/pages/CalculatorPage.tsx` | PageMeta 추가 | 보통 |
| `frontend/public/sitemap.xml` | /calculator, /landing 추가 | 보통 |

> **제외**: AdminPage, MyPage, Login, Intro, AuthCallback — 로그인 필요 or 크롤링 불필요

---

## 구현 계획

### Step 1 — 의존성 + Provider 설정
```bash
cd frontend && npm install react-helmet-async
```
`frontend/src/main.tsx`에 `<HelmetProvider>` 래핑 추가

### Step 2 — `<PageMeta>` 공통 컴포넌트 작성
```typescript
// frontend/src/components/PageMeta.tsx
interface PageMetaProps {
  title: string;           // 탭 제목 + og:title
  description: string;     // 검색 결과 설명 + og:description
  canonical: string;       // 중복 URL 방지 canonical
  ogImage?: string;        // SNS 공유 이미지 (없으면 기본 og-image.png)
  jsonLd?: object | object[]; // 구조화 데이터 배열 지원
}
```
- `<Helmet>` 내부에서 title, meta description, canonical link, og:* 태그 동적 설정
- jsonLd prop으로 JSON-LD script 태그 인라인 렌더링

### Step 3 — 가이드 5페이지: FAQPage + BreadcrumbList JSON-LD

**FAQPage 스키마 예시 (SeveranceGuide)**:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "일용직 근로자도 퇴직금을 받을 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네. 동일 사업장에서 계속 근로한 기간이 1년 이상이고..."
      }
    }
  ]
}
```

**BreadcrumbList 스키마**:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "홈", "item": "https://catch-daily-worker.vercel.app/home" },
    { "@type": "ListItem", "position": 2, "name": "가이드", "item": "https://catch-daily-worker.vercel.app/guide" },
    { "@type": "ListItem", "position": 3, "name": "퇴직금 가이드", "item": "https://catch-daily-worker.vercel.app/guide/severance" }
  ]
}
```

각 가이드 페이지별 FAQ 3~5개씩 실제 내용 기반으로 작성

### Step 4 — 계산기 4페이지: SoftwareApplication JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "쿠팡 퇴직금 계산기",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW" },
  "description": "일용직 근로자 퇴직금 무료 자동 계산 — 28일 블록 알고리즘"
}
```

### Step 5 — sitemap.xml 업데이트
```xml
<!-- 계산기 허브 -->
<url>
  <loc>https://catch-daily-worker.vercel.app/calculator</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>

<!-- 랜딩 페이지 (A/B 테스트 기본) -->
<url>
  <loc>https://catch-daily-worker.vercel.app/landing</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

### Step 6 — 페이지별 키워드 매핑

| 페이지 | 타겟 키워드 (검색량 기준) | description |
|--------|--------------------------|-------------|
| /guide/severance | 쿠팡 퇴직금, 일용직 퇴직금 계산, 쿠팡 퇴직금 받는법 | "쿠팡·컬리 일용직 근로자 퇴직금 조건, 계산 방법, 지급 절차를 완전 정리했습니다" |
| /guide/unemployment | 쿠팡 실업급여, 일용직 실업급여 조건, 일용직 고용보험 | "일용직 실업급여 신청 조건부터 수급액 계산까지 단계별 안내" |
| /guide/weekly-allowance | 주휴수당 계산, 알바 주휴수당, 주휴수당 조건 | "주 15시간 이상 근무 시 주휴수당 지급 조건과 계산 방법" |
| /guide/annual-leave | 연차수당 계산, 일용직 연차, 연차휴가 1년 미만 | "1년 미만 근로자도 연차수당 받을 수 있습니다. 계산 방법 안내" |
| /severance | 퇴직금 계산기, 일용직 퇴직금 계산기 무료 | "쿠팡·쿠팡이츠 근무자 퇴직금 자동 계산 — PDF 급여 명세서 업로드 지원" |
| /unemployment | 실업급여 계산기, 일용직 실업급여 계산 | "일용직 실업급여 수급액 자동 계산기 — 무료, 3분 완성" |
| /jobs | 쿠팡 채용, 단기알바 채용, 일용직 채용정보 | "쿠팡·컬리 등 일용직 단기알바 최신 채용정보" |

---

## 블로그 플랫폼 비교 및 결론

### 비교표

| 항목 | Hashnode | Tistory | 자체 /blog (Vite) |
|------|----------|---------|-------------------|
| SEO 기본 점수 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 커스텀 도메인 | ✅ 무료 | ✅ 무료 | ✅ |
| 구글 인덱싱 속도 | 빠름 (자체 CDN) | 느림 | SPA라 느림 |
| 한국어 SEO | 보통 | 우수 (티스토리 DA 높음) | 낮음 |
| 개발 비용 | 0 | 0 | 높음 |
| API 연동 | ✅ Headless API | ❌ | N/A |
| Next.js 전환 시 마이그레이션 | ✅ 쉬움 | ❌ 어려움 | ✅ 쉬움 |

### 결론: **Tistory 채널 + Hashnode 영문 채널 이중 운영**
- **Tistory**: 한국어 콘텐츠 (쿠팡 퇴직금, 일용직 실업급여 등 검색량 높은 키워드)  
  DA(도메인 권위)가 높아 구글/네이버 단기 노출 유리
- **Hashnode**: 추후 Phase 4 Next.js 전환 후 `blog.catch-daily-worker.vercel.app` 커스텀 도메인 연결 대비
- **현재 Phase 2까지**: Tistory 우선, 월 4~8편 콘텐츠 발행 목표

### 초기 콘텐츠 계획 (4월~5월)
1. "쿠팡 퇴직금 받는 법 — 일용직 완전 정리" (검색량 최고)
2. "쿠팡 실업급여 신청 조건 및 계산 방법"
3. "주휴수당이란? 알바도 받을 수 있는 조건"
4. "연차수당 계산법 — 1년 미만도 받는다"
5. "일용직 4대 보험 가입 기준 총정리"

---

## 리스크

| 리스크 | 설명 | 대응 |
|--------|------|------|
| SPA 한계 | Googlebot이 React 렌더링 실패 시 메타태그 미인식 | react-helmet-async는 최선, 근본 해결은 Phase 4 Next.js 전환 |
| FAQPage 오남용 패널티 | 허위/저품질 FAQ는 구글 패널티 가능 | 실제 가이드 페이지의 실제 내용 기반으로만 작성 |
| canonical 중복 | Vercel preview URL에서 중복 색인 가능 | canonical을 프로덕션 URL로 명시 |
| og:image 부재 | 페이지별 og:image가 없어 SNS 공유 시 기본 이미지만 | 일단 기본 og-image.png 공용 사용, 추후 페이지별 생성 |

---

## 검증 기준 (reviewer 확인 항목)

- [ ] `npm run build` 오류 없음
- [ ] 브라우저에서 /guide/severance 열고 `<head>` 내 title, description, canonical 태그 확인
- [ ] Chrome DevTools > Elements > `<script type="application/ld+json">` 존재 확인
- [ ] Google Rich Results Test (https://search.google.com/test/rich-results) — FAQ 스키마 유효성
- [ ] sitemap.xml에 /calculator, /landing URL 존재 확인
- [ ] react-helmet-async HelmetProvider가 main.tsx 최상위 래핑 확인
- [ ] TypeScript 빌드 타입 에러 없음
