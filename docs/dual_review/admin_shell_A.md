# 어드민 업비트풍 리디자인 — 총괄 리뷰어 A 보고서

> 대상: 어드민 "셸 + 대시보드" 묶음 (AdminPage/Sidebar/Dashboard 탭·차트)
> 브랜치: `redesign/admin-upbit` (작업물은 working tree 미커밋 상태 / base main `06bf859`)
> 검토일: 2026-06-30

## 한 줄 결론 + 최종 판정

**색·간격·토큰 정돈만 적용되고 데이터/쿼리/핸들러/비즈니스 임계값은 전 파일 불변 — 빌드 통과, 스코프 안전.** → **판정: PASS (BLOCKER 0건)**

---

## 빌드 결과

- `cd frontend && npm run build` → **성공** (`✓ built in 9.22s`).
- TypeScript 컴파일 에러 없음. 신규 `shared/adminTheme.ts` 정상 번들. 기존 청크 크기 경고(BarChart/index/TargetTab >500kB)는 이번 변경과 무관한 사전 존재 경고.

---

## 스코프 검증

- 변경 파일 전부 `frontend/src/components/admin/**` + `frontend/src/pages/AdminPage.tsx` 범위 안. **사용자 화면(pages/*, components/* non-admin) 변경 0건.**
- 신규 1: `components/admin/shared/adminTheme.ts` (UP 토큰 단일 출처, tailwind `up.*`와 1:1).
- `tsconfig.tsbuildinfo`는 빌드 산출물(무해).
- TargetTab/TargetMenu, dead 컴포넌트(AdminCard/AdminTable/KpiStrip/SignalCard) 미변경 확인. → **스코프 BLOCKER 없음.**

> 참고: 작업물이 아직 커밋되지 않아 `git diff main...HEAD`는 빈 결과. 본 리뷰는 **working tree vs main** 기준으로 수행함(커밋은 PASS 후 진행 권장).

---

## 데이터/로직 불변 검증 표

| 파일 | supabase 쿼리 | api/핸들러 | 비즈니스 임계값 | 판정 |
|------|--------------|-----------|----------------|------|
| OverviewTab.tsx | 변경 0 | 변경 0 | `stats.jobs.active` 등 데이터 참조 유지 | ✅ 색만 |
| VisitorTab.tsx | 변경 0 | `handleDownload` 로직 유지(스타일만 `excelBtn`로 추출) | `logs.length` 유지 | ✅ 색만 |
| CalcStatsTab.tsx | 변경 0 | `handleDownload` 유지 | `min:2000000/5000000`, `max:Infinity` **불변**(color만 교체) | ✅ 색만 |
| RecruitTab.tsx | 변경 0 | `handleDownload` 유지 | `p.status==='deleted'/'active'`, `appStats.confirmed/rejected/pending` 유지 | ✅ 색/JSX화살표 본문화 |
| DailyTrendChart / ServiceBarChart / RecentActivity / KpiCard | 변경 0 | 변경 0 | — | ✅ 색만 |
| menus/DashboardMenu / DashboardSubTabs / PageHeader / AdminSidebar / AdminPage | 변경 0 | 변경 0 | — | ✅ 색/간격만 |

- 로직성 라인 grep(supabase/.from/.select/.eq/.gte/getAdminStats/getQualifyingDays/365/5000000/confirmed/active/handleDownload/export/sheet 등): 전 파일에서 **순수 로직 변경 0건**. CalcStatsTab(4)·RecruitTab(6) 매칭은 모두 `color` 필드만 바뀐 라인이 임계값 숫자를 포함해 잡힌 false-positive로 육안 확인 완료.
- RecruitTab `Object.entries(sectionCounts).map(...=> { return ... })` → `...=> ( ... )` 변경은 **JSX 화살표 본문 축약 리팩터**로, key/count/인덱스 로직 동일. 로컬 `colors[]` → `SECTION_COLORS[]` 명명 교체만 발생.

---

## AA · 토큰 · 반응형 발견사항

### 토큰 일관성
- 변경 파일 옛 slate/무지개 hex 잔존 grep: **단 1건** `AdminPage.tsx:45` `#64748b` → `DEFAULT_PERMS.viewer.color`(역할 색 데이터, 명시된 예외). 스타일 잔재 아님. → **잔존 0.**
- Tailwind 텍스트 크기 유틸 클래스(`text-xs`/`text-[12px]` 등) 사용 **0건** → 전역 `index.css`의 `!important` 폰트 override와 충돌 없음. 폰트 크기 전부 인라인 rem/px.

### AA 대비
- 본문/중요 텍스트는 `UP.body(#333D4B)`/`UP.sub(#565D6A, 6.7:1)`/`UP.strong(#1B64DA)` 사용 — AA 충족.
- `UP.caption(#8E929B ≈3.0:1)`은 대부분 날짜(`created_at.slice`), 차트 축 tick, 순위 인덱스, 이메일/세션ID 보조줄, 빈상태 플레이스홀더 등 **허용 범주(보조/날짜)**에 사용.

### 반응형
- 데이터 테이블 2종(Recruit/Visitor) `overflowX:'auto'` 래퍼 보유 → 320px에서 가로 스크롤.
- KPI 그리드 전부 `grid-cols-2 sm:grid-cols-N` 모바일 우선(2열/1열 폴백).
- 잘림 텍스트 flex 자식에 `minWidth:0`(KpiCard, RecentActivity) 적용.
- 셸: `md:hidden` 모바일 토글 + `hidden md:block` 사이드바, sidebar nav `overflowY:'auto'`. 신규 `window/document` 참조 0건 → 콘솔/SSR 에러 위험 없음.

---

## BLOCKER 목록 (치명) — **0건**

데이터/권한/되돌리기 어려운 변경 없음. → PASS 조건 충족.

## 비치명 개선 제안 (선택)

1. **VisitorTab.tsx:240 "비회원" 라벨** — `UP.caption`(≈3.0:1) 사용. 같은 셀의 병렬 케이스 "회원 (프로필 없음)"은 `UP.sub`(AA). 행 식별 1차 텍스트이므로 `UP.sub`로 통일하면 대비·일관성 ↑. (비회원이 의미상 약강조라 치명 아님)
2. **빈상태 문구**(CalcStatsTab:221, VisitorTab:171·188, RecentActivity:78 "문의 없음/데이터 없음") — caption 색. 안내성 본문이므로 `UP.sub`로 올리면 가독성 ↑. 중요도 낮아 선택.
3. 커밋 미생성 상태 — 본 묶음 PASS 시 `redesign/admin-upbit`에 커밋하여 이후 묶음(Target)과 diff 추적 명확화 권장.

---

**판정: PASS, BLOCKER 0건**
