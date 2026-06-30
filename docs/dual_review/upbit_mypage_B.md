# 더블리뷰 B — 업비트풍 Phase4 마이페이지 디자인 QA 정적 검증

> 검증일: 2026-06-30 · 리뷰어: 시니어 QA (리뷰어 B, 디자인 정적 분석)
> 대상 브랜치: `redesign/upbit-mypage` (== 현재 main `078b797`, 기준 `d301400`)
> 검증 방식: 소스 정적 분석 + 빌드 CSS 산출물 대조 + `npm run build` 1회. 코드 수정·dev 서버 기동 없음.

---

## 최종 판정: ❌ FAIL (배포 불가)

- **BLOCKER: 1건** (무효 CSS 클래스로 인한 텍스트 비가시 — 지원서 수정 폼)
- **WARN: 4건** (옛 색 리터럴 잔존)
- **빌드 결과: ✅ exit 0** (`✓ built in 9.38s`, 타입·번들 에러 0)

빌드는 통과하나, 빌드 산출 CSS 대조 결과 **존재하지 않는 클래스(`bg-brand-bg0`)** 가 지원서 수정 폼 4개 토글 그룹에 사용되어 선택 상태에서 라벨이 보이지 않는 가독성 결함이 확정됨. Tailwind는 무효 클래스를 조용히 무시(빌드 에러 없음)하므로 빌드 통과만으로는 잡히지 않는 잠복 결함이며, IT 비전문가 사용자가 지원서를 수정할 때 직접 노출됨. 수정 후 재검증 필요.

---

## 검증 범위 메모

변경 12파일(`MyPage.tsx` + `mypage/{ProfileCard,SavedResultsList,SavedPdfList,QuickActions,SupportSection,MyFavoritesTab,MyApplicationsTab,MyScheduleTab,MySettingsTab,SavedResultDetail,InquiryModal}.tsx`)만 판정 대상.

grep에서 함께 잡힌 `InquiryHistory.tsx / MyRewardsTab.tsx / ProfileSection.tsx / RetirementWidget.tsx / ServiceCards.tsx`의 옛 색 리터럴 다수는 **기획서 B-23에서 "렌더 경로 밖, 제외"로 명시된 미변경 파일**이므로 본 QA 범위에서 제외(별도 부채로만 기록).

---

## 항목별 적출

### 1. 반응형 오버플로/잘림 — ✅ PASS

| 검증점 | 결과 | 근거 |
|--------|------|------|
| 2단 그리드 모바일 안전성 | ✅ | `MyPage.tsx:250` `lg:grid lg:grid-cols-[248px_minmax(0,1fr)]` — `lg:` 프리픽스로 **≥1024px에서만** 그리드 발동. <lg는 블록 1열. 트랙폭 `minmax(0,1fr)`로 콘텐츠 오버플로 차단. |
| 콘텐츠 영역 min-w-0 | ✅ | `MyPage.tsx:291` `<main ... min-w-0>` — 그리드 자식 최소폭 0 보장(긴 텍스트 overflow 방지). |
| 헤더 truncate | ✅ | `MyPage.tsx:235,237` 헤더 `min-w-0` + 부제 `truncate`, 로그아웃 버튼 `shrink-0`. |
| 좌측 메뉴 모바일 가로스크롤 | ✅ | `MyPage.tsx:254` `overflow-x-auto hide-scrollbar`, 탭 `shrink-0`. |
| 금액 오버플로 가드 | ✅ | 금액 span 전반 `font-mono tabular-nums` + 다수 `break-keep`(`SavedResultsList:180`, `MyApplicationsTab:492,499`). 컨테이너 `flex-1 min-w-0`. |

**320px 가용폭 계산 (가장 빡빡한 케이스 = MyApplicationsTab 임금 칩 2열):**
- viewport 320 − 컨테이너 `px-4`(16×2) = **288px** (모바일은 2단 미발동, main 전폭)
- 카드 `p-4`(16×2) → **256px** 카드 내부폭
- 임금 행 `flex gap-2`: 칩1(일급) + 8px + 칩2(시급)
  - 칩 `px-3`(24) + 라벨"일급"(≈26) + gap-1(4) + 금액
  - 일급 "200,000원"(9자, JetBrains Mono 13px tabular ≈ 7.8px/자 ≈ 70px) → 칩1 ≈ **124px**
  - 시급 "12,000원"(7자 ≈ 55px) → 칩2 ≈ **109px**
  - 합계 124 + 8 + 109 = **241px ≤ 256px** → 여유 ~15px, **오버플로 없음**
- 결론: 일급 도메인 상한(20만원대=6자리)에서 안전. 비현실적 7자리(천만원)면 칩에 `min-w-0`/`flex-shrink` 가드가 없어 부풀 수 있으나(미세 부채), 임금 데이터 특성상 실질 영향 없음.

