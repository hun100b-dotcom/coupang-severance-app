# 듀얼 리뷰 A — 업비트풍 Phase4 계산기 묶음 UI 리디자인

- **리뷰어**: 시니어 QA 리뷰어 A
- **검증 초점**: 계산 로직 회귀 0 + 빌드/타입 안정성
- **브랜치**: `redesign/upbit-cal`
- **검증 일시**: 2026-06-30
- **판정**: ✅ **PASS**
- **BLOCKER**: 0건
- **경고**: 2건 (모두 비차단)

---

## 0. 중요 전제 — 변경은 "커밋되지 않은 작업 트리" 상태

`redesign/upbit-cal` HEAD 는 `main` 과 **동일 커밋(42ed52f)** 이다. 리디자인 변경은 아직 커밋되지 않고 작업 트리(working tree)에만 존재한다. 따라서 `git diff main...HEAD` 는 빈 결과가 나오며, 실제 검증은 `git diff`(unstaged) 기준으로 수행했다.

```
$ git rev-parse HEAD   → 42ed52fecd16e600df7b70097d2921aa8f16fd76
$ git rev-parse main   → 42ed52fecd16e600df7b70097d2921aa8f16fd76
$ git merge-base main HEAD → 42ed52f...  (동일)
$ git diff main...HEAD --stat → (빈 결과)
```

```
$ git status --short
 M frontend/src/components/calc/CalcLayout.tsx
 M frontend/src/pages/AnnualLeaveAllowancePage.tsx
 M frontend/src/pages/CalculatorPage.tsx
 M frontend/src/pages/SeveranceFlow.tsx
 M frontend/src/pages/WeeklyAllowancePage.tsx
 M frontend/src/styles/index.css
?? tasks/plans/upbit-phase4-calculators.md
```

> ⚠️ **경고 1 (비차단)**: 검증 대상이 커밋되지 않은 작업 트리다. 본 PASS 판정은 현재 작업 트리 스냅샷 기준이며, 커밋 후 `main...HEAD` 로 재확인이 권장된다. `UnemploymentFlow.tsx` 는 프롬프트 예상대로 **변경 없음**(status 미표시).

---

## 1. 백엔드 변경 0건 — 확인

```
$ git diff -- backend/        → (빈 결과)
$ git status --short | grep backend → (없음)
```

`git status` 변경 목록에 backend 파일이 전혀 없고, `git diff -- backend/` 결과가 비어 있다. **백엔드 변경 0건 확정.**

---

## 2. 계산 로직 회귀 — 라인 단위 검증 (0건)

변경 6개 파일 전체 diff 를 라인 단위로 읽었다. 추가/삭제된 모든 라인이 **className / style / JSX 텍스트(폰트크기·색·radius·spacing·tabular-nums)** 범위 안에 있다.

### 2-1. 로직 패턴 자동 스캔 (결과: 0건)

```
$ git diff -- frontend/src | grep '^[+-]' | grep -v '^(+++|---)' \
  | grep -iE '\.append\(|FormData|function (run|calc|handle|onPdf|extract)|const (run|calc|handle)|/365|\* 30|weeklyHours|remainingDays|eligible|MIN_ORDINARY|useState|setS\(|\.map\(|fetch\(|api\.|axios'
→ (빈 결과 — 매칭 0)
```

계산식·함수 정의·FormData append·state·API 호출 패턴이 diff 에 **단 한 줄도 없음.**

### 2-2. 순수 UI 외 라인 필터 (결과: 주석 1줄만)

className/색/사이즈/radius/spacing/주석 패턴을 제외하고 남은 변경 라인:

```
- // min-h 52px → 터치 타겟 충분
+ // 업비트풍 업스케일: 높이 56px·16px 폰트 — 큼직한 주 CTA
```

→ 한국어 **주석 문구 변경**(CalcLayout.tsx, CalcNextButton). 코드 동작 무관.

### 2-3. 파일별 변경 성격

