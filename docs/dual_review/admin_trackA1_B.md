# 어드민 Track A-1 (네트워크 에러 박멸 — 호출계층) 더블리뷰 B (적대적)

- 검증일: 2026-07-01
- 검증자: 독립 리뷰어 B (별도 에이전트, "어떻게든 깨뜨리는" 관점, 실측)
- 대상: `frontend/src/lib/api.ts` 단일. git diff·파일 read·**실제 axios 1.13.6 실행**·`npm run build`.

## 항목별 PASS/FAIL
| # | 적대적 점검 | 판정 | 실측 근거 |
|---|---|---|---|
| 1 | 중복쓰기(쓰기 재시도) | PASS | 실제 POST 503 발사 → adapter **1회만**, 재시도 0. 504도 동일. 중복쓰기 불가 |
| 2 | 무한 재시도/메모리 | PASS | 실제 GET 503 → adapter **정확히 3회**(최초+2)에서 정지. `_retryCount` 머지 후에도 1→2 누적 보존 실증 |
| 3 | 다운 증폭 | CONCERN(비차단) | 503 즉시면 화면당 GET 병렬 각 ≈4.5s 후 실패(누적 아님). 단 진짜 무응답이면 시도마다 timeout 적용 → 최악 한 요청 수십~수백초 가능 → **재시도 timeout 15s 캡으로 완화 적용** |
| 4 | 인터셉터 부작용 | PASS | 성공 `res=>res` 통과. 기존 catch는 `err.message`/`err.response` 패턴 → `adminMessage` 추가 무해 |
| 5 | warmup 안전 | PASS | `/click-count`는 조회전용 GET(증가는 별도 POST `/click/{service}`). 404/CORS 시 `catch{}` 무음 |
| 6 | 타입/빌드 | PASS | `npm run build` exit 0. `type` import·`error.config` 옵셔널·`api(cfg)` 타입 안전 |
| 7 | 스코프 일탈 | PASS | 소스 변경 `api.ts` 단일. 계산/28일 알고리즘/타 파일 무변경 |
| 8 | CORS 무한재시도 | PASS | 응답없음도 `_RETRY_MAX=2` 한정. 실측 3회 정지 |

## BLOCKER 개수: **0**

## 잔여리스크/권고
1. **(중→완화됨)** 무응답 시 재시도 누적 지연 → **재시도 timeout 15s 캡 적용**으로 최악 지연 컷(최초 1회만 90s 허용).
2. (저) 첫 화면 click-count GET 중복(warmup+카운터) — 비용 미미.
3. (저) 429는 재시도 미포함(보수적 선택, 타당).

## 종합: **PASS**
핵심 증상(어드민 백엔드 의존 메뉴 "Network error" 전역 폭주)을 멱등 GET 한정 재시도로 안전 해소. 쓰기안전·무한루프방지·타입/빌드·스코프 전부 실측 통과. (중) 권고는 본 커밋에 반영 완료.
