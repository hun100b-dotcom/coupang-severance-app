# 업비트풍 Phase4 "계산기 묶음" 디자인 QA 리뷰 B (정적 분석)

> 리뷰어: 시니어 디자인 QA B
> 브랜치: `redesign/upbit-cal`
> 방식: 코드/빌드 정적 분석 + 클래스 계산 (dev 서버 미기동 — 지침 준수)
> 일자: 2026-06-30
> 검증 대상: `CalcLayout.tsx`, `CalculatorPage.tsx`, `SeveranceFlow.tsx`, `WeeklyAllowancePage.tsx`, `AnnualLeaveAllowancePage.tsx`, `styles/index.css`

---

## 판정: **FAIL**

- **BLOCKER: 2개**
- 경고(WARN): 4개
- 빌드: **PASS** (exit 0, 10.45s)

핵심 사유: ① 두 수당 페이지(주휴·연차)가 토큰을 거의 쓰지 않고 **옛 색 리터럴(#8b95a1·#191f28·#4e5968 등) 133회**를 유지 → 업비트 톤 일관성·대비 AA 둘 다 미달. ② 히어로 금액(`clamp(32,8.5vw,40)`)에 오버플로 가드(min-w-0/truncate/break-keep) 부재 → 320px 큰 금액 잘림 위험. CalcLayout·CalculatorPage는 깨끗하게 토큰화되어 통과.

---

## 1. 빌드 검증 (항목 5) — PASS

```
npm run build  →  ✓ built in 10.45s   EXIT=0
```
- 타입/컴파일 오류 없음. 기존 chunk-size 경고(>500kB index/TargetTab/BarChart)만 출력 — 이번 변경과 무관(기존 이슈).

---

## 2. 업비트 톤 일관성 (항목 2)

### 2-1. 잘된 점
- **글래스모피즘 완전 제거 확인**: 5개 파일 전체에서 `backdrop-blur` / `bg-white/N` / `border-white/N` / `GlassCard` **0건** (grep). 솔리드 흰 카드 + `border-up-hair`/`border-line` + `shadow-card`로 정리됨 → 업비트 평면 톤 부합.
- **CalcLayout.tsx**: `up-navy/up-sub/up-hair/up-sunken` 토큰 일관 사용, NextButton `min-h-[56px]`·16px (업스케일 충족), StepIcon `clamp(21px,5.5vw,26px)` 헤딩, `tabular-nums`+`font-mono` 진행표시 — 옛 색 리터럴 **0건**. 모범.
- **CalculatorPage.tsx**: 그룹색(퇴사후정산 `#1B64DA` 블루 / 재직중수당 `#05A56C` 그린) 유지, CTA `min-h-[56px]`·16px, stats `tabular-nums` — 옛 리터럴 **0건**. 모범.

### 2-2. BLOCKER ①: 수당 2페이지 옛 색 리터럴 잔존 (토큰 미적용)
grep `#8b95a1|#191f28|#4e5968|bg-[#F7F9FC]|bg-[#F2F4F6]|bg-gray-|text-gray-|text-blue-|bg-blue-|...`:

| 파일 | 적중 수 |
|------|--------|
| `WeeklyAllowancePage.tsx` | **57** |
| `AnnualLeaveAllowancePage.tsx` | **56** |
| `SeveranceFlow.tsx` | **20** |
| CalcLayout / CalculatorPage | 0 / 0 |

- 두 수당 페이지는 헤딩에만 `text-up-navy`를 쓰고 본문·라벨·캡션·배경은 전부 **하드코딩 hex**(`text-[#191f28]`, `text-[#4e5968]`, `text-[#8b95a1]`, 호버 `bg-[#F7F9FC]`, 비활성 `bg-[#F2F4F6]`)로 남아 있음. `up-body(#333D4B)`·`up-sub(#565D6A)`·`up-sunken(#F2F5FA)` 토큰 체계와 단절 → "전역 토큰 주입" 취지 위반. 동일 의미 텍스트가 페이지마다 다른 hex를 쓰게 되어 톤 표류 위험.
- 색은 유사(#191f28≈ink-900, #4e5968≈ink-700)하나 **토큰화 자체가 Phase 목표**이며, 특히 `#8b95a1`은 아래 대비 문제로 직결.

### 2-3. WARN: 색 리터럴 부분 잔존 (SeveranceFlow STEP4/입력 라벨)
- `SeveranceFlow.tsx`도 STEP4 입력 라벨·플레이스홀더에 `text-[#191f28]`/`text-[#8b95a1]` 20건 잔존(주 플로우는 토큰화됐으나 입력 카드 일부 미정리). CalcLayout 수준으로 통일 권장.

---

## 3. 대비 AA (항목 3)

### 3-1. BLOCKER 포함 — `#8b95a1`(=up-caption #8E929B, 흰 위 약 3.0:1)을 **본문 보조 텍스트**에 사용
분석 문서(`upbit_home_analysis.md` §2-2/§7)가 **정확히 이 함정**을 명시: "읽어야 하는 보조 텍스트엔 #565D6A(6.7:1), 흐린 #8E929B(3.0:1)는 날짜·플레이스홀더 같은 비필수에만." `#8b95a1` 적중 **45회**(주휴 21·연차 19·퇴직 5).

**AA 허용(비필수 — 통과)**: 입력 단위 접미사 `시간/원`, 날짜형 서브카피, 데코 ChevronRight 아이콘.

**AA 위반(기능성 보조 텍스트 — 13~11px인데 3.0:1)** 예시:
- 주휴 L353/391/435/482/530 스텝 안내 서브카피("근무 형태를 선택해 주세요", "소수점 입력 가능(예: 7.5)" 등) — 사용자가 읽어야 하는 지시문.
- 주휴 L669 계산식 라벨 "계산식", L817/821/825 데이터 라벨("전체 주차/주휴수당 발생/적용 시급"), L847 "해당 없음" 상태, L741 PDF 가이드 링크.
- 연차 동일 패턴(서브카피·요약 라벨 `text-[10px] text-[#8b95a1]` L730 등).

→ 13px/12px/11px 기능 텍스트에 3.0:1은 WCAG AA(4.5:1) 미달. 해당 항목은 `text-up-sub(#565D6A, 6.7:1)`로 교체 필요. **이것이 본 Phase의 명시 학습과 정면 충돌하므로 BLOCKER로 승격.**

> 참고: `#4e5968`(≈ink-700, 약 7.4:1)와 `#191f28`(≈12:1)는 대비 자체는 AA 통과 — 문제는 토큰 미사용(2-2)이지 대비 아님.

### 3-2. 통과
- 그린 텍스트는 전부 `#047857`(진한 그린, 흰 위 ~4.7:1 AA)로 통일 — 흰 배경/연그린(accent-bg) 위 모두 AA 충족. CalcLayout GREEN 팔레트도 동일.
- num-hero(index.css): `#1B64DA`(5.4:1) — AA 통과.

---

## 4. 반응형 오버플로 / 잘림 (항목 1)

### 4-1. BLOCKER ②: 히어로 금액 오버플로 가드 부재 (320px)
`text-[clamp(32px,8.5vw,40px)] font-mono tabular-nums ... tracking-tight leading-none` — 적용처 4곳:
- 주휴 L660(간편 결과), L811(PDF 합계)
- 연차 L790(미지급수당), L947(PDF 미지급)

**320px 계산**:
- 뷰포트 320 − CalcPageWrapper `px-4`(32) = 288 → CalcContentArea `max-w-[560px] w-full` = 288 → StepCard/결과카드 `p-6`(48) ≈ 240 → 금액카드 `px-5`(40) ≈ **200px 가용폭**.
- `8.5vw`@320 = 27.2px인데 clamp 하한 32px → **실제 32px 적용**. JetBrains Mono 숫자 ≈ 0.6em ≈ 19.2px/자.
- 예: "12,345,600원"(12자) ≈ 230px > 200px → **가로 오버플로**. 해당 `<p>`에 `min-w-0`/`truncate`/`break-keep`/`overflow` 없음 → 카드 밖으로 삐져나가거나 클립.
- 위험도: 주휴(주 단위, 보통 ~8만원 7자=134px)는 안전. **연차 미지급수당·PDF 합계는 7자리(백만대) 도달 가능 → 실위험.** 최소 `break-keep + 작은 clamp 하한(28px) + 컨테이너 overflow-hidden` 또는 자릿수 따른 폰트 축소 권장.

### 4-2. 통과/저위험
- `grid sm:grid-cols-2`(CalculatorPage L116) — 모바일 암묵 1열 OK. `grid-cols-1` 누락으로 인한 터짐 없음.
- 요약 `grid grid-cols-2`(주휴 L577 / 연차 L719) — 320에서 셀 ≈114px, 값에 `truncate`+`min-w-0` 부모 적용됨 → 안전.
- 7일 `grid-cols-7 gap-2`(주휴 L393) — 셀 ≈27px, 한 자리 숫자 `py-4` → 타이트하나 수용 가능.
- CalcModeSelector 요약(CalcLayout L274) `min-w-0`+`truncate` 적용 — 모범.

---

## 5. 콘솔 / 접근성 (항목 4)

- **key**: 모든 `.map` 렌더 `key` 적절(회사명·주차키·month·label 등). 누락 없음.
- **aria**: CalcHeader 뒤로가기 `aria-label="뒤로 가기"` 존재. 단, 다수 입력에 `<label>`이 텍스트만 있고 `htmlFor`/`id` 연결 없음(주휴 L761, 연차 L896 "사업장 선택" label 등) — 스크린리더 약결합. **WARN**.
- **터치타깃**: 주 CTA `min-h-[56px]` OK. 7일 그리드 버튼 `py-4`(높이 ~52px) OK. 저장 버튼 `px-4 py-2`(높이 ~32px) — 44px 미달. **WARN**(보조 동작이라 치명 아님).
- **콘솔 위험**: SeveranceFlow 에러 로깅이 상태코드/접두사만 출력(L212) — 민감정보 비노출 양호. 명백한 런타임 콘솔 위험 없음.

---

## BLOCKER 목록 (FAIL 사유)
1. **수당 2페이지 토큰 미적용 + #8b95a1 본문 보조 사용**: 옛 색 리터럴 133회(주휴57·연차56·퇴직20), 그중 `#8b95a1` 45회가 기능성 보조 텍스트(13~11px)에 쓰여 대비 ~3.0:1로 AA 미달 — 분석 문서가 명시한 함정과 정면 충돌. → 본문 보조는 `text-up-sub`, 배경/본문은 `up-sunken/up-body`로 토큰화.
2. **히어로 금액 320px 오버플로 가드 부재**: 4곳(`clamp(32,8.5vw,40)` mono) 에 `break-keep/truncate/min-w-0/overflow` 없음 — 7자리 금액(연차 미지급·PDF 합계)이 ~200px 가용폭 초과(≈230px)로 잘림 위험.

## 경고(WARN) 목록
- SeveranceFlow STEP4 입력 라벨/플레이스홀더 색 리터럴 20건 잔존(부분 토큰화).
- 입력 `<label>` ↔ input `htmlFor/id` 미연결(스크린리더 약결합).
- 저장 버튼 터치타깃 44px 미달.
- 청크 사이즈 빌드 경고(기존 이슈, 이번 변경 무관).

## 재검증 체크
- [x] 주휴·연차 페이지의 `#8b95a1`(기능 텍스트) → `text-up-sub` 치환 (재검증서 확인)
- [x] 히어로 금액 4곳에 `break-keep` + clamp 하한 축소 (재검증서 확인)
- [x] 빌드 재실행 PASS 유지

---

# 재검증 (HEAD=5911e2d, 미푸시) — 2026-06-30

> 코디네이터가 BLOCKER 2건 수정 후 재검증 요청. 정적 분석으로 확인.

## 재판정: **PASS** — 남은 BLOCKER 0개

### BLOCKER ① (AA 대비 / 토큰화) — 해소 확인
- `text-[#8b95a1]` grep(계산기 묶음 5파일): **0건** (수정 전 45건 → 0). `8b95a1`/`8B95A1` 어떤 형태(hover 포함)로도 **0건**.
- diff: 제거 라인 중 `8b95a1`·`clamp(32px` 외 라인 **0** → 순수 className 치환만 발생. 기능성 보조 텍스트가 `text-up-sub`(#565D6A, 흰 위 6.7:1)로 이동 → WCAG AA(4.5:1) 충족. 분석 문서 §2-2/§7 함정 해소.
  > 참고: 비필수(단위 접미사·날짜형)도 함께 #565D6A로 올라가 대비는 오히려 강화됨 — AA 관점 문제 없음(더 진한 색이 되는 것은 AA 위반 아님).

### BLOCKER ② (320px 금액 오버플로) — 해소 확인
- 히어로 금액 4곳(주휴 L660·L811, 연차 L790·L947) 모두 `text-[clamp(25px,7vw,38px)] ... break-keep` 적용 확인(grep 4/4).
- **320px 재계산**: 가용폭 ≈200px(320 − px-4 32 − p-6 48 − px-5 40). `7vw@320 = 22.4px < 하한 25px → 25px 적용`. JetBrains Mono 숫자 ≈0.6em ≈15px/자.
  - 8자리 "12,345,600원"(12자) ≈ **180px** < 200 ✓
  - 9자리 "123,456,000원"(13자) ≈ 195px ≈ 경계 내 ✓ (`break-keep`로 "원" 분리 방지)
  - 주휴(주 단위, 보통 ~8만원)는 여유. 연차 미지급·PDF 합계(7~8자리)도 수용 → 잘림 위험 해소.

### 계산 로직 무변경 — 확인
- diff 라인 중 `runSimple|runPrecise|calc*|×30|÷365|.append|FormData|Math.|parseInt|parseFloat|allowance=|total=|annualDays|remaining|weeklyHours` 매치 **0건**.
- 변경 통계 84 insert / 84 delete (1:1 균형) = 비즈니스 로직·28일 블록·PDF FormData 전부 무손상.

### 빌드 — PASS
```
npm run build → ✓ built in 9.37s  EXIT=0  (기존 chunk-size 경고만)
```

### 범위 외 WARN (BLOCKER 미승격 — 코디네이터 지시 준수)
- 저장 버튼 터치타깃 44px 미달 / 입력 `<label>` htmlFor 미연결 — 이번 수정 범위 밖, 잔존하나 차단 사유 아님.
- SeveranceFlow 입력 라벨 `#191f28`·`#4e5968` 등 비-#8b95a1 리터럴은 대비 자체는 AA 통과(토큰화 미완은 비차단 개선항목).

**결론: 두 BLOCKER 모두 해소, 계산 로직 무변경, 빌드 PASS → PASS. 커밋+배포 진행 가능.**
