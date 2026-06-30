# 적대적 리뷰어 B — 새 홈 시안 v2 (Home.tsx)

- 대상: `frontend/src/pages/Home.tsx` (v2, 763줄)
- 비교: `git show HEAD:frontend/src/pages/Home.tsx` (v1, 659줄)
- 방향: `docs/design/upbit_home_analysis.md` §8
- 검토일: 2026-06-30
- 사전 검증 인정: tsc 0 / 320·375·1280 오버플로 0 / 콘솔 0 / 카운트업 0은 hidden탭 rAF 아티팩트 → 이걸로 FAIL 안 함

---

## 판정: **PASS** (수정 권고 동반)

BLOCKER·HIGH 없음. 기능 회귀 없음, 데드링크 없음, 죽은 코드 없음.
다만 **접근성(대비·터치타깃·ARIA)** 에서 실제 결함 3건 확인 → 머지 차단은 아니나 후속 수정 권고.

---

## 1. 기능 회귀 — 없음 (PASS)

v1 대비 effect/handler/fetch/상태 전수 대조:

| 항목 | v1 | v2 | 판정 |
|------|----|----|------|
| 채용 fetch (`fetchRecentJobs`, status=active·expires 폴백·is_urgent 정렬·limit 4) | O | O (동일 쿼리) | 유지 |
| 카운트 폴백 (`/click-count` → supabase `click_counter` → 0) | O | O | 유지 |
| 카피 로테이션 (7초 interval) | O | O | 유지 |
| `registerClick` (trackAndNavigate) | O | O | 유지 |
| `autoSaved` (consumePendingSaveDone, 4초 배너) | O | O | 유지 |
| `useNotices` + 3건 슬라이스 | O | O | 유지 |
| SEO jsonLd FAQ 3문항 | O | O (텍스트 동일) | 유지 |
| 게스트 경로(noIndex, 비로그인 계산) | O | O | 유지 |

- 추가: `useReducedMotion`, `heroAmount`(고정 250 카운트업), 풋터 4단 컬럼. 제거된 핵심 로직 **없음**.
- v1의 `Sparkles`·`Container` import 제거 → v2에서 미사용이므로 정상 정리. (회귀 아님)

## 2. 데이터 폭발 — 없음 (PASS)

- `notices.created_at`: `new Date(n.created_at)` 후 `Number.isNaN(d.getTime())` 가드 있음 → 잘못된 날짜는 빈 문자열 처리. 안전.
- `job_postings` 필드: 타입(`types/supabase.ts` L93~117)상 `daily_wage`/`hourly_wage`=`number`(non-null), `benefits`=`string[]`, `region`/`work_hours`/`center_name`/`company_name`=`string`. 코드의 `Array.isArray(job.benefits)`·`job.center_name &&`·`job.region &&` 가드 적절.
- `wage.toLocaleString()` 경로: 만약 DB가 두 임금 모두 null을 반환하면 `null.toLocaleString()` 런타임 가능. **단** 기존 `JobsPage.tsx` L317 `fmtWage = (w: number) => w.toLocaleString()` 도 동일 무가드 → v2 고유 회귀가 아니라 **기존 코드와 동급**. 차단 사유 아님(LOW, §아래 메모).
- 빈배열/null 경로: `recentJobs.length === 0` 빈 상태, `jobsError` 에러 상태, `notices.length === 0` 빈 상태 모두 처리됨.

## 3. 레이아웃 — 없음 (PASS)

- 회사명·지역·공고제목·공지제목 모두 `truncate` + `min-w-0` 적용 확인 (L600·609·611·612·665). 줄터짐 없음.
- 풋터 4단 컬럼 `grid-cols-2 sm:grid-cols-4`, 각 컬럼 `min-w-0`. 고객센터 `lg:grid-cols-[1.2fr_2fr]` 정상.
- 히어로 카운트업 0 고착: hidden탭 rAF 아티팩트 → 사전합의대로 FAIL 안 함. (다만 §4 reduced-motion 미반영은 별건)

## 4. 접근성/대비 — 결함 3건 (수정 권고)

