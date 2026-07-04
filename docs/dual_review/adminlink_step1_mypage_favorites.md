# 듀얼리뷰 — 어드민 연동 전수조사 STEP1 (MyPage 알림 is_read + 즐겨찾기 만료필터)

> 2026-07-04. 어드민↔사용자홈 연동 전수조사 FIX 1단계.
> 빌더: Claude(Fable 5) / 리뷰어 A(총괄 5축) + 리뷰어 B(적대적) 독립 에이전트.

## 변경 요약

| 파일 | 변경 | 근거 |
|---|---|---|
| `frontend/src/pages/MyPage.tsx` | notifications 컬럼 `read`→`is_read` (count 쿼리 + update + 필터, 주석 포함) | 라이브 DB 실컬럼 `is_read` (service-role 실측). 기존 코드는 400 에러가 무음 처리되며 **알림 배지가 영영 0** — 어드민 지원 확정/거절 알림이 사용자에게 안 보이던 연동 단절 |
| `frontend/src/components/mypage/MyFavoritesTab.tsx` | 만료 공고 필터 `.or(expires_at.gte.오늘,expires_at.is.null)` 추가 | JobsPage/홈 프리뷰와 동일 기준. 즐겨찾기 탭만 만료 공고가 계속 노출되던 불일치 |

## 판정표

| 항목 | 리뷰어 A (5축) | 리뷰어 B (적대) |
|---|---|---|
| 판정 | **PASS** | **PASS** (반증 4건 전부 실패) |
| 코드 | diff 서술 일치, `'read'` 잔존 0건, tsc 0에러 | — |
| 회귀 | 2파일 +11/-6, 계산로직·CSS·폰트 0건 | — |
| B① RLS | — | 20260410 마이그레이션에 "본인 알림 읽음 처리" UPDATE 정책 존재, v3는 INSERT만 교체 → 유효 |
| B② Realtime | — | MyApplicationsTab 구독은 INSERT만 청취, read 컬럼 미참조 → 충돌 없음 |
| B③ PostgREST or+eq | — | top-level AND 결합, 프로덕션 검증된 패턴 |
| B④ expires_at 타입 | — | job_postings.expires_at=date, `>= 'YYYY-MM-DD'` 정확 |

**[합의]** 양측 PASS, 이견 없음.
**[잔여(비차단)]** 라이브 pg_policies에서 notifications UPDATE 정책 적용 여부는 로그인 세션 필요라 이 세션에서 실측 불가 → 종훈님 스모크(마이페이지 지원현황 탭 진입 후 새로고침 시 배지 유지 여부) 1회 권장. 미적용이어도 이번 변경 이전부터의 인프라 상태 문제.
**[최종결정: 커밋 진행]**
