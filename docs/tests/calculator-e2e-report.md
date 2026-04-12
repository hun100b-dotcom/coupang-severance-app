# CATCH 계산기 E2E 코드 레벨 검증 보고서

> 작성일: 2026-04-12  
> 대상: 실업급여 / 주휴수당 / 연차수당 계산기

---

## 1. 각 계산기 현황 요약

### 1-1. 실업급여 계산기

| 항목 | 내용 |
|------|------|
| 라우트 | `/unemployment` ✅ 구현됨 |
| 파일 | `frontend/src/pages/UnemploymentFlow.tsx` |
| Layout | Layout 안 (TopNav + BottomNav 있음) |
| 계산 방식 | **백엔드 API 전용** |
| API 엔드포인트 (정밀) | `POST /unemployment/precise` (FormData: file, company, company_other, end_date, age_50) |
| API 엔드포인트 (간편) | `POST /unemployment/simple` (JSON: insured_days, avg_daily_wage, age_50) |
| PDF 사전 처리 | `POST /unemployment/extract-companies` |
| 에러 처리 | `Promise.allSettled` + 에러 메시지 표시 (`CalcErrorMsg`) |
| 결과 컴포넌트 | `ResultUnemployment` (별도 파일) |
| 설문 단계 | 4단계 (Step 1~4) |

**수급 자격 체크 (프론트엔드 직접 판단):**
- Q1: 18개월 내 180일 미만 → 즉시 실패 화면 (failReason 세팅, API 미호출)
- Q2: 1개월 근로일수 10일 이상 → 즉시 실패 화면 (API 미호출)

---

### 1-2. 주휴수당 계산기

| 항목 | 내용 |
|------|------|
| 라우트 | `/weekly-allowance` ✅ 구현됨 |
| 파일 | `frontend/src/pages/WeeklyAllowancePage.tsx` |
| Layout | Layout 안 (TopNav + BottomNav 있음) |
| 계산 방식 (간편) | **프론트엔드 순수 계산** (API 미사용) |
| 계산 방식 (정밀) | **백엔드 API 호출** |
| API 엔드포인트 (정밀) | `POST /weekly-allowance/precise` (FormData: file, company, company_other, hourly_wage, daily_hours) |
| PDF 사전 처리 | `POST /weekly-allowance/extract-companies` |
| 에러 처리 | try/catch + setPdfError 상태 표시 |
| 결과 저장 | Supabase `reports` 테이블 직접 저장 (로그인 필요) |

**간편계산 공식 (프론트엔드):**
```
주 소정근로시간 = 하루 시간 × 주당 근무일
주휴수당 = (주 소정근로시간 / 40) × 8 × 시급

자격 조건:
  - 소정근로일 개근 (survey.allPresent === true)
  - 주 소정근로시간 ≥ 15시간
```

---

### 1-3. 연차수당 계산기

| 항목 | 내용 |
|------|------|
| 라우트 | `/annual-leave` ✅ 구현됨 |
| 파일 | `frontend/src/pages/AnnualLeaveAllowancePage.tsx` |
| Layout | Layout 안 (TopNav + BottomNav 있음) |
| 계산 방식 (간편) | **프론트엔드 순수 계산** (`calcSimpleAnnualLeave` 함수) |
| 계산 방식 (정밀) | **백엔드 API 호출** |
| API 엔드포인트 (정밀) | `POST /annual-leave/precise` (FormData: file, company, company_other 등) |
| PDF 사전 처리 | `POST /annual-leave/extract-companies` |
| 에러 처리 | try/catch + setPdfError 상태 표시 |
| 결과 저장 | Supabase `reports` 테이블 직접 저장 (로그인 필요) |

**간편계산 공식 (프론트엔드, `calcSimpleAnnualLeave`):**
```
1년 미만: 매월 1일씩 발생 (최대 11일)
1년 이상: 연 15일 기본 + 2년마다 1일 추가 (상한 25일)
미지급 연차수당: 잔여 연차일수 × 평균 일급
```

