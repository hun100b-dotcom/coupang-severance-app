# CATCH 어드민 전수조사 (1단계 · 읽기전용) — 2026-06-30

> **성격**: 조사 전용 — 발견만 기록. **코드 수정·커밋·배포 없음**(구현은 승인 후 3단계).
> **방법**: 소스 라인 단위 추적 + git 실측 + 빌드/그렙 + 병렬 Explore 3종 + 기존 감사문서(`docs/audit/admin_review_2026-06-30.md`) 교차검증.
> **대전제**: 디자인 진실은 코드에서 직접 확인(추측·과거발언 의존 금지).
> **목표**: 사용자앱의 **현재 실제 적용 디자인(업비트풍)** 을 정답지로 어드민을 완전 통일.

---

## A. 사용자앱 "현재 실제 적용" 디자인 언어 (주력 vs 레거시) — 코드 확정

### A-1. 주력(현재 정답지) = 업비트풍 `UP.*` / tailwind `brand·ink·line·page`

| 토큰 | 값 | 근거 |
|------|----|----|
| page(배경) | `#EEF1F5` | `Home.tsx:27`, `tailwind.config.js:page` |
| surface(카드) | `#FFFFFF` | `Home.tsx:28` |
| sunken(구획) | `#F2F5FA` | `Home.tsx:29` |
| navy(헤딩) | `#1A2434` | `Home.tsx:30` |
| body(본문) | `#333D4B` | `Home.tsx:31` |
| sub(보조, AA 6.7:1) | `#565D6A` | `Home.tsx:32` |
| caption(비필수) | `#8E929B` | `Home.tsx:33` |
| hair(헤어라인) | `#E1E4EA` | `Home.tsx:34` |
| brand / strong | `#3182F6` / `#1B64DA` | `Home.tsx:35-36` |
| green(채용/성공) | `#047857` | `tailwind.config.js:accent.700` |
| radius | 카드 12~16(rounded-xl/2xl), 버튼 12 | `Home.tsx`(rounded-2xl/xl) |
| 그림자 | **얕게/헤어라인 위주**(flat) | `Home.tsx` 카드 border 위주 |
| 숫자 | mono + `tabular-nums` | `Home.tsx` 금액 |
| 폰트 | Pretendard(본문) + JetBrains Mono(숫자) | `index.css:79` |

> 사용자앱 홈은 이미 업비트풍으로 전환됨(main HEAD Home.tsx = UP 인라인 토큰·flat·헤어라인·radius 12~16·mono 숫자). **이것이 어드민이 맞춰야 할 정답지.**

### A-2. 레거시(청산 대상)

| 레거시 | 상태 | 위치 |
|--------|------|------|
| tailwind `toss.*` 색 토큰 | 하위호환 표기(“절대삭제금지” 주석)이나 실사용 거의 없음 | `tailwind.config.js:73-84` |
| CSS 변수 `--toss-blue/text/text-2/text-3` | **생존** — 결과 화면에서 사용 중 | `index.css`, `ResultSeverance.tsx`(수십), `ResultUnemployment.tsx`, `Button.tsx:50` |
| index.css 폰트 `+1.5px !important` override | **생존**(회귀 1순위 함정) | `index.css:14-24` |
| 구형 glass-card / radius 20 | 부분 잔존 | `index.css`, `adminTheme RADIUS.card=20` |

---

## B. 어드민 라우트·컴포넌트 트리·데이터흐름·인증/권한

### B-1. 컴포넌트 트리

```
AdminPage.tsx (입장 게이트 + 셸 레이아웃 + 권한 분기)
├─ 입장 게이트 (AdminPage.tsx:89-152) — admin_accounts DB 조회, is_active=true만 진입
├─ 권한 매핑 DEFAULT_PERMS (AdminPage.tsx:24-54) — super_admin(16)/admin(12)/viewer(2)
├─ AdminSidebar.tsx (MENU_TREE 39-82, 접기/펼침, 슈퍼전용 빨간점)
│  ├─ 대시보드  → DashboardMenu (lazy 5탭: Overview/Visitor/CalcStats/Recruit/Target)
│  ├─ 채용·인원 → JobPostings / Applicants / Confirmed / RecruitSummary
│  ├─ 콘텐츠    → Notices / Inquiries(+TemplateManager/InquiryTable/InquiryDetailPanel)
│  └─ 시스템    → Target / Members / Accounts / Security / ServerLogs / AuditLogs / Settings
└─ 상단바(메뉴 제목·역할 뱃지·로그아웃)
```
- 어드민 컴포넌트 **총 41개**(`components/admin/**`), 공통 `ui/*`(6종) **미재사용**.

