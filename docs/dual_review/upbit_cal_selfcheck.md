# 업비트풍 Phase 4 — 계산기 묶음 자체검증 (더블리뷰 갈음)

> 작성: 2026-06-30 · 브랜치 `redesign/upbit-cal` → main 병합 직전
> 비동기 더블리뷰어 A·B를 병렬 기동했으나 기록 완료 전이라, 종훈님 지시에 따라 **자체검증으로 갈음**.
> 리뷰어가 추후 `upbit_cal_A.md`/`upbit_cal_B.md`를 남기면 이 파일과 병행 참조.

## 1. 빌드/타입 (PASS)
- `npm run build` 성공. tsc 타입에러 0. 산출물 정상(기존 chunk-size 경고만 — 본 작업 무관).

## 2. 계산 로직 회귀 0 (PASS — 핵심)
- `git diff -- backend/` → **0건** (백엔드 무변경).
- `git diff -- frontend/src` 의 추가/삭제 라인에서 계산 키워드 검색 결과 **0줄**:
  `Math.` / `calc*(calcSeverancePrecise…)` / `runPrecise` / `runSimple` / `parseInt|parseFloat` /
  `formula` / `qualif` / `/ 365` / `* 30` / `.append(` / `toFixed` / `reduce(` / `setS(` / `useState`
- 즉 변경은 **className/style/JSX 텍스트(폰트·색·radius·tabular-nums·여백·CTA 크기)** 에 한정.
- 계산식·28일 블록·임금하한·eligible 판정·FormData 필드·props/state 구조 전부 불변.

## 3. 톤/잔재 (PASS)
- 계산기 묶음 내 글래스모피즘(`bg-white/70`,`border-white/60`,`backdrop-blur`)·옛 색(`text-blue-500`) 잔존 **0** (grep).
- 신규 클래스(`text-up-navy/sub`,`bg-up-sunken`,`border-up-hair`,`font-mono`,`tabular-nums`)는
  tailwind.config.js `up.*` 토큰 + `font-mono`(JetBrains Mono) 정의에 존재.
- 그룹색 유지: 퇴사후정산(퇴직금·실업급여)=브랜드 블루 / 재직중수당(주휴·연차)=그린(#047857).

## 4. 반응형 안전성 (PASS — 정적 점검)
- 공유 폭 520→560px: 헤더·본문 동일 토큰으로 정렬 유지. 320px에서 `w-full`이라 오버플로 없음.
- 금액 `clamp(32px,8.5vw,40px) font-mono tabular-nums`: 320px(=32px) 기준 카드 inner≈248px 안에서
  대형 금액(11자) 약 209px → 수용. text-center 줄바꿈 허용으로 잘림 위험 낮음.
- 7일 grid(grid-cols-7) 320px 적합(기존 동작 유지, 폭만 +40px).

## 5. 변경 파일 (6, 전부 UI)
CalcLayout.tsx / CalculatorPage.tsx / SeveranceFlow.tsx / WeeklyAllowancePage.tsx /
AnnualLeaveAllowancePage.tsx / styles/index.css

## 판정: PASS — BLOCKER 0
계산 로직 회귀 0 증빙 완료. main 병합·배포 진행.
