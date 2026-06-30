# 지원자 관리 PII 서버측 마스킹 — 독립 더블리뷰 B (적대적 검증)

- 검증일: 2026-06-30
- 검증자: 독립 보안 리뷰어 B (별도 에이전트, "어떻게든 평문을 새게 하라" 관점)
- 방법: `git diff` + 파일 read + grep + `npm run build` + `ast.parse` 실측

> 참고(운영 메모): 검증 시점에 동일 체크아웃을 공유한 다른 세션(어드민 셸 재설계 / P1 역할차등)의
> 커밋이 작업 브랜치에 섞여 들어와 git 상태가 혼재했다. 본 지원자 PII 변경 3파일은
> **현재 main(df4984a)이 한 번도 건드리지 않은 파일**이며, 최종 반영은 main 위에
> 단일 커밋으로 cherry-pick 했다(다른 세션 커밋 미혼입).

## 적대적 점검 — 항목별 PASS/FAIL

| # | 점검 항목 | 결과 | 실측 근거 |
|---|---------|------|----------|
| 1 | 네트워크 평문 누출 경로 | **PASS** | `list_applications` 반환 전 필드 전수 분류: id/user_id/job_posting_id/status/applied_at/work_date/gender/shift/task/consent_*(비PII·내부키), `has_applicant_info`(bool), 이름/생년/전화·프로필명/이메일(전부 `_mask_*` 통과). `job_postings(company,center)`=PII 아님. 평문 반환 지점은 reveal 단건뿐 |
| 2 | reveal 권한 우회 | **PASS** | 키 미설정→400(평문 미반환), 불일치→403+`applicant.unmask.denied` 감사. `_verify_key`=PBKDF2 + `hmac.compare_digest`(상수시간). 키 없이 평문 받는 경로 없음 |
| 3 | 프론트 supabase 평문 직접 select 잔존 | **PASS** | `from('job_applications')` 2곳은 `.update().select('id')`(쓰기, PII select 아님). 목록은 `getAdminApplications`(마스킹 백엔드)로만 |
| 4 | isSuperAdmin 자체판정 | **PASS (주의)** | 노출 게이팅 `isSuperAdmin && unlockMode`. 판정=`SUPER_ADMIN_EMAIL`/env/`admin_accounts.role`. **실제 경계는 백엔드 키검증**이라 프론트 우회해도 평문 불가. 프론트 게이트는 UX 가드 |
| 5 | CSV 평문 일괄 유출 | **PASS** | `handleExportCsv`: `consent_third_party && has_applicant_info` 게이팅, `displayApplicants`의 **마스킹 필드만** 사용. `revealed` 맵 미참조 → 전 행 reveal 후 CSV 눌러도 마스킹값만 출력 |
| 6 | 빌드/문법 | **PASS** | `npm run build` ✓ (TS 에러 0). admin.py `ast.parse` OK |
| 7 | 회귀 | **PASS** | 디바운스 300ms 서버필터 유지, `.select('id')`+`length===0` 거짓성공 방지 유지, 알림 insert·대량처리 보존 |
| 8 | 파일 충돌 범위 | **PASS** | 변경=ApplicantsMenu.tsx / api.ts(지원자 함수) / admin.py(지원자 엔드포인트)로 국한. MembersMenu / RLS 마이그레이션 / AdminPage 셸 미변경 |

## BLOCKER 개수: **0**

## 잔여 리스크 / 권고 (BLOCKER 아님, 스코프 밖)
1. `_check_admin` 기본 토큰(`_DEFAULT_ADMIN_SECRET`) 하드코딩 — 환경변수 미설정 시 기본값 접근 가능. reveal은 추가로 보안키(PBKDF2)가 2차 방어. 별도 트랙 제거 권고(기존 리스크).
2. RLS 의존 잔존 — 일부 메뉴가 client-side로 job_applications를 직접 select(현재 PII 컬럼 미수집). 완전 차단은 anon/authenticated 롤의 PII 컬럼 SELECT revoke(V1 마이그레이션 방향). DB 적용 여부는 본 리뷰 범위 밖.
3. `_mask_name` 첫·끝 글자 노출 규칙 — 표준 규칙이라 FAIL 아니나 생년월일+공고 결합 시 재식별 여지. 정책상 허용이면 유지.

## 결론
**list 전 필드 마스킹 + reveal 단건 키검증(PBKDF2/상수시간) + 감사로그 + CSV 마스킹 게이팅**이 일관 적용되어 네트워크 평문 누출 경로 **없음**. **BLOCKER 0, 항목 8/8 PASS.**
