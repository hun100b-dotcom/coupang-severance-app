# GSC 색인 요청 추적 (Google Search Console)

> catch-daily-worker.vercel.app 의 Google 색인 요청 및 현황을 추적합니다.

---

## 진행 현황 (2026-04-14 기준)

| 구분 | 수량 | 비고 |
|------|------|------|
| sitemap.xml 등록 URL | 15개 | 아래 전체 목록 참고 |
| GSC 인식 URL | 14개 | 1개는 아직 미발견 |
| 색인 완료 | 2개 | GSC "색인이 생성된 페이지" 에서 확인 가능 |
| 색인 미완료 | 12개 | "발견됨 - 현재 색인 생성되지 않음" 상태 |
| 수동 색인 요청 완료 | 2개 | /home (04-09), /severance (04-14) |

---

## sitemap.xml 전체 URL 현황 (15개)

| # | URL | priority | 색인 요청일 | GSC 상태 |
|---|-----|----------|------------|----------|
| 1 | `/` (루트) | 1.0 | - | 색인 완료 or 미완료 (확인 필요) |
| 2 | `/severance` | 0.9 | **2026-04-14** | ✅ 요청 완료 — 미색인 12개 중 하나 |
| 3 | `/unemployment` | 0.9 | - | 미색인 (내일 최우선) |
| 4 | `/guide/severance` | 0.9 | - | 미색인 |
| 5 | `/guide/unemployment` | 0.9 | - | 미색인 |
| 6 | `/weekly-allowance` | 0.8 | - | 미색인 |
| 7 | `/annual-leave` | 0.8 | - | 미색인 |
| 8 | `/guide` | 0.8 | - | 미색인 |
| 9 | `/calculator` | 0.8 | - | 확인 필요 (미색인 12개 목록에 없음) |
| 10 | `/jobs` | 0.8 | - | 미색인 |
| 11 | `/guide/weekly-allowance` | 0.8 | - | 미색인 |
| 12 | `/guide/annual-leave` | 0.8 | - | 미색인 |
| 13 | `/landing` | 0.7 | - | 확인 필요 (미색인 12개 목록에 없음) |
| 14 | `/my-benefits` | 0.7 | - | 미색인 |
| 15 | `/notices` | 0.6 | - | 미색인 |

### ⚠️ 확인 필요 사항

- **`/home`**: 2026-04-09에 색인 요청했으나 **sitemap.xml에 포함되어 있지 않음**. 앱 내부 경로(`/home`)와 sitemap 루트(`/`)가 다른 URL임. 색인 효과 확인 필요.
- **`/`**, **`/calculator`**, **`/landing`**: 이 3개 중 2개가 "색인 완료" 2개일 가능성 + 1개는 GSC 미발견. GSC에서 정확히 어떤 URL이 색인됐는지 확인 필요.
- GSC 인식 14개 = 색인 완료 2개 + 미색인 12개. sitemap 15개 중 1개는 아직 미발견.

---

## 미색인 12개 URL (GSC 확인, 2026-04-14)

1. `/annual-leave`
2. `/guide`
3. `/guide/annual-leave`
4. `/guide/severance`
5. `/guide/unemployment`
6. `/guide/weekly-allowance`
7. `/jobs`
8. `/my-benefits`
9. `/notices`
10. `/severance` ← 오늘 요청 완료
11. `/unemployment`
12. `/weekly-allowance`

---

## 다음 요청 우선순위

1. **/unemployment** — 실업급여 계산기 (최우선, 04-14 할당량 초과로 실패)
2. **/guide/severance** — 퇴직금 가이드
3. **/guide/unemployment** — 실업급여 가이드
4. **/weekly-allowance** — 주휴수당 계산기
5. **/annual-leave** — 연차수당 계산기

---

## 작업 일지

### 2026-04-09 (세션 4, Cowork)

- GSC 속성 추가: `catch-daily-worker.vercel.app` (HTML 태그 인증)
- sitemap.xml 제출 완료
- `/home` 수동 색인 요청 완료 (첫 번째)
- 일일 할당량 초과로 나머지 연기
- ⚠️ 참고: `/home`은 sitemap.xml에 없는 URL (sitemap에는 `/`만 등록)

### 2026-04-14

- GSC 색인 현황 최초 확인
  - 색인 완료: 2개
  - 색인 미완료: 12개 ("발견됨 - 현재 색인 생성되지 않음")
- `/severance` 수동 색인 요청 완료 (두 번째)
- `/unemployment` 요청 시도 → **일일 할당량 초과** 에러 → 내일 재시도

---

## 참고

- GSC URL 검사 도구: 하루 색인 요청 할당량 제한 있음 → 하루 2~3개씩 나눠서 요청
- 색인 반영 소요: 요청 후 수일~2주 (Google 재량)
- sitemap.xml 위치: `frontend/public/sitemap.xml`
- 관련 문서: [SEO 검색 순위 추적](seo-rank-history.md)
