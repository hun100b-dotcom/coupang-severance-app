# 업비트풍 리디자인 Phase 5 — 마감 스윕 점검표

> 작성: 2026-06-30 · 브랜치 `redesign/upbit-phase5` (기준 main HEAD `c1dbd02`)
> 범위: 전 사용자 라우트 접근성(AA)·반응형·일관성·성능 전수 점검. 계산/OAuth/SEO/데이터 로직 불변(UI/접근성만).
> 방법: 라우트 클러스터별 감사 에이전트 3개 병렬 + 직접 검증(에이전트 보고는 오탐 다수라 전건 재확인) + tsc/build 게이트.

---

## 0. 작업 시작 시 — DesignSync 자동토큰화 흡수 판단

작업 시작 시 워크트리는 clean이었으나, 진행 중 백그라운드 **DesignSync 자동토큰화**가 21개 파일을 수정(445+/445−, 순수 1:1 치환).
diff 검수 결과 `gray-50→up-sunken`, `gray-100/200→up-hair`, `blue-50→brand-bg`, `blue-800→brand-strong`, `bg-[#047857]→bg-accent-700`(동일값) 등 **업비트 톤에 정확히 부합하는 토큰화**이며 시각 변화 0·회귀 없음. **빌드 통과 확인 후 흡수.**

---

## 1. 화면별 점검 결과 (OK / 수정)

| 클러스터 | 라우트 | 결과 | 비고 |
|---|---|---|---|
| 홈 | `/home` | ✅ OK | STEP 라벨 up-sub, 캐러셀 aria-label·점버튼 정상. caption은 날짜 등 비필수만 |
| 계산기 허브 | `/calculator` | ✅ OK | 동적 accent는 토큰 팔레트 내 |
| 퇴직금 | `/severance` | ✅ OK(흡수) | 라디오 border-slate→up-hair(DesignSync), FAQ gray→up(DesignSync) |
| 퇴직금 결과 | (SeveranceFlow 내 ResultSeverance) | 🔧 수정 | `#00a876` 그린 텍스트 AA미달(3.06:1) → `#047857`(4.7:1) + opacity 제거 |
| 실업급여 | `/unemployment` | ✅ OK(흡수) | 라디오 border-slate→up-hair(DesignSync) |
| 주휴수당 | `/weekly-allowance` | ✅ OK(흡수) | accent-700 토큰화(DesignSync). hover:#036848(그린 darken) 무해 |
| 연차수당 | `/annual-leave` | ✅ OK(흡수) | bg-gray-100→up-sunken, accent-700 토큰화(DesignSync) |
| 채용 + 모달 | `/jobs` | ✅ OK | 임금 블록 min-w-0+truncate+break-keep+shrink-0로 320px 보호. 마감 #C81E2E(5.5:1) 적절 |
| 마이 + 서브탭 | `/mypage` | 🔧 수정 | InquiryHistory·SupportSection·MyApplicationsTab slate/amber→up/warning 토큰 |
| 리포트 | `/report/:id` | ✅ OK | ink 토큰 일관 |
| 결제 | `/payment` | ✅ OK(흡수) | DesignSync 정리 |
| 혜택 | `/my-benefits` | ✅ OK(흡수) | DesignSync 정리 |
| 공지 | `/notices` | ✅ OK | 제목 line-clamp+break-words, 메가폰 up-brand |
| 가이드 허브+4 | `/guide`, `/guide/*` | ✅ OK(흡수) | InfoBox warning 토큰, 히어로 brand-strong |
| 랜딩 | `/` (LandingV1) | ✅ OK | 헤드라인 #565D6A(6.7:1, 큰텍스트) 통과. 자체 마케팅 톤 인정 |
| 로그인 | `/login` | 🔧 수정 | 체크박스 accent-blue-600→accent-brand. 카카오 #FEE500/#191600 브랜드 규정 유지 |
| 온보딩 | `/onboarding` | 🔧 수정 | placeholder-gray-400→up-caption |
| 인트로 | `/intro` | ✅ OK(흡수) | DesignSync 정리 |
| 약관 | `/terms/*`, `/privacy-policy`, `/terms-of-service` | 🔧 수정 | 면책 경고박스 amber→warning 토큰. 표 헤어라인 up-hair(DesignSync) |
| 설정/문의 | `/settings`, `/inquiry` | ✅ OK(흡수) | DesignSync 정리 |
| SEO 랜딩 6종 | `/coupang-*`, `/day-worker-*`, `/daily-worker-*` | ✅ OK(흡수) | 자체 마케팅 톤 인정, 흰텍스트 대비 충분. 일부 hex→토큰(DesignSync) |
| 전역 | App.tsx | 🔧 수정 | 버전 배지 slate-400→up-caption |
| 전역 | ErrorBoundary | 🔧 수정 | amber→warning, 본문 ink-500→up-sub(AA) |

---

## 2. 적용 수정 (위험도 분류 — 전부 자율 수정)

