# 어드민 셸+대시보드 업비트 토큰화 — 적대적 리뷰어 B 보고서

**한 줄 결론:** 셸·대시보드 13개 파일 + 신규 토큰 1개는 모두 색/스타일 토큰화로 한정되며 기능·데이터·쿼리·권한·계산 임계값은 전부 불변 — 빌드 통과. **판정: PASS** (BLOCKER 0건, 비치명 2건).

브랜치: `redesign/admin-upbit` / base `main(06bf859)`
※ 변경은 아직 **커밋 전 워킹트리 상태**(HEAD==main). diff는 `git diff HEAD` 기준으로 검증.

---

## 1. 빌드 검증

```
cd frontend && npm run build
```
- 결과: **✓ built in 9.89s** (성공)
- 경고: 청크 500kB 초과 경고만 출력 — `index.js 533kB`, `TargetTab 543kB`, `BarChart 379kB`. 이번 변경과 무관한 **기존 경고**(코드 스플릿 권고). 신규 에러/타입 에러 없음.

---

## 2. 로직 불변 라인대조 결과표 (색 외 조건/숫자/쿼리/정렬/임계값)

| 파일 | 핵심 로직 라인 | main | HEAD | 변화 |
|------|----------------|------|------|------|
| CalcStatsTab | SEVERANCE_RANGES min/max | `0/1, 1/500000, 500000/2000000, 2000000/5000000, 5000000/Inf` | 동일 | **불변** (color만 토큰화) |
| CalcStatsTab | byService 집계·eligibleRate·avgSeverance | 동일 | 동일 | **불변** |
| OverviewTab | KpiCard value/sub 식, conversionRate, resolveRate | 동일 | 동일 | **불변** |
| OverviewTab | 문의 분포 key(waiting/reviewing/answered/closed)·count | 동일 | 동일 | **불변** (color만) |
| RecruitTab | `status==='deleted'` 필터, `status==='active'` 분기, `.slice(0,30)` | 동일 | 동일 | **불변** |
| RecruitTab | SECTION_COLORS 인덱스 매핑(오늘긴급/내일긴급/상시) | 인라인 `['#d97706','#ca8a04','#3182f6']` | 상수 `[UP.amber,UP.strong,UP.brand]` | **순서·인덱스 동일**, 색 토큰화만 |
| VisitorTab | uniqueSessions/todayCount/loggedInCount, topPages, topReferrers, `.slice(0,50)` | 동일 | 동일 | **불변** |
| VisitorTab | referrer 색 `colors[i%len]` → `CHART_SERIES[i%len]` | 인라인 8색 | CHART_SERIES(6색) 토큰 | 색 배열만 교체(데이터·인덱싱 로직 동일) |
| ServiceBarChart | `Math.round(severance/total*100)`, total 합산, dataKey | 동일 | 동일 | **불변** |
| DailyTrendChart | dataKey new_users/new_reports/new_inquiries, totals | 동일 | 동일 | **불변** (시리즈 색만 상수화) |
| RecentActivity | STATUS_META 키, `.slice(0,8)`, fmtRelative | 동일 | 동일 | **불변** (color/bg/border만) |
| KpiCard | trend>0 분기, Math.abs(trend) | 동일 | 동일 | **불변** |
| 셸 4파일 | (아래 셸 항목 참조) | — | — | 치수/굵기/마진만 |

**임계값 확인:** `min:500000/2000000/5000000`, `qualifying`/`eligible` 집계식, `status==='confirmed'`(appStats 집계), `status==='active'/'deleted'` 모두 **원본 유지**. `getQualifyingDays>=365`/`min:5000000`류 계산 코어는 이 묶음 변경 파일에 미포함(백엔드/플로우) — 어드민 셸 변경이 건드리지 않음.

### 셸 파일(비-탭) 로직 외 변경만 추출
```
AdminSidebar:  width 220→232, fontWeight(비활성) 400→500, numeric 적용
PageHeader:    marginBottom 20→22, marginTop 4→5, lineHeight 1.4, letterSpacing, minWidth:0
AdminPage / DashboardSubTabs / DashboardMenu: import UP + 색 토큰화
```
→ 데이터/쿼리/권한/탭 라우팅/조건 분기 **변경 0**. 순수 시각.