| 파일 | 변경 성격 | 로직 영향 |
|------|----------|----------|
| `CalcLayout.tsx` | border-line→border-up-hair, text-ink-900→text-up-navy, max-w 520→560, 폰트 17→18px, min-h 52→56px, font-mono/tabular-nums 추가 | 없음 |
| `CalculatorPage.tsx` | CTA min-h 48→56px, text 15→16px, 아이콘 16→18px (className만) | 없음 |
| `SeveranceFlow.tsx` | input border/색 토큰 교체, 타이틀 span 색 blue-500→brand, PDF 회사선택 칩 색상. `onChange={setS/setEndDate/setWorkDays/setAvgWage}` 핸들러 **불변** | 없음 |
| `WeeklyAllowancePage.tsx` | 타이틀 22px→clamp(21~26px), 버튼 min-h-[56px]/rounded-lg/16px, 결과 금액 `<p>` 에 font-mono tabular-nums clamp 추가. `onClick={setSurveyStep/setStep/runPrecise}` **불변**, `formatWon(...)` 값식 **불변** | 없음 |
| `AnnualLeaveAllowancePage.tsx` | 동일 패턴(타이틀 clamp, 버튼 56px, 결과 금액 mono/tabular). `onClick={handleNext/runPrecise}` **불변**, `formatWon(simpleResult.unpaidAllowance / pdfResult.unpaid_allowance)` 값식 **불변** | 없음 |
| `styles/index.css` | `.num-hero` font-family 에 'JetBrains Mono' 선두 추가, font-size clamp 상향(1.9→2rem 등), `font-variant-numeric: tabular-nums` / `font-feature-settings:'tnum'` 추가 | 없음 (표현 전용) |

**핵심 비즈니스 로직(28일 블록, 평균임금×30×일수/365, 주휴 weeklyHours/40*8*wage, 연차 remainingDays×일급, 임금하한, eligible 판정, FormData 필드명/값, state 구조, props 시그니처) — 전부 diff 무변경 확인.**

→ **계산 로직 회귀 BLOCKER 0건.**

---

## 3. 빌드 / 타입 안정성 — PASS

빌드 스크립트: `tsc -b && vite build` (tsc 타입검사 포함)

```
$ npm run build
...
✓ built in 9.23s   (재실행 9.25s)
```

- tsc 타입 에러 **0** (에러 출력 없음, vite 단계까지 정상 진행)
- `grep -iE 'error|TS[0-9]+|cannot find'` → 매칭 없음
- 모든 청크 정상 생성

> ⚠️ **경고 2 (비차단)**: vite 청크 크기 경고(`index-*.js 533kB`, `TargetTab-*.js 543kB > 500kB`)가 출력된다. 다만 이는 **기존부터 존재하던 정보성 경고**이며 이번 리디자인과 무관(계산기 파일 청크는 27~45kB 수준). 차단 사유 아님.

---

## 4. 신규 Tailwind 클래스 토큰 존재 검증 — PASS

diff 에서 사용된 신규 클래스를 `frontend/tailwind.config.js` 와 대조:

| 클래스 | 토큰 출처 | 정의 위치 | 유효 |
|--------|----------|----------|------|
| `text-up-navy` | up.navy = #1A2434 | tailwind.config.js:58 | ✓ |
| `text-up-sub` | up.sub = #565D6A | :60 | ✓ |
| `bg-up-sunken` | up.sunken = #F2F5FA | :57 | ✓ |
| `border-up-hair` / `bg-up-hair` | up.hair = #E1E4EA | :62 | ✓ |
| `text-brand` / `border-brand` / `ring-brand` / `brand/30` | brand.DEFAULT = #3182F6 | :18 | ✓ |
| `bg-brand-bg` | brand.bg = #EAF2FE | :20 | ✓ |
| `border-brand-200` | brand.200 = #C7DDFC | :23 | ✓ |
| `font-mono` | fontFamily.mono = ['JetBrains Mono','monospace'] | :88 | ✓ |
| `tabular-nums` | Tailwind 내장 유틸 | (내장) | ✓ |

**무효 클래스 0건.** styles/index.css 의 `.num-hero` 도 'JetBrains Mono' 폰트가 fontFamily.mono 와 일관됨.

---

## 종합 판정

| 항목 | 결과 |
|------|------|
| 1. 백엔드 변경 0건 | ✅ |
| 2. 계산 로직 회귀 | ✅ 0건 |
| 3. 빌드/타입(tsc) | ✅ 성공, 에러 0 |
| 4. Tailwind 토큰 유효성 | ✅ 무효 클래스 0 |

### BLOCKER (0건)
- 없음

### 경고 (2건, 모두 비차단)
1. 변경이 **미커밋 작업 트리** 상태 — 커밋 후 `main...HEAD` 기준 재확인 권장.
2. vite 청크 크기 경고는 **기존 잔존 이슈**로 이번 변경과 무관.

## 최종 판정: **PASS** — "UI only" 주장 사실로 확인됨. 계산 로직 회귀 0, 빌드/타입 안정.