MyScheduleTab 요약(`grid-cols-3 gap-3`)은 `/10000` 만원 축약으로 자릿수 짧아 안전. SavedResultsList 카드 금액은 `flex-1 min-w-0` 안 `break-keep` → 안전.

---

### 2. 업비트 톤 일관성 (옛 색 리터럴 잔존) — ⚠️ WARN 4건

변경 12파일 내 잔존만 집계(미변경 제외 파일은 별도). 토스트 그래디언트·STATUS_CONFIG/getDdayStyle hex는 **데이터 구동 시맨틱 색으로 보존 정상**.

| # | 파일·라인 | 잔존 | 판정 |
|---|-----------|------|------|
| W-1 | `SavedResultsList.tsx:110` | 비활성 탭 hover `hover:bg-slate-200` | ⚠️ 카드 크롬 — `hover:bg-up-hair` 류로 토큰화 권장 |
| W-2 | `SupportSection.tsx:56` | 처리중 배지 `bg-blue-50 text-blue-500` | ⚠️ 상태 배지(완료=emerald/접수=amber와 한 세트)라 시맨틱 보존 여지 있으나, 같은 배지군이 `blue-*` 리터럴이라 톤 일관성상 `brand-bg/up-strong` 검토 권장 |
| W-3 | `MyScheduleTab.tsx:119` | 빈 상태 아이콘 `text-blue-200` | ⚠️ 장식 아이콘. 대비 무관하나 옛 리터럴 — `text-brand-200` 토큰화 권장 |
| W-4 | `SavedResultDetail.tsx:176` | 모달 드래그 핸들 `bg-slate-200` | ⚠️ 비기능 핸들바 — `bg-up-hair` 권장 |

> 참고(보존 정상, 지적 아님): `ProfileCard:52` 아바타 그라데이션 `from-[#3182f6] to-[#60a5fa]`, `MyScheduleTab:130,145` / `MyApplicationsTab:363` 토스트·요약 그래디언트, `InquiryModal:102` `hover:bg-[#1b64da]`(brand-strong와 동일값), `MyApplicationsTab` STATUS_CONFIG/getDdayStyle hex 전부 → 데이터 구동/그래디언트 보존 범위.

---

### 3. 대비 AA — ✅ PASS (조건부)

