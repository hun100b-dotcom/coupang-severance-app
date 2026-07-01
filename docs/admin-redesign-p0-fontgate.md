# P0 — 폰트 override 관문 (회귀 측정 증거) · 2026-07-02

> **규칙3 관문**: 전역 폰트 영향 변경은 baseline↔after `computed font-size(px)` 측정 → **1px이라도 다르면 자동 FAIL·롤백**.
> **변경 내용**: `tailwind.config.js`에 어드민 전용 폰트 유틸(`text-a10`~`text-a30`) 신설. index.css의 `.text-[Npx]`/`.text-xs`/`.text-sm` `!important` override(+1.5px)를 **회피**(리터럴 셀렉터 불일치).
> **측정 방법(규칙1 순서)**: (a) 헤드리스 Playwright `getComputedStyle` **성공** → 이 방법 사용. (b)크롬DOM (c)CSS정적파싱은 보조 증거로 병행.

---

## 1. 결정적 증거 3종

### 증거① 빌드 CSS 바이트 동일 (정적 파싱)
| | md5 |
|---|---|
| before(유틸 추가 전) | `dd73b57221eda163ec230cb18f1379b5` |
| after(유틸 추가 후) | `dd73b57221eda163ec230cb18f1379b5` |
| restore(임시검증 후 원복) | `dd73b57221eda163ec230cb18f1379b5` |
→ **완전 동일.** 유틸은 미사용이라 Tailwind JIT가 아무것도 생성하지 않음 → 사용자앱 CSS 무변화. override 규칙(`13.5px!important` 등) 그대로 존재.

### 증거② 런타임 computed font-size — 선택자별 26/26 동일 (Playwright headless, 1280px)
| page | body | h1 | h2 | h3 | p | button | .text-sm | .text-xs |
|------|------|----|----|----|---|--------|----------|----------|
| `/` | 16 / 16 | 16 / 16 | 44 / 44 | 16.5 / 16.5 | 15.5 / 15.5 | 15.5 / 15.5 | 15.5 / 15.5 | — |
| `/login` | 16 / 16 | 20 / 20 | — | — | 15.5 / 15.5 | 13.5 / 13.5 | 15.5 / 15.5 | 13.5 / 13.5 |
| `/home` | 16 / 16 | 52 / 52 | 30 / 30 | 19 / 19 | 17.5 / 17.5 | 16 / 16 | 15.5 / 15.5 | — |
(형식 = before / after, 단위 px) → **모든 선택자 값 일치. 불일치 0.**

### 증거③ 새 폰트크기 미발생 + 유틸 정상 생성
- before→after 폰트크기 **분포에 새 px값 0개**(신규 크기 미발생).
- 임시 컴포넌트로 유틸 사용 시 생성 확인: `.text-a12{font-size:12px;line-height:1.5}` … **정확히 px, `!important` 없음, override 미적용**(text-a12는 override 셀렉터 목록에 없음). 검증 후 원복(md5 동일).

---

## 2. `__dist`(전체요소 분포) 차이 = 동적콘텐츠 노이즈 (오판 방지)
- before/after의 top-20 분포에서 16px·56px가 순위 밖으로 밀린 개수 변동 관측 → **동일 빌드 2회 측정으로 노이즈 검증**: 같은 빌드 back-to-back은 분포 완전 안정. before/after 분포차는 Supabase 채용/공지 async 로드 + 히어로 카운트업 요소 개수 변동 탓(새 폰트크기 아님, CSS 동일이라 폰트 변화 불가능).
- 즉 최초 스크립트의 "mismatch 2"는 **분포 개수 churn**이며 **폰트 크기 회귀 아님**.

---

## 3. 판정

| 항목 | 결과 |
|------|------|
| 빌드 CSS 바이트 | ✅ 동일(md5) |
| 선택자별 computed px | ✅ 26/26 동일 |
| 새 폰트크기 발생 | ✅ 0개 |
| 유틸 생성·비override | ✅ 확인 |
| 사용자앱 0px 영향 | ✅ **증명** |

### [P0 판정] **PASS** — 사용자앱 폰트 0px 영향. 롤백 불필요. 유틸 도입 안전 확정.
- 후속(P1~P3): 어드민 인라인 fontSize를 `text-a*`로 치환 시, **어드민 요소는 별도 baseline**을 잡아 의도된 크기로만 이동(사용자앱은 계속 0px — 어드민 전용 클래스라 원천 무영향).

_측정 산출물: `scratchpad/p0/`(measure_before/after.json, css md5, 빌드로그). 방법: Playwright headless getComputedStyle._