### B-2. 데이터 흐름 (Supabase 직접 vs FastAPI 백엔드)

| 경로 | 메뉴 |
|------|------|
| **Supabase 직접**(프론트) | 대시보드·Target·채용공고·채용현황·Summary·공지(RLS is_admin)·문의 list·계정 |
| **FastAPI 백엔드**(X-Admin-Token) | 문의 수정/답변/템플릿·회원 마스킹/reveal·지원자 reveal·설정·감사로그·IP차단 |

### B-3. 인증·권한

- **입장 게이트**(AdminPage.tsx:89-152): `admin_accounts.select('role,is_active').eq('email').maybeSingle()` → `is_active=true`만 통과. 하드코딩/env 단독통과 **제거됨**(2026-07-01). 미등록→/home, 비로그인→/login. **리뷰 PASS**(`docs/dual_review/admin_gate_A.md`).
- **백엔드**: `_check_admin`이 `X-Admin-Token ∈ _VALID_ADMIN_TOKENS` 확인(`admin.py:56-58`). 프론트 토큰 = `VITE_ADMIN_SECRET || ANON_KEY.slice(-32)`(`api.ts:369-372`).
- **감사로그**: 모든 관리자 행위 + 실패 reveal(`member.unmask.denied`)까지 기록(`admin.py:122-156`).
- **권한 취약점**(기존 감사 `admin_review_2026-06-30.md` 조사2):
  - 🟠 **P1**: RLS `is_admin()`은 role 무관·is_active만 → viewer도 notices/inquiries/job_postings CRUD 가능(역할 차등이 서버에 없음).
  - 🟠 **P2**: `admin_accounts` SELECT `TO authenticated USING(true)` → 로그인 일반회원도 관리자 명단 열람.
  - 🟡 **P3**: 하드코딩 슈퍼 이메일 백도어(`is_super_admin()`).
  - ✅ 자기승격은 RLS로 차단(안전).

---

## C. 기능 인벤토리 + 플로우 단절점

| 메뉴 | 데이터경로 | 진입→작업→결과 | 상태·단절점 |
|------|-----------|----------------|-------------|
| 대시보드(5탭) | Supabase | KPI→탭전환 | ✅ lazy load |
| Target 분석 | Supabase | 테이블/차트 | ✅ (대규모 집계 프론트 수행) |
| 채용공고 | Supabase | 등록/수정/섹션/soft삭제 | ✅ |
| 지원자 관리 | 백엔드(마스킹+reveal) | 필터→상태변경·**대량처리**→평문해제 | ✅ (대량선택 **구현됨** — `handleBulkUpdate` L272·대량액션바 L574·전체선택 L330·실패ID 재시도 L315) ※최초 audit "미구현"은 오류 |
| 채용현황/Summary | Supabase | 현황차트/요약·CSV | ✅ |
| 공지사항 | Supabase(RLS is_admin) | 추가/수정/토글/삭제 | ⚠️ **RLS 경로 의존** — 미등록·비-admin RLS면 쓰기 0행. **단 `NoticesMenu.tsx:118-119,133-134`에서 에러 명시 표시(무음 아님, 913985e 반영)**. 게이트 정합상 백엔드 이관 권장(선택) |
| 문의 | list=Supabase, 수정=백엔드 | 필터→상태/답변·템플릿 | ⚠️ **필터 이원화 개연성**(프론트 ilike vs 백엔드 `_sanitize_ilike`) — 백엔드 범위라 미확정, 확인 필요 |
| 회원 관리 | 백엔드 마스킹+reveal(PBKDF2) | 검색→보안키→평문해제 | ✅ (대량 불가=의도) |
| 관리자 계정 | Supabase | 추가/역할/활성/삭제 | ✅ **모범 표준**(이중가드·에러표시·refetch) |
| 보안 현황 | 백엔드+Supabase | 차단IP 목록/차단·해제 | ✅ (슈퍼 전용) |
| 서버 로그 | **Supabase 직접**(system_logs) | 로그 테이블 + Realtime 구독 | ✅ **동작**(`ServerLogsMenu.tsx:122` system_logs 직조회 + Realtime L83-85). ※최초 audit "백엔드 부재"는 오류 |
| Audit Logs | 백엔드(service-role) | 필터/범위→목록 | ✅ |
| 설정 | 백엔드 | 권한레벨·보안키·법정변수·IP·Discord·CMS | ✅ |