---

## 3. grep 검증

| 검사 | 명령/대상 | 결과 |
|------|-----------|------|
| (a) Tailwind 텍스트 크기 클래스 | `text-(xs\|sm\|base\|lg\|xl\|\[)` in admin/**.tsx | **0건** — index.css `!important` 폰트 override 충돌 없음. 모든 폰트 크기 인라인 rem |
| (d) 잔존 옛 hex (탭) | `#[0-9a-fA-F]{6}` in tabs/*.tsx | **0건** (`#fff`=흰 텍스트만 잔존, 정상) |
| (d) 잔존 옛 hex (차트) | dashboard/*.tsx | **0건** (rgba 그림자 제외) |
| (c) chart 토큰을 텍스트색으로 | `color: UP.(amberChart\|greenChart\|dangerChart)` | 5건 — 4건은 분포바 `background`/구간 `color`(막대 fill 용), **1건만 텍스트**(ServiceBarChart:70, 아래 비치명#1) |
| (b) UP.caption 본문 사용 | `color: UP.caption` | 다수 — 전부 날짜·인덱스·빈상태·서브라벨 등 **비필수 캡션**. 토큰 정의 주석("캡션/날짜 비필수만") 계약 내. 중요 라벨엔 UP.sub/body/navy 사용 확인 |

---

## 4. adminTheme.ts 검증
- `import type { CSSProperties } from 'react'` **존재**(line 11), `numeric/adminCard/thLabel`에서 실사용 → 미사용 import 아님.
- `UP`, `CHART_SERIES`, `numeric` export 정상. `adminCard`/`thLabel`은 export됐으나 이번 묶음 미사용 — export 미사용은 빌드 무해(트리셰이킹). 다음 묶음 사용 예정으로 추정.
- 빌드 타입체크 통과 → 미사용 변수/import 에러 없음.

---

## 5. BLOCKER vs 비치명

### BLOCKER (치명: 데이터/권한/되돌리기 어려움)
- **없음.** 데이터 쿼리·RLS·권한 헤더·CRUD·계산 임계값 변경 0. 전부 색/치수, 되돌리기 쉬움.

### 비치명 (AA·일관성, 출시 차단 아님)
1. **`frontend/src/components/admin/dashboard/ServiceBarChart.tsx:70`** — 범례의 `{d.pct}%` 텍스트가 `color: d.color`를 그대로 써서, 실업급여 항목은 `UP.greenChart(#06BE7B)`가 **텍스트 색**으로 적용됨. 흰 배경 대비 약 2.0:1로 **AA(4.5:1) 미달**. 막대 fill용 채도 높은 그린을 작은 굵은 텍스트에 재사용한 사례. main에선 `#059669`(≈AA 경계)였어서 **대비 소폭 회귀**.
   - 영향: 장식적 범례 숫자, 데이터 정확성 무관. 막대/도트는 정상.
   - 권고: 범례 숫자 텍스트는 `UP.green`(텍스트용 AA 토큰)으로, 도트/막대만 `UP.greenChart` 유지. (OverviewTab·RecruitTab 범례는 이미 텍스트=UP.green/amber로 올바르게 분리되어 있어 패턴 불일치이기도 함.)
2. **`UP.caption(#8E929B)` 광범위 사용** — 흰 위 약 3.5:1로 일반 본문 AA 미달이나, 적용처가 전부 날짜·일련번호·빈상태·보조 서브라벨 등 토큰이 명시한 "비필수 캡션" 범위. **계약 내 사용으로 통과**. 다만 VisitorTab의 "비회원/이메일" 식별 정보가 캡션색이라 가독 경계선 — 모니터링 권고.

---

## 결론
색 외 로직/데이터/권한/임계값 **전수 불변**, 빌드 통과, 전역 `.text-*` !important 충돌 회피(인라인 rem) 확인. AA 비치명 2건은 출시 차단 아님. **PASS.**
