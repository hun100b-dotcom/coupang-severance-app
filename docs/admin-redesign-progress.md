# 어드민 재개발 진행 상태 · 세션 인계 (2026-07-02)

> 브랜치: **`redesign/admin-upbit-impl`** (main 미병합). 백업 태그 `pre-admin-redesign-2026-07-02`.
> 계획서: `docs/admin-redesign-proposal.md`(v2) · 전수조사: `docs/admin-audit.md` · 폰트관문: `docs/admin-redesign-p0-fontgate.md`.
> 규칙: `CLAUDE.md` 상단 상시규칙 1~4(방법없음금지/더블리뷰/회귀측정/절대·조건부).

---

## ✅ 완료 (커밋됨, 각 회귀 0px PASS)

| Phase | 내용 | 커밋 |
|---|---|---|
| P0 | 어드민 전용 폰트유틸 `text-a10~a30`(tailwind.config) — index.css `!important` override 회피. CSS md5 동일·선택자 26/26 동일 | ✅ |
| P1 | 공통 프리미티브 `shared/`: AdminCard·AdminButton·AdminBadge·AdminTable(Th/Td)·AdminState(Loading/Empty/Error)·AdminSpinner + index.ts 배럴. AdminPageHeader=기존 PageHeader 재수출. thLabel dead 제거 | ✅ |
| P2 | AdminSidebar 호버 JS직조작 3곳 → CSS `.admin-navitem:hover`(index.css) | ✅ `e7b6e58` |
| P3-a | 로더 스피너 중복 7파일 인라인 `@keyframes spin` → `AdminLoading` | ✅ `f69076a` |
| P3-b | CARD 상수 5파일 → 공용 `cardBox`(adminTheme, radius16·flat) | ✅ `43fe9e3` |
| P3-c | 메뉴 순차 인라인 fontSize 제거(15파일 약 400개 → `text-a*`), 카드/모달 radius 20·18→16, JobPostings 버튼/4상태 프리미티브화 | ✅ `348c9d4`~`11e3421` (9커밋) |

**측정 하네스(2026-07-02 갱신)**: 이전 세션 스크래치패드 소멸 → 재작성. `frontend/_measure_tmp.mjs`(playwright 모듈해석 위해 frontend 내부 배치, 커밋X·임시). Playwright 헤드리스 + `reducedMotion:'reduce'`(홈 히어로 로테이션 정지) + **라우트별 reload→`document.fonts.ready`→1500ms 정착**(첫로드 레이스 제거로 완전 결정화). 전 요소 computed font-size 히스토그램(px→개수) + 대표셀렉터 picks 비교.
- 라우트: `['/home','/calculator','/severance']` (`/`는 Intro 히어로 애니메이션 요소개수 지터 → /home이 동일컨텐츠 결정적 대체라 제외).
- 절차: `npm run build` → `npm run preview --port 4173`(점유시 4174 자동) 백그라운드 → `node _measure_tmp.mjs http://localhost:<port> <label> > measure_after.json` → `measure_before.json`(baseline)과 picks+히스토그램 전량 대조. **1px/1개라도 다르면 FAIL**(단 애니메이션 라우트 요소개수 지터는 폰트변화 아님). dev 포그라운드 금지.
- 코드모드/measure 스크립트 사본: 세션 scratchpad `4a2a3fd6-.../scratchpad/{codemod.mjs,measure.mjs}`.

---

## ⏭️ 다음 세션 인계 지점 (여기부터)

