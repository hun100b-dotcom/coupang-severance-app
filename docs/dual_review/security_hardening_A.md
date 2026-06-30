# 보안 하드닝 V1~V6 — 더블리뷰 A (시니어 보안 리뷰어 · 총괄)

> 대상 브랜치: `security/hardening` (변경은 **작업 트리 미커밋 상태**, HEAD=main 동일)
> 방법: `git diff`(HEAD 대비) 전수 + 기존 마이그레이션(002 / 004 / 20260410_notifications / 20260629_audit_logs_schema) 교차검증 + 직접 grep·build·ast 실증
> 성격: 총괄 정확성·코드경로 안전성("끊기면 큰일") 검증. 긍정 편향 배제, 실제 위험·한계 명시.
> 검증일: 2026-06-30 · 검증자: Review A (독립 에이전트, 실측본)

## 0. 요약 판정

**조건부 PASS — BLOCKER 0.**

V1~V4·V6은 DB 정책·권한 변경(마이그레이션 파일, MCP/대시보드로 적용)이며 **앱 코드 경로 영향 0건**을 grep으로 실증. V5는 방문자탭 평문 PII 제거를 코드로 적용(빌드·문법 통과). 기능을 끊거나 보안 회귀를 일으키는 치명 결함은 없다. 다만 ① **마이그레이션이 아직 실 DB 미적용**(작업 트리에만 존재)이고 ② V3가 "알림 발송 관리자가 `admin_accounts(is_active=true)`에 등록돼 있어야" 동작하는 **운영 전제**에 의존하므로 "조건부".

## 1. 항목별 검증표

| 항목 | 코드영향 실측 | 조치 | 정확성 | 안전성(끊김) | 판정 |
|---|---|---|---|---|---|
| **V1** user_profiles | `grep -rn user_profiles frontend/src backend` = **0건** | anon/auth/PUBLIC REVOKE + security_invoker=on | 유효(REVOKE/ALTER VIEW) | dead 객체 → 끊김 없음, DROP 안 함=가역 | **PASS** |
| **V2** admin_audit_logs | `grep admin_audit_logs` = **0건**, 실사용은 `audit_logs`(별개) | INSERT를 is_admin() 전용으로 | 유효, DROP 대상 `audit_logs_insert`가 002:30 실제 정책명과 일치 | 미사용 테이블 → 끊김 없음 | **PASS** |
| **V3** notifications | insert 경로 = ApplicantsMenu(menus/) 220·286행, 백엔드 insert 없음 | INSERT `auth.uid()=user_id OR is_admin()` | 유효, DROP 대상 `인증된 사용자 삽입 허용`이 20260410:35와 일치 | is_admin 분기로 어드민 발송 유지 | **PASS(WARN)** |
| **V4** SECURITY DEFINER/트리거 함수 | `grep '\.rpc(\|/rpc/' frontend/src backend` = **0건** | anon/auth/PUBLIC EXECUTE 회수(DO 동적) | 유효(pg_proc 순회 + regprocedure) | 트리거 발화는 EXECUTE와 무관, is_admin/is_super_admin 제외(정확) | **PASS** |
| **V5** 방문자탭 마스킹 | profiles 평문 select 제거 → 백엔드 마스킹 lookup | POST `/admin/profiles/masked-lookup` + VisitorTab 전환 | 유효 | 빌드 통과, 평문 미전송 | **PASS** |
| **V6** 함수 search_path | ALTER SET만(본문 무변경) | public,pg_temp 멱등 고정 | 유효(proconfig 미설정만, prokind='f') | is_admin 등 동작 불변 | **PASS(WARN)** |
| **빌드** | `npm run build` ✓ 9.44s / admin.py `ast.parse` ✓ | — | — | — | **PASS** |
| **회귀(계산로직)** | `git diff --name-only`에 calc/severance/block 파일 **0건** | — | — | — | **PASS** |

## 2. 세부 근거 (실측)

