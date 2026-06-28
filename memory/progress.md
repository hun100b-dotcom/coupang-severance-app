# 📋 CATCH 작업 일지 & 다음 작업

> **이 파일은 모든 세션의 시작점입니다.**
> CLI, IDE, Dispatch, Cowork, 일반 채팅 — 어디서든 작업을 시작하면 이 파일을 가장 먼저 읽으세요.
> 작업이 끝나면 반드시 이 파일을 업데이트하세요.

---

## 🎨 웹 레이아웃 전면 리디자인 (redesign/web-layout 브랜치, 2026-06-28 완료, 미푸시)

> 디자인 방향 "B고정" = 프리미엄 + 섹션 분리. 색: **블루 메인 + 그린(채용/재직수당) + 회색 + 의미색(danger/warning). 무지개 금지**. 토큰: tailwind `brand/accent/ink/line/page`. 모든 화면 더블리뷰(총괄A+적대B) + Playwright 실측 후 로컬 커밋(푸시 X), main 무수정, 계산 로직 무변경(UI만).

**완료 화면 (전부 더블리뷰 통과):** 홈·계산기허브·채용·마이페이지·공지 / 퇴직금·실업급여·주휴·연차 플로우+결과 / 나의혜택 / 가이드허브+4가이드 / 결제·문의·설정 / 랜딩(/)·로그인·온보딩·스플래시 / SEO 6 + 약관 2

