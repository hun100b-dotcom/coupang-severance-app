# 어드민 Track A-1 (네트워크 에러 박멸 — 호출계층) 더블리뷰 A (기능)

- 검증일: 2026-07-01
- 검증자: 독립 리뷰어 A (별도 에이전트, 실측 — 추측 금지)
- 대상: `frontend/src/lib/api.ts` 단일 파일 (호출계층). 빌드·번들·백엔드 라우트 실측.

## 진단 전제 (실측으로 확정)
| 항목 | 결과 |
|---|---|
| 프로덕션 번들 baseURL | `https://coupang-severance-app.onrender.com/api` (절대·올바른 호스트·`/api` 포함) — **정상** |
| X-Admin-Token baked 값 | `Luck2058qorwhdgns3` = 백엔드 기본값 일치 — **정상** |
| CORS allow_origins | `catch-daily-worker.vercel.app` 포함 — 프로덕션 도메인 **허용** |
| Render 백엔드 라이브 | **80초 연속 503 = 다운/서스펜드** (코드 밖 ops) |
| progress.md 호스트 `coupang-severance-api` | 404 = 오표기/스테일(실 호스트는 `coupang-severance-app`) |

→ **상대경로 가설 기각** — baseURL/토큰/CORS 전부 정상. 실 슈퍼관리자 Network error의 지배적 원인은 **백엔드 다운**(ops). 본 변경은 *콜드스타트 슬립으로 인한 반복 Network error*를 재시도로 회복 + 다운 시 우아한 안내.

## 항목별 PASS/FAIL
| # | 검증 | 결과 | 근거 |
|---|---|---|---|
| 1 | 재시도 트리거(GET만) | PASS | `_isRetriable`: method≠get/head/options면 false. POST/PATCH/DELETE 차단. 응답없음 또는 502/503/504 재시도 |
| 2 | 무한루프 방지 | PASS | `cfg._retryCount` 원본 config에 누적 + `< _RETRY_MAX(2)` → 최대 2회 |
| 3 | 다운 UX(≈4.5s 우아 실패) | PASS | 503 즉시반환 시 1.5+3=4.5s 후 `adminMessage` 부착 reject (90s 행 아님) |
| 4 | warmup `/click-count` | PASS | `common.py`에 GET `/click-count`(조회전용) 존재 → `/api/click-count`. dev프록시·prod절대 양쪽 도달. 기존 `/health`는 `/api/health`로 404였음(교체 타당) |
| 5 | adminErrorMessage·비밀누출 | PASS | 401/403/404/5xx/네트워크 분기 정상. 토큰값 미노출(환경변수 이름만 안내) |
| 6 | 회귀(성공·POST 통과) | PASS | `res=>res` 통과. 계산 POST는 재시도 차단→중복계산 없음. export 시그니처 유지 |
| 7 | 빌드 | PASS | `npm run build` ✓ (tsc 통과). 번들에 click-count·_retryCount·adminMessage 포함, /health 0건 |

## 결론: **PASS · BLOCKER 0**
마이너(비차단): ①쓰기는 콜드스타트 시 재시도 없이 1회 실패(의도된 멱등 한정 트레이드오프) ②warmup 무음(진단로그 없음). **단, 백엔드 다운은 코드밖 ops — 본 변경만으로 정상화되지 않으며 Render 인스턴스 기동이 선행돼야 함.**