### ✅ P3-c — 메뉴 순차 인라인 fontSize 제거 (2026-07-02 세션 완료)
**열거 14파일 + TargetMenu = 15파일, 인라인 리터럴 fontSize 약 400개 → 어드민 전용 `text-a*` 유틸 이관.** 각 파일 빌드+회귀 0px PASS 후 커밋(브랜치 `redesign/admin-upbit-impl`, main 미병합).
- 채용군: JobPostingsMenu(71)·ApplicantsMenu(40)·ConfirmedMenu(22)·RecruitSummaryMenu(10) — 커밋 `348c9d4`,`3564c83`,`1e7ab54`,`3ee565e`. JobPostings는 헤더버튼→AdminButton·로딩/빈→AdminState·카드 radius 20·18→16 추가.
- 콘텐츠: NoticesMenu(11)·InquiriesMenu(6)·InquiryTable(2)·InquiryDetailPanel(14)·TemplateManager(9) — 커밋 `a126f05`,`317d768`.
- 시스템: Members(28)·Accounts(21)·Security(17)·ServerLogs(27)·Audit(23)·Settings(22)·Cms(5)·Discord(3)·IpBlock(6)·Legal(1) — 커밋 `44843ee`,`202c938`,`0e6e55b`. Members·Accounts modalStyle radius 20→16.
- +TargetMenu(61) 분석대시보드 잔여 박멸 — 커밋 `11e3421`.
- **방법**: 결정적 코드모드(`scratchpad/codemod.mjs`) — 문자열인지 균형스캔으로 `style={{}}` 내 리터럴 fontSize만 추출→매핑 text-a* className 이동(+기존 반응형 className 자동 병합), 카드 radius 18|20→16. rem→a토큰 매핑 앵커: 0.85rem→a13(AdminButton), 0.66rem→a10(badge).
- **의도적 잔여(정상)**: 각 파일 2~5개 = ⓐ공유 CSSProperties 상수(inputStyle·cellStyle·thStyle 등 DRY 단일출처) ⓑrecharts `contentStyle`/`wrapperStyle`/`tick`(숫자·대문자 S 프롭) ⓒclamp() 반응형 KPI값. 이들은 "인라인 난립"이 아니라 유지가 타당.

### ✅ P3-c 대시보드군도 완료(2026-07-02 동일 세션, 열거 밖이나 "인라인 박멸"로 마저 처리)
- 셸/카드: AdminSidebar(10)·DashboardSubTabs(3)·DailyTrendChart(7)·KpiCard(4)·RecentActivity(9)·ServiceBarChart(6)·JobsMenu(3) — 커밋 `2fdfb38`.
- 탭/타겟/감사표: CalcStatsTab(10)·OverviewTab(9)·RecruitTab(11)·VisitorTab(23)·CompanyPieChart(1)·UserTagsPanel(5)·WageSegment(1)·WorkDurationSegment(1)·AuditLogTable(5) — 커밋 `d662b6d`.
- shared/PageHeader 프리미티브(아이콘 a20·서브타이틀 a13) — 커밋 `a132be1`.

**→ P3-c 결과: 어드민 전역 인라인 fontSize 스윕 완결.** `text-a*` 사용 521개(어드민). 전 커밋 회귀 0px. **최종 잔여 인라인 fontSize는 전부 의도적**: ⓐclamp() 반응형 헤딩/KPI ⓑ차트 마이크로라벨 0.4/0.45rem(a10=10px보다 작아 확대 시 차트 레이아웃 위험) ⓒ공유 CSSProperties 상수(DRY) ⓓrecharts contentStyle/wrapperStyle/tick(숫자·대문자S) ⓔ**BulkActionBar(대량선택 보호 — 무변경)**.
- ⚠️ 측정 노이즈: `/home` 16px·56px **개수** 지터가 첫로드 레이스로 가끔 뜸(picks는 항상 일치=폰트변화 아님). FAIL 뜨면 **재측정 1회**로 확정(재측정하면 baseline과 일치). picks가 진실 소스.

### ✅ P4 — 정합 (기능) 완료 (커밋 `28cc2a2`)
- **공지 백엔드 이관**: backend `admin.py`에 GET/POST/PATCH/DELETE `/admin/notices` 신설(X-Admin-Token 게이트 + service-role + `_write_audit`, 없는 id는 404). `api.ts` getAdminNotices/createNotice/updateNotice/deleteNotice 추가. `NoticesMenu`가 이를 사용(supabase 클라이언트 제거, 실패는 HTTP 에러→표시). 공개 배너 `useNotices`는 supabase 유지.
- **문의 필터 일원화**: 실측 결과 "이원화"의 실체 = 프론트 `getAdminInquiries`가 supabase 직접 ilike(원형주입+RLS), 백엔드 `/admin/inquiries`는 고아. → 프론트를 백엔드 경로로 전환 + 백엔드 `list_inquiries` search를 페이지내 파이썬 substring → 서버측 `_sanitize_ilike`+`or(title/content/category ilike)`로 보강(회원·지원자와 동일 패턴).
- ⚠️ 백엔드 엔드포인트는 **main 병합 시 Render 배포**(프론트 Vercel과 동시). 배포순서 지연 시 어드민 공지/문의 일시 404 가능(어드민 한정, 수용).
- ※지원자 대량선택·서버로그는 이미 동작 — 무변경.

