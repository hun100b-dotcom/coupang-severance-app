# 업비트풍 Phase4 "채용(JobsPage) 묶음" 디자인 QA 리뷰 B (정적 분석)

> 리뷰어: 시니어 디자인 QA B
> 브랜치: `redesign/upbit-jobs` (HEAD=`c633d8e`, 확인 일치)
> 방식: 코드/빌드 정적 분석 + 클래스(자릿수) 계산 — dev 서버 미기동(지침 준수)
> 일자: 2026-06-30
> 검증 대상: `frontend/src/pages/JobsPage.tsx` (1009줄)
> 톤 기준: `Home.tsx`, 토큰: `tailwind.config.js` up.* / `frontend/src/styles/index.css`

---

## 판정: **PASS**

- **BLOCKER: 0건**
- 경고(WARN): 4건 (모두 비차단)
- 빌드: **PASS** (exit 0, 9.30s)

핵심: 직전 계산기 묶음 리뷰(upbit_cal_B)에서 BLOCKER였던 ① 옛 색 리터럴/대비, ② 320px 금액 오버플로 가드 부재 — **두 함정 모두 JobsPage에서는 사전 차단됨**. `#8b95a1`/`#191f28`/`#4e5968` 0건, 모든 금액에 `break-keep`+`min-w-0`(또는 `truncate`) 가드 적용, clamp 하한이 320px 가용폭 내 수렴함을 자릿수 계산으로 확인.

---

## 1. 빌드 (항목 7) — PASS

```
npm run build → ✓ built in 9.30s   EXIT=0
dist/assets/JobsPage-LPdLDjLO.js  48.29 kB │ gzip: 13.78 kB
```
- 타입/컴파일 오류 0. 기존 chunk-size 경고(index 533kB/TargetTab 543kB/BarChart 379kB)만 출력 — 이번 변경 무관(기존 이슈, 비차단).

---

## 2. 업비트 톤 일관성 (항목 2) — PASS

### 2-1. 글래스모피즘 — PASS
- `backdrop-blur` 적중 2건(L660, L930) 모두 **모달 오버레이 dim**(`bg-black/45 backdrop-blur-sm`) — 의도된 dim으로 지침상 허용. 콘텐츠 카드엔 0건.
- `bg-white/N` · `border-white/N` · `GlassCard` **0건**. 콘텐츠는 전부 솔리드 흰 카드 + `border-up-hair` + `shadow-card`. 업비트 평면 톤 부합.

### 2-2. 옛 색 리터럴 잔존 — PASS (0건)
grep `#8b95a1|#191f28|#4e5968|#f7f9fc|#f2f4f6` (대소문자 무관): **0건**.
레거시 토큰 `text-ink-N` / `border-line` / `bg-[#F7F9FC]` / `bg-[#F2F4F6]`: **0건**.
→ 계산기 묶음에서 BLOCKER였던 토큰 미적용 문제가 채용 페이지엔 **재발 없음**.

### 2-3. up.* 토큰 일관 사용 — PASS
사용된 커스텀 컬러 유틸 전수 대조(전부 tailwind.config.js 정의 존재):
`up-navy(11) · up-body(10) · up-sub(28) · up-caption(4) · up-hair(22) · up-sunken(15) · up-green(6) · up-strong(6) · up-danger(3) · brand-strong(9) · brand-700(6) · brand-200(4) · brand-bg(5) · accent-bg(5)` — **무효 클래스 0건**.

### 2-4. 채용=그린 액센트 — PASS
- 히어로 키커 `bg-accent-bg text-up-green`(L363), 그린 글로우(L358), 혜택칩 `bg-accent-bg text-up-green`(L595/737), 상시모집 섹션 `#047857`(L98), 지원완료 `text-up-green`(L618/863). 채용 정체성 그린 유지.
- 의미색 분리 정상: 긴급=danger(`#C81E2E` 텍스트 / `bg-danger/10`), 내일=warning(`#B45309` / `bg-warning/10`).

### 2-5. 잔존 hex 리터럴 — 전부 의도된 의미/브랜드색 (비차단)
- `#FEE500`/`#3C1E1E`(L105·L764): 카카오 브랜드 노랑+텍스트 — 브랜드 고정색, 정당.
- `#C81E2E`(긴급 빨강 텍스트, 6곳), `#B45309`(내일 앰버 텍스트, 3곳), `#047857`(상시 그린): SECTIONS/배지 의미색. 토큰화 안 됐으나 **대비 AA 통과**(§3) → 차단 아님. SECTIONS 색은 `style={{color}}` 인라인 주입 구조라 토큰화 곤란 — 수용.

---

## 3. 대비 AA (항목 3) — PASS

