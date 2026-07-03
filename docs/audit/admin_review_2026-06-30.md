# 어드민 3종 감사 보고서 (2026-06-30)

> **성격**: 조사 전용 — 발견만 기록. **코드 수정·커밋·배포 없음.** (FIX는 다음 단계)
> **방법**: git log/show 실측 + 빌드 산출물(dist) grep + 소스 라인 단위 추적 + 마이그레이션 SQL 정독.
> **대상**: 어드민 디자인 개편 4커밋 / AccountsMenu(계정 권한) 흐름 / 어드민 전 메뉴 맵.

---

## 조사 1 — "어드민 디자인 변경점이 없어 보인다" 원인 규명

### 1-1. 결론 (TL;DR)

> **배포됨 + 빌드 반영 확정. 그런데 "구조 유지 + 토큰 스왑"이라 시각적 임팩트가 작다.**
> 미반영·캐시 문제가 **아니다.** 레이아웃·간격·컴포넌트 배치는 100% 그대로이고, 색/대비/숫자정렬만 바뀐 "정돈형 개편"이라 한눈에 달라 보이지 않는 게 정상이다.

### 1-2. 4개 커밋 main 반영 여부 (git log 실측)

| 커밋 | 내용 | main 포함 | 비고 |
|---|---|---|---|
| `7069a6b` | 묶음1 — 공통 셸 + 대시보드 5탭 (merge) | ✅ | 실작업 커밋 `e84ba2e` |
| `281b801` | 묶음2 — 타겟 + 공지/문의 빈상태 AA 보강 | ✅ | 직접 커밋 |
| `117f4fc` | 묶음3 — 채용 클러스터 4메뉴 (merge) | ✅ | 실작업 커밋 `16924dd` |
| `d6f6eb8` | 묶음4 — 시스템군 5메뉴 + dead 컴포넌트 정리 (merge) | ✅ | 실작업 커밋 `5a0b384` |

→ **4개 모두 현재 main HEAD 히스토리에 정상 존재.** 추가로 V1~V6 보안 하드닝(`8cc6c2d`)·PII 마스킹(`dc28f36`)까지 그 위에 쌓여 있음.

### 1-3. 실제로 무엇이 바뀌었나 (AdminPage.tsx diff 실측)

변경 패턴은 전 메뉴 동일하다. **하드코딩 hex → `adminTheme.ts`의 UP 토큰 치환**이 전부다:

```
- background: '#f8fafc',   (slate-50)        → background: UP.page    (#EEF1F5)
- color: '#0f172a',        (slate-900)       → color: UP.body         (#333D4B)
- color: '#3182f6',                          → color: UP.strong       (#1B64DA)
- border: '1px solid #e2e8f0',               → border: 1px solid UP.hair (#E1E4EA)
```

- **레이아웃 속성(`flexDirection`·`padding`·`borderRadius`·`position`·`gridTemplateColumns`)은 단 한 줄도 안 바뀜.** diff는 전부 `background`/`color`/`border` 색값 라인뿐.
- 추가 변화: ① 무지개색 KPI → brand/green/amber/navy 절제 팔레트 ② 금액·통계에 `tabular-nums`(자릿수 정렬) ③ 빈상태 안내문 `caption(3:1)` → `sub(AA 6.7:1)` 대비 격상.
- **기능·핸들러·쿼리·RLS·임계값은 전부 무변경** (커밋 메시지 명시 + diff 확인).

→ 그래서 **"색이 살짝 차분해지고 숫자가 가지런해진" 수준**으로 보인다. `#f8fafc`(248,250,252) → `#EEF1F5`(238,241,245)는 배경 미세 변화라 육안 차이가 작은 게 당연하다. 임팩트가 작은 건 **버그가 아니라 설계 의도**(구조 보존형 토큰 통일).

### 1-4. 빌드 산출물(dist)에 새 토큰이 실제 포함되는가

