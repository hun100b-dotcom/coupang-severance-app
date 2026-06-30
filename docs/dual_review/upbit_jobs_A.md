# 더블리뷰 A — 업비트풍 Phase4 "채용(JobsPage) 묶음" 정적 검증

- **리뷰어**: 시니어 QA 리뷰어 A
- **검증 방식**: 정적 분석 (dev 서버 기동 없음, 빌드 검증만)
- **브랜치**: `redesign/upbit-jobs` (HEAD=c633d8e) ↔ 기준 `main` (5911e2d)
- **검증 초점**: 계산/데이터 로직 회귀 0 + 빌드/타입 안정성
- **검증일**: 2026-06-30

---

## 🟢 최종 판정: **PASS**

BLOCKER 0건. 로직 회귀 0건. 빌드 exit 0 / tsc 에러 0 / 무효 Tailwind 클래스 0건.

---

## 1. 변경 범위 — 단일 파일 (UI only)

```
git diff main...redesign/upbit-jobs --name-only
→ frontend/src/pages/JobsPage.tsx   (단일 파일, 백엔드/기타 0건)

--stat: 1 file changed, 154 insertions(+), 149 deletions(-)
```

- 백엔드(Python)·다른 프론트 파일·tailwind.config·DB 마이그레이션 변경 **0건** ✅
- 단일 파일 검증 대상 일치 ✅

---

## 2. 로직 보존 검증 (변경 라인 자동 스캔)

변경된 `+/-` 라인에서 로직 패턴을 grep으로 스캔한 결과, **로직 코드 라인 변경 0건**. 매칭된 2줄은 모두 `className` 문자열(분기 결과 색상)만 변경됐고, 상태 **읽기(read) 자체는 동일**.

| 영역 | 검사 패턴 | 변경 라인 | 판정 |
|---|---|---|---|
| 채용 fetch | `fetchJobs` / `.from('job_postings')` / `.select` / `.eq('status'` / `.or(` / `.order(` | 0 | ✅ 보존 |
| 즐겨찾기 | `listFavorites`/`addFavorite`/`removeFavorite`/`isFavorited`/`toggleFav` | 0 (호출부 className만) | ✅ 보존 |
| 지원 플로우 | `handleApply`/`applyToJob`/`getAppliedJobIds`/`checkConfirmedOnDate`/`handleApplyModalSubmit` | 0 (onClick 핸들러 동일) | ✅ 보존 |
| Realtime 구독 | `.channel('job_postings_realtime')`/`.subscribe`/`removeChannel` | 0 | ✅ 보존 |
| 필터/정렬 | `filtered` useMemo / `searchQuery`·`regionFilter`·`urgentOnly`·`sortKey` / `REGION_OPTIONS` | 0 (조건부 class 2줄 — 상태 read 불변) | ✅ 보존 |
| 변환 | `toCardData` / `apply_methods` / `map_query` | 0 (값 렌더링 동일) | ✅ 보존 |
| 상태 훅 | `useState`/`useEffect`/`useMemo` 선언 | 0 (import 라인·선언 모두 동일) | ✅ 보존 |

**조건부 class 매칭 2줄 (로직 아님 — 색 토큰 교체):**
```diff
- regionFilter === r ? 'bg-brand-bg text-brand font-bold' : 'text-ink-700 hover:bg-[#F2F4F6]'
+ regionFilter === r ? 'bg-brand-bg text-brand-strong font-bold' : 'text-up-body hover:bg-up-sunken'
- urgentOnly ? 'bg-danger text-white border-danger' : 'bg-white text-ink-700 border-line'
+ urgentOnly ? 'bg-up-danger text-white border-up-danger' : 'bg-white text-up-body border-up-hair hover:border-brand-200'
```
→ `regionFilter`/`urgentOnly` 상태 비교식·핸들러는 동일, 결과 className만 업비트 토큰으로 교체.

**유일한 비-className 변경 (UI 타이밍, 데이터 로직 아님):**
```diff
- transition={{ delay: i * 0.04, ... }}
+ transition={{ delay: Math.min(i * 0.04, 0.3), ... }}
```
→ Framer Motion 카드 등장 stagger 딜레이 상한(0.3s) 클램프. 렌더 순서·데이터·키(`key={job.id}`) 불변. 회귀 없음.

나머지 변경은 전부: 색 토큰(ink/line/brand → up-*), radius(rounded-md→lg, xl→2xl), 사이즈(min-h, px/py, text-[]), `font-mono`/`tabular-nums`/`break-keep` 부가, 주석, `<motion.div>`→`<motion.section>` 시맨틱 태그 교체.

---

## 3. 빌드 / 타입 안정성

| 항목 | 결과 |
|---|---|
| `npm run build` | ✅ **exit 0** — `✓ built in 9.36s` |
| `npx tsc --noEmit` | ✅ **exit 0** — 타입 에러 0 |
| 경고 | chunk-size > 500kB (index/TargetTab/BarChart) — **기존 경고, 본 변경과 무관** |
| JobsPage 번들 | `JobsPage-LPdLDjLO.js 48.29 kB (gzip 13.78 kB)` 정상 산출 |

---

## 4. 신규 Tailwind 클래스 대조 (tailwind.config.js)

JobsPage에서 사용된 모든 `up-*`/`brand-*`/`accent-*` 토큰을 추출해 config와 1:1 대조. **무효 클래스 0건.**

| 사용 토큰 | config 정의 위치 | 판정 |
|---|---|---|
| `up-navy/up-body/up-sub/up-caption/up-hair/up-sunken/up-strong/up-green/up-danger` | `colors.up.*` (L54–67) | ✅ |
| `brand-strong/brand-700/brand-bg/brand-200` | `colors.brand.{strong,700,bg,200}` (L17–27) | ✅ |
| `accent`(DEFAULT)/`accent-bg` | `colors.accent.{DEFAULT,bg}` (L29–35) | ✅ |
| `accent-strong` (CTA_MAP 정의에 존재, 현재 미사용 분기) | `colors.accent.strong` (L31) | ✅ |
| `font-mono` | `fontFamily.mono = JetBrains Mono` (L88) | ✅ |
| `tabular-nums` | Tailwind 빌트인 유틸 | ✅ |
| `rounded-pill/rounded-2xl/shadow-card/shadow-float` | `borderRadius`·`boxShadow` (L97–113) | ✅ |

> 빌드가 PostCSS/Tailwind JIT를 통과해 exit 0이므로, 미정의 토큰이 있었다면 클래스가 그냥 생략될 뿐 빌드는 통과한다는 한계는 있으나 — 위 수동 대조로 모든 사용 토큰이 정의됨을 직접 확인함.

---

## 5. BLOCKER / 경고

- **BLOCKER: 없음**
- **경고(비차단)**:
  1. (기존) Vite chunk-size > 500kB 경고 — 본 변경과 무관, 별도 코드스플릿 과제.
  2. 히어로 서브타이틀에 `truncate` 추가(L104) — 모바일에서 로테이션 문구가 길면 말줄임 처리될 수 있음. 의도된 잘림 보강이나, 카피 길이에 따라 시각적 잘림 발생 가능(기능 영향 없음, 디자인 확인 권장).

---

## 결론

본 변경은 명시된 대로 **JobsPage.tsx 단일 파일의 UI-only 리디자인**이며, 채용 fetch·즐겨찾기·지원 플로우·Realtime 구독·필터/정렬·데이터 변환·상태 훅 등 **데이터/계산 로직은 단 한 줄도 변경되지 않았다**. 빌드와 타입 검사 모두 통과, 신규 Tailwind 토큰은 전부 config에 정의됨. **PASS.**
