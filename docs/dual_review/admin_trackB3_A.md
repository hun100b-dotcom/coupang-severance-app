# 어드민 Track B3 (메뉴별 잔여 디자인 통일) 더블리뷰 A (톤 일관성)

- 검증일: 2026-07-01
- 검증자: 독립 리뷰어 A (별도 에이전트, 실측)
- 대상(작업트리 미커밋, admin 21파일): menus 13 + inquiries 4 + settings 4
- 기준: shared/adminTheme.ts(단일출처) + ui/Card·Button·Badge(사용자앱)

## 변경 요지
표/카드 래퍼 `borderRadius:14`→`RADIUS.card`(20), 주요 버튼→`btnPrimary/btnSecondary/btnGhost`, 상태배지→`badge(tone)` 적용(단일출처 헬퍼 참조).

## 항목별 PASS/FAIL
| # | 검증 | 결과 | 근거 |
|---|---|---|---|
| 1 | 표/카드 radius 14→RADIUS.card 일관 | PASS | 13+파일 일관 적용. ServerLogs는 리스트라 RADIUS.content(16) 의도적 차등. 칩/버튼 과적용 없음 |
| 2 | 버튼 헬퍼 매핑 일관 | PASS | 주CTA=btnPrimary, 보조=btnSecondary, 은은=btnGhost. danger(IP차단/삭제) 위험색 보존 |
| 3 | 상태배지 의미색 통일 | PASS | Applicants/Inquiries/BulkActionBar/ServerLogs 전부 동일 규칙(완료→green·거절/error→danger·검토/대기→amber·기본→brand·종결→neutral) |
| 4 | badge()의 버튼 적용 사용성 | PASS(마이너) | 호출부에서 `cursor:'pointer'` 명시 보완, onClick 보존. 0.66rem 소형은 마이너 |
| 5 | 동적 색 보존 | PASS | AccountsMenu 역할배지(permLevels 커스텀색)·MembersMenu reveal/amber 보존 |
| 6 | 빌드 | PASS | `✓ built` TS 에러 0 |
| 7 | 사용자앱 톤 일치 | PASS | badge≈ui/Badge, btnSecondary=ui secondary, 카드 radius20=radius-xl |

## 결론: **PASS · BLOCKER 0**
마이너 4(모두 의도·주석화): ①JobPostings "오늘추가" danger→amber(긴급만 빨강 규칙) ②ServerLogs SECURITY 행라벨 보라 유지(가독성) ③badge 0.66rem ④Discord 테스트 버튼 브랜드 보라 예외.
