# 더블리뷰 — 퇴직금 정밀계산 콜드스타트 재시도 수정 (2026-07-05)

## 대상
- 파일: `frontend/src/lib/api.ts` (단일 파일, 로직 전용)
- 커밋 메시지: `fix(calc): 정밀계산 등 순수계산 POST 콜드스타트 재시도 허용 (연결에러 박멸)`

## 증상 (종훈님 보고)
퇴직금 정밀계산기 4단계에서 저장된 PDF(`TalkFile_일용근로내역서_고용.pdf`, 93.1KB)를 넣고 계산하면
빨간 배너 **"서버에 연결할 수 없어요. 잠시 후 다시 시도하거나 '쉬운 계산'을 이용해주세요."** 노출. '쉬운 계산' 폴백은 동작.

## 진단 (실측 근거)
1. 백엔드 계산 엔드포인트는 **정상**. 실제 저장 PDF로:
   - `POST /api/severance/extract-companies` → HTTP 200 (사업장명 반환)
   - `POST /api/severance/precise` → HTTP 200, **퇴직금 2,497,860원**, 인정일수 616일, 평균임금 49,335원 (Python·실브라우저 origin 양쪽 확인)
2. 프론트 배포 설정도 정상: `VITE_API_URL = https://coupang-severance-app.onrender.com/api` → 경로 일치(라이브 번들 실측).
3. 문제의 에러 메시지(`SeveranceFlow.tsx` L263, "쉬운 계산" 포함)는 **브라우저가 HTTP 응답을 아예 못 받을 때만**(`!status || 'Network Error'`) 표시됨 = 네트워크 단절/타임아웃/Render 콜드스타트 502.
4. **근본 원인**: `api.ts`의 axios 재시도 인터셉터(`_isRetriable`)가 **GET만 재시도**하고 POST는 제외. 핵심 계산 호출(extract/precise/simple)은 전부 POST → Render 무료티어 콜드스타트 502가 한 번 오면 **재시도 0회로 즉시 실패**. GET(어드민 메뉴)엔 5회 백오프 재시도가 있는데 정작 사용자 핵심 기능인 계산 POST엔 회복탄력성이 없던 공백.
5. 계산/추출 엔드포인트는 `backend/app/api/severance.py`(L33-130) 실독 결과 **DB 쓰기 등 부작용 0인 순수계산(멱등)** → 재시도해도 100% 안전.

## 수정
- axios `AxiosRequestConfig`에 `_idempotent?: boolean` 플래그 추가(`declare module`).
- `_isRetriable`: `_idempotent:true`인 POST도 GET처럼 재시도 허용.
- 4개 계산기의 순수계산 호출 10곳(extract×4 + precise×4 + simple×2)에 `_idempotent:true` 부여.
- 멱등 재시도 타임아웃 20s→45s(PDF 파싱 무게 반영). 부작용 POST(문의/지원/어드민)엔 플래그 미부여 → 재시도 대상 제외 유지.

---

## [Reviewer A — 총괄 5축] 판정: **PASS**
- 1.디자인 / 2.UI: **N/A**(로직 전용, 렌더 무변경)
- 3.UX: **PASS** — 콜드스타트 502를 5회 지수백오프(합 48초)로 흡수 → 실측 시나리오 ~50초 내 회복·성공. 재시도는 인터셉터 내부에서 투명 처리돼 로딩 오버레이 1개만 유지(이중 스피너 없음). MINOR-1: 서버가 502도 안 주고 완전 무응답 hang일 때만 이론적 최악 ~6분(실 콜드스타트에선 미발생).
- 4.코드: **PASS** — `_idempotent` 10곳 전수 확인(전부 순수계산), 부작용 POST 오염 0건, `declare module` 타입증강 적정, `tsc --noEmit` EXIT 0.
- 5.회귀: **PASS** — GET 재시도·어드민 에러정규화(`_isAdminRequest`)·28일 블록 로직 무변경. **FormData 멀티파트 재시도 body 재전송을 axios 1.13 소스레벨로 안전 확정**(브라우저 File/Blob은 재판독 가능).
- 발견: BLOCKER 0 / MAJOR 0 / MINOR 1(최악 대기시간, 배포 차단 아님).

## [Reviewer B — 적대적(Attack 1~7)] 판정: **PASS**
> 사유: 백그라운드 독립 리뷰어 응답 지연 → 오퍼레이터가 인라인으로 수행·실증한 적대 검토로 확정 채택(종훈님 승인).

1. **FormData 재전송**: 실 Node http 서버(503×2→200)로 실증 — 3회 재시도 모두 **327바이트 동일, 파일+필드+한글값('기타') 온전**, 최종 200. 브라우저 File 기반이라 소비되지 않음 → **방어확인**.
2. **멱등 플래그 오염**: 10곳 전수 = 순수계산만. `notifyNewInquiry`·`/click`·어드민 patch/bulk/reveal/audit엔 미부여 → 중복 부작용 위험 없음 → **방어확인**.
3. **최악 대기**: 실 콜드스타트(502 즉시 반환)에선 ~50초 내 회복. 완전 무응답 hang은 이론적(Render 게이트웨이는 502를 즉시 반환) → MINOR, **방어확인**.
4. **timeout 45s**: 웜 파싱 5~7초 → 45초 충분. `runPrecise`의 `allSettled([calc, setTimeout(3000)])`는 최소 스피너 시간일 뿐 실제 호출 완료까지 대기 → 충돌 없음 → **방어확인**.
5. **declare module 부작용**: `_idempotent`는 config 전용 필드로 axios 어댑터가 요청 본문/헤더로 직렬화하지 않음(와이어 유출 없음). `tsc` 클린 → **방어확인**.
6. **_retryCount 상태**: 매 `api.post()`가 새 config 객체 생성 → 동시 호출 간 간섭 없음 → **방어확인**.
7. **에러정규화 회귀**: `_isAdminRequest`(X-Admin-Token 유무) 무변경. 계산 호출은 토큰 없음 → message가 'Network Error'로 유지 → `SeveranceFlow` L217/262 분기 온전 → **방어확인**.
- 발견: BLOCKER 0 / MAJOR 0 / MINOR 0.

## 통합 결정
- A·B **합의: PASS**. 이견 없음. 공통 MINOR(최악 대기시간)는 **실 콜드스타트에서 미발생**하는 이론적 상한이라 배포 차단 사유 아님.
- **후속(선택, 비차단)**: 계산 POST 1차 시도 timeout을 45~60s로 캡하면 완전 무응답 hang의 상한을 더 낮출 수 있음. 목표(콜드스타트 502 회복)엔 지장 없어 이번 스코프 제외.
- **최종 결정: 커밋·배포 진행.**

## 검증 (배포 후 6-step은 progress.md 참조)
- 백엔드 실 PDF 200 + 2,497,860원 재확인(2회).
- 재시도 로직 실증: 멱등 POST 재시도 O / 부작용 POST 재시도 X / GET 재시도 O.
- FormData 재전송 온전성 실증 PASS.
- `tsc --noEmit` EXIT 0, `npm run build` 성공(프리렌더 17/17).
