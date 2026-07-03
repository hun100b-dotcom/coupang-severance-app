# P2 sitemap·robots — 더블리뷰 아카이브

- 스텝: **SEO P2 — sitemap.xml·robots.txt 정리**
- 대상 커밋: `067bc99`
- 리뷰 일자: 2026-07-03 (라이브 반영: sitemap 우선순위 0.95 확인)

## 1. 무엇을 했나
- `sitemap.xml`: redirect(/landing)·인증전용(/my-benefits·/notices) URL 제거 → 공개 SEO 라우트 18(홈·랜딩6·가이드5·계산기5·jobs). lastmod 2026-07-03. 공백시장 CFS(0.95)·계산기 우선순위 상향.
- `robots.txt`: /admin·/auth·/mypage·/my-benefits·/notices·/settings·/onboarding·/payment·/login·/report Disallow 보강. Sitemap 명시 유지.

## 2. 검증
라이브 curl: sitemap `priority=0.95` 1건(CFS) 확인. robots Disallow·Sitemap 라인 서빙.

## 3. 회귀 (규칙3)
정적 파일(xml/txt)만 변경 — 앱 CSS/tsx 무관 → 폰트 회귀 구조적 불가. 계산 로직·DB 불변.

## 4. 리뷰어 A (5축)
| 축 | 판정 | 근거 |
|---|---|---|
| 디자인/UI | PASS(해당없음) | 정적 크롤러 파일 |
| UX | PASS | 크롤러 UX: 색인 대상 명확화·비공개 경로 차단 |
| 코드 | PASS | 중복·죽은 URL 제거·우선순위 근거 |
| 회귀 | PASS | 앱 소스 무관 |

**A 종합: PASS.**

## 5. 리뷰어 B (Adversarial)
- **sitemap↔robots 정합**: robots가 Disallow한 경로가 sitemap에 없나? → /my-benefits·/notices 등 제거 확인, 상호 모순 없음.
- **canonical↔sitemap 정합**: sitemap URL이 각 페이지 canonical(프로덕션 절대 URL)과 일치. cleanUrls로 확장자 없는 경로 서빙.
- **놓친 위험**: sitemap의 /jobs는 동적이나 공개 목록이라 색인 허용 타당. lastmod 하드코딩은 콘텐츠 갱신 시 수기 갱신 필요 → 문서화.

**B 종합: PASS** + 문서화 1건(lastmod 수기 갱신).

## 6. 합의·이견·최종결정
| 항목 | 내용 |
|---|---|
| 합의 | 둘 다 PASS. |
| 이견 | 없음. |
| 최종결정 | **P2 PASS·배포유지.** lastmod 수기 갱신 유의(문서화). |
