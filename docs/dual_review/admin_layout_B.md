# 어드민 레이아웃 재설계 — 독립 더블리뷰어 B (적대적 실측)

- 대상: `main...HEAD` (HEAD=`31fde42`, 실제 브랜치=`security/applicants-pii` ※ 프롬프트의 `redesign/admin-layout`과 브랜치명 불일치, 단 HEAD 해시 일치)
- 변경 파일(전수, 3개): `frontend/src/pages/AdminPage.tsx`, `frontend/src/components/admin/AdminSidebar.tsx`, `frontend/src/components/admin/menus/SecurityMenu.tsx`(신규)
- 주장: "레이아웃만 바꾸고 기능 불변" → 적대적으로 깨려 시도함

## 빌드 실측

```
> tsc -b && vite build
✓ built in 10.23s
(경고: chunk > 500kB — index/TargetTab/BarChart, main에도 존재하는 기존 경고. 신규 아님)
```
- `tsc -b` 통과(타입 에러 0). vite 번들 성공. **PASS**

## 적대적 점검 결과 표

| # | 점검 항목 | 실측 근거 | 판정 |
|---|-----------|-----------|------|
| 1 | diff에 동작 변경 숨었나(핸들러/조건/시그니처) | AdminPage: `handleLogout`(L165), `handleMenuChange`(L172), 권한 게이트 `currentPerms[activeMenu]===false`(L175) 모두 불변. 추가된 것은 `collapsed` 상태 + 데스크탑 상단바 + `security` case뿐. `DEFAULT_PERMS`에 `security` 키만 3역할 모두 추가(super=true, admin/viewer=false) | PASS |
| 2 | Sidebar prop 시그니처 ↔ 호출부 일치 | 신규 시그니처 `{active,onChange,collapsed?}`. AdminPage 호출부(L~292)도 `active/onChange/collapsed`만 전달. `adminEmail/isSuperAdmin/onLogout` 제거가 양쪽 동시 반영 — 불일치 없음 | PASS |
| 3 | 제거된 기능(역할배지/로그아웃) 동등 복원 | 데스크탑: 상단바로 이전 — 이메일(L347 lg:inline), 역할배지 `✦ {currentRoleLabel}`(L359, currentRoleColor 사용), 로그아웃 버튼(L362 handleLogout). 회귀 없음 | PASS |
| 3b | 모바일에서 로그아웃/역할배지 유지 | 모바일 헤더(`md:hidden`)는 main과 **바이트 동일**(역할배지 L256-269 + 🚪 로그아웃 L272-287). 변경 0 | PASS |
| 4 | SecurityMenu API 형태 일치 | `getBlockedIps`/`getAuditLogs`/`getUnmaskKeyStatus` 모두 `.then(r=>r.data)` 반환. SecurityMenu의 `Array.isArray(res)?res:(res?.blocked_ips??[])`(이중 방어), `res?.logs??[]`, `getUnmaskKeyStatus()` 타입 `{configured,updated_at}` 정확히 일치. 잘못된 필드 접근 없음 | PASS |
| 4b | try/catch 콘솔 오염 차단 | 5개 fetch 전부 개별 `try{}catch{errs.push(...)}`. 실패해도 throw 미전파 → 콘솔/화면 무오염. 부분실패는 상단 경고 배너로만 표시 | PASS |
| 5 | security 권한: super만 노출 + 비-super 차단 | 사이드바 메뉴트리에 `security: superOnly:true`. AdminPage 게이트: admin/viewer는 `security:false` → 모바일 드롭다운서 선택 시 `renderMenu`가 AccessDenied 반환. RLS는 admin_accounts/감사 엔드포인트가 백엔드서 재검증(이 PR 미변경) | PASS |
| 6 | collapsed의 FLAT_LEAVES 누락/중복 | `FLAT_LEAVES=MENU_TREE.flatMap(...)` — dashboard(single) + recruit-group 4 + admin-group 6(security 포함) = 11 리프. key는 모두 고유 AdminMenu 값 → 중복/누락 없음 | PASS |
| 7 | 충돌 금지 파일 미변경 | `git diff --name-only`: ApplicantsMenu.tsx / backend/admin.py / 기타 개별 메뉴 본문 **diff에 없음**. 3개 파일만 변경 | PASS |
| 8 | 반응형(320/768/1280) 위험요소 | 데스크탑 상단바 `hidden md:flex`(<768 숨김), 모바일 헤더 `md:hidden`. 이메일은 `hidden lg:inline`로 좁은폭 숨김 처리됨. 상단바 항목 다수 `whiteSpace:nowrap` + `flexShrink:0`이나 브레드크럼/이메일은 ellipsis 처리 → 768px 협폭에서 배지+버튼 가로압박 가능성(경미). 헤더 중복(모바일/데스크탑) 없음 — 브레이크포인트로 상호배타 | 주의(경미) |

## 적대적 추가 검증 (깨기 시도)

- **상단바 역할배지 vs 사이드바 옛 배지 동작차**: 옛 사이드바는 자체적으로 `system_settings.permission_levels`를 fetch해 라벨/색 계산(이 useEffect 제거됨). 신규는 AdminPage가 동일 fetch(L148-160)해 `currentRoleLabel/currentRoleColor` 계산 → **단일 출처로 통합**, 의미 동일. 회귀 아님.
- **`security` 미설정 시 권한**: 만약 DB의 `permission_levels`에 `security` 키가 없으면 `currentPerms['security']`는 `undefined`. 게이트는 `=== false`만 차단하므로 undefined는 통과 → 사이드바 `superOnly`가 비-super에게 메뉴를 안 보이므로 데스크탑은 안전. 단 **모바일 드롭다운은 항상 전 메뉴 노출**(main에서도 동일한 기존 동작)이라, DB에 security 키 없는 비-super가 모바일서 선택하면 AccessDenied 대신 SecurityMenu가 렌더될 수 있음. 그러나 DEFAULT_PERMS에 security:false가 박혀 있고 DB값은 `{...DEFAULT_PERMS, ...parsed}` 머지라 기본 차단 보장. SecurityMenu 자체도 읽기전용 + 백엔드 RLS 재검증 → 실질 위험 낮음. **주의(설계 일관성), BLOCKER 아님.**
- **런타임 필드 오접근**: SecurityMenu가 만지는 응답 필드(`logs`, `blocked_ips`, `configured`, `updated_at`, `admin_email`, `action`, `target_type`, `created_at`)는 모두 api.ts 타입/실응답과 정합. 없는 필드 접근 0.
- **빌드 외 정적**: 사용 테마키(sunken/amber*/green*/danger*/caption/navy/hair/hairSoft/brand/brandBg/page/surface/sub/body/strong) 전부 adminTheme에 존재. PageHeader props(icon/title/subtitle/actions) 정합.

## 종합

"레이아웃만 변경, 기능 불변" 주장은 실측상 **성립**. 권한/RLS/CRUD/감사 로직 변경 없음, 충돌 파일 무변경, 빌드 통과, 모바일 회귀 없음. 신규 SecurityMenu는 읽기 전용이며 API 정합. 미세 주의 2건(협폭 상단바 압박, 모바일 드롭다운 전메뉴 노출=기존 동작)은 모두 비차단.

BLOCKER: 0