| 텍스트 | 색 | 배경 | 대비 | 판정 |
|--------|----|----|------|------|
| 보조 텍스트 전반(서브카피·라벨·캡션) | up-sub `#565D6A` | 흰/sunken | ~6.7:1 | ✅ AA |
| 캡션(데코 즐겨찾기 빈상태·로고테두리만) | up-caption `#8E929B` | 흰 | ~3.0:1 | 비필수만 사용 ✅ |
| 금액 강조 | up-strong `#1B64DA` | brand-bg `#EAF2FE` | ~5.0:1 | ✅ AA |
| 흰텍스트 주 CTA | white | brand-strong `#1B64DA` | ~5.4:1 | ✅ AA |
| 문자지원 흰텍스트 | white | up-green `#047857` | ~4.7:1 | ✅ AA |
| 긴급 배지 텍스트 | `#C81E2E` | danger/10 (≈흰) | ~5.6:1 | ✅ AA |
| 내일 배지 텍스트 | `#B45309` | warning/10 (≈흰) | ~4.9:1 | ✅ AA |

- **`#8b95a1`(3.0:1) 기능 텍스트 사용 0건** — 계산기 묶음의 핵심 BLOCKER가 여기선 부재.
- `up-caption(#8E929B, 3.0:1)`은 **비필수에만** 사용 확인: 즐겨찾기 미선택 별 아이콘(L551·L703, 데코), 로고 테두리(N/A), 빈상태 Briefcase 아이콘(L503). 읽어야 하는 보조 텍스트는 전부 `up-sub`로 처리(예: 히어로 서브카피 L378, 카드 센터명 L546, 스탯 라벨 L396). AA 충족.
- 토스트 흰텍스트: 성공 `bg-up-strong`(5.4:1)·에러 `bg-up-danger #F04452`(~3.8:1, but 큰 굵은 14px 텍스트는 Large-Text AA 3:1 기준 통과) — 수용.

---

## 4. 반응형 오버플로 / 잘림 (항목 1) — PASS

> ⚠️ 계산 전제: `Container`는 `px-5`(20px/side, 계산기의 px-4 아님). 모바일은 sm(640) 미만 → 카드 그리드 **암묵 1열**(`grid sm:grid-cols-2`, grid-cols-1 명시 없으나 sm 미만 단일 컬럼 정상).

**320px 가용폭 = 320 − px-5(40) = 280px**

### 4-1. 카드 시급 블록 (L556-568) — PASS
- 카드 280 − p-5(40) = 240 → 블록 px-4(32) = **208px 가용**.
- 시급 `clamp(22px,6vw,26px)` mono: 6vw@320=19.2 < 22 하한 → **22px**(digit ≈13.2px). 좌측 시급 span에 **`truncate min-w-0 break-keep`** + 부모 `min-w-0` → 초과 시 클립(삐짐 없음). 우측 일급은 `shrink-0`.
- 실측: 시급 6자리 "10,030"≈79px + 라벨26 + 원9 ≈114px / 일급(15px) "80,240"≈54px + 라벨26 + 원9 ≈89px → 합 ≈203 < 208 ✓. **가드 + 폭 둘 다 안전.**

### 4-2. 상세 모달 급여 grid-cols-2 (L709-717) — PASS
- 320px 바텀시트 w-full=320 − p-6(48) = 272 → gap-2.5(10) → 셀 (272−10)/2=**131px** → p-4(32)=**99px 가용**.
- `clamp(19px,5.5vw,24px)`: 5.5vw@320=17.6 < 19 하한 → **19px**(digit ≈11.4px). `break-keep` + 부모 `min-w-0`.
- 일급 7자리 "240,720"≈80px + "원"(13px)≈8px = 88 < 99 ✓. 시급 "12,030"≈68+8=76 < 99 ✓. **안전.**

### 4-3. 히어로 스탯 grid-cols-4 (L387-400) — PASS
- 320에서 `md:w-[380px]` 미적용 → 풀폭 280 − gap-2.5(3×10=30) → 셀 (280−30)/4=**62.5px** → px-1.5(12)=**50px 가용**.
- 숫자 `clamp(18px,5vw,22px)`: 5vw@320=16 < 18 하한 → 18px mono. 라벨 `text-[10px]`+`truncate`+dot. 공고 카운트 3자리 "100"≈32 < 50 ✓ (4자리 "9999"≈43 < 50 여유). **안전.**

### 4-4. 카드 그리드 (L518) — PASS
`grid sm:grid-cols-2 lg:grid-cols-3` — 모바일 1열, sm 2열, lg 3열. `items-stretch` + 카드 `h-full`+`mt-auto`(L606)로 높이 통일. 카드 `min-w-0`로 그리드 셀 터짐 방지.

