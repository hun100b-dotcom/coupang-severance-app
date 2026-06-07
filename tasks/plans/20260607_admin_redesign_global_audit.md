# 기획서: 어드민탭 UI/UX 전면 개편 + 전역 기능 전수검사
> 작성일: 2026-06-07  
> 담당: Claude (하네스 오퍼레이터)  
> 우선순위: P0

---

## 1. 목표

### Task A — 어드민탭 UI/UX 전면 개편
현재 어드민은 **다크 테마(#0d0d1a)** 기반.  
캐치퀀트봇 디자인 토큰 기준으로 **라이트 모드 전면 전환** + 레이아웃 구조 개편.

### Task B — 전역 기능 전수검사
앱 전역(프론트 모든 페이지 + 백엔드 엔드포인트 + Supabase RLS)에서 작동 안 하는 곳 탐지 + 즉시 핫픽스.

---

## 2. 캐치퀀트봇 디자인 토큰 (적용 기준)

```
배경:     bg-white / bg-gray-50 / bg-slate-50
카드:     border border-slate-200 shadow-sm rounded-2xl p-4~6
큰 숫자:  text-2xl font-bold text-slate-900  (또는 text-3xl)
라벨:     text-[10px] uppercase tracking-wide text-slate-500
양수:     text-emerald-600
음수:     text-rose-600
중립:     text-slate-600
컨테이너: max-w-7xl mx-auto
사이드바: bg-white border-r border-slate-200
활성메뉴: border-l-4 border-blue-500 bg-blue-50 text-blue-700 font-semibold
섹션제목: text-xs font-semibold text-slate-400 uppercase tracking-wider
```

---

## 3. 변경 파일 목록

### 3-A 신규 생성 (공용 컴포넌트)
| 파일 | 역할 |
|------|------|
| `frontend/src/components/admin/shared/AdminCard.tsx` | 라이트 카드 기본 (border+shadow+rounded) |
| `frontend/src/components/admin/shared/KpiStrip.tsx` | KPI 숫자 4개 가로 스트립 |
| `frontend/src/components/admin/shared/SignalCard.tsx` | 신호등(🟢🟡🔴) + 메인 값 카드 |
| `frontend/src/components/admin/shared/PageHeader.tsx` | 페이지 제목 + 부제목 + 필터 영역 |
| `frontend/src/components/admin/shared/AdminTable.tsx` | 공통 테이블 (head+body+hover) |

### 3-B 대규모 수정
| 파일 | 변경 내용 |
|------|----------|
| `AdminPage.tsx` | 배경 → white/gray-50, flex 구조 유지 |
| `AdminSidebar.tsx` | 다크→라이트 (white bg, slate border, blue active) |
| `DashboardMenu.tsx` | 래퍼 배경 변경 |
| `DashboardSubTabs.tsx` | 탭 바 → 라이트 스타일 |
| `tabs/OverviewTab.tsx` | KPI 카드 + 차트 배경 → 라이트 |
| `tabs/VisitorTab.tsx` | 라이트 전환 |
| `tabs/CalcStatsTab.tsx` | 라이트 전환 |
| `tabs/RecruitTab.tsx` | 라이트 전환 |
| `tabs/TargetTab.tsx` | 라이트 전환 |
| `dashboard/KpiCard.tsx` | 카드 → AdminCard 래핑 |
| `dashboard/DailyTrendChart.tsx` | 차트 배경 라이트 |
| `dashboard/ServiceBarChart.tsx` | 차트 배경 라이트 |
| `dashboard/RecentActivity.tsx` | 라이트 전환 |
| `menus/JobPostingsMenu.tsx` | 라이트 + PageHeader 적용 |
| `menus/ApplicantsMenu.tsx` | 라이트 전환 |
| `menus/ConfirmedMenu.tsx` | 라이트 전환 |
| `menus/RecruitSummaryMenu.tsx` | 라이트 전환 |
| `menus/InquiriesMenu.tsx` | 라이트 전환 |
| `menus/NoticesMenu.tsx` | 라이트 전환 |
| `menus/MembersMenu.tsx` | 라이트 전환 |
| `menus/AccountsMenu.tsx` | 라이트 전환 |
| `menus/SettingsMenu.tsx` | 라이트 전환 |
| `menus/AuditLogsMenu.tsx` | 라이트 전환 |
| `menus/ServerLogsMenu.tsx` | 라이트 전환 |
| `menus/TargetMenu.tsx` | 라이트 전환 |
| `inquiries/InquiryTable.tsx` | 라이트 전환 |
| `inquiries/InquiryDetailPanel.tsx` | 라이트 전환 |
| `target/CompanyPieChart.tsx` | 라이트 전환 |
| `target/UserTagsPanel.tsx` | 라이트 전환 |

---

## 4. 구현 순서 (Sprint 단계)

### Step 1 — 공용 컴포넌트 신규 생성 (5개)
AdminCard, KpiStrip, SignalCard, PageHeader, AdminTable

### Step 2 — 셸(shell) 먼저: AdminPage + AdminSidebar
전체 배경/사이드바 → 라이트로 전환. 다른 메뉴들의 배경이 자동 영향받음.

### Step 3 — 대시보드 레이어 (DashboardMenu → Tabs → KpiCard/Chart)
OverviewTab KPI 카드를 AdminCard + KpiStrip으로 교체.

### Step 4 — 채용 레이어 (JobPostings, Applicants, Confirmed, RecruitSummary)
PageHeader + AdminTable 적용.

### Step 5 — 콘텐츠 레이어 (Inquiries, Notices)
기존 어두운 패널 → 라이트 카드.

### Step 6 — 시스템 레이어 (Members, Accounts, Settings, AuditLogs, ServerLogs, Target)
단순 색상 전환 위주.

---

## 5. 전역 전수검사 항목 (Task B)

### 5-A 프론트엔드 — 페이지 진입 체크
체크 대상 라우트 (40개):
- 일반: /home, /jobs, /calculator, /severance, /unemployment, /weekly-allowance, /annual-leave, /mypage, /report, /payment, /my-benefits, /notices
- SEO 랜딩: /coupang-severance-calculator, /coupang-unemployment-calculator, /day-worker-severance-guide, /coupang-part-time-severance-method, /daily-worker-severance-28days, /coupang-cfs-severance-calculation
- 가이드: /guide, /guide/severance, /guide/weekly-allowance, /guide/annual-leave, /guide/unemployment
- 시스템: /login, /terms, /privacy-policy, /onboarding, /inquiry, /admin
- 인증: /auth/callback

### 5-B 백엔드 엔드포인트 체크
- GET /health → 200
- POST /calculate/severance → 200
- POST /calculate/unemployment → 200
- POST /calculate/weekly-allowance → 200
- POST /calculate/annual-leave → 200

### 5-C Supabase RLS 확인
- click_counter: RLS 비활성 여부 확인
- blocked_ips: RLS 비활성 여부 확인
- user_tags: RLS 비활성 여부 확인
- legal_variables: 테이블 존재 여부 확인 (미적용 가능성)

### 5-D 주요 인터랙션
- 계산기 4종 더미 데이터로 결과 확인
- 채용공고 목록 로드
- 로그인/로그아웃 흐름
- 어드민 메뉴 진입 (권한 체크)

---

## 6. 완료 기준

- [ ] 어드민 전체 배경 white/slate-50, 다크 색상 0개
- [ ] KPI 카드/차트 AdminCard 통일
- [ ] 사이드바 라이트 전환 + 활성 메뉴 left-border blue
- [ ] 빌드 TypeScript 에러 0건
- [ ] 전수검사 발견 이슈 핫픽스 완료
- [ ] console error 0건 목표
- [ ] git push + Vercel READY

---

## 7. 리스크

1. **차트 배경**: recharts/chart.js 컴포넌트가 하드코딩 다크색 사용 시 추가 prop 필요
2. **범위**: 30개 파일 수정 → 타입 에러 위험 → 빌드 검증 Step별 필수
3. **전수검사**: Render 백엔드 콜드스타트 30초 지연 → timeout 60s로 테스트
