# 더블리뷰 — 배치2 그룹2(연차수당)·그룹3(PDF 회사필터) (2026-07-15)

## 대상
- 그룹2 연차: `backend/app/api/annual_leave.py`, `frontend/src/pages/AnnualLeaveAllowancePage.tsx`, `lib/api.ts` (커밋 `ba37cff`)
- 그룹3 PDF필터: `backend/app/services/pdf.py` (커밋 `446eefe`)

## 수정 요지
### 그룹2 (연차 3버그)
- (a) 미지급수당이 전 기간 누적 연차×단가 → 과다. **소멸시효 3년(36개월) 발생분(claimable_entitlement)만 청구 대상**으로 제한(발생시점 `(total_months-gm)<36`). total_entitlement는 표시용 유지.
- (b) 단가 평균일급 vs FAQ '1일 통상임금' 불일치 → 입력·요약·결과·주석 라벨을 **'1일 통상임금(시급×8h)'** 통일. wage_basis 반환.
- (c) 1년 미만 연차 항상 11일 → **attended_months(실제 개근 개월) 반영**(first_year_days=min(max(att,0),11)).
- 결과화면 소멸시효 안내 배너. 프론트 간편계산도 백엔드와 **동일 grant-based 로직**.

### 그룹3 (필터 과매칭)
- 3차 폴백 `norm_target in x or x in norm_target` → `(norm_target in x)`는 2차(str.contains)가 커버해 제외, `(x in norm_target)`은 **저장명 4자 이상만** 허용. 1·2차 무변경.

## 손계산 대조 (실측)
| 케이스 | 총 발생 | 청구가능(3년) |
|---|---|---|
| 10년 | 181 | **56** |
| 5년 | 90 | **49** |
| 3.0년(경계) | 57 | 57(전액) |
| 2.5년 | 49 | 49(무변경) |
| 40년 | 899 | **98**(대폭 캡) |
- 미지급수당(10년·일급5만): 905만 → **280만**(청구56일). used>claimable→remaining=0. attended 0→0/None→11/20→11(캡). 9일근속→0.
- 프론트-백엔드 grant/partial/CLAIM_MONTHS/nextRate **문자 그대로 동일** → 수치 일치.
- PDF필터: 정확일치·쿠팡풀필먼트(6자) 유지, 서비스(3자)·CJ(2자) 제외, 쿠팡 키워드 경로 무변경, 실패→빈→상위 422.

---

## [Reviewer A — 총괄 5축] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 2)
- 5축 전부 PASS. claimable 수치 3건 손재현 일치(10년56·5년49·2.5년49), 프론트-백엔드 로직 동일, used가 claimable에서 차감(보수적), 라벨 통일, attended 반영·죽은코드(first_year_days_actual) 제거, 필터 4자 경계·1·2차 무변경, 회귀 없음(annual/pdf 국소).
- MINOR(비차단): ①필터가 좁아져 일부 '기타' 커스텀명이 빈결과→422(오매칭보다 안전) ②1년미만 월연차 발생시점 12개월 일괄확정 단순화(경계영향 미미, 판례상 방어가능).

## [Reviewer B — 적대적 8공격] 판정: **초기 FAIL → 지적 2건 수정 후 PASS** (수정 커밋 `5fb11ea`)
독립 B 에이전트가 오퍼레이터·A가 놓친 결함 2건을 실측 적발:
- **★BLOCKER (수정완료)**: 연차·주휴 정밀이 `filter_df_by_company(df, target)`로 company_other 미전달 →
  사업장명이 positional company로 들어가 '기타' 분기 미진입 → **전체 df 무필터 반환**(다회사 PDF 오계산 + 446eefe 무력).
  severance·unemployment는 정상. → `filter_df_by_company(df_raw, company, company_other)`로 규약 통일.
  실측: filter(df,기타,'쿠팡풀필먼트서비스 동탄')→해당 1건만.
- **MAJOR (수정완료)**: 연차 partial이 파이썬 `round()`(은행가 2.5→2) vs 프론트 JS `Math.round`(2.5→3) →
  .5 경계 1일 편차. → `int(x+0.5)`(올림)로 통일. **전수대조(0~492개월) 프론트-백엔드 완전 일치** 확인.
- 그 외 8공격(소멸시효 경계·used차감·attended·단가·PDF 4자폴백·회귀)은 방어확인. MINOR(비차단): total 표시값 미세 변동·ref<hire 음수total(claimable max0·상위가드)·빈결과 200+error.

## 통합 결정: **PASS (B의 BLOCKER·MAJOR 수정 반영 후)**
- 초기 B=FAIL → **BLOCKER(필터 우회)·MAJOR(반올림) 즉시 수정·재검증 후 PASS**(커밋 `5fb11ea`).
- A는 PASS였으나 B가 A·오퍼레이터 사각(다회사 필터·.5 반올림)을 적발 — 적대 리뷰의 가치 입증. 두 결함 해소 확인.
- 과다 축소(보수적) 방향, 배치1·퇴직금 로직 무훼손, 프론트-백엔드 완전 일치.
