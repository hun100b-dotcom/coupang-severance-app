# 업비트풍 리디자인 Phase 3 — 전역 토큰 적용 / 더블리뷰 B

- 리뷰어: **B (접근성 AA 대비 · 반응형/오버플로 · 홈 v2 스케일 일치)**
- 브랜치: `redesign/upbit-home`
- TIER: **TIER 2** (변경 파일 6개 — `src/components/` 다수 + 전역 토큰)
- 검증일: 2026-06-30
- 변경 파일: `tailwind.config.js`, `src/styles/index.css`, `Container.tsx`, `TopNav.tsx`, `Button.tsx`, `SectionHeader.tsx`

## 최종 판정: ✅ PASS (BLOCKER 0 · 경미 2)

---

## 1. AA 대비 검증 (WCAG 2.x 상대휘도 공식, 실측 계산)

### 흰 배경(#FFFFFF) 위 텍스트 색

| 토큰 | HEX | 대비비 | 본문(4.5:1) | 대형/굵게(3:1) | 판정 |
|------|-----|--------|-------------|----------------|------|
| up.navy | #1A2434 | **15.60:1** | ✅ | ✅ | 헤딩 OK |
| up.body | #333D4B | **11.00:1** | ✅ | ✅ | 본문 OK |
| up.sub | #565D6A | **6.63:1** | ✅ | ✅ | 보조 본문 AA 통과 (주석 "6.7:1"은 반올림 표기, 실측 6.63) |
| up.caption | #8E929B | **3.12:1** | ❌ | ✅ | **비필수 캡션 전용이면 OK** (본문 사용 금지) |
| up.brand | #3182F6 | **3.71:1** | ❌ | ✅ | 텍스트로 본문 사용 시 미달 → 큰 글씨/굵게/아이콘만 |
| up.strong | #1B64DA | **5.41:1** | ✅ | ✅ | 금액·CTA 텍스트 AA 통과 (주석 "5.4:1" 정확) |
| up.green | #047857 | **5.48:1** | ✅ | ✅ | 채용 텍스트 AA 통과 |
| up.danger | #F04452 | **3.71:1** | ❌ | ✅ | 긴급 라벨(작은 본문) 텍스트 사용 시 주의 |

### 흰 텍스트(#FFFFFF)를 컬러 배경 위에 (버튼/뱃지 면)

| 배경 토큰 | HEX | 대비비 | 흰 텍스트 본문 AA | 판정 |
|-----------|-----|--------|-------------------|------|
| up.strong bg | #1B64DA | **5.41:1** | ✅ | 주 CTA 버튼 OK |
| up.green bg | #047857 | **5.48:1** | ✅ | 채용 CTA/뱃지 OK |
| up.brand bg | #3182F6 | **3.71:1** | ⚠️ 대형만 | 큰 버튼 라벨(16px+)이면 OK, 작은 캡션 흰글씨 주의 |
| up.danger bg | #F04452 | **3.71:1** | ⚠️ 대형만 | 긴급 뱃지 흰글씨 — 작은 글씨면 경계선 |