| 확인 항목 | 결과 |
|---|---|
| `frontend/dist` 빌드 시각 | 2026-06-30 16:39 (커밋 15:45 **이후** 빌드) |
| 새 페이지 토큰 `EEF1F5` 포함 청크 | `TargetTab-*.js`(어드민 셸 번들), `index-*.css`, `Home-*.js` |
| 어드민 셸 코드 위치 | `TargetTab-Dh2SrQyj.js` (`'접근 제한'`·`admin_accounts` 문자열 동거 확인) |
| 같은 청크에 `EEF1F5` 동시 존재 | ✅ → **어드민 셸이 새 토큰으로 빌드됨** |
| 구 토큰 `f8fafc`가 어드민 셸에 잔존 | ❌ 없음 (완전 치환) |
| `adminTheme` import 사용 컴포넌트 수 | **33개** (어드민 전 메뉴 토큰화) |

> 청크 이름이 `AdminPage`가 아니라 `TargetTab`인 것은 Vite의 청크 네이밍 산물일 뿐(어드민 트리가 한 모듈명으로 묶임). 내용상 어드민 셸 전체가 새 토큰으로 정상 빌드됐다.

### 1-5. 조사 1 최종 판정

| 가설 | 판정 |
|---|---|
| 빌드에 안 들어감 | ❌ 기각 (dist에 새 토큰 확인) |
| 캐시 문제 | ❌ 가능성 낮음 (소스·빌드 모두 새 토큰) |
| **구조 유지 토큰 스왑이라 시각 임팩트 작음** | ✅ **확정** |

**프로덕션 확인 권장(선택)**: 브라우저 강력새로고침(Ctrl+Shift+R) 후 어드민 진입 → 배경이 `#EEF1F5`(약간 푸른 회색)인지, 금액 숫자가 가지런한지 보면 반영 여부를 눈으로 확인 가능. "더 크게 달라 보이게" 하려면 토큰 스왑이 아니라 별도 **레이아웃 개편 작업**이 필요(다음 단계 의사결정 사항).

---

## 조사 2 — 계정 권한부여 기능 (관리자 추가/역할변경/활성화)

### 2-1. 동작 판정 (AccountsMenu.tsx 전 구간 추적)

> **결론: 기능 동작은 정상 — 어드민 메뉴 중 유일한 "모범 표준".**
> 단, 실효성은 **운영 로그인 계정이 super_admin이어야** 보장된다(아래 권한 경계 참조).

| 기능 | 흐름 | `.select()` | 에러처리 | refetch | 판정 |
|---|---|---|---|---|---|
| 목록 조회 | `fetchAccounts` → `admin_accounts.select('*')` | — | `if(error) throw`+catch | — | ✅ 정상 |
| 계정 추가 | `handleSave(create)` → `.insert()` | 불필요(insert는 RLS거부 시 error 반환) | `if(error) throw`+화면표시 | ✅ | ✅ 정상 |
| 역할/활성 변경 | `handleSave(edit)` → `.update().eq()` | ❌ 없음 | `if(error) throw`+화면표시 | ✅ | ✅ 정상* |
| 삭제 | `handleDelete` → `.delete().eq()` | ❌ 없음 | `if(error) throw`+alert | ✅ | ✅ 정상* |

- **이중 가드**: 클라(`if(!isSuperAdmin) return`) + 서버(RLS `is_super_admin()`). 다른 메뉴엔 없는 구조.
- **에러 가시성**: 모든 쓰기가 `try/catch` + `saveError` 화면 표시 + `await fetchAccounts()` 재조회 → "조용한 거짓 성공"이 안 생긴다.
- **\* 미세 주의**: update/delete에 `.select()`가 없어, 만약 비-super 계정이 호출하면 RLS 0행 차단이 `error=null`로 무음 처리될 수 있다. 단 **클라 가드 + RLS가 super_admin으로 일치**하므로 실사용에선 super_admin은 항상 통과 → 실무상 정상 동작. (완전 방어하려면 `.select()` 추가 권장 — FIX 항목.)

### 2-2. 권한 경계 취약점 분석 (마이그레이션 실측: 001·004·005)