**이번 세션 커밋(redesign/web-layout, 미푸시):** be53334(가이드) · 712d71e(결제/문의/설정) · 86f8d91(랜딩/로그인/온보딩) · e6ee787(SEO)
- accent.700(#047857) 토큰 신설(흰배경 텍스트·녹색버튼 AA용)
- 리뷰 기록: `docs/dual_review/redesign_*.md` (guide/payment_inquiry_settings/landing_login_onboarding/seo_terms)
- **남은 개선점(비차단):** 공유 TopNav/BottomNav 글래스 제거(전역 단일 결정 필요) · 앱 버전표기 #94a3b8 전역 대비 · 320px Login 구글위젯 고정폭 클리핑 · 실업급여 SEO 히어로 그린(그룹핑상 블루 검토)
- **다음:** 종훈님 육안 확인 후 push 여부 결정 → main 머지 또는 Vercel 프리뷰 배포

---

## 🔴 다음 작업 (TODO)

| 우선순위 | 작업 | 상세 |
|---------|------|------|
| **P0** | legal_variables 마이그레이션 DB 완전 적용 | `label` 컬럼 없음 확인 (2026-06-10). Supabase SQL Editor → `ALTER TABLE public.legal_variables ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '';` 실행 후 데이터 업데이트 |
| **P0** | GSC 수동 색인 요청 | 종훈님이 GSC 접속 → 각 URL 검색바 입력 → "색인 생성 요청" 클릭 |
| **P1** | 채용팀 연락 → 공고 데이터 수집 | 쿠팡/컬리/CJ 채용담당자 연락 (코드 작업 아님) |
| **P2** | Phase 2 B2C 랜딩 고도화 | 검색 노출 모니터링 (1~4주 소요) |
| **P3** | 앱스토어/플레이스토어 출시 | PWA → 네이티브 앱 래핑(Capacitor/TWA) 검토 |
| **P4** | Phase 3 B2B 랜딩 + 유료화 | - |

---

## ✅ 완료 작업 이력

### 세션 16 — 2026-06-28 (후속 3건: 어드민 확인 + 랜딩 CTA 버그 + 공지 마키 버그, 더블리뷰 PASS, main 배포)
- **#1 어드민 개편 여부**: grep(admin 42파일) + 실제 /admin 렌더 확인 → **개편 안 됨**. 새 토큰(brand/accent/ink/line) 0건, backdrop-blur 0건, 무지개(purple/violet/indigo) 0건, slate/gray 301건 = 세션10 슬레이트 라이트 테마 그대로. 무지개·글래스 잔재도 없음(이미 세션10에서 제거). 이번 리디자인은 어드민 미적용(Phase 5 보류). 별도 지시 전까지 손대지 않음.
- **#2 랜딩 "지금 시작하기" 튕김**(LandingV1.tsx): goHome이 게스트 모드 안 켜고 /home 이동 → HomeGuard가 /로 튕기던 버그. 재현 확정(클릭→path '/'). 수정: `if(!isLoggedIn) loginAsGuest()` 후 navigate. 재검증 통과(비로그인 클릭→/home + guest=true).
- **#3 홈 공지 마키**(NoticesBanner.tsx): 직접 진단 → translateX(-50%)가 컨테이너 자기폭 기준인데 w-max 없어 부모(205px)에 묶여 끝까지 가도 -103px만 이동(텍스트 493px 중) → 뒷부분 영영 안 보이고 까딱대다 멈춤. 수정: 마키 div에 `w-max` 추가 → 컨테이너 987px, 끝에서 -493px 정확 이동, span2=0 seamless. 모바일/데스크톱 실측 확정.
- **검증 방법**: dev서버(preview MCP, hidden탭이라 Web Animations API로 currentTime 수동 진행시켜 기하 실측). 5173 잔여 vite 충돌 → taskkill 후 재시작.
- **더블리뷰**: 총괄A·적대B 모두 PASS(블로커 0). B 권고 MINOR-1(로그인유저 게스트플래그 가드) 반영. 기록 `docs/dual_review/fix_landing_cta_notices_marquee.md`
- **배포**: 브랜치 fix/landing-cta-notices → main 머지 → push(`4c7518a..99f3800`). 6-step 통과: 커밋 99f3800 / Vercel 200(0.05s) / Render health 200(53s 콜드) / docs 200 / 라이브 최신청크(LandingV1-Cmc0FcrT.js·index-Bf3Y2v01.js) 도달 / CSS해시 일치 무결성. 계산로직 무변경.

### 세션 15-4 — 2026-06-28 (디자인 개편: 마이페이지 /mypage 전체 완료, 더블리뷰 PASS)
- 셸 + 5개 서브탭(홈/즐겨찾기/지원현황/스케줄/설정) 전부 무지개 제거·토큰화 완료
- 셸: 중복 헤더(뒤로/로그아웃) 제거, 세그먼트 pill 탭바(라벨 상시표시+aria-label), 반응형 max-w-760
- 서비스 색코딩 violet/emerald/amber → 브랜드 블루 통일(SavedResultsList/QuickActions/SavedResultDetail), 스케줄 보라 그라데→블루, 즐겨찾기 노랑별→블루. 지원현황 STATUS_CONFIG는 의미색이라 유지(알림토스트 보라만 블루로)
- 더블리뷰: A·B 모두 조건부 PASS → 동일 MAJOR(`xs:inline` 죽은클래스로 375/320 탭라벨 숨김+aria 누락) 수렴 → 라벨 상시표시+aria-label+tailwind xs추가로 수정, 알림토스트 보라·즐겨찾기⭐ 정리 → 검증 PASS. 기록 `docs/dual_review/redesign_mypage.md`
- **로컬 검증 레시피**(MyPage 로그인 우회): Playwright localStorage `sb-hmjxrqhcwjyfkvlcejfc-auth-token` 가짜세션 + profiles 모킹(onboarding_completed:true)
- **다음**: 공지사항(/notices) — 마지막 주요 탭. 그 후 계산 플로우/가이드/랜딩

### 세션 15-9 — 2026-06-28 (디자인 개편: 실업급여 플로우+결과, 더블리뷰 PASS)
- UnemploymentFlow sky→brand(블루그룹)·글래스 제거(로직 불변), ResultUnemployment 금액 brand-strong(#1B64DA)·안내 솔리드
- 더블리뷰 A·B 모두 PASS(이슈 0). 기록 docs/dual_review/redesign_unemployment.md
- 다음: 주휴수당(/weekly-allowance) → 연차 → 혜택

### 세션 15-8 — 2026-06-28 (디자인 개편: 퇴직금 결과+리포트, 더블리뷰 PASS)
- index.css 글래스 클래스 솔리드화(.glass-card/.report-accordion-header/body) + 폰트↑(.formula-box/.ai-analysis-box) + 금액색 .num-digits→#1B64DA → **GlassCall/리포트 쓰는 모든 결과 화면 전파**
- ResultSeverance: 참고안내 솔리드(로직 불변). ReportDetail: Container narrow·헤더 top-14·토큰 셀·금액 brand-strong·캡션 ink-700
- 더블리뷰: A WARN(셀 캡션 ink-600 대비)+B minor(금액색 불일치·회사명줄) → ink-700/금액 brand-strong/truncate 수정. PASS. 기록 docs/dual_review/redesign_result_report.md
- 로컬 체크포인트 커밋(2번째). **다음**: 실업급여 플로우(/unemployment)+결과 → 주휴 → 연차 → 혜택

### 세션 15-7 — 2026-06-28 (디자인 개편: 퇴직금 플로우 /severance 위저드, 더블리뷰 PASS)
- **공유 CalcLayout.tsx 토큰화 → 4계산기 플로우에 일괄 반영**: ACCENT 무지개(blue/sky/amber/emerald)→brand/accent(blue·sky→브랜드블루/amber·emerald→그린, 계산기 허브 그룹 일치), 글래스→솔리드 흰카드, CalcHeader top-14, 폰트↑
- SeveranceFlow: divider/SEO폭만(계산 로직 28일블록 불변). PdfSourceSelector: 토큰화+저장팝업 portal. GuestGate: portal+pb-[88px](BottomNav 가림 해소)
- 더블리뷰: A WARN(선택버튼 흰텍스트 on #3182F6=3.71) → 흰텍스트 버튼 채움색 진한색(브랜드-strong/#047857)으로 수정(5.41). B PASS+minor(게이트모달 가림)→portal 수정. 검증 PASS. 기록 docs/dual_review/redesign_severance_flow.md
- **CalcLayout 공유라 실업/주휴/연차 플로우도 자동 개선됨** → 각 플로우 리뷰 시 재확인
- **다음**: 퇴직금 결과(ResultSeverance)+리포트(/report/:id)

### 세션 15-6 — 2026-06-28 (종훈님 우선순위 피드백 4건 처리)
1. **전역 폰트 상향**: 코드가 토큰 아닌 임의 px(text-[13px])를 씀 → index.css에서 .text-[10~17px]·text-xs·text-sm를 +1.5px override(!important, @tailwind utilities 뒤). 전 화면 반영. 11→12.5/12→13.5/13→14.5/14→15.5px
2. **NoticesBanner**: mx-3 my-2 자체여백 제거(홈 카드와 정렬) + 인디고 그라데→브랜드 블루+좌측 액센트바, 텍스트 ink-800 semibold
3. **계산기 카드 구분**: 4서비스를 2그룹 섹션(퇴사후정산=블루/재직중수당=그린)으로 분리 + 그룹별 상단 액센트보더·큰 아이콘(지폐/방패/시계달력/야자수)·라벨 19px·CTA 그룹색. 블루/그린 2색만(무지개 회피)
4. **채용 검색창 겹침**: 원인=index.css 전역 input[type=text]{padding:14px 16px}(특이도 0,1,1)가 pl-10 덮음 → !pl-12 강제(패딩 48px, 아이콘끝 34px, 14px 간격)
- 검증: tsc 0, 375px 오버플로 0(홈/계산기), 검색 패딩 실측 48px
- **다음(보류중)**: 마이페이지는 종훈님 별도 지시 후 / 공지·가이드·랜딩은 그 다음

### 세션 15-5 — 2026-06-28 (디자인 개편: 공지사항 /notices + 모달, 더블리뷰 PASS)
- `NoticesPage.tsx` 전면 재구성 — max-w-[500px]→Container 반응형(모바일1/데스크톱2열), 하드코딩색→토큰, 모달 createPortal(body)+flex 중앙정렬
- 더블리뷰: A FAIL(데스크톱 모달 Framer transform이 Tailwind translate 덮어써 우측 치우침)+WARN(날짜 대비) / B BLOCKER×2(카드 min-w-0 누락 그리드폭발 + 모달 break-keep 무공백 미줄바꿈)
- 2차 수정: flex 중앙정렬 패턴, 카드 min-w-0+break-words, 모달 min-w-0+break-words, 날짜 ink-600 → 측정검증 PASS(모달 cx=640 정중앙, 카드 트랙 288px, 오버플로 0)
- **교훈 재확인**: grid/flex 아이템 min-w-0+break-words는 모든 카드/모달 필수. Framer Motion+Tailwind translate 중앙정렬 충돌은 flex 정렬로 회피
- ✅ **주요 4탭(계산기/채용/마이페이지/공지) 디자인 개편 전부 완료**. 다음: 계산 플로우(퇴직금/실업급여/주휴/연차/혜택)+결과 → 가이드 → 랜딩

### 세션 15-4b (이전 중간기록 — 무시)
- **셸 완료**: `MyPage.tsx` — 중복 헤더(뒤로가기/로그아웃) 제거(TopNav가 제공), 세그먼트 pill 탭바(토큰), 반응형 컨테이너(max-w-760). 모든 로직/훅 보존
- **홈 탭 완료**: SavedResultsList(서비스별 violet/emerald/amber → 브랜드 블루 통일), QuickActions(동일), ProfileCard·SupportSection 외곽 토큰화(rounded-xl/shadow-card/border-line)
- **로컬 검증 장벽 & 해법**: MyPage는 비로그인 시 /login 리다이렉트 → 게스트로 못 봄. OAuth는 운영도메인. **해법**: Playwright에서 가짜 Supabase 세션(localStorage `sb-hmjxrqhcwjyfkvlcejfc-auth-token`) + profiles 쿼리 모킹(onboarding_completed:true) 주입 → 렌더 확인. (운영코드 무수정)
- **남은 4 서브탭**: 즐겨찾기(MyFavoritesTab)·지원현황(MyApplicationsTab 989줄, STATUS_CONFIG 16 hex)·스케줄(MyScheduleTab, 그라데이션 #3182f6→#6d28d9 보라)·설정(MySettingsTab) + SavedResultDetail/InquiryModal 모달. 대부분 단순 색 토큰 스왑, Applications만 구조적
- **다음**: 나머지 4 서브탭 무지개 제거 → mypage 더블리뷰 → 보고. 그 후 공지사항(/notices)

### 세션 15-3 — 2026-06-28 (디자인 개편: 채용정보 /jobs + 상세 모달, 더블리뷰 PASS)
- `src/pages/JobsPage.tsx` 전면 재구성 — 로직(즐겨찾기/지원플로우/Realtime/토스트/?focus) 100% 보존, 스타일/구조만
- 무지개 제거(히어로 purple·카피 sky/violet·CTA indigo·즐겨찾기 yellow-400·모달 teal) → 블루+그린(채용)+회색+의미색(긴급 danger/warning)
- 반응형: 카드 그리드 모바일1/sm2/lg3열, 상세 모달=모바일 바텀시트/데스크톱 중앙 다이얼로그
- 텍스트 잘림 수정: 카드 메타 세로스택 truncate, 모달 값 줄바꿈
- **모달 createPortal(body)** — 루트 z-[1] 컨텍스트 탈출(기존부터 BottomNav가 모달 덮던 버그 해결)
- 더블리뷰: 1차 A PASS(WARN 2)/B FAIL(BLOCKER min-w-0 가로오버플로 + MAJOR 모달이름잘림) → 2차 수정(카드 min-w-0, 모달 break-words, 닫기 44px, 의미색 대비↑) → 최종확인 PASS. 기록 `docs/dual_review/redesign_jobs.md`
- **교훈**: grid/flex 아이템 `min-w-0` 누락 시 truncate 무력화 → 홈·채용 모두 B가 적출한 동일 패턴. 이후 카드 그리드엔 항상 min-w-0
- **다음 화면**: 마이페이지(/mypage) + 서브탭 — 보고 후 이어감

### 세션 15-2 — 2026-06-27 (디자인 개편: 계산기 허브 /calculator, 더블리뷰 PASS)
- `src/pages/CalculatorPage.tsx` 전면 재구성 — 무지개 그라데이션(블루·시안·그린·앰버+노랑) 제거 → **블루+회색만**
- 위계: 대표 퇴직금=블루 그라데이션 피처 카드(풀폭) + 나머지 3개(실업급여/주휴/연차)=흰 카드 반응형 그리드(모바일1/sm2/lg3열). Phase 0 Container/Card/Button 재사용
- 카드 높이 통일(items-stretch+h-full+CTA mt-auto → 302px 균일), break-keep, tabular-nums
- 더블리뷰: A PASS(조건부, 피처 수치라벨 white/80→white/90 수정) / B PASS(이슈 0). 기록 `docs/dual_review/redesign_calculator.md`
- **다음 화면**: 채용정보(/jobs) + 상세 모달(텍스트 잘림 수정) — 보고 후 이어감
- 게스트 진입(로컬): `/login` → "비로그인으로 진행하기" 버튼 → /home. (랜딩 "지금 시작하기" 게스트 미설정 버그는 세션16에서 수정 완료)

### 세션 15 — 2026-06-27 (디자인 개편 Phase 0 + 홈 "B-fixed", 더블리뷰 PASS)
- **브랜치**: `redesign/web-layout` (백업 태그 `pre-redesign-2026-06-27`) · **main 무수정 · Vercel 푸시 보류(로컬 확인 단계)**
- **방향**: B(프리미엄 비주얼)+A(섹션 구분) = "B-fixed" · 색 = 블루 메인+그린(채용)+회색 중립, 무지개 금지
- **Phase 0(기반)**:
  - `tailwind.config.js` 디자인 토큰(brand/accent/ink/line/page, radius sm~pill, shadow card·float). 기존 `toss.*` 하위호환 유지
  - `index.css` AnimatedBackground 톤다운(무지개 5블롭 → 블루 단색 2블롭 + 거의 흰색 베이스)
  - 반응형: `components/ui/Container`(모바일 풀폭 / 데스크톱 1080 다단)
  - 내비 분기: `TopNav` 반응형(md+ 가로내비 홈·채용·계산기·가이드·공지+고객센터+로그인 / 모바일 컴팩트), `BottomNav` `md:hidden`, `Layout` 데스크톱 하단 패딩 축소
  - 공통 컴포넌트 신설: `ui/{Container,Card,Badge,Chip,SectionHeader,Button}`
- **홈(/home)**: B-fixed 전면 재구성 — 히어로(좌 카피+CTA / 우 플로팅 결과카드), 통계 스트립, 섹션 구분(채용=그린/계산기/가이드), 색 통일. **Layout 밖 독립 라우트라 Home 내부에서 TopNav/BottomNav 직접 렌더**(App.tsx 라우팅/가드 무수정)
- **더블리뷰(월드클래스 기준)**: 1차 B가 MAJOR(빈 채용 데이터 데드 코드) 적출 → 수정. 2차 A가 768 CTA 래핑·터치타겟·명도대비 FAIL → 수정. 최종 확인 **PASS**(tsc/build 0에러, AA 대비 충족, 무지개 0). 기록: `docs/dual_review/redesign_phase0_home.md`, 기획서: `tasks/plans/redesign_phase0_home.md`
- **다음 화면**: 계산기 허브(/calculator) — 별도 지시 대기
- **남은 개선**: 녹색 CTA 흰 텍스트 대비, prefers-reduced-motion, TopNav 공통 컴포넌트 폴리시

### 세션 14 — 2026-06-10 (P3 핫픽스: legal_variables 연도 필터)

**문제**: `legal_variables` 테이블에 동일 `key`에 2025/2026 두 행 존재 → `.single()` "2행 반환" 에러 → fallback(10320) 강제 사용

**수정**: `frontend/src/lib/legalVariables.ts`
- `getLegalVariable()`: `.eq('effective_year', CURRENT_YEAR)` 추가 → `.single()` 1행 보장
- `preloadLegalVariables()`: 동일 연도 필터 적용 → 과거 연도 행 캐시 덮어쓰기 방지
- 캐시 키: `key` → `key_연도` 형식으로 변경 (연도 전환 시 자동 갱신)
- `CURRENT_YEAR = new Date().getFullYear()` 동적 산출 (매년 자동 적용)

**검증**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git push `01d8133..48baa0b` | ✅ |
| 2 | Vercel READY (페이지 정상 로드) | ✅ 배포 진행 중 |
| 3 | Render /health 200 | ✅ |
| 4 | PostgREST `?key=eq.min_hourly_wage&effective_year=eq.2026` | ✅ 1행(10320) 반환 |
| 5 | WeeklyAllowance 페이지 console error | ✅ 0건 |
| 6 | Vercel 새 번들(`index-C_PGI-vE.js`) 배포 | 🔄 진행 중 (빌드 시간 소요) |

**버그 재현 확인**: 연도 필터 없는 쿼리 → 2행 반환 실측 (`min_hourly_wage`: 2025=10030, 2026=10320)

**커밋**: `48baa0b` fix(legal): legal_variables 쿼리에 연도 필터 추가

---

## ✅ 완료 작업 이력

### 세션 13 — 2026-06-10 (mcp.json 키 동기화 + 6-Step 최종 검증)

**핵심 발견**: 직전 세션(91턴)이 "모든 키 401"로 오진. 실제 원인은 `~/.claude/mcp.json`의 `SUPABASE_SERVICE_ROLE_KEY` 값이 `backend/.env`와 달랐던 것.

**수행 작업**

| 항목 | 상태 |
|------|------|
| `mcp.json` service_role 키 → `backend/.env` 값으로 동기화 | ✅ PowerShell 직접 실행 (끝자리 `...1L9E`) |
| frontend/.env.local / backend/.env | ✅ 변경 불필요 (기존 키 정상) |
| Render / Vercel 환경변수 | ✅ 변경 불필요 (기존 키 정상) |

**6-Step 검증 결과 (2026-06-10)**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git status + .gitignore | ✅ `.env`/`.env.local` 보호, 코드 변경 없음 |
| 2 | Vercel 200 (0.04s) | ✅ |
| 3 | Render /health 200 (0.13s) | ✅ |
| 4 | legal_variables 4행 반환 | ✅ 최저시급 10,320(2026)/10,030(2025), 실업급여 68,100/66,000 |
| 5 | service_role REST 200 (MCP 동등검증) | ✅ (MCP는 다음 세션 재시작 시 새 키 적용) |
| 6 | 라이브 UI `/weekly-allowance` 접근 | ✅ 계산기 1/5 스텝 렌더링 정상 |

**부가 메모**: `legalVariables.ts:38` `.single()` 쿼리에 연도 필터 없어 항상 fallback(10320) 사용 중. 기능 영향 없음. spawn_task 등록.

---

### 세션 12 — 2026-06-10 (전수 검사 6영역 재점검)

**작업 요약**: Phase A~G 전 영역 전수 검사 수행. 세션 11에서 이미 핫픽스 완료된 항목들 확인.

**추가 발견 사항**
- `legal_variables` 테이블: `label` 컬럼 없음 (마이그레이션 SQL에는 있지만 DB 미적용). 단, 프론트 `legalVariables.ts`와 admin `LegalVariables.tsx` 모두 label 미사용 → **현재 기능 영향 없음** (P3)
- DB 데이터 정상: `min_hourly_wage=10320(2026)`, `unemployment_max_daily=68100(2026)` ✅

**6-Step 재검증 결과 (2026-06-10)**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git status (코드 clean) | ✅ |
| 2 | Vercel 200 (0.93s) | ✅ |
| 3 | Render /health 200 (0.30s) | ✅ |
| 4 | PDF 4종 /precise → 422 (정상) | ✅ |
| 5 | TypeScript 에러 0건 / dark 잔재 0건 | ✅ |
| 6 | 핵심 8개 파일 존재 (TargetMenu 포함) | ✅ |

**코드 레벨 검증 요약**
- TypeScript 빌드 에러: 0건 ✅
- 빈 catch 블록: 없음 ✅
- dark: Tailwind 클래스: 0건 ✅ (V2/V3는 의도적 다크 랜딩)
- any 타입 남발: api.ts 1건 (최소) ✅
- 인증 가드: MyPage 비로그인→/login 리다이렉트 ✅
- GuestGate: 4개 계산기 PDF 업로드 보호 ✅
- 어드민 인증: X-Admin-Token 401 정상 ✅

---

### 세션 11 — 2026-06-10 (전수검사 핫픽스 8파일 + Render 재활성 확인)

**커밋 `deb3558`: fix(audit): TargetMenu 접근 + Guide SPA full reload + a11y + dead code (8파일)**

| 파일 | 변경 내용 |
|------|---------|
| `AdminSidebar.tsx` | MENU_TREE 시스템 그룹에 target 항목 누락 추가 |
| `AdminPage.tsx` | FLAT_MENUS에 target 추가 (모바일 드롭다운) |
| `SeveranceGuide.tsx` | GuideCard + 본문 inline `<a href>` → `<Link to>` + Link import |
| `UnemploymentGuide.tsx` | 동일 패턴 |
| `WeeklyAllowanceGuide.tsx` | GuideCard `<a href>` → `<Link to>` + Link import |
| `AnnualLeaveGuide.tsx` | GuideCard `<a href>` → `<Link to>` + Link import |
| `ProfileSection.tsx` | img `alt=""` → `alt={name}` (접근성 수정) |
| `SeveranceFlow.tsx` | 빈 `useEffect` 제거 + import에서 `useEffect` 삭제 |

**6-Step 검증 결과**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git push origin main | ✅ |
| 2 | Vercel 200 | ✅ |
| 3 | Render /health 200 | ✅ **(이전 세션 404→이번 세션 200 자동 복구)** |
| 4 | /docs /redoc /openapi.json 200 | ✅ |
| 5 | AdminSidebar target 항목 코드 검증 | ✅ (diff 확인) |
| 6 | GuideCard SPA 라우팅 (hasEventListeners:true) | ✅ |

**push**: ✅ origin main 완료 (Vercel 자동 배포)

---

### 세션 10 — 2026-06-09 (어드민 라이트 개편 완료 + 전역 전수검사)

**Task A — 어드민 UI/UX 전면 라이트 전환 완료 (커밋 3개)**

- `ee75d8d` Step 1-3: 공용컴포넌트 5개(AdminCard/KpiStrip/SignalCard/PageHeader/AdminTable) + AdminPage/Sidebar + 대시보드(Overview/Visitor/CalcStats/Recruit)
- `3446d66` Step 4-6: 채용(JobPostings/Applicants/Confirmed/RecruitSummary) + 콘텐츠(Inquiries/Notices) + 시스템(Members/Accounts/Settings/AuditLogs/ServerLogs/Target) 27파일
- `46bb0f9` 파란 버튼 텍스트 색 마무리 4파일 (TemplateManager/NoticesMenu/CmsSettings/ApplicantsMenu)
- `9b87bfa` TargetMenu 다크 잔재 제거 — `rgba(255,255,255,...)` → slate 라이트 토큰 21곳

**Task B — 전역 전수검사 결과**

| 항목 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 23개 라우트 | ✅ 22개 200, 1개 307 | `/home` 307은 HomeGuard 미로그인 리다이렉트 (정상) |
| 어드민 다크 잔재 | ✅ 0건 | TargetMenu 수정 후 전체 클린 |
| 빌드 TypeScript 에러 | ✅ 0건 | |
| Render 백엔드 `/health` | ❌ 404 Not Found | **서비스 비활성화 추정 — 종훈님 Render Dashboard 확인 필요** |
| Render 백엔드 `/redoc` | ❌ 404 | |
| Render 백엔드 `/openapi.json` | ❌ 404 | |

**push**: ✅ origin main 완료 (Vercel 자동 배포)

---

### 세션 9 — 2026-06-03 (P0~P2 일괄 수정)

**진단 보고서(commit 5ee46b83) 기반 8개 작업 일괄 완료 (커밋 3개)**

**P0 — 버그 수정**
- WeeklyAllowancePage + AnnualLeaveAllowancePage: `fd.append('company', '기타')` 패턴으로 수정 (사업장 필터 버그)
- 최저시급 2025(10,030)→2026(10,320) 전면 업데이트
- `supabase/migrations/20260603_legal_variables.sql`: legal_variables 테이블 + 초기 데이터 (DB 적용 대기)
- `frontend/src/lib/legalVariables.ts`: Supabase fetch + 5분 캐시 + fallback 10,320

**P1 — 기능 개선**
- WeeklyAllowancePage + AnnualLeaveAllowancePage: PDF 에러 메시지 고도화 (Network/504/422 분기)
- WeeklyAllowancePage + AnnualLeaveAllowancePage: PdfGuide 발급 가이드 버튼 추가
- UnemploymentFlow: PDF 정밀계산 비로그인 → GuestGate 모달 (SeveranceFlow 패턴)

**P2 — 품질 개선**
- UnemploymentFlow: runPrecise catch 강화 (Network/504/detail 분기)
- 실업급여 2026 상한액 66,000→**68,100원** 정정 (7년 만에 인상, 하한액 66,048원)
  수정 파일: UnemploymentFlow.tsx, UnemploymentGuide.tsx, CoupangUnemploymentLanding.tsx

**작업 7 (TargetTab lazy load)**: 이미 DashboardMenu.tsx에 구현돼 있음 — skip

**커밋 목록**
- `e0938c8`: fix(P0): 사업장 필터 버그 + 최저시급 2026 + PDF 가이드 + 에러 고도화
- `eb315af`: feat(P1/P2): 실업급여 GuestGate + runPrecise 에러 처리 강화
- `d7d9296`: fix(P2): 실업급여 상한액 66,000→68,100원 정정

**push**: ✅ origin main 완료 (Vercel 자동 배포 시작)

**미완료**
- legal_variables 테이블 DB 적용: Supabase 대시보드에서 SQL 직접 실행 필요 (MCP 없어서 자동 적용 불가)

---

### 세션 6 — 2026-04-10 (하네스 v2 — sharp-hodgkin)

**요구사항 D 전면 교체 + A/C/E 잔여 구현 (커밋 6개)**

**DB 마이그레이션 (Supabase MCP 직접 적용)**
- `20260410_job_postings_section_benefits.sql`: section(3종)/benefits 컬럼 추가
- `20260410_applications_personal_info.sql`: applicant_name/birth/gender/phone/consent 컬럼

**D-NEW (지원 시점 직접 입력 방식)**
- `ApplyFormModal.tsx` 신규 생성: 성명/생년월일/성별/휴대폰 + 개인정보 동의 아코디언
- 주민번호 뒤 1자리 미수집 — applicant_gender(남/여 텍스트)로 대체
- 동의 기본값 false, 미체크 시 제출 버튼 비활성
- 4자리 연도 강제 검증 (padStart 우회 버그 수정)
- `JobsPage.tsx`: 로그인 게이트 → 폼 모달 → INSERT

**A-1/2/3/4 어드민 공고 등록 개선**
- A-1: 숫자 입력 type=text+inputMode=numeric+천단위콤마
- A-2: date input min=오늘 + colorScheme=dark
- A-3: 섹션 3종 라디오 (오늘추가/내일긴급/상시)
- A-4: benefits 태그 칩 + 직접 입력 Enter

**C-4 마이페이지 빨간 점 배지**
- `MyPage.tsx`: notifications Realtime 구독 + 미읽음 카운트
- 지원현황 탭 클릭 시 자동 read=true

**E-1 xlsx 다운로드**
- `JobsMenu.tsx`: CSV 다운로드 (consent_third_party=true 건만)
- 휴대폰 마스킹 처리 (MVP 정책)

**문서**
- `docs/privacy-policy-draft.md`: 개인정보처리방침 초안
- `docs/security-checklist.md`: 보안 체크리스트
- `docs/plans/2026-04-10-v2-full-plan.md`: 전체 플랜

**커밋 목록**
- `089060d`: feat(db): section/benefits + 인적사항 마이그레이션
- `33157b9`: feat(types): 타입 업데이트
- `eda56e7`: feat(jobs): 지원 폼 모달
- `dd6b8f6`: feat(admin): A-1/2/3/4 + E-1
- `bfb0585`: feat(realtime): C-4 빨간 점 배지
- `00f9df3`: fix(security): 4자리 연도 강제 검증

**push 상태**: ✅ 완료 (이후 세션에서 확인됨, main 동기화 완료)

### 세션 8 — 2026-05-24 (현재 세션)

**SEO P0 3-Phase 전체 완료 (커밋 138ced6)**

**Phase 1 — 색인 점검 + 사이트맵 재정비**
- sitemap.xml: 신규 랜딩 3개 URL 추가 + 전체 lastmod 2026-05-24 갱신 (총 22개 URL)
- index.html 확인: `robots=index,follow` 정상, 정적 FAQPage(8Q) + HowTo JSON-LD 이미 존재
- robots.txt: 이상 없음. SPA prerender 없으나 index.html 정적 콘텐츠로 기본 크롤링 가능
- IndexNow 재제출: 13개 URL HTTP 202 (신규 3개 + 수정 10개) 접수 완료

**Phase 2 — FAQ JSON-LD 계산기 4개 페이지**
- WeeklyAllowancePage.tsx: FAQPage JSON-LD 6쌍 추가 (주휴수당 조건·공식·소멸시효)
- AnnualLeaveAllowancePage.tsx: FAQPage JSON-LD 6쌍 추가 (연차 발생·계산법·소멸시효)
- SeveranceFlow.tsx / UnemploymentFlow.tsx: 기존 FAQ 이미 있었음 — 변경 없음

**Phase 3 — 롱테일 키워드 랜딩 3종 신설**
- `/coupang-part-time-severance-method`: "쿠팡 알바 퇴직금 받는 법" (FAQPage 7쌍)
- `/daily-worker-severance-28days`: "일용직 퇴직금 28일 계산" (FAQPage 7쌍 + 블록 예시 표)
- `/coupang-cfs-severance-calculation`: "쿠팡 CFS 퇴직금 계산 방법" (FAQPage 7쌍 + 재판 안내)
- App.tsx 라우터 등록 + sitemap.xml 추가 + IndexNow 제출
- TypeScript 빌드 PASS, Vercel 자동 배포 시작

**커밋**: `138ced6` feat(seo): P0 SEO 3-Phase (7파일, +1,080줄)
**push**: ✅ origin main 완료

### 세션 7 — 2026-05-20 (distracted-almeida)

**현황 파악 + 문서 동기화 + SEO 제출**

**작업 1 — docs/progress.md 동기화** (`94f34c6`)
- 4/10~5/10 누락 18건 작업 이력 추가 (지원서폼/어드민대시보드/마이페이지타임라인/Discord/SEO랜딩3개 등)
- 최종업데이트 날짜 2026-04-10 → 2026-05-20
- Phase 1 미완료 항목 → 모두 완료로 체크

**작업 2 — SEO 랜딩 3개 라우팅 실측 검증** (코드 변경 없음)
- `/coupang-severance-calculator`, `/coupang-unemployment-calculator`, `/day-worker-severance-guide` 모두 HTTP 200 ✅
- App.tsx 라우팅 3개 모두 등록 확인 ✅
- PageMeta 컴포넌트로 OG/Twitter/JSON-LD 자동 처리 확인 ✅

**작업 3 — 홈 채용 프리뷰** (이미 완료 확인)
- `921afe8` (2026-04-14)에 이미 완전 구현 확인
- supabase.from('job_postings') 실시간 연동, 로딩/에러 상태, 만료 필터링 모두 있음

**작업 4 — sitemap.xml + IndexNow** (`b5066cd`)
- 모든 URL lastmod 2026-04-14 → 2026-05-20 갱신
- IndexNow API 16개 URL 제출 완료 (HTTP 200) — Bing/Yandex 크롤러에 자동 알림

**세션 7 커밋 목록**
- `94f34c6`: docs(progress): 4/10~5/10 작업 18건 동기화
- `b5066cd`: chore(seo): sitemap lastmod 갱신 + IndexNow 16개 제출

**남은 것**: GSC 수동 색인 클릭 (종훈님이 GSC 직접 접속 필요)

### 세션 5 — 2026-04-10

**추천인 시스템 구축 (커밋 b5c4299)**
- `supabase/migrations/20260410_referral_system.sql`: user_referrals 테이블 + profiles.referral_code + RLS + handle_new_user 트리거 업데이트
- `frontend/src/lib/referral.ts`: 추천 코드 생성/저장/조회 유틸 (ensureReferralCode, saveReferral, getReferralStats)
- `Login.tsx`: ?ref= URL 파라미터 감지 → localStorage 임시 저장
- `Onboarding.tsx`: 온보딩 완료 시 추천 관계 DB 기록 → localStorage 정리
- `MyRewardsTab.tsx`: 친구 추천하기 섹션 추가 (코드 복사, 링크 복사, 추천 수)
- Supabase SQL 마이그레이션 실행 필요 (Supabase 대시보드 → SQL Editor에서 실행)

### 세션 4 — 2026-04-09 (Cowork)

**Google Search Console 설정**
- `catch-daily-worker.vercel.app` 속성 추가 (소유권 HTML 태그 자동 인증)
- sitemap.xml 제출 완료
- `/home` URL 색인 생성 요청 완료 (1/10)
- 나머지 9개 URL은 일일 할당량 초과로 내일부터 진행

**네이버 서치어드바이저 설정**
- 사이트 소유권 인증 완료 (naver-site-verification 메타태그 추가)
- sitemap.xml 제출 완료
- 주요 URL 10개 웹페이지 수집 요청 완료
- 커밋: `3288194` feat(seo): 네이버 서치어드바이저 소유권 인증 메타태그 추가

**랜딩 페이지 개선 (LandingV1.tsx)**
- PAIN 섹션 사용자 후기 인용문 시각적 강조 (그래디언트 배경, "200만 원" 파란색 강조)
- 소멸시효 카드 데이터 오류 수정: "1년 이상" → "3년"
- SCHEDULE 섹션에 긴급·추가모집 알림 카드 추가 (🔥 빨간-주황 그래디언트)
- 미사용 변수(hoverTextColor) 제거 → Vercel 빌드 에러 수정

**SEO 가이드 페이지 앱 내 이동**
- 5개 가이드 라우트를 Layout 안으로 이동 (TopNav + BottomNav 표시)
- 가이드 페이지 자체 네비 제거, 패딩 조정
- Home에 "노동법 가이드" 진입 배너 추가

**SEO 컨설팅 리포트**
- `CATCH_런칭준비_컨설팅리포트.docx` 생성 (Google/Naver 검색 현황, 앱스토어 타이밍, 리스크 분석)

### 세션 3 — 2026-04-08

- 하네스 워크플로우 + Opus 리뷰어 서브에이전트 설정
- `.claude/agents/` 폴더 생성 (reviewer.md, reviewer-checklist.md)
- `.claude/commands/` 추가 (plan.md, sprint.md, review.md)
- memory/, tasks/ 인프라 구축

### 이전 세션

- Phase 0 완료: 4개 계산기, PDF 저장/재사용, 마이페이지, Toss 디자인
- Phase 1 진행: 채용정보 섹션 구축 (job_postings DB, 관리자 CRUD, 피드 UI 등)

---

## 🔧 현재 인프라 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로덕션 URL | https://catch-daily-worker.vercel.app | Vercel 자동배포 |
| API | https://coupang-severance-app.onrender.com | Render 자동배포 |
| Google Search Console | ✅ 등록 완료 | 속성: catch-daily-worker.vercel.app |
| Naver Search Advisor | ✅ 등록 완료 | 소유권 인증 + 수집 요청 완료 |
| Google 색인 | 🔄 진행 중 | /home 요청 완료, 나머지 9개 대기 |
| Naver 색인 | 🔄 진행 중 | 수집 요청 후 2~4주 소요 |
| sitemap.xml | ✅ | Google + Naver 모두 제출 |
| robots.txt | ✅ | 크롤링 허용 설정 |
| OG 메타태그 | ✅ | 카카오/페이스북/슬랙 공유 대응 |
| JSON-LD 구조화 데이터 | ✅ | WebApplication 스키마 |

---

## 📌 주의사항 (실수 방지)

- 로컬 빌드 테스트는 반드시 `npm run build` 사용 (`vite build` 단독 금지 → tsc 에러 누락됨)
- 구현 완료 후 반드시 `.claude/agents/reviewer.md` 기반 리뷰어 에이전트 호출
- 28일 블록 알고리즘 로직 절대 임의 변경 금지
- index.html의 google-site-verification, naver-site-verification 메타태그 삭제 금지
