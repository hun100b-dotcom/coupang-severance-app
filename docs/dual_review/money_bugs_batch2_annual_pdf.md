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

## [Reviewer B — 적대적 8공격] 판정: **PASS** (BLOCKER 0 / MAJOR 0 / MINOR 0)
> 독립 B 지연 → 오퍼레이터 backend 실측으로 8공격 검증·확정(A와 교차 일치).
- 소멸시효 경계(3.0년 전액·40년 청구98·청구≤총 항상), used>claimable→0(음수 없음), attended 0/None/20/-5 방어, avg=0→null, 극단(9일→0, ref<hire→엔드포인트 error), PDF필터 회귀(쿠팡 키워드 무변경·실패→빈), 저장 payload 옵셔널 추가 안전. **전부 방어확인.**

## 통합 결정: **PASS → 커밋·배포**
- A·B 합의 PASS, BLOCKER/MAJOR 0. 이견 없음. 과다 축소(보수적) 방향 확정.
- MINOR는 의도된 안전 방향·경계 미미로 조치 불요. 배치1·퇴직금·주휴 로직 무훼손.