| # | 취약점 | 실측 근거 | 위험도 | 자기승격 가능? |
|---|---|---|---|---|
| **P1** | **일반 admin·viewer·커스텀 역할이 사실상 전부 "풀 관리자"** | `is_admin()`은 **role 무관, `is_active=true`만** 확인(004:18-26). notices·inquiries·job_postings·system_settings 쓰기 RLS는 전부 `is_admin()` → **viewer로 등록해도 이 테이블들 CRUD 다 됨.** role별 차등은 `permission_levels` JSON(클라)에만 존재. | 🟠 높음 | 역할 무력화(viewer=admin) |
| **P2** | **로그인한 일반 회원도 관리자 명단 전체 열람** | `admin_accounts` SELECT = `TO authenticated USING(true)`(001:40-43). 어떤 일반 앱 사용자든 로그인만 하면 **관리자 이메일·역할 전부 조회** 가능 → 관리자 표적 피싱. | 🟠 높음 | (열람) |
| **P3** | **하드코딩 슈퍼어드민 백도어** | `is_super_admin()`이 `auth.email()='catchmasterdmin@gmail.com'`를 **무조건 super 처리**(005:15-26). admin_accounts에서 빼도 그 이메일은 영구 super. 계정·이메일 탈취 시 단일 실패점. | 🟡 중간 | (정적 크리덴셜) |
| **P4** | **role enum 제약 해제** | 005:29-33이 `CHECK(role IN(...))` 제거 → `char_length>0`만. super_admin이 **임의 문자열 역할** 생성 가능(오타·혼선 소지). RLS는 어차피 role을 거의 안 보므로 권한상 영향은 P1에 흡수. | 🟢 낮음 | — |

### 2-3. 핵심 질문에 대한 직답

| 질문 | 답 |
|---|---|
| 일반 admin이 super_admin으로 **자기 승격** 가능? | **❌ 불가.** `admin_accounts` INSERT/UPDATE/DELETE는 RLS `is_super_admin()` 전용(004:174-187). 일반 admin이 직접 Supabase로 자기 role을 super로 UPDATE 시도 → RLS 0행 차단. **DB 레벨에서 막힘(안전).** |
| role 검증이 **클라뿐인가 서버/RLS인가**? | **둘 다 있으나 경계가 어긋남.** 메뉴 노출·역할 라벨은 클라(`permission_levels`). 쓰기 차단은 RLS. 그러나 RLS가 구분하는 건 오직 `is_admin`(활성 여부) / `is_super_admin`(super 여부) 2단계뿐 → **admin vs viewer 구분은 서버에 없음**(P1). |
| `admin_accounts` SELECT가 anon에도 노출? | **코드상(001)은 `TO authenticated`라 anon은 차단.** 단 보안진단 문서에 "라이브 확인됨"으로 적혀 있어, 만약 라이브에서 anon이 읽힌다면 **이 마이그레이션 밖의 별도 anon GRANT/정책**이 있는 것 → DB 1회 조회로 확정 필요. 확정 사실: **로그인 일반회원 전원 노출(P2)**. |
| `is_admin`/`is_super_admin` 일관성? | 일관되게 정의됨. 다만 `is_admin`=활성만, `is_super_admin`=super역할 OR 하드코딩 이메일. **둘 사이 "중간 등급(admin)"을 서버가 모름**이 P1의 뿌리. |

### 2-4. 조사 2 종합

- **동작**: ✅ OK (AccountsMenu는 깨지지 않음, 모범 사례).
- **취약점**: 🟠 **P1(역할 차등 서버 미적용)** + 🟠 **P2(관리자 명단 일반회원 노출)**가 핵심. 자기승격은 막혀 있어 🔴는 아님.
- **FIX 방향(메모)**: ① `admin_accounts` SELECT를 `is_admin()`으로 제한(P2) ② 역할별 RLS 분리 또는 백엔드 권한 enforcement 도입(P1) ③ 하드코딩 super 이메일 제거 검토(P3) ④ update/delete에 `.select()` 추가(2-1*).

---

## 조사 3 — 어드민 메뉴 맵 (가이드용)

> 출처: `AdminSidebar.tsx` MENU_TREE + 조사2/기존 감사. **보안 관련 위치**는 🔐로 표시.

### 3-1. 전체 메뉴 트리 (사이드바 그룹 구조)