- **V1**: 004가 뷰에 admin 게이트를 넣었어도 Advisor가 `auth_users_exposed`+`security_definer_view` ERROR를 띄운 이유 = ① anon 잔존 GRANT ② 뷰 기본 SECURITY DEFINER. 본 조치가 ①을 REVOKE로 ②를 security_invoker=on으로 직접 제거. 뷰 DROP 안 해 가역. 백엔드는 service-role로 테이블 직접 조회, 뷰 미사용.
- **V2**: `20260629_audit_logs_schema.sql` 주석대로 `admin_audit_logs`(002)는 컬럼 구조가 코드와 달라 미사용. 실사용 `audit_logs`는 별도로 is_admin INSERT + 백엔드 service-role 우회 정상. V2는 미사용 테이블의 위조 표면만 제거.
- **V3**: 기존 `WITH CHECK(true)` = 임의 user_id로 타인 알림 생성(피싱) 허용. 신정책은 타인 대상 insert를 is_admin()으로만 허용. ApplicantsMenu 인서트는 `user_id: app.user_id`(타인)이므로 `is_admin()` 분기로 유지. MyPage는 INSERT 없음(SELECT/UPDATE 본인 한정) → 무영향. 단 정책의 `TO` 역할이 기존 미지정(PUBLIC)에서 `authenticated`로 바뀐 점은 의도된 강화(익명 INSERT 자체 차단).
- **V4**: 트리거 함수는 트리거 발화 시 소유자/정의자 권한 실행이라 호출자 EXECUTE 회수와 무관. is_admin/is_super_admin은 RLS 평가에 필요해 회수 대상에서 제외(올바름). 프론트는 Supabase Edge `functions.invoke`만 쓰고 PostgREST `rpc`는 0건.
- **V5**: 엔드포인트는 `_mask_name`/`_mask_email`(admin.py:912,900, 회원탭과 동일 규칙) 재사용, `_check_admin`(X-Admin-Token) 인증, UUID 화이트리스트로 PostgREST `in.()` 메타문자 주입 차단, 1000건 상한. **POST 방식**이라 PII가 URL/캐시/로그에 남지 않음. VisitorTab은 `lookupMaskedProfiles`만 사용 → 네트워크 평문 미전송, CSV도 마스킹값.

## 3. WARN / 권고 (비차단)

- **W1 (V3 운영 전제)**: V3 정책의 `is_admin()`은 `admin_accounts`에 `email=auth.email() AND is_active=true` 행이 있어야 true. 운영 관리자 미등록 시 출근확정/거절 알림 insert가 조용히 실패(`console.warn`만, 상태변경은 완료)할 수 있음. → **적용 전 `SELECT email,is_active FROM admin_accounts` 1회 확인 필수.**
- **W2 (적용 미완)**: 5개 SQL은 작업 트리에만 존재(미커밋·미적용). "PASS"는 정적분석+빌드 기준. 실제 보안 효과(anon 차단 등)는 Supabase apply 후 Advisor/curl 재실증으로 닫아야 완결. 적용은 비파괴·가역이라 리스크 낮음.
- **W3 (V6 광역 ALTER)**: search_path 미설정 public 함수 전부에 SET 적용. 대시보드 수동 생성 함수가 `extensions` 등 타 스키마 객체를 unqualified로 참조하면 깨질 수 있음. 본 레포 정의 함수는 모두 public/qualified라 안전. 적용 전 확인 SQL(파일 내 포함)로 대상 목록 육안 점검 권장.
- **W4 (V5 마스킹 강도)**: 표시용 마스킹이며 익명화 아님(`ab***@gmail.com`, `김*훈`, 도메인 평문). 소모집단 재식별 여지 잔존. V5 목표(Network 평문 PII 제거)는 달성. 평문 필요 시 MembersMenu reveal 경로 분리도 적절.
- **W5 (V5 UUID 검증)**: `all(c in "0-9a-fA-F-")`는 주입은 막으나 형식 검증은 아님(`------` 통과). uuid 컬럼 매칭이라 잘못된 값은 행 미매칭으로 끝나 escalation 없음(허용). 더 엄격히 하려면 `uuid.UUID(i)` 파싱 권장(선택).
- **참고 (V3 범위 밖 기존 버그)**: 스키마 컬럼은 `is_read`(20260410:18)인데 MyPage.tsx는 `.eq('read', false)`/`.update({ read: true })` 사용. **이번 변경 무관 기존 이슈**(V3는 INSERT 정책만 손댐). 별도 수정 권장.

## 4. BLOCKER

**BLOCKER 0.**

## 최종 판정

**조건부 PASS — BLOCKER 0, WARN 5(비차단).** 빌드·문법 통과, 계산 로직 무변경, 마이그레이션 멱등·가역. 단 적용 전 `admin_accounts` 운영 관리자 등록 1회 확인 + 실 DB 적용 후 Advisor/curl 재실증 필요.
