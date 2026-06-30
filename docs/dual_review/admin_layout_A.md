# 어드민 레이아웃 재설계 — 독립 더블리뷰 A (실측본)

- 대상 커밋: `31fde42` redesign(admin): 어드민 셸 레이아웃 전면 재설계 + 보안 현황 대시보드 신설
- 비교 기준: `main...HEAD`
- 검증 일자: 2026-06-30
- 검증 방식: 실측만 (git diff 전문 정독 + 실제 빌드 + grep)

> ⚠️ 사전 메모: 프롬프트에는 브랜치명이 `redesign/admin-layout`으로 명시되었으나, 실측 결과 현재 브랜치는 `security/applicants-pii` 입니다. 단, HEAD 해시(`31fde42`)와 변경 파일 3개는 프롬프트와 정확히 일치하므로 검증 대상은 동일합니다.

---

## 종합 판정표

| # | 검증 항목 | 판정 | 실측 근거 |
|---|----------|------|----------|
| 1 | 변경 범위가 3개 파일로 한정 | **PASS** | `git diff --name-only` 결과 정확히 3개 (AdminSidebar.tsx, SecurityMenu.tsx, AdminPage.tsx) |
| 2 | TypeScript/빌드 통과 | **PASS** | `tsc -b && vite build` → `✓ built in 13.05s` |
| 3 | 기능 무변경 (권한/판정/감사) | **PASS** | DEFAULT_PERMS·switch·게이팅·useEffect 모두 의미 불변, 아래 상세 |
| 4 | SecurityMenu 읽기 전용 | **PASS** | GET 3종 + supabase select만, 쓰기 호출 0건 |
| 5 | 충돌 금지 파일 무수정 | **PASS** | ApplicantsMenu.tsx, backend/app/api/admin.py 둘 다 diff에 없음 |
| 6 | 반응형(320/768/1280) 분기 정합 | **PASS** | md:hidden / hidden md:flex / hidden md:block 상호 배타, 미정의 참조 없음 |
| 7 | 계산 로직(severance 등) 무관 | **PASS** | diff에 admin 3파일만 포함, calc/severance 파일 미포함 |

---

## 1) 변경 범위 (PASS)

```
frontend/src/components/admin/AdminSidebar.tsx     | 428 +++++-------
frontend/src/components/admin/menus/SecurityMenu.tsx | 323 ++++++ (신규)
frontend/src/pages/AdminPage.tsx                   | 147 +++--
3 files changed, 625 insertions(+), 273 deletions(-)
```
`git log main..HEAD` 도 커밋 1개(`31fde42`)뿐. 범위 한정 확인.

## 2) 빌드 (PASS)

- 명령: `npm run build` (`package.json` line 8 = `"tsc -b && vite build"`)
- 결과 마지막 줄: `✓ built in 13.05s` (TypeScript 컴파일 통과 → 빌드 산출물 생성 완료)
- 경고는 청크 크기(>500kB) 관련뿐이며 이번 변경과 무관(기존 BarChart/TargetTab/index).
- 참고: AdminSidebar.tsx·SecurityMenu.tsx가 `React.CSSProperties`를 `React` 명시 import 없이 사용하나, tsconfig 전역 React 네임스페이스로 해소되어 `tsc -b` 통과. (블로커 아님)

## 3) 기능 무변경 — 엄격 검증 (PASS)

### DEFAULT_PERMS (AdminPage.tsx 26~54)
diff 상 각 역할 블록에 **`security` 키만 추가**:
- super_admin: `..., server_logs: true, security: true,` (기존 값 전부 그대로)
- admin: `..., server_logs: false, security: false,`
- viewer: `..., server_logs: false, security: false,`
→ 기존 dashboard/target/.../server_logs 권한 값 **단 한 개도 변경되지 않음**. 추가만 발생.

### renderMenu switch (AdminPage.tsx 182~199)
- 추가된 case는 `case 'security': return <SecurityMenu />` 단 1줄.
- 기존 case 13종(dashboard~server_logs) **불변**.
- 권한 가드 `if (currentPerms[activeMenu] === false)` (line 175) **불변**.

### isSuperAdmin prop 게이팅 (AdminPage.tsx 191~193)
- `MembersMenu isSuperAdmin={...}`, `AccountsMenu isSuperAdmin={...}`, `SettingsMenu isSuperAdmin={...}` 모두 **그대로 유지**.
- SecurityMenu는 prop 없이 호출되나, AdminPage 권한 가드(`currentPerms['security']`)로 게이팅됨. admin/viewer는 `security:false`라 AccessDenied 화면이 뜸 → 실제 접근 통제는 권한 맵이 담당.

