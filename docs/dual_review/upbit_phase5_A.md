# 업비트풍 Phase5 마감 스윕 — 리뷰어 A (총괄 QA)

- 검토일: 2026-06-30
- 브랜치: `redesign/upbit-phase5` (기준 main=`c1dbd02`)
- 검토 방식: 실제 코드 diff 정독 + `tsc`/`build` 실행 + WCAG 대비비 직접 계산
- 변경 규모: 44파일, +701 / −701 (라인 수 대칭 = 순수 치환 성격)

---

## 1. 빌드 / 타입 — PASS

- `npx tsc --noEmit` → **0 에러** (`TSC_EXIT=0`)
- `npm run build` → **성공** (`✓ built in 9.50s`, `BUILD_EXIT=0`)
- 청크 500kB 경고는 기존부터 있던 것(index 533kB / TargetTab 543kB)으로 이번 사이클과 무관. 신규 회귀 아님.

근거: 빌드 로그 말미 `✓ built`, tsc 종료코드 0.

## 2. 로직 불변 (계산·OAuth·데이터·라우팅 diff 0) — PASS

`git diff c1dbd02` 전수 검사 결과 변경은 전부 **className / inline style color / 토큰** 한정. 조건분기·핸들러·상태·API·라우트 코드 변동 0.

- **ResultSeverance.tsx** `#00a876`→`#047857` 10곳: 전부 `color:` 속성 또는 `linear-gradient`의 색 정지점에만 적용.
  - `s.eligible ? '#047857' : '#cc2233'` — 삼항 **조건식 자체는 불변**, true 분기 색값만 교체 (L101, L107).
  - `BlockCard`의 `const color = block.qualifies ? '#047857' : '#cc2233'` (L252) — 동일.
  - `bg`/`border` 변수(`rgba(0,196,140,...)`)와 `background: 'rgba(0,196,140,0.08)'` **배경 rgba는 그대로 유지** (의도대로 텍스트만 진하게). 그라데이션도 시작색 `#00c48c`는 유지, 끝색만 `#047857`.
  - `opacity: 0.7` 제거 1곳(L367 적격 블록 "= N일") — 캡션 가독성 강화 목적, 값/구조 영향 없음.
- **App.tsx**: 버전배지 `text-slate-400/80`→`text-up-caption/80` 1줄. `aria-hidden` 유지.
- **Login/Onboarding/Terms/ErrorBoundary/mypage 3종**: 색 클래스 1:1 치환만. checkbox `onChange`, `handleSubmit`, OAuth 호출, `app.status` 분기 모두 불변.

BLOCKER: 0

## 3. 접근성 AA — PASS

흰/해당 배경 위 대비비 직접 계산(파이썬, sRGB WCAG 공식, 알파는 흰 배경 합성 후 측정):

| 색 / 배경 | 측정 대비비 | 기준 | 판정 |
|---|---|---|---|
| `#047857` on white (본문/금액) | **5.48:1** | 4.5 | PASS (프롬프트 4.7 기재보다 우수) |
| `#047857` on `rgba(0,196,140,0.07)` (BlockCard) | 5.16:1 | 4.5 | PASS |
| `#047857` on `accent-bg #E6F8F1` (배지) | 4.98:1 | 4.5 | PASS |
| `#B45309` on `warning/10`(=#FEF5E7) | 4.65:1 | 4.5 | PASS |
| `#B45309` on white | 5.02:1 | 4.5 | PASS |
| `up-sub #565D6A` on white (ErrorBoundary 본문) | 6.63:1 | 4.5 | PASS |
| `up-caption #8E929B` on white | 3.12:1 | 4.5 | 비필수 한정 사용 → 허용 |

- `up-caption` 3.12:1은 4.5 미달이나 사용처가 **버전배지(aria-hidden)·빈상태 아이콘·날짜 캡션** 등 토큰 정의상 "비필수(non-essential)만" 명문화된 용도. 본문 텍스트엔 미사용. AA 위반 아님.
- `accent-700`(#047857)을 흰배경·녹색칩 모두에서 ✓ 표식·완료 배지에 사용 — 모두 4.5 이상.

BLOCKER: 0

## 4. 토큰 존재성 — PASS

`tailwind.config.js`에서 사용 클래스 전수 확인:

- `text-up-caption` / `text-up-sub` ← `up.caption #8E929B` (L61), `up.sub #565D6A` (L60) ✔
- `bg-up-sunken` ← `up.sunken #F2F5FA` (L57) ✔
- `border-up-hair` ← `up.hair #E1E4EA` (L62) ✔
- `accent-brand`(accent 유틸) ← `brand.DEFAULT #3182F6` (L18) ✔
- `bg-accent-bg` / `text-accent-700` ← `accent.bg #E6F8F1` (L32), `accent.700 #047857` (L34) ✔
- `bg-warning/10` / `border-warning/30` / `text-warning` ← `warning #F59E0B` (L70, hex라 알파모디파이어 정상) ✔
- `bg-danger/10` / `border-danger/30` / `text-danger` ← `danger #F04452` (L71) ✔
- `text-ink-900/700/500` ← ink 스케일 (L38·40·42) ✔

`#B45309`는 토큰이 아닌 arbitrary hex(`text-[#B45309]`)지만 Tailwind가 정상 생성 — 빌드 통과로 확인. 미정의 클래스 0.

BLOCKER: 0

## 5. 일관성 (off-팔레트 잔존) — PASS

변경 8개 핵심 파일 재스캔:
- `(text|bg|border|accent|ring|placeholder|shadow|from|to|via)-(slate|gray|emerald|amber|indigo|purple|violet)-[N]` → **0건**
- `-blue-N` / `accent-blue` / `placeholder-gray` → **0건**
- 잔존 1건 `App.tsx:85` `border-[#3182F6]`(로딩 스피너)는 이번 사이클 변경 아님 + 브랜드색 arbitrary value라 정상 렌더. 비차단.

데드코드(ProfileSection/RetirementWidget/ServiceCards/MyRewardsTab)는 사용처 0이므로 스코프 제외 인정.

## 6. 회귀 (className 병합 오류) — PASS, 경미 코스메틱 1건

- 중복 토큰·오타 없음. checkbox/배지/박스 className 모두 정상 병합.
- **경미(비차단)**: `Onboarding.tsx:373` 제출 버튼 `bg-brand ... hover:bg-brand` — hover가 동일색이라 호버 시 시각 변화 없음(원래 `hover:bg-blue-600`이 brand로 치환되며 base와 동일해짐). AA·기능 영향 없음. 향후 `hover:bg-brand-strong` 권장하나 이번 PASS 차단 사유 아님.

---

## BLOCKER 목록

- 없음 (0건)

## 권고(비차단)

1. `Onboarding.tsx:373` 제출버튼 `hover:bg-brand` → `hover:bg-brand-strong`(#1B64DA)로 교체 시 호버 피드백 복원.
2. `App.tsx:85` 스피너 `#3182F6` → 차기 정리 시 `border-brand` 토큰화 권장.

최종: PASS
