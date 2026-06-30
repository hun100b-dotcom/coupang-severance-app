# 지원자 관리(ApplicantsMenu) PII 서버측 마스킹 — 독립 더블리뷰 A

- 검증일: 2026-06-30
- 검증자: 독립 보안 리뷰어 A (별도 에이전트, 실측 — 추측 금지)
- 대상 변경 3파일 (작업 트리 실측):
  - `backend/app/api/admin.py` — 신규 `GET /admin/applications`, `POST /admin/applications/reveal`
  - `frontend/src/lib/api.ts` — `getAdminApplications` / `revealApplicant` / `MaskedApplication` / `RevealedApplicant`
  - `frontend/src/components/admin/menus/ApplicantsMenu.tsx` — 전면 재작성(평문 직접조회 제거)
- 방법: 파일 정독 + grep + `npm run build` + 백엔드 `ast.parse` 실행

## 항목별 PASS/FAIL

| # | 검증 항목 | 결과 | 근거 |
|---|-----------|------|------|
| 1 | 평문 노출 0 (GET /admin/applications) | **PASS** | 응답의 `applicant_name/birth/phone`은 `_mask_name/_mask_birthdate/_mask_phone`만 통과, `profiles.full_name/email`도 `_mask_name/_mask_email`만 통과. `has_applicant_info`는 bool(평문 아님). 평문 반환 지점은 reveal 단건뿐. 응답 dict에 원본 PII 키 없음 |
| 2 | 프론트 평문 직접조회 제거 | **PASS** | `from('job_applications')` 2곳 모두 `.update().select('id')`(상태변경 쓰기, 비PII). `from('profiles')` 평문 select 없음. `job_postings.select(id,company_name,center_name)`은 드롭다운용 비PII(허용). `admin_accounts.select(role,is_active)`는 슈퍼관리자 판정용 |
| 3 | 단건 reveal 게이팅 | **PASS** | `reveal_applicant`: `_check_admin` → 보안키 미설정 시 400 → `_verify_key`(PBKDF2 상수시간) 실패 시 `applicant.unmask.denied` 감사 + 403, 성공 시 `applicant.unmask` 감사. `_UNMASK_KEY_NAME = "member_unmask_key"` 회원 reveal과 동일 키 재사용 확인 |
| 4 | 검색 우회 차단 | **PASS** | 이름/전화는 원본 컬럼 `applicant_name/applicant_phone ilike`로 서버측 검색, 모두 `_sanitize_ilike`(`* , ( ) %` 제거) 적용. 결과는 동일 마스킹 빌더로 반환 |
| 5 | 기능 로직 불변 | **PASS** | `handleUpdateStatus`·`handleBulkUpdate` supabase 직접 경로 + `.select('id')` RLS 가드 보존. notifications insert 보존. CSV는 서버 마스킹값만 export(평문 일괄추출 아님), `consent_third_party + has_applicant_info` 게이팅 유지 |
| 6 | 빌드 | **PASS** | `npm run build` → `✓ built` (chunk-size 경고만, 기존 이슈·비차단). 백엔드 `ast.parse` → OK |
| 7 | PostgREST 안전 | **PASS (마이너 갭)** | `user_id`는 UUID 화이트리스트(`0-9a-fA-F-`) 검증 후 `in.()`. `company`-파생 job_ids는 DB 소스 신뢰 UUID. `job_posting_id`/`company`는 `eq.{값}` raw — 아래 마이너 참조 |

## BLOCKER: 0건
평문 노출·권한우회·기능회귀급 결함 없음.

## 마이너 이슈 (비차단)
1. `job_posting_id`/`company`/`application_id`의 `eq.` 필터에 UUID 검증 미적용. 실질 위험 낮음: httpx `params=`가 값을 URL 인코딩 → 메타문자가 별도 필터로 분리(injection)되지 않고 리터럴 전달, UUID 컬럼이라 잘못된 값은 빈 결과, 인증 게이트 안쪽. 일관성 차원에서 검증 추가 권고.
2. reveal 403 경로에서 기존 표시된 다른 행 `revealed` 평문을 비우지 않음(추가 누출은 아님, UX 마이너).
3. `_APPLICANTS_MAX`(1000) 상한 매직넘버 통일 권고.

## 종합 판정: **PASS (BLOCKER 0)**
가짜 마스킹(프론트 평문 수신 후 화면 가림)이 실제 제거됐고, 평문은 보안키 해시검증을 통과한 단건 reveal에만 감사로그와 함께 제공된다. 검색·CSV 우회로 모두 마스킹 경로로 통일. 마이너 4건은 인증 게이트 안쪽의 방어심층/일관성 개선으로 배포 차단 사유 아님.
