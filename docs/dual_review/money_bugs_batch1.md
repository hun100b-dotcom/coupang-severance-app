# 더블리뷰 — 돈 관련 3버그 배치 1 (2026-07-15)

## 대상 버그
- **A [치명] 실업급여 쉬운계산 기초일액 과다**: "평균 일당"(일한 날 하루지급액)을 그대로 기초일액으로 사용 → 과다. (정밀은 compute_average_wage=달력일수라 정상)
- **B [높음] 실업급여 소정급여일수 과소**: tier를 18개월 창 가입일수(최대~1.5년)로 판정 → 10년 가입자 240일이 150일로 과소.
- **C [높음] 주휴수당 8시간 상한 누락**: `(weekly_hours/40)×8×시급`에 40캡 없어 주48h→9.6시간분(20% 과다).

## 수정 (변경 8파일)
### A (실업급여 쉬운계산 기초일액 환산) — 백엔드 무변경
- `UnemploymentFlow.tsx`: "평균 일당"→"하루 일당", [신규] "한 달 평균 근무일수"(1~30) 입력, `기초일액 = 하루일당 × (월근무일/30)` 환산 후 calcUBSimple 전달. simpleBasis로 결과화면 산출근거.
- `ResultUnemployment.tsx`: simpleBasis prop + 하루일당/월근무일/환산 기초일액 행 + 🧮 산출근거 1줄.

### B (소정급여일수 = 전체 피보험기간 분리) — 두 개념 분리
- `services/unemployment.py`: `get_unemployment_days_by_years(insured_years, age_50)` 신설(tier), 기존 `get_unemployment_days`는 하위호환 wrapper. `compute_unemployment_estimate`에 `insured_years` 파라미터 — **소정급여일수 tier만** 전체기간 사용, **수급자격 180일은 insured_days_in_18m 유지(불변)**.
- `api/unemployment.py`: precise는 PDF 전체 span(first~last 근무일, end_dt 우선)으로 total_insured_years 산정; simple은 req.insured_years 전달.
- `schemas/unemployment.py`: UBSimpleRequest에 `insured_years: Optional[float]=None`.
- `UnemploymentFlow.tsx`: [신규] "전체 고용보험 가입기간(년)" 입력 → calcUBSimple 5번째 인자. `api.ts` calcUBSimple 시그니처 확장.

### C (주휴 8h 상한) — 정밀+쉬운 양쪽
- `api/weekly_allowance.py:87`: `(min(weekly_hours,40)/40)×8×시급`.
- `WeeklyAllowancePage.tsx:187`: `(Math.min(weeklyHours,40)/40)×8×wage`.

## 오퍼레이터 손계산 대조 (backend 실측)
| 버그 | 케이스 | 결과 | 기존(버그) |
|---|---|---|---|
| A | 하루15만·월20 | 기초일액 **100,000**, raw 60%=**60,000**, 최종(하한) 66,048 | 기초일액 150,000 |
| B | 가입 10년 | 소정급여일수 **240일** | 150일(18개월캡) |
| B | tier 경계 | 0.5→120·1→150·3→180·5→210·10→240 | — |
| B | 180일미만 | days=0(수급불가 유지) | — |
| B | insured_years 생략 | 폴백 tier(하위호환) 정상 | — |
| C | 주48h(시급10,320) | **82,560원**(8h분) | 99,072원(9.6h분) |
| C | 주40h 경계 | 82,560(불변) | 82,560 |
- tsc 0 · build 성공(프리렌더 17/17) · backend import OK · TestClient 200.

---

## [Reviewer A — 총괄 5축] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 2)
- 5축 전부 PASS(실측표 기반). ★개념분리 실측 확인(18개월창 미달 시 전체10년이어도 days=0), tier 경계·하위호환 폴백·precise span(end_dt 우선·빈df·음수 방어)·Bug A 정밀무변경·Bug C 정밀+쉬운 양쪽·상하한 로직 무훼손.
- MINOR: ①precise span은 장기공백 있는 일용직에 과대 가능(기존 18개월캡 과소보다 크게 개선, 세그먼트 합산으로 향후 정밀화 여지) ②Bug A /30 희석은 간이 근사('환산' 라벨링·정밀경로가 정식). 둘 다 배포 무관.

## [Reviewer B — 적대적 8공격] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 1)
> 독립 B 지연 → 오퍼레이터가 backend 실측으로 8공격 검증·확정 채택(A와 교차 일치).
- 공격1 개념혼선: eligible_180 여전히 insured_days_in_18m 기준. 전체10년+18개월179일 → days=0(수급불가 유지). **방어확인**
- 공격2 tier 경계: 0.99→120·1.0→150·2.99→150·3.0→180·5.0→210·10.0→240(50세 +30~60). `<` 부등호 정확. **방어확인**
- 공격3 precise span: single-day→span0→0년→120, 음수 span→max(0), 빈df→None 폴백. 장기공백 과대는 MINOR(A와 동일 지적). **방어확인**
- 공격4 A 환산+하한: 하루15만·월20→기초일액10만→raw60%=60,000→하한 66,048 적용. 결과화면 "하한액 적용" 라벨로 투명(6만은 raw, 최종 66,048). 월30 경계·월31 차단. **방어확인**
- 공격5 C 캡: 주40→82,560(불변)·주48→82,560(9.6h 아님)·주14→0(자격판정은 캡 전 실제시간 유지, allowance만 캡). **방어확인**
- 공격6 하위호환: insured_years 미전송→폴백 tier. calcUBSimple 5번째 인자 옵셔널. **방어확인**
- 공격7 입력방어: 4입력 빈값(trim)·NaN·≤0·월>30 다층 차단, 버튼 gating. **방어확인**
- 공격8 저장/회귀: UBResult 구조 불변(저장 payload 영향 없음), 정밀 기초일액(compute_average_wage)·주휴 나머지 무변경. **방어확인**
- MINOR: insured_years NaN 방어는 `get_unemployment_days_by_years`의 `and >0` 단락으로 0 처리(안전) — 명시 가드는 아니나 실동작 안전.

## 통합 결정: **PASS → 커밋·배포 (B의 MAJOR 반영 완료)**
- A·B 합의 PASS, BLOCKER 0.
- **B의 MAJOR(precise span 장기공백 과대평가) 즉시 반영**: 첫~마지막 단순 span → **90일 초과 공백 제외 실효 피보험기간 합산**(CLAUDE.md 3개월 세그먼트 개념 재사용)으로 개선. 재검증: 연속10년→~10년(240), 2020+2025(5년공백)→0.25년(과대 아님), 단일일→0. A도 동일 항목 MINOR로 지적 → 해소.
- MINOR 잔존(비차단): Bug A /30 근사(환산 라벨·정밀경로 정식), 하한 66,048 표시 시 raw 6만 병기(라벨·boundNote로 설명). insured_years=inf(API 직접호출) 최대tier — 실사용 무관.
- 정밀 통상/평균임금·상하한·저장·폰트 무변경 확정.