**결론**: 토큰 위계가 의도대로 설계됨. navy/body/sub/strong/green은 본문 AA 통과. caption(#8E929B 3.12:1)·brand·danger는 본문 대비 미달이나 주석에 "비필수/강조/긴급 전용"으로 용도 제한이 명시되어 있어 토큰 정의 자체는 적절. 단, **실제 사용처에서 caption/danger/brand를 일반 본문 텍스트에 쓰면 AA 위반**이 되므로 후속 적용 단계(컴포넌트별 클래스 적용)에서 재검증 필요 → 경미 이슈 #2.

---

## 2. 반응형 / 오버플로 분석

대상 클래스: `w-full max-w-content mx-auto px-5 md:px-8` (Container wide), TopNav 동일 패턴.

- **모바일(375/320px) 가로 오버플로**: 없음.
  - `w-full` = 부모(뷰포트) 100% 폭이 기본. `max-w-content(1280px)`는 *상한값*일 뿐이며 뷰포트가 1280보다 작은 모바일에서는 캡이 발동하지 않음. 따라서 1080→1280 상향은 **데스크톱에서만** 콘텐츠가 더 넓어지고 모바일 레이아웃엔 영향 없음.
  - `box-sizing: border-box`(index.css 전역)가 적용되어 px-5(20px) 좌우 패딩이 폭 안쪽으로 계산됨 → 패딩이 폭을 넘기지 않음.
- **px-4(16px) → px-5(20px) 상향 방향성**: 좌우 패딩 증가 = 가용 콘텐츠 폭 *축소* 방향. 오버플로를 유발하는 방향이 아님(오히려 여백 증가). 320px 초소형에서도 콘텐츠 가용폭 320-40=280px 확보로 정상.
- **Button lg(56px/17px)**: `min-h`/`text-size`만 변경, width 미관여 → 가로 오버플로 무관. 터치 타겟 56px ≥ 44px 접근성 최소 충족.
- **SectionHeader 타이틀 `md:text-[20px]`**: 모바일 17px 유지(보수적), `truncate`(text-overflow ellipsis) 유지로 긴 제목도 줄넘침 없음.

**결론**: 반응형/오버플로 안전. ✅

---

## 3. 홈 v2 스케일 일치 (전역화 정합성)

### 색 토큰 대조 — Home.tsx 로컬 `UP` 객체 vs tailwind `up.*`

| 키 | Home UP | tailwind up.* | 일치 |
|----|---------|---------------|------|
| page | #EEF1F5 | #EEF1F5 | ✅ |
| surface | #FFFFFF | #FFFFFF | ✅ |
| sunken | #F2F5FA | #F2F5FA | ✅ |
| navy | #1A2434 | #1A2434 | ✅ |
| body | #333D4B | #333D4B | ✅ |
| sub | #565D6A | #565D6A | ✅ |
| caption | #8E929B | #8E929B | ✅ |
| hair | #E1E4EA | #E1E4EA | ✅ |
| brand | #3182F6 | #3182F6 | ✅ |
| strong | #1B64DA | #1B64DA | ✅ |
| green | #047857 | #047857 | ✅ |
| danger | #F04452 | #F04452 | ✅ |

**핵심 12키 전부 정확 일치.** Home 로컬엔 `bgBrand(#EAF2FE)`, `bgGreen(#E6F8F1)` 배경변형 2키가 추가로 있으나 전역 up.*엔 미승격 → 경미 이슈 #1.

### 컨테이너 폭 스케일 대조

| 컴포넌트 | 클래스 | 데스크톱 폭 | 패딩 |
|----------|--------|-------------|------|
| Home `Wrap` | `max-w-[1280px] px-5 md:px-8` | 1280px | 20/32px |
| Container(wide) | `max-w-content px-5 md:px-8` | **1280px** | 20/32px |
| TopNav | `max-w-content px-5 md:px-8` | 1280px | 20/32px |

`max-w-content` = tailwind.config `maxWidth.content: '1280px'` → Home의 하드코딩 `max-w-[1280px]`와 **동일 스케일**. 패딩(px-5 md:px-8)도 완전 일치. 전역화가 홈과 정확히 동일한 폭/여백 스케일을 재현함. ✅

### CSS 변수 ↔ tailwind 토큰 일치 (index.css :root --up-*)

`--up-page/surface/sunken/navy/body/sub/caption/hair/brand/strong` 값도 tailwind up.*와 동일 HEX. 단 index.css `:root`에는 **green/danger 변수가 누락**됨(tailwind엔 있음) → 경미 이슈 #1에 포함.

---

## 4. 빌드 / 핵심 로직 보호

- `npm run build`: **✓ built in 9.40s, 에러 0** (기존 chunk>500kB 경고는 사전 존재, 본 변경과 무관).
- 28일 역산 블록 / qualifying_days≥365 / 90일 세그먼트 로직: **변경 없음** (디자인 토큰·컴포넌트 스타일만 수정).
- 한국어 주석: 모든 변경 라인에 추가됨. console.log·하드코딩 시크릿: 없음. any 신규: 없음.

---

## 이슈 목록

### BLOCKER
- 없음.

### 경미 (후속 처리 권장 — 배포 차단 아님)
1. **토큰 미러링 불완전**: index.css `:root --up-*`에 `green`/`danger` 변수가 빠짐(tailwind엔 존재). 또한 Home 로컬의 `bgBrand`/`bgGreen` 배경 변형이 전역에 미승격. 인라인 style에서 green/danger 변수를 참조하면 깨질 수 있으니 `--up-green: #047857; --up-danger: #F04452;` 보강 권장.
2. **신규 up.* 토큰 실사용처 0건**: 본 단계는 "토큰 주입"만 수행, 컴포넌트에 `text-up-sub` 등 미적용 상태(grep 결과 0). caption/brand/danger를 본문 텍스트에 적용하는 후속 PR에서 AA 미달(3.1~3.7:1) 오용 여부 반드시 재검증 필요.
3. **주석 표기 정밀도(미세)**: 주석의 "sub 6.7:1"은 실측 6.63:1의 반올림. AA 통과엔 영향 없음. 표기 정정은 선택.

---

## 최종 결론

PASS