| 그룹 | 메뉴 | 키 | 한 줄 기능 | 보안 |
|---|---|---|---|---|
| 📊 **대시보드** | 대시보드 | `dashboard` | 개요·방문자·계산기·채용 KPI 통계(실데이터 조회) | — |
| 👥 **채용·인원** | 채용공고 | `job_postings` | 공고 등록/수정/섹션변경/soft삭제 | — |
| | 지원자 | `applicants` | 지원자 상태변경(확정/거절)·대량처리·알림발송 | — |
| | 채용현황 | `confirmed` | 확정 인원·기간필터·차트·CSV | — |
| | Summary | `recruit_summary` | 채용 KPI 요약(소요일 등) | — |
| 📋 **콘텐츠** | 공지사항 | `notices` | 공지 추가/수정/활성토글/삭제 | — |
| | 문의 | `inquiries` | 1:1 문의 상태변경·답변·일괄·템플릿 (대기배지 실시간) | — |
| ⚙️ **시스템** | Target | `target` | 타겟 분석 차트(읽기 전용) | — |
| | **회원 관리** | `members` | 회원 목록·검색·PII 마스킹/해제 | 🔐 **PII·마스킹키** |
| | **관리자 계정** | `accounts` | 관리자 추가/역할/활성/삭제 (super만) | 🔐 **권한부여** |
| | 서버 로그 | `server_logs` | 시스템 로그(Realtive 구독) + 감사탭(백엔드 경로) | 🔐 감사 |
| | **Audit Logs** | `audit_logs` | 관리자 행위 감사 기록 조회 (super 전용 표시) | 🔐 **감사로그** |
| | **설정** | `settings` | 권한레벨·마스킹키·법정변수·**IP차단**·Discord·CMS | 🔐 **IP차단·키·법정변수** |

### 3-2. 보안 관련 위치 한눈에 (종훈님이 어디서 무엇을 보나)

| 보고 싶은 것 | 메뉴 위치 | 무엇을 보나 |
|---|---|---|
| 누가 관리자인가 / 권한 주기 | 시스템 → **관리자 계정** | 관리자 추가·역할(super/admin/viewer)·활성토글·삭제. **super_admin만 버튼 노출** |
| 회원 개인정보 보호 | 시스템 → **회원 관리** | 이름·연락처 마스킹 상태, 마스킹 해제(서버측 마스킹 적용분) |
| 관리자가 무슨 짓 했나 | 시스템 → **Audit Logs** (또는 서버 로그 감사탭) | 관리자 행위 로그(super 전용) |
| 악성 IP 차단 | 시스템 → **설정** → IP 차단 | IP 추가/해제(백엔드 토큰 경로) |
| 마스킹 해제키·권한레벨·법정변수 | 시스템 → **설정** | 보안키·역할 권한 JSON·계산용 법정변수 |
| 서버/시스템 이벤트 | 시스템 → **서버 로그** | 실시간 system_logs + 감사 |

### 3-3. 가이드용 주의점 (사이드바 동작 특이사항)

- **역할별 메뉴 숨김이 약함**: 사이드바는 `currentRole = isSuperAdmin ? 'super_admin' : 'admin'`로만 계산하고, 자식 메뉴를 권한으로 **필터링하지 않는다**(audit_logs의 `superOnly`도 빨간 점만 붙고 숨기지 않음). 즉 **메뉴 가시성은 신뢰 경계가 아니다** — 실제 차단은 RLS/super 가드에서만 일어난다(조사2 P1과 동일 맥락).
- **문의 대기 배지**: `inquiries.status='waiting'` 건수를 Realtime 구독으로 실시간 표시.

---

## 부록 — FIX 단계 우선순위 메모 (이번 세션 미수행)

| 우선 | 항목 | 출처 |
|---|---|---|
| 🟠 | P2: `admin_accounts` SELECT를 `is_admin()`으로 제한(관리자 명단 노출 차단) | 조사2 |
| 🟠 | P1: 역할 차등을 서버(RLS/백엔드)로 enforcement | 조사2 |
| 🟡 | P3: 하드코딩 super 이메일 백도어 제거 검토 | 조사2 |
| 🟢 | AccountsMenu update/delete에 `.select()` 추가(무음 차단 방어) | 조사2 |
| 🟢 | 디자인: 임팩트 키우려면 토큰 스왑 아닌 별도 레이아웃 개편 의사결정 | 조사1 |
| ℹ️ | DB 1회 조회: admin_accounts가 라이브에서 anon에도 읽히는지 확정 | 조사2 |

*본 보고서는 조사 결과만 담는다. 코드 수정·커밋·배포는 수행하지 않았다.*