**설문 플로우 (동적 분기):**
- 퇴직 여부에 따라 퇴직일 스텝 추가
- 목적(미지급청구/남은일수)에 따라 일급 스텝 추가
- 총 설문 단계: 최소 4단계, 최대 6단계

---

## 2. 발견된 문제점

### 🔴 [HIGH] 실업급여 계산기 — API 에러 메시지 파싱 unsafe

**위치:** `UnemploymentFlow.tsx` 라인 206

```typescript
// 문제 코드
const msg = (res.reason as { response?: { data?: { detail?: string } } })
  ?.response?.data?.detail || '계산 중 오류가 발생했어요.'
```

**문제:** `res.reason`을 명시적 타입 단언(as)으로 처리 — axios 에러 구조가 아닌 네트워크 에러 등의 경우 `undefined` 접근 가능성. `any` 타입 단언과 동일한 안전성 문제.

**수정 권고:**
```typescript
import axios from 'axios'
const msg = axios.isAxiosError(res.reason)
  ? res.reason.response?.data?.detail || '계산 중 오류가 발생했어요.'
  : '계산 중 오류가 발생했어요.'
```

---

### 🔴 [HIGH] 주휴수당 계산기 — Supabase null 가드 패턴 불일치

**위치:** `WeeklyAllowancePage.tsx` 라인 135

```typescript
// 문제 코드
const { data: { user } } = await supabase!.auth.getUser()
```

**문제:** `supabase!` (non-null assertion)는 `supabase`가 `null`인 경우 런타임 에러 발생. 연차수당 페이지 동일.

**수정 권고:**
```typescript
if (!supabase) { setSaveState('error'); return }
const { data: { user } } = await supabase.auth.getUser()
```

---

### 🔴 [HIGH] 연차수당 계산기 — 날짜 계산 정밀도 문제

**위치:** `AnnualLeaveAllowancePage.tsx` 라인 71~73

```typescript
// 문제 코드
const totalDays   = diffMs / (1000 * 60 * 60 * 24)
const totalMonths = Math.floor(totalDays / 30.44)  // 30.44는 평균 월일수
```

**문제:** 
- 30.44일을 한 달로 간주 — 실제 근로기준법은 역월 기준 계산
- 윤년, 월별 일수 차이를 반영하지 않아 경계값(정확히 1년, 3년 등)에서 1개월 오차 가능
- 예: 2024년 2월 29일 입사자의 경우 계산 오류 가능성

**수정 권고:**
```typescript
// 역월 기준 정확한 개월수 계산
const yearsWorked = end.getFullYear() - hire.getFullYear()
const monthOffset = end.getMonth() - hire.getMonth()
const dayOffset   = end.getDate() < hire.getDate() ? -1 : 0
const totalMonths = yearsWorked * 12 + monthOffset + dayOffset
```

---

### 🟡 [MEDIUM] 주휴수당 계산기 — 시급 입력 쉼표 제거 미처리

**위치:** `WeeklyAllowancePage.tsx` 라인 90

```typescript
const wage = Number(survey.hourlyWage.replace(/,/g, ''))
```

**문제:** `hourlyWage` 입력 시 쉼표는 replace로 제거하지만, 사용자가 "1,0000"처럼 잘못 입력한 경우 `NaN` 아닌 `10000`으로 파싱되어 조용히 통과됨.

**수정 권고:** 입력 필드 `onChange`에서 숫자만 허용 (정규식 `[^0-9]` 제거) 또는 유효성 검사 추가.

---

### 🟡 [MEDIUM] 연차수당 계산기 — 미래 날짜 입력 방어 없음

**위치:** `AnnualLeaveAllowancePage.tsx` `calcSimpleAnnualLeave` 함수

