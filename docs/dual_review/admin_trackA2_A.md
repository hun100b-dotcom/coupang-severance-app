# 어드민 Track A-2 (RC3 무음쓰기 / RC4 406 / RC6 설정경로) 더블리뷰 A (기능)

- 검증일: 2026-07-01
- 검증자: 독립 리뷰어 A (별도 에이전트, 실측 — 추측 금지)
- 대상(작업트리 미커밋, admin 5파일): JobPostingsMenu·AccountsMenu·SettingsMenu·ApplicantsMenu·AdminPage

## 변경 요지
- **RC3 무음쓰기 박멸**: JobPostingsMenu `handleSave(update)`·`handleChangeSection`·`handleDelete` 3곳에 `.select('id')` + 0행이면 실패처리(에러표시 + refetch 재동기화). AccountsMenu `update`·`delete`에 `.select('id')` + 0행 실패처리(방어).
- **RC4 406 제거**: `.single()`→`.maybeSingle()` 5곳(AccountsMenu fetchPermLevels / SettingsMenu permission_levels / ApplicantsMenu 슈퍼관리자 판정 / AdminPage admin_accounts·system_settings).
- **RC6**: CmsSettings·LegalVariables·SettingsMenu saveLevels가 **이미 patchSetting(백엔드 경로 B)으로 통일**돼 있어 추가 변경 불필요(확인만). system_settings 직접 update 무음쓰기 0건.

## 항목별 PASS/FAIL
| # | 검증 | 결과 | 근거 |
|---|---|---|---|
| 1 | RC3 무음쓰기 박멸(JobPostings update/section/delete) | PASS | 3곳 모두 `.select('id')`+0행 실패처리. 성공 시 logAdminAction·fetchJobs·토스트 보존, 실패 시 토스트+fetchJobs 재동기화 |
| 2 | RC4 406 제거(5 maybeSingle, null 안전) | PASS | 전부 `.eq(단일키)` 단일행 보장. 후속 접근 옵셔널체이닝(data?.value / row?.is_active)으로 null 안전 |
| 3 | RC6 설정경로 통일 | PASS | Cms/Legal/Discord/SettingsMenu saveLevels 전부 patchSetting. system_settings 직접쓰기 0건 |
| 4 | 회귀(상태/확정/알림/계산/28일/insert) | PASS | ApplicantsMenu 상태·알림 로직 불변. job_postings insert(.select().single()) 그대로 에러 surface |
| 5 | 빌드 | PASS | tsc -b 타입체크 + vite build 성공(에러 0) |
| 6 | 스코프(admin 5파일) | PASS | git diff 정확히 5파일, 타 영역 무변경 |

## 결론: **PASS · BLOCKER 0**
마이너(비차단): ①AccountsMenu insert(create)는 `.select()` 미적용이나 INSERT는 RLS 거부 시 error throw로 surface돼 무음 위험 없음(일관성 차이만) ②청크 크기 경고(기존, 무관).