### [MEDIUM] 공지 날짜 텍스트 대비 미달
- 위치: L649 공지 패널 `background: UP.page`(#EEF1F5) + L666 날짜 `color: UP.caption`(#8E929B).
- 근거: #8E929B on #EEF1F5 ≈ **2.6:1** → 본문/대형 텍스트 AA(3:1·4.5:1) 모두 미달. 주석은 "흰 위 3.0:1"을 전제했으나 실제 배경이 흰색이 아닌 #EEF1F5라 더 낮음.
- 재현: 홈 → 공지 패널 날짜 칼럼. 저시력 사용자 가독 저하.
- 권고: 날짜를 `UP.sub`(#565D6A)로 올리거나 패널 배경을 `UP.surface`로.

### [MEDIUM] 캐러셀 점 터치타깃 44px 미달
- 위치: L376~388 헤드라인 인디케이터 점. `h-2`(8px) × width 8~28px.
- 근거: WCAG 2.5.5 Target Size 44×44px 미달. 모바일에서 정확 탭 곤란.
- 권고: 시각 점은 유지하되 버튼 히트영역을 `before:`/패딩으로 44px 확보.

### [LOW] 캐러셀 ARIA 의미 오류
- 위치: L374 `role="tablist"` + L379 `role="tab"` + `aria-selected`.
- 근거: 대응하는 `role="tabpanel"`·`aria-controls`가 없음. 헤드라인 `<h1>`은 패널이 아님 → 스크린리더에 "탭" 으로 잘못 노출. 패널 없는 tablist는 부적절 패턴.
- 권고: `role` 제거하고 `aria-label`만 둔 버튼 그룹으로, 또는 `aria-controls`로 헤드라인 영역 연결.

### [LOW] reduced-motion 미반영(히어로 카운트업)
- 위치: L44~60 `useCountUp` 는 `reduceMotion`을 보지 않고 항상 rAF 애니메이션. 헤드라인(L329)·타일(L429)은 `reduceMotion` 분기하면서 금액 카운트업만 누락 → 일관성 결여. prefers-reduced-motion 사용자에게도 숫자가 굴러감.
- 권고: `useCountUp(target, duration, reduceMotion)` 로 즉시 표시 분기.

## 5. 죽은 코드 — 없음 (PASS)

- 아이콘 20개 전수 사용 확인(ChevronRight·ArrowRight·MapPin·Clock·Briefcase·BookOpen·Building2·CalendarDays·Gift·FileText·Banknote·Palmtree·Upload·Calculator·CheckCircle2·ShieldCheck·BadgeCheck·Headphones·Megaphone 모두 ≥1회).
- UP 토큰 미사용 키 없음(green/bgGreen/sunken/surface/body/caption 등 전부 참조).
- 없는 Tailwind 클래스 미발견(색은 인라인 style, hover만 임의값 `hover:bg-[#F2F5FA]`·`hover:bg-white`·`hover:-translate-y-0.5` — 정상 JIT).

## 6. 풋터 데드링크 — 없음 (PASS)

App.tsx 라우트 대조 (L156~241):

| 풋터 경로 | App.tsx 존재 | 비고 |
|-----------|-------------|------|
| /severance /unemployment /weekly-allowance /annual-leave | O | Layout 내 |
| /guide /guide/severance /guide/unemployment | O | |
| /inquiry /notices /my-benefits | O | |
| /terms-of-service /privacy-policy | O | MySettingsTab 경로 재사용 |
| /landing | O → `/`(LandingV1) redirect | 의도된 리다이렉트, 데드 아님 |
| /jobs (CTA·전체보기) | O | |

데드링크 0건.

---

## 가장 치명적 1건

**[MEDIUM] 공지 날짜 대비 2.6:1 (L649 #EEF1F5 배경 위 L666 #8E929B 텍스트)** — 디자인 주석이 전제한 "흰 배경 3.0:1"과 실제 배경(#EEF1F5)이 달라, 명시 목표였던 AA를 스스로 깬 유일한 실측 대비 미달. 차단급은 아니나 v2가 내세운 "더블리뷰 교훈 반영 대비 준수"라는 자기 주장과 정면 충돌하는 지점.

## 메모 (FAIL 사유 아님)

- wage null 무가드는 v2 신규 결함이 아니라 기존 JobsPage와 동일 수준. 별도 티켓으로 `fmtWage` 공통화 + null 폴백 권장.
