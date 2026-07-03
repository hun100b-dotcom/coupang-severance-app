# 더블리뷰 — 어드민 성능 FIX 스텝1 (백엔드 공유 httpx.Client 커넥션 풀)

> 변경: `backend/app/api/admin.py` — Supabase 호출 8곳을 모듈레벨 원샷 `httpx.get/post/patch/delete()`(호출마다 새 연결)에서 모듈레벨 공유 `httpx.Client`(커넥션 풀·keep-alive) 재사용으로 전환. 목적=전 어드민 엔드포인트 가속(특히 /admin/stats 웜 3초).

## 사전 실측 (규칙3 — 측정값으로 판정)
로컬 9병렬 동일 쿼리 세트, 최선값:
- ONE-SHOT(기존): **1.511s**
- POOLED(개선): **0.070s** → 약 **21배** 단축 (연결 재사용으로 TLS 핸드셰이크 제거)
- (Render→Supabase 절대값은 다르나 메커니즘 동일. 배포 후 §라이브에서 재측정)

## 판정 표

| 항목 | 리뷰어 A (5축 총괄) | 리뷰어 B (적대적) |
|---|---|---|
| 판정 | **PASS** | **PASS** |
| 코드 | 8곳 전환 완전(잔존 원샷 0), 타임아웃 5/10/15 per-call 보존, count=exact/upsert 헤더 불변, 죽은코드·미사용 import 0 | — |
| 회귀 | 계산 로직 무관, 반환타입 httpx.Response 불변 → 소비코드 그대로, 응답 스키마 불변 | 시나리오6 예외경로(fetch try/except·_write_audit) 불변 REFUTED |
| 스레드안전 | httpx.Client(sync) 스레드세이프 — 풀이 락으로 커넥션 대여/반납 보호, max_conn40>동시9 여유 | 시나리오1: 27동시요청 실측 전부200·에러0·풀9수렴 REFUTED |
| 타임아웃 | per-call 우선(기본15 무해중복) | 시나리오3: httpx 0.27.2 소스+실측으로 per-call 5/10/15 보존 REFUTED |
| 누수/생명주기 | Info: close 선택적(무해) | 시나리오2: 싱글턴+keepalive_expiry30+상한40 → 누수없음 REFUTED |
| async DNS | — | 시나리오5: async/AsyncClient 0건, sync 확인 REFUTED |
| h2 | — | 시나리오7: http2=False, limits 시그니처 유효 REFUTED (h2 4.3.0 설치돼 있어 켜도 무해) |

## 합의 / 이견
- **합의(쌍방 검증)**: 전환 완전성·스레드 안전·타임아웃/헤더 보존·기능 동등성·계산로직 불변 — 전부 통과. BLOCKER/MAJOR 0.
- **B MINOR 2건 → 반영 완료**: ①상단 NOTE "counter.py와 동일 패턴" 부정확 → 문구 교정 ②shutdown close 미등록 → `atexit.register(_client.close)` 자기완결 등록(main.py 무수정).
- **A Info/Nit 2건**: close 선택적·기본timeout 중복 → ①은 B와 동일(반영), ②는 무해 중복이라 유지(회귀·기능 무영향).

## 최종결정
**[배포 진행]** — 쌍방 PASS, MINOR 반영 후 py_compile 재통과. 배포 후 라이브 /admin/stats 응답시간 재측정으로 효과 확정.
