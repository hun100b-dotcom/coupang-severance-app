# 더블리뷰 — 방문자 지표 신뢰성 재확정(A) + 계산기 피드백 폼(B) (2026-07-06)

커밋: `f069972`(B 피드백), `965c9eb`(A 지표). 어드민/계산기 결과화면. 금액 계산 로직 무관.
방식: 인라인 적대검토 + 실 DB 교차검증(종훈님 실도메인 기준).

## A. 방문자 지표 — 270 교차검증 + 재정의
### 실 DB 분해(30일, 봇 제외 271 세션)
| 구성 | 세션 |
|---|---|
| Electron/Claude(검증도구=내 트래픽) | 13 |
| 관리자 본인 로그인 | 32 |
| localhost 개발 | 1 |
| **순수 외부 실유저** | **~226** |
- 가입자 하드넘버: auth.users 57 = profiles 57(일치).

### 정의 못박음(각 카드 툴팁 반영)
- **순 방문자 = 외부 실유저**: distinct 세션에서 봇/헤드리스/프리렌더/**Electron** + **관리자(종훈님) 본인 로그인 세션** 제외. 관리자 세션은 admin_accounts.email→profiles.id→visitor_logs.user_id 로 식별.
- **오늘 방문 = 순 사람 수**(distinct 세션, KST, 외부) — 조회수 아님.
- **총 페이지뷰 = 조회수**(실유저, 봇 제외) — 방문자 수 아님(라벨 명확화).
- **가입자 = 하드넘버**(Supabase 인증 계정 수) + 오늘/최근7일 신규가입.
- tracking_since 2026-04-18 표기(기간 해석).

### before → after (라이브 실측)
| 지표 | 부풀림(전) | 봇제외(중간) | 최종(외부 실유저) |
|---|---|---|---|
| 순 방문자 | 1,796 | 270 | **226** (관리자본인 32·Electron 13 추가 분리) |
| 총 페이지뷰 | 4,046 | 1,649 | **1,384** (Electron 제외) |
| 오늘 방문 | (조회수·부정확) | — | **순 사람 수(KST)** |
| 가입자 | (없음) | — | **57명**(하드넘버) |
| 봇 제외 | — | 2,482 | 2,749(Electron 포함) |

### 적대검토
- 226 = 258(비Electron) − 32(관리자) 정확 일치(교차검증 PASS).
- 관리자 미로그인 익명 테스트는 IP 없어 식별 불가 → 정직하게 한계 표기(툴팁/보고). incl_admin 병기.
- signups_total=profiles count=auth 57 검증. today_visitors=0은 실제(오늘 외부방문 없음)라 정상.
- Electron 제외로 실사용자 중 Electron 앱 유저(극소수)도 빠질 수 있음 — 트레이드오프 수용(문서화).
- 판정: PASS.

## B. 계산기 피드백 폼
- calc_feedback 테이블(프로덕션) + RLS(anon insert 정책) + **GRANT INSERT to anon/authenticated**(신규테이블 권한 함정 — 없으면 42501). SELECT는 미부여+is_admin RLS로 이중 차단.
- CalcFeedback 공용 컴포넌트: 지정 문구 + 도움/오류/자유의견/이메일, 제출후 감사, 세션당 계산기별 1회.
- 4개 결과화면(퇴직금·실업급여 결과페이지 + 주휴·연차 간편/PDF 결과) 삽입. 결과 아래 카드(비침습).
- 백엔드 GET /admin/feedback(service-role) + 요약. 어드민 [소통]에 '계산기 피드백' 메뉴.
### 엔드투엔드 실측
- anon 제출(return=minimal, supabase-js .insert 동일) → **201** / return=representation는 401(정상: SELECT는 admin만).
- /admin/feedback → 제출건 노출 + summary(도움예 1). 테스트행 삭제(잔존 0).
### 적대검토
- 폼 `.insert()`는 representation 미요청이라 SELECT RLS 안 걸림(실측 201). XSS=React 이스케이프. 빈 제출 차단(canSubmit).
- 판정: PASS.

## 최종: A PASS + B PASS, BLOCKER 0. 라이브 실측·교차검증 완료.
잔여(비차단): 익명 개발트래픽 IP 미식별 한계 / Electron 앱 유저 극소수 제외.