### ✅ P5 — 마감 (진행분 커밋 `5d8fc60`)
- ✅ dead export `SUPER_ADMIN_EMAIL` 제거(라이브 참조 0).
- ✅ 차트 무지개 팔레트 정돈: `target/*` 4파일 리터럴(purple/pink/teal/gold)+슬레이트 회색 → `CHART_SERIES`+UP 토큰, 카드 radius 12→16. SecurityMenu 역할뱃지 `#e11d48`→`UP.danger`. ※TargetMenu `C` 팔레트는 이미 UP 토큰(값은 규정색)이라 무변경.
- ✅ 브랜드 정체성색(google/kakao/github, Discord blurple)은 식별 목적이라 의도적 유지(주석 명시).
- ✅ 4상태 전수: 전 메뉴 로딩/빈/에러/성공 구비 확인(빈상태는 InquiryTable 등 하위서 처리).
- ✅ 접근성 AA(색대비 실측): 필수 텍스트 navy 15.6·body 11·sub 6.63·strong 5.41·green 5.48·amber 5.02·danger 4.96 = 본문 AA(≥4.5). brand 3.71·caption 3.12 = 큰텍스트/UI AA(≥3). caption-on-sunken 2.85은 토큰상 "비필수" 전용.
- ⏳ 잔여 follow-up(회귀위험 회피로 병합 후 별도): 아이콘전용 버튼 aria-label 전수·키보드 focus-visible 링(어드민 인라인 outline:none 다수) — 별도 접근성 태스크 권장.

### P5 — 마감
- 잔여 하드코딩 hex(어드민은 `MembersMenu`의 `#FEE500` 카카오톤 정도) 토큰화.
- **TargetMenu 다색 팔레트(gold/purple/orange `C.*`) 정돈** — 규칙2 무지개 금지 위반. 계획서상 "다색 차트 별도 정돈"으로 P3-c에서 유예함. `CHART_SERIES`(adminTheme) 기반 절제 팔레트로 치환 검토(차트 가독성 영향 있어 디자인 판단 필요).
- dead export `AdminSidebar.tsx:19 SUPER_ADMIN_EMAIL` 제거(라이브 참조 0 — 단 grep 재확인 후).
- 전 메뉴 4상태 전수 · 접근성 AA · 사용자앱 0px 전수.

### 최종
통합검수(5축 + 회귀 전/후 수치표) → **main 병합·push(자동배포)** → **[승인2] 대기 보고**.

---

## ⚠️ 주의/우회 메모
- `/admin`은 DB 인증 게이트(admin_accounts 조회)라 **헤드리스 렌더 불가** → 어드민 시각은 **tsc+build+로직보존**으로 검증, **사용자앱 0px만 실측**. (규칙1 우회: DB 시드된 관리자 세션이 없으면 게이트 통과 불가 — 확인함)
- 폰트 회귀 핵심: 어드민 텍스트를 `text-a*`(px 고정)로 옮기면 기존 인라인 rem(예 0.85rem=13.6px)→가장 가까운 a13(13px)/a14(14px)로 **의도적 정규화**(사용자앱 아님). 사용자앱은 `text-a*` 미사용이라 항상 0px.
- 병렬 세션이 main에 어드민 토큰/헬퍼(btnPrimary 16파일·PageHeader)를 이미 얹어둠 → **재사용**(중복 신설 금지). 최종 병합 시 정합 확인.
- LF→CRLF 경고는 무해(Windows 개행).
