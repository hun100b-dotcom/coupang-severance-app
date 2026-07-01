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

**측정 하네스**: `scratchpad/p0/measure.mjs`(Playwright headless getComputedStyle). baseline=`measure_before.json`.
매 단계 `npm run preview -- --port 4173` 백그라운드 + `node measure.mjs http://localhost:4173 <label>` → `measure_before`와 대조(사용자앱 선택자 20개 0px 확인). dev 포그라운드 금지.

---

## ⏭️ 다음 세션 인계 지점 (여기부터)

### P3-c — 메뉴 순차 인라인 style 제거 (최대 덩어리, 메뉴 단위로)
현재 어드민 `style={{` 잔여 **약 1120개**. 순서(재설계안): **채용군 → 콘텐츠 → 시스템**.
- 채용군: `JobPostingsMenu`(154)·`ApplicantsMenu`(89)·`ConfirmedMenu`(50)·`RecruitSummaryMenu`(45)
- 콘텐츠: `NoticesMenu`(48)·`InquiriesMenu` + `InquiryTable`(20)·`InquiryDetailPanel`(25)·`TemplateManager`(19)
- 시스템: `MembersMenu`(53)·`AccountsMenu`(37)·`SecurityMenu`(41)·`ServerLogsMenu`(46)·`AuditMenu`(51)·`SettingsMenu`(47)
**작업 패턴(메뉴당)**: 인라인 fontSize→`text-a*` / 버튼→`AdminButton` / 배지→`AdminBadge` / 카드→`AdminCard`(or cardBox) / 표→`AdminTable`(Th/Td) / 로딩·빈·에러→`AdminState` / radius16 / 숫자 mono+tabular. **데이터·핸들러·쿼리 절대 무변경**. 메뉴별 [빌더]→[리뷰어 5축]→회귀0px→커밋.

### P4 — 정합 (기능)
- **공지**: `NoticesMenu` 쓰기를 Supabase 직접(RLS is_admin 의존)에서 **백엔드 경로**로 이관(게이트 정합). ※현재도 에러 표시는 됨(무음 아님).
- **문의**: 프론트 list `ilike` 미새니타이즈 vs 백엔드 `_sanitize_ilike` **필터 경로 일원화 확인**.
- ※지원자 대량선택·서버로그는 **이미 동작**(audit 정정) — 건드리지 말 것.

### P5 — 마감
- 잔여 하드코딩 hex(어드민은 `MembersMenu`의 `#FEE500` 카카오톤 정도) 토큰화.
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
