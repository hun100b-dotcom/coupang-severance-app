# 보안 하드닝 V1~V6 — 더블리뷰 B (적대/Red-team)

> 대상 브랜치: `security/hardening` / 기준: `main`
> 방법: 각 공격 가설을 grep·파일읽기·build로 **실증 시도**. 추측 BLOCKER 금지(재현 경로 필수). 기존 이슈는 분리 표기.

## 0. 최종 판정 (먼저)

**PASS / BLOCKER 0.** 8개 공격 가설 중 치명적 우회·기능파괴 재현 **실패**. MAJOR 1(범위외 잔존 평문 PII = 기존 이슈, 명시 분리), MINOR 2.

## 1. 공격 가설별 결과

| # | 공격 가설 | 결과 | 근거 |
|---|---|---|---|
| 1 | V1 REVOKE 후에도 anon이 회원 이메일 읽는 다른 경로 | **실패(차단됨)** | auth.users/email 노출 경로는 user_profiles 뷰뿐. grep상 다른 뷰/RPC 없음. REVOKE+invoker로 봉쇄 |
| 2 | V1이 실제 쓰이는 곳을 끊음 | **실패(영향0)** | `grep user_profiles`(비-md) = SQL 3파일만, 코드 0참조. 끊길 기능 없음 |
| 3 | V2/V3 무음 실패로 신규 회귀 | **부분(기존 이슈)** | admin_accounts 미등록 어드민의 notifications insert 실패는 **기존 RLS 모델과 동일**(job_applications update도 동일 제약). 신규 회귀 아님 |
| 4 | V3 자기-알림 자가스팸 | **성립(영향 경미)** | 본인 user_id로만 가능→자기 테이블만. 타인 스팸(기존 취약)은 차단. 프론트 일반유저 insert 경로 없음 → MINOR |
| 5 | V4 `on\_%` 과잉/RLS 함수 오회수 | **실패** | `\_`는 LIKE 기본 이스케이프로 리터럴 `_`. is_admin/is_super_admin 미포함(이름 불일치). .rpc 0건이라 외부호출 영향 없음 |
| 6 | V5 UUID 필터 인젝션 우회 | **실패** | `all(c in 16진수+'-')` → 콤마/괄호/`*` 전부 탈락. 빈/대량 방어(0건 short-circuit, 1000 cap). 화면·CSV 평문 잔재 없음 |
| 7 | 마이그레이션 멱등성/순서/정책명 | **통과(주의1)** | 전부 `DROP ... IF EXISTS`/`IF NOT EXISTS`/skip조건 → 2회·임의순서 안전. is_admin 선존재 전제(V2/V3)는 004 적용됨 가정 → 검증SQL로 확인 권장 |
| 8 | 빌드 무결성 | **통과** | `npm run build` ✓(tsc 에러 0), admin.py ast.parse ✓ |

## 2. MAJOR (단, 기존 이슈 — 이번 변경 무관, 명시 분리)

- **M1 지원자관리(ApplicantsMenu) 평문 PII 잔존**: `ApplicantsMenu.tsx:157` `profiles.select('id,full_name,email')` + `job_applications.applicant_name/applicant_phone` 평문이 브라우저로 내려옴(이름/전화 클라 필터도 평문 의존, L186-187). 이번 V5는 **방문자탭만** 처리. 지원자관리는 운영상 평문(연락·확정)이 필요해 회원탭식 보안키 reveal 흐름으로 재설계해야 하는 큰 작업 → **별도 트랙으로 분리**(과제 등록). 이번 PR이 만든 회귀가 아니라 V5 진단 시점부터의 기존 노출. 단, RLS 게이트 뒤(등록 어드민만)라 anon 노출은 아님.

## 3. MINOR

- **m1 (가설4)**: V3 자기-알림 자가스팸 가능 → 후속에서 is_admin 전용으로 더 조일 여지.
- **m2 (가설7)**: V2/V3/V4/V6은 `public.is_admin()` 또는 함수 존재를 전제. 라이브에 004 미적용 상태면 V2/V3 정책 생성이 실패할 수 있음 → 적용 순서상 004 선적용/존재 확인 필수(검증 SQL 제공).

## 4. BLOCKER

**BLOCKER 0** — 재현 가능한 치명 결함 없음.

## 최종 판정
**PASS — BLOCKER 0.** MAJOR 1은 명시적 범위외(기존 이슈, 별도 트랙). MINOR 2 비차단.
