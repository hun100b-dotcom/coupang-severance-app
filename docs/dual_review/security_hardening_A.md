# 보안 하드닝 V1~V6 — 더블리뷰 A (총괄)

> 대상 브랜치: `security/hardening` / 기준: `main`
> 방법: `git diff` 전수 + 관련 기존 마이그레이션(002/003/004/20260410_notifications/20260629_audit_logs_schema) 교차검증 + 직접 grep·build 실증
> 성격: 총괄 정확성·코드경로 안전성 검증. 긍정 편향 배제.

## 0. 요약 판정

**조건부 PASS / BLOCKER 0.** V1~V4·V6은 DB 정책·권한 변경(마이그레이션 파일만, Dispatch가 MCP로 적용)이며 코드 경로 영향이 없음을 grep으로 실증. V5는 방문자탭 평문 PII 제거를 코드로 적용(빌드 통과). 지원자관리(ApplicantsMenu) 평문 PII는 운영상 평문 필요·범위가 커 이번 분리(별도 트랙, 명시 보고). WARN 2건(V6 광역 ALTER, V3 자기-알림 자가스팸)은 비차단.

## 1. 항목별 검증표

| 항목 | 코드영향 확인(실측) | 조치 | 정확성 | 안전성(끊김) | 판정 |
|---|---|---|---|---|---|
| V1 user_profiles | `grep -rn user_profiles frontend/src backend` = **0건**(SQL 3파일만) | anon/auth/PUBLIC REVOKE + security_invoker=on | 유효 | 미사용 객체→끊김 없음 | PASS |
| V2 admin_audit_logs | 실사용 테이블은 `audit_logs`(별개). `admin_audit_logs`는 코드 0참조 | INSERT를 is_admin() 전용으로 | 유효(DROP/CREATE POLICY) | 미사용→끊김 없음 | PASS |
| V3 notifications | insert 경로 = ApplicantsMenu(어드민) 단 1곳, 백엔드 insert 없음 | INSERT `auth.uid()=user_id OR is_admin()` | 유효 | is_admin 경로 유지(어드민 등록 필요) | PASS(WARN) |
| V4 SECURITY DEFINER 함수 | `.rpc(`/`/rpc/` = **0건**(Edge `functions.invoke`만, 무관) | anon/auth/PUBLIC EXECUTE 회수(DO 동적) | 유효(regprocedure) | 트리거 발화 무관, RLS 함수 제외 | PASS |
| V5 방문자탭 | profiles.select 평문 → 백엔드 마스킹 | 마스킹 엔드포인트+VisitorTab 전환 | 유효 | RLS 게이트 뒤였음, 빌드 통과 | PASS |
| V6 함수 search_path | ALTER SET만(본문 무변경) | public,pg_temp 멱등 고정 | 유효 | 동작 동일 | PASS(WARN) |
| 빌드 | `npm run build` tsc+vite ✓ / admin.py `ast.parse` ✓ | — | — | — | PASS |
| 회귀(계산로직) | 28일블록/평균임금 등 파일 무변경(diff 무관) | — | — | — | PASS |

## 2. 세부 근거

- **V1**: 004가 이미 뷰에 `WHERE is_admin()`를 넣었지만 Advisor가 여전히 `auth_users_exposed`+`security_definer_view` ERROR를 띄운 이유 = ① anon에 잔존 GRANT ② 뷰 기본 SECURITY DEFINER. 본 조치는 ①을 REVOKE로, ②를 security_invoker=on으로 직접 제거. 뷰를 DROP하지 않아 가역적. 백엔드는 service-role로 직접 테이블을 읽고 뷰를 안 쓰므로 무관.
- **V2**: `20260629_audit_logs_schema.sql` 주석이 명시하듯 `admin_audit_logs`(002)는 컬럼(target_table/detail)이 코드와 달라 미사용. 실사용 `audit_logs`는 이미 is_admin INSERT + 백엔드 service-role 우회로 정상. 따라서 V2는 미사용 테이블의 위조 표면만 제거.
- **V3**: 기존 `WITH CHECK(true)`는 **임의 user_id로 타인 알림 생성**(피싱) 허용. 신정책은 타인 대상 insert를 is_admin()으로만 허용 → ApplicantsMenu(어드민 확정/거절 알림)는 동일 권한 수준이라 유지. 단 알림 발송 관리자가 `admin_accounts(is_active=true)` 미등록이면 insert 실패(아래 WARN).
- **V4**: 트리거 함수는 트리거 발화 시 정의자/소유자 권한으로 실행되어 호출자 EXECUTE 회수와 무관. is_admin/is_super_admin은 RLS 평가에 필요해 **회수 대상에서 제외**(올바름).
- **V5**: 마스킹 엔드포인트는 `_mask_name/_mask_email`(회원탭과 동일 규칙) 재사용, UUID 화이트리스트로 PostgREST in.() 인젝션 차단, 1000건 상한. VisitorTab은 `lookupMaskedProfiles`만 사용 → 네트워크에 평문 미전송. CSV도 마스킹값.

## 3. WARN (비차단)

- **W1 (V6 광역 ALTER)**: search_path 미설정 public 함수 **전부**에 SET 적용. 만약 어떤 함수가 `extensions`/다른 스키마 객체를 unqualified로 참조하면 깨질 수 있음. 본 레포 정의 함수는 모두 public/qualified(`auth.email()` 등)라 안전하나, 대시보드 수동 생성 함수는 적용 전 확인 SQL(파일 내 포함)로 목록 육안 점검 권장.
- **W2 (V3 자가-알림)**: 일반 유저가 자기 자신(user_id=본인)에게 알림 insert 가능 → 자기 테이블만 더럽히는 자가스팸(타인 영향 없음). 기존(타인 스팸 가능) 대비 강한 개선. 프론트에 일반 유저 insert 경로 없음. 필요 시 후속에서 is_admin 전용으로 더 조일 수 있음.

## 4. BLOCKER

**BLOCKER 0.**

## 최종 판정
**조건부 PASS — BLOCKER 0, WARN 2(비차단).** 코드 변경 빌드 통과, 계산 로직 무변경, 마이그레이션은 멱등·가역.