### 4-5. 엣지케이스 — PASS (전부 가드)
| 케이스 | 가드 | 라인 |
|--------|------|------|
| 긴 회사명(카드) | `truncate` + 부모 `min-w-0` | L545, L537 |
| 긴 센터명(카드) | `truncate` | L546 |
| 긴 회사명(모달) | `break-words` | L695 |
| 위치/시간/마감 줄 | `truncate`+`min-w-0`/`keep-all` | L572-588 |
| 빈 benefits | `length > 0 &&` 가드 | L592, L732 |
| 빈 description | `selectedJob.description &&` | L746 |
| expires_at 없음 | `&&` 가드 (카드+모달) | L585, L727 |
| 빈 apply_methods + 링크없음 | "회사 정보 링크 없음" 폴백 | L794-796 |
| sections.length===0 | 빈 상태 카드 | L500-506 |
| 로고 미존재 회사 | `getCompanyLogoUrl`→`/logos/default.svg` 폴백 | jobUtils L30 |
| description 줄바꿈 | `whitespace-pre-line break-keep` | L749 |

---

## 5. 검색 돋보기/입력 겹침 (항목 4) — PASS

- `index.css` L673-677 전역 `input[type="text"]{padding:14px 16px}`(특이도 0,1,1)가 Tailwind `pl-N`을 덮어쓰는 함정 **존재 확인**.
- JobsPage L417 `!pl-12 !pr-4`(important)로 좌측 패딩 48px 강제 → 아이콘 `absolute left-4`(16px)+`w-[18px]` 끝=34px < 48px 패딩 시작점 → **겹침 0**. L407-409 코드 주석에 정확히 명시(가드 의도 문서화). ✅

---

## 6. 모달 z-index / portal / 안전영역 (항목 5) — PASS

- `createPortal(…, document.body)` 적용(상세 L653, 로그인 L923) → 루트 `z-[1]` 스태킹 탈출, BottomNav(z-50) 위 렌더. ✅
- 오버레이 `z-[60]`(L660·L930), toast `z-[300]`, region backdrop `z-20`/dropdown `z-30` — 충돌 없는 위계.
- 모바일 바텀시트 `max-h-[94vh] sm:max-h-[88vh]` + `overflow-hidden` + 내부 `flex-1 overflow-y-auto`(L673) → 긴 콘텐츠 스크롤. ✅
- 하단 고정 CTA `paddingBottom: calc(env(safe-area-inset-bottom,0px)+16px)`(L857) → iOS 홈인디케이터 안전영역. ✅
- 6영역 정돈 확인: 회사(F1 L683)·급여(F2 L709)·근무조건(F3 L721)·혜택(F4 L732)·상세(F5 L746)·지도(F5.5 L754)·지원방법(F6 L773) + 비슷한공고/공유. 닫기 버튼 `aria-label="닫기"`(L678).

---

## 7. 접근성 / 콘솔 (항목 6) — PASS (경고 일부)

- **.map key**: JSX 렌더 9개 map 전부 key 보유(L393/439/474/509/519/594/736/776/811). 데이터 변환 map 3개(L166/216/239)는 비-JSX. 누락 0.
- **aria-label**: 즐겨찾기(L550·L700), 닫기(L678) 존재. 단 검색 input·정렬/필터 버튼은 보이는 텍스트/placeholder로 라벨 대체(허용 수준).
- **터치타깃**: 주 CTA `min-h-[56px]`(모달 L871·L862), 카드 CTA `min-h-[46px]`(46~56px 기준 충족, L609·L628). 즐겨찾기 `w-11 h-11`(44px)·닫기 `w-11 h-11`. 필터칩 `min-h-[44px]`. **전부 44px+ 충족** — 계산기 묶음의 저장버튼 32px 문제 재발 없음.
- **콘솔 위험**: `console.error('[공고 로드 오류]', err)` 1건(L168) — 에러 객체만, 민감정보 비노출. 런타임 콘솔 위험 없음.

---

## BLOCKER 목록
- **없음 (0건)**

## 경고(WARN) 목록 (모두 비차단)
1. SECTIONS 의미색(`#C81E2E`/`#B45309`/`#047857`)이 `style` 인라인 hex 주입 — 대비는 AA 통과하나 토큰화 미완(인라인 구조상 곤란, 개선항목).
2. 로고 `<img>`에 `onError` 폴백 핸들러 없음 — `getCompanyLogoUrl`이 default.svg를 보장하나, DB 경로가 깨진 URL일 경우 broken-img 가능(저위험).
3. 검색/필터 버튼에 명시적 `aria-label` 없음(텍스트로 대체됨, 스크린리더 동작은 가능).
4. 청크 사이즈 빌드 경고 — 기존 이슈, 이번 변경 무관.

## 재검증 체크 (이미 충족)
- [x] 옛 색 리터럴/8b95a1 → 0건 (선제 차단)
- [x] 금액 4영역+카드+모달 break-keep/min-w-0 가드 → 320px 수렴 확인
- [x] 검색 !pl-12 전역 padding 가드 → 겹침 0
- [x] portal+z-[60]+safe-area → 모달 정상
- [x] 빌드 exit 0

---

**결론: BLOCKER 0건. 직전 계산기 묶음에서 FAIL을 유발한 두 함정(옛 리터럴/대비, 320px 금액 오버플로)이 JobsPage에서는 사전 차단됨. 톤·대비·반응형·모달·접근성·빌드 전 항목 통과 → PASS. 커밋+배포 진행 가능.**