### 관리자 판정 / 리다이렉트 / 감사 (AdminPage.tsx 90~160)
- admin_accounts 조회(`select('role, is_active').eq('email', email).single()`) **불변**.
- super 이메일 분기(`SUPER_ADMIN_EMAIL`, `VITE_ADMIN_EMAIL`) **불변**.
- 리다이렉트 effect(`navigate(isLoggedIn ? '/home' : '/login', {replace:true})`) **불변**.
- `logAdminAction('admin.login', ...)` effect **불변**.
- permission_levels fetch effect(`system_settings` 조회 → setPermLevels) **불변**.
→ 이 영역들은 diff hunk에 포함되지 않았음(읽기로 재확인). 의미 변화 0.

### AdminSidebar에서 제거된 것 (AdminSidebar.tsx diff)
제거 대상은 **UI 요소 + 사이드바 내부 보조 상태**뿐:
- 신원(adminEmail) 표시, 역할 뱃지, 로그아웃 버튼 → 상단바(AdminPage)로 이전.
- 사이드바 자체의 `permLevels` state + `system_settings` fetch useEffect + `currentRole/Label/Color` 파생값 제거. (이 fetch는 AdminPage에 동일 로직이 여전히 존재 → 중복 제거일 뿐, 권한 의미 변화 없음)
- Props 변경: `adminEmail/isSuperAdmin/onLogout` 제거, `collapsed?` 추가.
- **메뉴 트리(MENU_TREE) 권한 의미 불변**: security 항목 1개만 추가, 나머지 라벨/키/그룹 동일. `superOnly` 플래그는 사이드바 내 빨간 점(●) 표시용 데코레이션일 뿐, 실제 접근 통제 아님.

## 4) SecurityMenu 읽기 전용 (PASS)

- import (line 16): `getAuditLogs, getBlockedIps, getUnmaskKeyStatus` 3종 — 전부 `api.get(...)` (api.ts 702/710/785 실측: 모두 GET).
- supabase 직접 호출: `supabase.from('admin_accounts').select('role, is_active')` (line 101~103) — select만.
- grep `insert|update|delete|upsert|post|put|patch|fetch` → 매치 1건뿐이며 그것은 액션 라벨 문자열 `'ip.unblock': 'IP 해제'` (line 50)로 **API 호출 아님**.
- 쓰기 helper(`blockIp`/`unblockIp`/`patchSetting`/`postAuditLog`)는 api.ts에 존재하나 **SecurityMenu가 import하지 않음**.
→ 진정한 읽기 전용 확인.

## 5) 충돌 금지 파일 (PASS)

`git diff --name-only`에 `ApplicantsMenu.tsx`, `backend/app/api/admin.py` **둘 다 미포함**. (grep 결과 NONE)

## 6) 반응형 분기 (PASS)

- 모바일 헤더: `<div className="md:hidden">` (AdminPage 215) — 768px 미만 노출.
- 데스크탑 영역 컨테이너: 그 아래 `<div style={{display:flex,...}}>` 내부에
  - 사이드바 래퍼 `className="hidden md:block"` (line 292)
  - 신규 상단바 `<header className="hidden md:flex">` (line 304)
  → 셋 다 md(768px) 경계로 상호 배타. 중복/누락 없음.
- 상단바 우측 이메일: `className="hidden lg:inline"` (line 348) — 1280px 미만에서 숨김(고의 절약), 320~767px에선 모바일 헤더가 대신 표시 → 누락 아님.
- 320px 점검: 모바일 헤더 자식들에 `flexShrink:0` + select `flex:1`로 폭 흡수. 고정폭 overflow 유발 요소 없음. 신규 상단바는 hidden 상태라 320px에서 렌더 자체 안 됨.
- 미정의 참조: `MENU_META[activeMenu]`는 AdminMenu 전 키를 망라(`Record<AdminMenu,...>`)하므로 undefined 접근 불가. `collapsed` state 정상 정의. 콘솔 오류 유발 코드 없음.

## 7) 계산 로직 (PASS)

diff 대상에 severance/calc 관련 파일 전무. 4개 계산기 로직 무관.

---

## BLOCKER 판정 사유

- 빌드 실패: 없음 (PASS)
- 권한/RLS/CRUD/감사 로직 실제 변경: 없음 (security 키/케이스 추가뿐, 기존 값 불변)
- 충돌 금지 파일 수정: 없음

BLOCKER: 0
