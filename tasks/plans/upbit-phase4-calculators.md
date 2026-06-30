# 업비트풍 Phase 4 — 계산기 묶음 기획서

> 작성: 2026-06-30 · 브랜치 `redesign/upbit-cal` · 근거: 홈 v2(42ed52f) 확립 톤 계승
> 범위: 계산기 허브 + 4개 플로우(퇴직금·실업급여·주휴·연차) + 결과 화면 + 공유 CalcLayout
> **불변 원칙**: 계산 로직(28일 블록·계산식·임금하한·API 호출) 절대 무변경 — UI만.

---

## 1. 목표 (홈에서 확립된 업비트 톤 계승)

- 큰 타이틀 / 시원한 여백 / tabular-nums 숫자 / 일관 카드 / 업스케일 CTA / 단계 진행 표시
- 그룹색 유지: 퇴사후정산(퇴직금·실업급여)=블루 / 재직중수당(주휴·연차)=그린
- 결과 금액 강조: strong `#1B64DA` + tabular-nums (그린 그룹 결과는 그룹색 그린 유지 + tabular-nums)
- 전역 토큰(up.*, maxWidth.content=1280) 이미 주입됨 → 재사용

## 2. 지렛대 분석

| 화면 | 시각 골격 출처 | 적용 방법 |
|------|--------------|----------|
| 퇴직금/실업급여 플로우 | **CalcLayout 공유 컴포넌트 100%** | CalcLayout 업스케일 → 양쪽 동시 적용 |
| 주휴/연차 플로우 | CalcHeader/Wrapper/ContentArea + **인라인 step UI** | 공유 width 업스케일 + 인라인 반복문자열 replace_all |
| 결과(퇴직금/실업급여) | GlassCard + index.css `.num-hero` | index.css tabular-nums 추가(양쪽 동시) |
| 허브 | ui/Container·Card·SectionHeader | 톤 업스케일 |

## 3. 변경 파일 (UI only)

1. **components/calc/CalcLayout.tsx** — 공유 업스케일
   - 컨테이너 폭 520→560(헤더·본문 동시), StepCard 패딩 p-6 sm:p-7·gap-5
   - StepIcon 타이틀 clamp(21,5.5vw,26)·subtitle 15px, NextButton min-h 56·16px
2. **pages/CalculatorPage.tsx** — 허브 CTA min-h 52·16px, stat tabular-nums, 카드 간격
3. **styles/index.css** — `.num-hero`에 `font-variant-numeric: tabular-nums`
4. **pages/SeveranceFlow.tsx** — 글래스 입력 잔재(border-white/60 bg-white/70) → 솔리드 토큰(UnemploymentFlow와 동일), PDF 사업장 선택 칩 토큰화
5. **pages/WeeklyAllowancePage.tsx** — step 타이틀 업스케일, 금액 font-mono tabular-nums, CTA 업스케일(반복문자열 replace_all)
6. **pages/AnnualLeaveAllowancePage.tsx** — Weekly와 동일 패턴 replace_all

## 4. 절대 불변 (회귀 0 검증 대상)

- runPrecise / runSimple / handleSave / handlePdfFile / extract* / calc* 호출 일체
- 계산식 문자열, formula-box, 28일 블록, 임금하한, 적격 판정
- props 시그니처, state 구조, API FormData 필드

## 5. 검증

1. `npm run build`(tsc 포함) 통과 · 콘솔 0
2. 320/375/768/1280 오버플로·잘림 0 (DOM 실측)
3. 더블 리뷰어 A·B — **특히 계산 로직 diff 0** 회귀 검증 → docs/dual_review/
4. `git diff`로 backend/ 및 계산 함수 변경 0건 증빙

## 6. 배포

더블리뷰 PASS → main 병합 → push → Vercel 자동배포 → 6-step 확인
