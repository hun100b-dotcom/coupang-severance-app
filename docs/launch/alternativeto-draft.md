# AlternativeTo 등재 초안 — CATCH (퇴직금 한번에)

> Draft Date: April 2026

---

## Category (카테고리)

**Primary:** Finance  
**Secondary:** Legal / Productivity

AlternativeTo 카테고리 태그:
- Finance
- Legal Tools
- Calculators
- HR Tools
- Korean Apps

---

## Short Description (English, 300+ chars)

CATCH is a free web calculator for daily workers in South Korea to calculate severance pay, unemployment benefits, weekly holiday pay, and annual leave pay. It supports PDF upload (employment insurance work history) for precise calculations using the legal 28-day reverse block algorithm, or manual input for quick estimates. Built for logistics center workers at Coupang, Kurly, and CJ.

*(Character count: ~380)*

---

## 한국어 설명 (300자+)

**CATCH(퇴직금 한번에)** 는 쿠팡·컬리·CJ 등 물류센터 일용직 근로자를 위한 무료 노동권 계산기입니다.

- **퇴직금 계산기**: 28일 역산 블록 알고리즘으로 법적 기준에 맞는 정밀 계산
- **실업급여 계산기**: 피보험 단위기간 180일 충족 여부 + 예상 수급액 계산
- **주휴수당 계산기**: 주 15시간 이상 근무 시 받을 수 있는 주휴수당 자동 계산
- **연차수당 계산기**: 미사용 연차에 대한 수당 계산

고용보험 근로내역 PDF 업로드 시 자동 분석(정밀 계산), 날짜·금액 직접 입력 시 간편 계산 — 두 가지 모드를 지원합니다.

회원가입 불필요, 완전 무료로 제공됩니다.

---

## 경쟁 서비스 목록 — 국내 유사 서비스

### 1. 고용보험 홈페이지 모의계산 (work.go.kr)
- **URL**: https://www.ei.go.kr
- **제공 기관**: 고용노동부 (공식)
- **기능**: 실업급여 모의계산, 피보험기간 조회
- **한계**: 일용직 특화 없음, UI가 복잡하고 모바일 최적화 미흡, 퇴직금 계산 미제공

### 2. 사람인 퇴직금 계산기
- **URL**: https://www.saramin.co.kr/zf_user/tools/salary-calculator
- **제공 기관**: 사람인 (취업 포털)
- **기능**: 퇴직금 간편 계산 (재직 기간·평균임금 입력)
- **한계**: 일용직 28일 블록 알고리즘 미지원, PDF 업로드 없음, 실업급여·주휴수당 없음

### 3. 잡코리아 급여계산기
- **URL**: https://www.jobkorea.co.kr/goodjob/tip/calculator
- **제공 기관**: 잡코리아 (취업 포털)
- **기능**: 연봉 계산, 퇴직금 계산, 4대보험 계산
- **한계**: 정규직 기준, 일용직 비적격 블록 계산 없음, 물류센터 특화 없음

### 4. 네이버 퇴직금 계산기
- **URL**: 네이버 검색 "퇴직금 계산기" 상단 위젯
- **제공 기관**: 네이버 (검색 포털)
- **기능**: 입사일·퇴사일·임금 입력 → 퇴직금 즉시 계산
- **한계**: 단순 계산만 제공, 일용직 조건 판별 없음, 실업급여 등 연계 없음

### 5. 알바몬 급여계산기
- **URL**: https://www.albamon.com/tools/salary
- **제공 기관**: 알바몬 (단기 알바 포털)
- **기능**: 시급 기반 월급·주급 계산, 주휴수당 계산
- **한계**: 미래 급여 예측 도구, 과거 근무 기록 기반 퇴직금 계산 없음

### 6. 고용24 (구 워크넷)
- **URL**: https://www.work24.go.kr
- **제공 기관**: 고용노동부 (공식)
- **기능**: 실업급여 신청, 고용보험 이력 조회, 채용정보
- **한계**: 계산 기능보다 신청/행정 처리 중심, UI 복잡, 모바일 불편

---

## CATCH만의 차별점

### 1. 일용직 전문 28일 역산 블록 알고리즘

다른 계산기는 단순히 "시작일~종료일"로 계산합니다. CATCH는 근로기준법과 퇴직급여보장법에 따른 **28일 역산 블록** 방식을 적용해 일용직 퇴직금을 법적으로 정확하게 계산합니다.

- 비적격 블록(8일 미만) 자동 제외
- 3개월 이상 공백 시 세그먼트 자동 분리
- 연도별 최저임금 하한 자동 적용

### 2. PDF 업로드 자동 분석

고용24에서 발급받은 **고용보험 근로내역 PDF를 업로드**하면 자동으로 파싱해서 근무일을 분석합니다. 수동 입력 없이 정밀 계산이 가능합니다.

### 3. 4가지 노동권 통합 계산기

퇴직금 + 실업급여 + 주휴수당 + 연차수당을 **하나의 앱에서** 모두 계산할 수 있습니다. 각 계산기가 PDF 업로드 / 수동 입력 두 가지 모드를 지원합니다.

### 4. 물류센터 일용직 특화

쿠팡·컬리·CJ 등 국내 주요 물류센터 근로자들이 실제로 겪는 패턴(단기 계약 반복, 여러 센터 이동, 공백 기간 등)에 맞춰 설계되었습니다.

### 5. 완전 무료, 회원가입 불필요

계산 기능은 로그인 없이 무료로 사용할 수 있습니다. 계산 결과 저장을 원하는 경우에만 소셜 로그인(카카오/구글)을 이용하면 됩니다.

---

## 앱 링크

- **프로덕션 URL**: https://catch-daily-worker.vercel.app
- **플랫폼**: Web (모바일 최적화, PWA 지원 예정)
- **언어**: 한국어
- **가격**: 무료 (Freemium 모델 예정)

---

## AlternativeTo 등재 체크리스트

- [ ] AlternativeTo 계정 생성 (hun100b@gmail.com)
- [ ] 앱 등재 페이지 작성 (위 내용 활용)
- [ ] 스크린샷 3장 이상 업로드
- [ ] 경쟁 서비스 6개를 "Alternative to" 로 태그
- [ ] 소셜 공유 (링크드인, 트위터/X, 카카오)
- [ ] 지인들에게 좋아요(vote) 요청

---

## 참고 — 해외 유사 서비스 (글로벌 비교)

| 서비스 | 국가 | 특징 |
|--------|------|------|
| Gusto | 미국 | HR/급여 SaaS (유료, 기업용) |
| PaycheckCity | 미국 | 급여 계산기 (무료, 개인용) |
| MoneyHelper | 영국 | 정부 제공 퇴직금/급여 계산기 |
| MoneySmart | 싱가포르 | 정부 제공 금융 계산기 모음 |

**CATCH의 글로벌 포지셔닝**: 한국 일용직 노동법에 특화된 유일한 전문 계산기. 해외에 직접 경쟁 서비스가 없는 블루오션.