- **4상태(로딩/성공/실패/빈상태)**: 대체로 존재하나 파일별 편차(로더 스피너 인라인 `<style>` 중복, 빈상태 문구 대비 일부 caption).

---

## D. 어드민 ↔ 사용자앱 어긋남 (통일 격차)

| 항목 | 사용자앱(정답) | 어드민 현재 | 어긋남 |
|------|---------------|-------------|--------|
| 색 토큰(page/navy/strong/hair 등) | UP.* | **UP.*(동일)** | ✅ 이미 일치 |
| radius | 카드 12~16(flat) | `adminTheme RADIUS.card=20` + 로컬 `borderRadius:12` 혼재 | ⚠️ **20 vs 12~16 불일치** |
| 그림자 | 얕게/헤어라인 위주 | `SHADOW.card/float`(무거움) 다수 | ⚠️ 톤 차이 |
| 컴포넌트 | 공통 `ui/{Card,Button,Badge,...}` | **미재사용** — adminTheme 헬퍼+인라인 | ⚠️ **구조 이원화**(같은 카드/버튼을 두 벌 유지) |
| 폰트 크기 | Tailwind `text-*`(override 후 확정) | **인라인 rem/px 강제**(override 회피) | ⚠️ 크기 스케일 불일치·비표준 50+종 |
| 레이아웃 | 큰 섹션·여백·업스케일 | 색만 스왑, **구조·간격 구형 유지** | 🔴 **"통일된 느낌" 부재의 핵심** |
| 하드코딩 색 | 일부(#EDEEF1 등) | 어드민은 `MembersMenu`의 `#FEE500(카카오)` 정도 — 나머지(#EDEEF1·#B7791F 등)는 **대부분 사용자앱**(Login/Home/Landing) | ⚠️ 어드민 산발은 약함(정정) |
| danger 톤 | `#F04452`(차트)/`#D32F3A`(텍스트) | 혼용 | ⚠️ 텍스트/차트 구분 미흡 |

> **결론**: 어드민은 **색은 통일됐으나 "구조·간격·컴포넌트·폰트 방식"이 구형**이라 종훈님 눈에 "안 통일된" 것. 진짜 통일은 **토큰 스왑을 넘어 레이아웃/컴포넌트 재구성**이 필요.

---

## E. index.css 폰트 override 영향지도 + 어드민 인라인 회피 (회귀 1순위)

### E-1. 전역 override 규칙 (`src/styles/index.css:14-24`, 전부 `!important`)

| 셀렉터 | 강제 크기 | 영향 |
|--------|-----------|------|
| `.text-[10px]` | **11.5px** | Tailwind 임의 폰트 클래스 무력화 |
| `.text-[11px]` | 12.5px | |
| `.text-[12px]` | 13.5px | |
| `.text-[13px]` | 14.5px | |
| `.text-[14px]` | 15.5px | |
| `.text-[15px]` | 16.5px | |
| `.text-[16px]` | 17.5px | |
| `.text-[17px]` | 18.5px | |
| `.text-xs` | 13.5px (+lh 1.5) | |
| `.text-sm` | 15.5px (+lh 1.55) | |
| `body`(L79) | Pretendard `!important` | 폰트패밀리 강제 |

- 효과: **어떤 컴포넌트든 `text-[Npx]`/`text-xs/sm`를 쓰면 +1.5px 강제**. → 어드민은 이를 피하려 `adminTheme.ts:6-7` 주석대로 **fontSize를 인라인 rem/px**로 둠(비표준 크기 50+종 난립의 근본 원인).
- **회귀 위험**: 이 override를 건드리면(제거/수정) **사용자앱 전 화면 폰트가 즉시 변함** → 규칙3(측정값) 대상 1순위.

### E-2. 어드민 인라인 style 규모

- 41개 중 **39개(95%)** 가 인라인 style 사용, `style={{` **총 1192개**(grep 실측).
- 용도: ① fontSize override 회피 ② 조건부 색/간격 ③ 호버를 `onMouseEnter/Leave`로 직조작(`AdminSidebar.tsx:198-199,237-238,285-286`) ④ 로더 스피너 인라인 `<style>` 중복.

---

## F. 죽은코드·중복·미사용

| 유형 | 내용 | 근거 |
|------|------|------|
| 미사용 컴포넌트 | **없음**(41개 전부 MENU_TREE 등재/렌더) | `AdminSidebar.tsx:39-82` |
| 색 정의 중복 | `UP` 정의 **2곳**: `adminTheme.ts:13-50` + `Home.tsx:26-41`(로컬). ※`TargetMenu.tsx:15-23`은 UP **참조** 차트색 맵(재정의 아님 — 최초 "3중"은 셈 오류) | — |
| 카드 스타일 중복 | 로컬 `CARD` 상수 재정의 **5파일**: `CalcStatsTab:243`·`OverviewTab:258`·`RecruitTab:208`·`VisitorTab:278`·`TargetMenu:37` vs `adminTheme.adminCard:77-82`(과소보고 정정 — 규모 큼) | — |
| 표헤더 셀 중복 | `NoticesMenu.tsx:150`·`InquiryTable.tsx:56` 각자 정의 | — |
| **dead export (2건)** | ① `AdminSidebar.tsx:19 SUPER_ADMIN_EMAIL` 참조 0 ② **`adminTheme.ts:125 thLabel` 정의됐으나 전 코드 사용 0건** | `admin_gate_A.md` |
| 로더 스피너 중복 | 인라인 `<style>@keyframes spin` 여러 파일 반복 | `TargetMenu.tsx:80-87`, `DashboardMenu.tsx:21-30` |
| 호버 인라인 이벤트 | `:hover` CSS 대신 JS 직조작 6건 | `AdminSidebar.tsx:198-199,237-238,285-286` |

---

## G. toss.* 전수 + 안전 청산 가능여부·교체순서

### G-1. toss 잔재 2계층

| 계층 | 정의 위치 | 참조처(생존) | 판정 |
|------|-----------|--------------|------|
| tailwind `toss.*` 색 토큰 | `tailwind.config.js:73-84` | JSX `bg-toss-*`/`text-toss-*` 실사용 거의 0 | 대부분 dead(정의만) |
| CSS 변수 `--toss-blue/text/text-2/text-3` | `index.css` | `ResultSeverance.tsx`(수십)·`ResultUnemployment.tsx`·`Button.tsx:50` | **생존**(사용자 결과화면) |

- **어드민에는 toss 참조 없음**(adminTheme UP 전환 완료). → toss 청산은 **사용자앱 결과화면 3파일** 문제.

### G-2. 안전 청산 가능 여부·순서 (조건부규칙4 — 조사 후 순차)

1. **조사 완료**: toss 실참조 = `Button.tsx`(1) + `ResultSeverance.tsx`(다수) + `ResultUnemployment.tsx`. tailwind `toss.*`는 정의만.
2. **안전 제거 불가(현시점)**: ResultSeverance/Unemployment가 `var(--toss-*)`에 강결합 → **일괄 삭제 시 결과화면 색 깨짐**. → **어드민 통일 범위 밖**이므로 이번 프로젝트에서 **건드리지 않음**(별도 태스크로 분리).
3. **교체 순서(향후)**: ① `--toss-*` → UP 대응값 매핑표 작성 ② Result 2파일·Button 1파일 순차 치환 + 화면 측정 ③ 전부 치환 확인 후 tailwind `toss.*` + `--toss-*` 정의 제거. **조사 없는 일괄삭제 금지(규칙4)** 준수.
4. **이번 어드민 재개발과의 관계**: 어드민은 toss 무참조라 **청산 대상 아님**. 문서화만 하고 보류.

---

## H. 요약 — 재설계가 풀어야 할 것 (2단계 입력)

1. 🔴 **구조 통일**: 색 스왑 넘어 레이아웃/간격/컴포넌트를 사용자앱 업비트풍으로 재구성(공통 `ui/*` 재사용 or adminTheme 확장).
2. 🟠 **인라인 style 1192개 정리 전략** + **폰트 override 회피의 근본 해결**(측정 기반 회귀 방지).
3. 🟠 **기능 단절점(정정 후 축소)**: 공지 RLS 경로 정합(백엔드 이관, 선택)·문의 필터 이원화 확인. ※지원자 대량선택·서버로그는 **이미 동작**(단절 아님).
4. 🟡 **중복 정리**: UP 2중 정의·카드 5파일 중복·표헤더/스피너 중복·dead export 2건(SUPER_ADMIN_EMAIL·thLabel).
5. 🟡 **권한 P1/P2**(선택, 보안 트랙): 역할 차등·관리자명단 노출 — 디자인과 별개 플래그.
6. ℹ️ **toss 청산**: 어드민 무관, 사용자 결과화면 별도 태스크로 분리.

---

_1단계 조사 완료. 코드 수정 없음. → [리뷰어] 검수 후 2단계 재설계안으로._