**문제:** 입사일이 현재보다 미래 날짜인 경우 `diffMs`가 음수 → `totalMonths`가 음수 → 연차 0일 발생하지만 에러 메시지 없음. 사용자 혼란 유발 가능.

**수정 권고:**
```typescript
if (hire > new Date()) {
  return { ..., totalEntitlement: 0, error: '입사일이 미래 날짜입니다.' }
}
```

---

### 🟡 [MEDIUM] 실업급여 계산기 — 기타 회사 입력 시 표시명 혼재

**위치:** `UnemploymentFlow.tsx` 라인 131

```typescript
const companyLabel = s.displayCompany || 
  (s.company === '기타' ? s.companyOther : s.company) || ''
```

**문제:** `displayCompany`가 PDF에서 추출한 사업장명인데, Step 1에서 선택한 회사(`s.company`)와 혼재될 수 있음. `기타` 선택 후 PDF 업로드 시 사업장명이 덮어씌워짐.

---

### 🟢 [LOW] 모든 계산기 — data-testid 속성 없음

**문제:** E2E 테스트에서 DOM 선택 시 텍스트 기반 셀렉터에 의존. 한국어 텍스트 변경 시 테스트 깨질 가능성 높음.

**수정 권고:** 주요 버튼/결과 영역에 `data-testid` 속성 추가
```typescript
// 예시
<button data-testid="btn-next">다음</button>
<div data-testid="result-amount">{result}</div>
```

---

### 🟢 [LOW] 주휴수당/연차수당 — 로딩 오버레이 미사용

**문제:** 실업급여는 `LoadingOverlay` 컴포넌트를 사용하는 반면, 주휴수당/연차수당 간편계산은 로딩 상태 표시 없음. 간편계산은 즉시 계산이므로 문제없지만, PDF 정밀계산 중 로딩 UI가 일관성 없음.

---

## 3. E2E 테스트 파일 목록

| 파일 | 대상 계산기 | 테스트 수 |
|------|------------|---------|
| `frontend/src/tests/unemployment.spec.ts` | 실업급여 계산기 | 8개 |
| `frontend/src/tests/weekly-allowance.spec.ts` | 주휴수당 계산기 | 6개 |
| `frontend/src/tests/annual-leave.spec.ts` | 연차수당 계산기 | 7개 |

---

## 4. 테스트 실행 방법

```bash
# 1. 개발 서버 실행 (별도 터미널)
cd frontend && npm run dev

# 2. Playwright 설치 (최초 1회)
npx playwright install

# 3. 특정 테스트 실행
npx playwright test frontend/src/tests/unemployment.spec.ts
npx playwright test frontend/src/tests/weekly-allowance.spec.ts
npx playwright test frontend/src/tests/annual-leave.spec.ts

# 4. 전체 E2E 테스트 실행
npx playwright test frontend/src/tests/

# 5. UI 모드로 실행 (시각적 확인)
npx playwright test --ui
```

> **주의:** 백엔드 API를 호출하는 테스트(실업급여 쉬운 계산, PDF 정밀계산)는 `VITE_API_URL` 환경변수 또는 Vite 프록시 설정이 필요합니다.

---

## 5. 수정 권고 우선순위

| 순위 | 파일 | 내용 | 긴급도 |
|------|------|------|--------|
| 1 | `UnemploymentFlow.tsx` | axios.isAxiosError 사용으로 에러 파싱 안전화 | HIGH |
| 2 | `WeeklyAllowancePage.tsx`, `AnnualLeaveAllowancePage.tsx` | supabase null 가드 `!` 제거 | HIGH |
| 3 | `AnnualLeaveAllowancePage.tsx` | 역월 기준 날짜 계산으로 교체 | HIGH |
| 4 | `AnnualLeaveAllowancePage.tsx` | 미래 입사일 입력 방어 추가 | MEDIUM |
| 5 | 전체 | data-testid 속성 추가 | LOW |