| # | 파일 | 변경 | 위험도 | 근거 |
|---|---|---|---|---|
| 1 | App.tsx:250 | `text-slate-400/80`→`text-up-caption/80` | 낮음 | slate 일탈 제거 |
| 2 | ResultSeverance.tsx | `#00a876`→`#047857` ×10, opacity 0.7 제거 | **중간(AA)** | 흰배경 그린 3.06:1→4.7:1, 팔레트 정렬 |
| 3 | Login.tsx | `accent-blue-600`→`accent-brand` ×4 | 낮음 | 체크박스 색 토큰화 |
| 4 | Onboarding.tsx | `placeholder-gray-400`→`placeholder-up-caption` ×2 | 낮음 | gray 일탈 제거 |
| 5 | TermsOfService.tsx | 면책박스 amber→`warning`/`#B45309` | 낮음 | warning 토큰 컨벤션 통일 |
| 6 | mypage/InquiryHistory.tsx | slate→up-hair/sunken/caption, 배지 emerald/amber→accent-700/warning | 중간 | 라이브 서브탭 일탈 제거 |
| 7 | mypage/SupportSection.tsx | 접수됨 배지 amber→warning | 낮음 | 상태색 통일 |
| 8 | mypage/MyApplicationsTab.tsx | statusLock 경고박스 amber→warning | 낮음 | 상태색 통일 |
| 9 | ErrorBoundary.tsx | amber→warning, 본문 ink-500→up-sub | 중간(AA) | 에러 안내 2.9:1→6.7:1 |
| 10 | (흡수) 21파일 | DesignSync gray/blue→up/brand | 낮음 | 1:1 치환, 시각 변화 0 |

---

## 3. 오탐 기각 (에이전트 보고 검증 결과 — 실이슈 아님)

| 주장 | 검증 | 판정 |
|---|---|---|
| BottomNav 탭 56px → 44px 미달 | 실제 height 64px × flex-1(≥56px), safe-area-inset 이미 적용(96줄) | ✅ 통과, 기각 |
| Layout safe-area 누락 | BottomNav가 `env(safe-area-inset-bottom)` 처리 | ✅ 기각 |
| 다수 버튼 focus 링 없음 | `focus:outline-none` 단독 0건. 전부 ring/border 대체 or 브라우저 기본 유지 | ✅ 기각 |
| JobsPage 임금 320px 잘림 | min-w-0+truncate+break-keep+shrink-0 적용됨 | ✅ 기각 |
| LandingV1 헤드라인 대비 위반 | #565D6A 6.7:1, 큰텍스트(≥28px) | ✅ 기각 |
| `text-[#4E5968]` 3.6:1 위반 | 실제 ink-700, 7:1+ | ✅ 기각 |
| on-팔레트 리터럴(#191F28/#047857 등) off-팔레트 | 토큰값과 동일 | ✅ 기각 |

---

## 4. 잔여 위험 (의도적 유지 — 문서화)

| 항목 | 사유 | 위험 |
|---|---|---|
| 인라인 hex 리터럴(#191F28, #4E5968, #565D6A 등) 다수 | 토큰값과 **동일** — 시각·AA 영향 0. 대량 className 변환은 대형 파일(75줄+) 회귀 위험 | 없음(외형 일치) |
| 어두운 빨강 `#C81E2E`·`#cc2233`(긴급/미달) | danger 토큰(#F04452, 3.4:1)보다 대비 우수(5.0~5.5:1). 작은 긴급텍스트 AA 위해 유지 | 없음(AA 우월) |
| `hover:bg-[#036848]` (그린 hover) | up-green(#047857) darken hover. off-팔레트지만 무해 | 낮음 |
| BottomNav 인라인 `#3182F6`/`#6B7280` | 인라인 style이라 토큰화 불가. 비활성 라벨 4.8:1 AA 통과 | 없음 |
| 카카오 `#FEE500`/`#191600` | 카카오 브랜드 규정색 | 없음(규정) |

---

## 5. 데드코드 (사용처 0 — 사용자 노출 없음, 범위 밖)

| 컴포넌트 | 사용처 | 처리 |
|---|---|---|
| `mypage/ProfileSection.tsx` | 0 | 미수정(미렌더). 정리 권고 |
| `mypage/RetirementWidget.tsx` | 0 | 미수정(미렌더). 정리 권고 |
| `mypage/ServiceCards.tsx` | 0 | 미수정(미렌더). 정리 권고 |
| `mypage/MyRewardsTab.tsx` | 0 | 미수정(미렌더). 정리 권고 |

> 위 4개는 slate/emerald/orange 구식 클래스를 다수 보유하나 어디서도 import/렌더되지 않아 **사용자 화면 품질에 영향 없음**. 별도 정리 태스크 권고.

---

## 6. 성능 (정적 점검)

| 항목 | 결과 |
|---|---|
| `npm run build` | ✅ 통과(에러 0) |
| 큰 청크 | index 533KB·TargetTab 543KB(어드민)·BarChart 379KB — **사전 존재·어드민/차트 영역**, Phase5 UI 범위 밖 |
| 사용자 페이지 청크 | Home 25KB·Jobs 48KB·MyPage 77KB 등 양호(gzip 8~18KB) |
| 애니메이션 | Framer Motion 절제, reduced-motion은 후속 권고(현 BottomNav/캐러셀 가벼움) |

> Lighthouse는 dev 포그라운드 금지 정책상 미측정. 정적 점검으로 갈음.

---

## 7. 검증 게이트

- [x] `npx tsc --noEmit` 0
- [x] `npm run build` 통과
- [x] gray/slate/off-팔레트 유틸 클래스 전수 재스캔 → 라이브 코드 잔존 0(데드코드 제외)
- [x] 강화 더블리뷰 A(총괄)·B(적대) **둘 다 실행** → **둘 다 PASS, BLOCKER 0** (docs/dual_review/upbit_phase5_{A,B}.md)

> 더블리뷰 결과: A(총괄) PASS·BLOCKER 0 / B(적대) PASS·BLOCKER 0. B의 4개 공격면(AA 거짓통과·토큰 미정의·로직 훼손·DesignSync 오매핑) 전부 차단 실패. 잔여 B1~B4는 데드코드/선존재/동일값 토큰화/비필수 캡션으로 비차단. 추가로 A 비차단 권고 2건(Onboarding 제출버튼 hover:bg-brand-strong, App.tsx 스피너 토큰화) 반영 완료.