| 검증점 | 결과 | 근거 |
|--------|------|------|
| 기능성 보조 텍스트 = up-sub(6.7:1) | ✅ | 보조 본문 전반 `text-up-sub`(#565D6A) 사용. 캡션/날짜만 `text-up-caption`(#8E929B) — 규칙 부합. |
| 금액 = brand-strong(5.4:1) | ✅ | 금액 강조 `text-up-strong`(빌드 CSS 실측 `rgb(27 100 218)` = #1B64DA, 5.4:1) — AA 통과. |
| 작은 본문에 brand(#3182f6, 3.6:1) 사용 | ⚠️→정보 | `SupportSection:232` 카테고리 라벨 `text-brand`(10px), `:245` 답변보기 `text-brand`(11px)는 #3182f6(3.6:1)로 **소형 텍스트 AA(4.5:1) 미달**. 단 보조 인터랙션 라벨이고 기획 토큰 규칙상 brand 허용 범위라 BLOCKER 아님. 엄밀 AA로는 `up-strong` 권장(개선 제안). |

---

### 4. 접근성/콘솔 — ✅ PASS (BLOCKER는 5번에서 별도)

| 검증점 | 결과 | 근거 |
|--------|------|------|
| 탭 aria-label/aria-current | ✅ | `MyPage.tsx:269-270` 각 탭 `aria-label={tab.label}` + `aria-current={isActive?'page':undefined}`. 320~399px 라벨 숨김 시에도 aria-label로 접근성 유지. |
| 터치타깃 ≥44px | ✅ | 탭 `min-h-[44px] lg:min-h-[48px]`(:266), 로그아웃 `min-h-[40px]`(:243)은 보조버튼이라 허용선. CTA·바텀시트 버튼 `py-3~3.5`(≈44px+). |
| .map key | ✅ | 모든 리스트 `key={...id}` 부여(TABS/reports/jobs/applications/inquiries/FAQ 등 전수 확인). |
| 콘솔 위험 | ✅ | `console.error`만 catch 내부에 존재(디버그 log 없음). Realtime 채널 `removeChannel` cleanup 정상. |

---

### 5. 빌드 + 무효 클래스 검증 — ❌ FAIL (BLOCKER 1)

**빌드:** `npm run build` → `✓ built in 9.38s`, **exit 0**. 타입 에러·번들 에러 0.

#### 🔴 BLOCKER-1: `bg-brand-bg0` 무효 클래스 → 선택 토글 텍스트 비가시

- **위치:** `MyApplicationsTab.tsx` 라인 **806 / 857 / 875 / 893** (지원서 수정 폼의 성별·90일경험·희망시간대·교통수단 토글 4그룹)
- **코드:** 선택 상태 분기 `'bg-brand-bg0 border-brand text-white'`
- **빌드 CSS 실측 (확정 증거):**
  - `grep ".bg-brand-bg0" dist/assets/index-DYe6-BPO.css` → **NOT FOUND** (룰 미생성)
  - 대조: `.bg-brand-bg{...background-color:rgb(234 242 254...)}` → **정상 생성**
  - tailwind.config.js `colors.brand`에 `bg`는 있으나 `bg0` 키 **부재** → Tailwind가 무효 클래스로 **조용히 무시**(빌드 에러 없음)
- **결함 영향:** 선택된 토글 버튼은 배경색이 적용되지 않고 `text-white`만 남음 → **흰 글씨가 흰/투명 배경 위에 렌더 → 라벨("남성"/"있음"/"오전"/"자차" 등)이 사라짐**. `border-brand`(파란 테두리)만 보여 어떤 값이 선택됐는지 사용자가 판별 불가.
- **노출 경로:** 지원현황 탭 → 지원서 보기 → (applied 상태) 수정하기 → 인적/근무 정보 토글 선택. IT 비전문가 물류 근로자가 본인 지원서 수정 시 직접 마주침.
- **추정 원인:** 의도한 클래스는 `bg-brand`(파란 배경+흰 텍스트). 오타(`brand-bg` + 잘못된 `0` 접미) 또는 치환 과정 산물.
- **수정안:** 4곳 `bg-brand-bg0` → `bg-brand` 치환(흰 텍스트 대비 확보).

---

## 결론

- **판정: ❌ FAIL — 배포 불가.**
- **차단 사유:** BLOCKER-1 (`MyApplicationsTab.tsx:806/857/875/893` `bg-brand-bg0` 무효 클래스 → 지원서 수정 폼 선택 토글 라벨 비가시). 빌드 CSS 대조로 클래스 미생성 확정.
- **수정 필요(필수):** BLOCKER-1 4곳 `bg-brand` 치환 후 재빌드·재검증.
- **수정 권장(WARN, 비차단):** W-1~W-4 옛 색 리터럴 토큰화(`slate-200`/`blue-*` → `up-hair`/`brand-*`), SupportSection 소형 brand 텍스트 `up-strong` 상향.
- **긍정 편향 배제 코멘트:** 반응형·접근성·금액 가드·AA(주요 경로)는 견고하게 계승됨. 그러나 "빌드 통과 = 안전"이 아님을 본 건이 보여줌 — Tailwind 무효 클래스는 빌드 무에러로 통과하나 런타임에서 스타일이 증발한다. 빌드 PASS만 믿고 통과시켰다면 사용자 손에서 터졌을 결함.

---

# 재검증 (코디네이터 수정 후) — 2026-06-30

> 리뷰어 B의 BLOCKER-1 + WARN 4건을 코디네이터가 수정 후 정적 + 빌드 CSS 재검증.

## 재판정: ✅ PASS — 남은 BLOCKER 0

### BLOCKER-1 (bg-brand-bg0 무효 클래스) — 해소 확인
- `grep -rn 'bg-brand-bg0' frontend/src/` → **0건** (수정 전 4건 → 0). 4곳 모두 `bg-brand border-brand text-white`로 치환.
- 빌드 CSS(`dist/assets/index-tG4IYu1V.css`) 교차검증:
  - `.bg-brand-bg0` → **NOT FOUND**(여전히 미생성, 이제 사용처 없음)
  - `.bg-brand{...background-color:rgb(49 130 246...)}` = #3182f6 **정상 생성** → 선택 토글이 솔리드 파란 배경 + 흰 글씨로 **가시화**. 라벨("남성/있음/오전/자차") 표시 정상.

### WARN 4건 — 전부 토큰화 완료
- W-1 `SavedResultsList:110` `hover:bg-slate-200` → `hover:bg-up-hair`
- W-2 `SupportSection:56` `bg-blue-50 text-blue-500` → `bg-brand-bg text-brand-strong`
- W-3 `MyScheduleTab:119` `text-blue-200` → `text-brand-200`
- W-4 `SavedResultDetail:176` `bg-slate-200` → `bg-up-hair`
- 추가(AA 개선 제안 반영): `SupportSection` 소형 brand 텍스트 2곳(카테고리 라벨·답변보기) `text-brand`(3.6:1) → `text-brand-strong`(5.4:1).

### 빌드
- `npm run build` → ✓ built in 9.40s, exit 0. 깨진 토큰 0.

**결론: BLOCKER-1 해소 + WARN 4건 정리 + AA 소형텍스트 상향 → PASS. 핫픽스 배포 가능.**
