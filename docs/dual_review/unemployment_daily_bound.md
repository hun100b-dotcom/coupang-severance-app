# 더블리뷰 — 실업급여 구직급여일액 상·하한액 적용 (2026-07-06)

## 대상
- 백엔드: `services/unemployment.py`, `schemas/unemployment.py`, `api/unemployment.py`
- 프론트: `lib/api.ts`, `pages/UnemploymentFlow.tsx`, `pages/ResultUnemployment.tsx`
- (범위 밖: 같은 작업트리의 `api/admin.py` 변경은 다른 세션 작업 — 이번 커밋에 미포함)

## 배경 / 문제
실업급여(구직급여) 정밀·간편 계산이 `일액 = 평균일급 × 60%`만 적용하고 **법정 상·하한을 적용하지 않아**, 저임금 일용직(핵심 사용자)은 예상 실업급여가 실제보다 **낮게**, 고임금자는 **높게** 표시됐다. (2026-07-05 3계산기 점검에서 적출 → 종훈님 승인 후 개선.)

## 법적 근거 (검증됨, 2026년)
- **구직급여일액 = 기초일액(이직 전 평균일급) × 60%** (원칙)
- **상한액: 68,100원/일** — 기초일액 상한 113,500원 × 60% (2026년 7년 만에 인상. 하한 66,048 > 기존상한 66,000 역전현상 해소)
- **하한액(최저구직급여일액) = 1일 소정근로시간(최대 8h) × 최저임금(10,320원) × 80%** → 8h면 66,048원, 8시간 미만 단시간·일용직은 실근로시간 비례
- **최종 = min( max(평균일급×0.6, 하한액), 상한액 )**
- 출처: [찾기쉬운 생활법령정보 — 구직급여 수급액](https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=2), [고용보험 상한액 인상 안내](https://brunch.co.kr/@shopl/516)

## 변경 요지
1. `unemployment.py` 서비스: 연도 상수(UB_MIN_HOURLY_WAGE=10320, UB_DAILY_UPPER=68100, UB_LOWER_RATE=0.8, UB_STD_HOURS_CAP=8, UB_BENEFIT_RATE=0.6) + `compute_ub_daily_lower_bound(daily_hours)` + `compute_unemployment_estimate(..., daily_hours=8.0)`에 clamp 로직, `bound_applied`/`daily_benefit_raw`/`lower_bound`/`upper_bound` 반환.
2. `api/unemployment.py`: precise에 `daily_hours: float = Form(8.0)`, simple은 스키마 기본값. 두 응답에 `daily_benefit_raw`/`bound_applied` 부착.
3. `schemas`: 요청에 `daily_hours=8.0`, 응답에 optional 2필드.
4. 프론트 `UnemploymentFlow`: "하루 평균 근로시간" 입력(정밀·간편 공통, 기본 8, 빈값/0/음수는 8로 방어) → fd/call 전달, reset 복원.
5. `ResultUnemployment`: `bound_applied`에 따라 라벨 적응("하한액 적용"/"상한액 적용"/"약 60%") + 안내문구. optional이라 구 데이터(undefined)는 기존 "약 60%"로 폴백.
6. `api.ts`: UBResult에 optional 2필드, calcUBSimple에 daily_hours(기본 8).

## 오퍼레이터 사전 검증 (backend TestClient, 실측)
| 케이스 | raw(60%) | → 일액 | bound | 총액 |
|---|---|---|---|---|
| 저임금 49,335원·8h (실제 PDF) | 29,601 | **66,048** | lower | 7,925,760 |
| 고임금 200,000원·8h | 120,000 | **68,100** | upper | 8,172,000 |
| daily_hours 생략(구 프론트 하위호환) | 29,601 | 66,048 | lower | — (기본8 적용) |
| 단시간 4h | 29,601 | **33,024** | lower | 3,962,880 |
| 중간 113,000원·8h | 67,800 | 67,800 | None(원칙) | 8,136,000 |
| 평균일급 0 | 0 | 0 | None | 0 |
- tsc 무에러 · `npm run build` 성공(프리렌더 17/17) · backend import OK.

---

## [Reviewer A — 총괄 5축] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 2)
- 1.디자인 PASS(새 입력 카드 클래스가 옆 date input과 완전 동일·토큰 실존·무지개 없음) · 2.UI PASS(CalcInputCard 재사용, 정밀·간편 공통 JSX 중복 없음) · 3.UX PASS(기본8·단시간 지원·이중 방어·하한상한 라벨 전달·4상태) · 4.코드 PASS(경계값 8종 실측·하위호환·상수화·min(max) 순서 안전) · 5.회귀 PASS(28일블록/퇴직금/주휴/연차/index.css 무변경, UBResult 소비처·옛 저장데이터 폴백 안전, tsc EXIT 0).
- MINOR(스코프 밖·비차단): ①`app.py`(Streamlit 레거시)에 동명 함수 미동기화 — 프로덕션(Render=`backend/app/`) 무관 ②저장 payload에 bound_applied 미포함(금액은 정확, 투명성 배지만 미표시).

## [Reviewer B — 적대적 8공격] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 2 → **오퍼레이터가 2건 다 반영**)
- 공격1 경계부등호 · 2 daily_hours 이상값 · 3 하위호환 · 4 avg 0/음수/None(미수급자 오표기 방어) · 5 응답스키마 소비처 · 6 프론트 전달·reset · 7 total/eligible 상호작용 — **전부 방어확인**(TestClient 실측).
- B 지적 MINOR 2건 **즉시 반영 완료**:
  - MINOR-1(NaN daily_hours API 직접호출 우회): `compute_ub_daily_lower_bound`에 `math.isfinite`+≤0 폴백(→8시간), `raw_benefit`에도 `math.isfinite` 가드 추가.
  - MINOR-2(미래 하한>상한 역전 시 상한 우선 미보장): if-elif → "하한 상향 후 상한 절삭" 순차 구조로 변경. 역전 시뮬레이션에서 상한 우선(upper) 실측 확인.

## 통합 결정: **PASS → 커밋·배포**
- A·B 합의 PASS, BLOCKER/MAJOR 0. B의 MINOR 2건은 반영 완료(재검증: 정상 경계 불변 + NaN/inf/0/음수→8폴백 + avg NaN→0 + 역전 시 upper 우선).
- 계산 로직은 실업급여만 변경(28일 블록·타 계산기 무영향). `admin.py`(타 세션)는 커밋에서 제외.

### 재검증 실측 (하드닝 후)
| 케이스 | 일액 | bound |
|---|---|---|
| 저임금 49,335·8h | 66,048 | lower |
| 고임금 200,000·8h | 68,100 | upper |
| raw==하한 110,080 | 66,048 | None |
| raw==상한 113,500 | 68,100 | None |
| 단시간 4h | 33,024 | lower |
| daily_hours NaN/inf/0/음수 | 66,048(8폴백) | — |
| avg NaN | 0 | None |
| 역전 시뮬(하한>상한) | 상한 | upper |
