# 2026-03-13 04:45 — CATCH 비대상자 케어 퍼널 (NonEligibleResult) 구현 계획

## 0. 전제/현재 상황 정리

- **목표**: 설문 결과 “비대상자(자격 미달)”로 판정된 사용자가 이탈하지 않도록,
  1) 탈락 사유 안내,
  2) 첫 출근일 기반 D-Day(+1년) 계산,
  3) 카카오/구글 간편 로그인으로 알림 신청,
  4) 이후 대안 혜택 안내
  까지 이어지는 **3단계 카드형 케어 퍼널**을 구현한다.
- **현재 구조**
  - 퇴직금: `frontend/src/pages/SeveranceFlow.tsx`
    - 자격 미달 시 `s.failed === true` 분기에서 **단일 실패 카드**만 노출.
  - 실업급여: `frontend/src/pages/UnemploymentFlow.tsx`
    - 비대상자 안내 UI는 있으나, 이번 퍼널은 **퇴직금 비대상자(1년/15시간 조건 미달)** 케어를 우선 타깃으로 한다.
  - 결과 화면: `ResultSeverance.tsx`, `ResultUnemployment.tsx`는 이미 잘 구성되어 있으므로 수정 최소화.
- **디자인 시스템**
  - Tailwind 설정(`frontend/tailwind.config.js`) 기준:
    - `toss.blue`, `toss.blueLight`, `toss.text` 등 컬러 팔레트
    - `rounded-card`, `backdrop-blur-glass`, `animation.page-enter` 등 Glass + 토스 스타일.

---

## 1. 전체 아키텍처 & 흐름

### 1-1. 컴포넌트 구조

- `src/components/non-eligible/NonEligibleResult.tsx` (신규)
  - 비대상자 케어 퍼널 전체 컨테이너.
  - 내부에서 **3단계 카드 슬라이드 + 프로그레스 점 + 바텀시트 달력 + 로그인 버튼 + 혜택 카드** 관리.
- `SeveranceFlow.tsx`
  - 기존 `if (s.failed) { ... }` 블록을 `NonEligibleResult` 렌더링으로 교체.
  - 탈락 사유(`reason`)와 다시 시작 콜백(`onRestart`)만 전달.
- (차후) `UnemploymentFlow.tsx`
  - 동일 패턴을 재사용할 수 있도록, `NonEligibleResult`는 **복수 유형(reason 텍스트만 다름)** 을 지원하도록 설계.

### 1-2. 상태(State) 설계 (`NonEligibleResult` 내부)

- `currentStep: 1 | 2 | 3`
- `firstWorkDate: string | null` — YYYY-MM-DD, 첫 출근일.
- `dDayDate: string | null` — `firstWorkDate` + 1년.
- `dateInput: string` — 텍스트 입력 값.
- `isCalendarOpen: boolean` — 바텀시트 달력 열림 여부.
- `calendarYear: number`, `calendarMonth: number` — 달력에 표시 중인 연/월.
- `selectedDate: Date | null` — 달력 선택 값.
- `authStatus: { kakao: 'idle' | 'loading' | 'success' | 'error'; google: 동일 }`
- `skipLogin: boolean` — “나중에 할게요” 를 선택했는지.
- `errorMessage: string | null` — 날짜 형식 등 오류 메시지.

데이터 흐름:

1. `reason`(탈락 사유)와 함께 Step 1 표시.
2. Step 1에서 첫 출근일 입력 → 유효할 때만 `다음` 활성화.
3. Step 2에서 `firstWorkDate + 1년` D-Day 계산/표시 → 로그인 버튼 또는 건너뛰기.
4. 로그인 버튼은 현재 **UI 상태만 변경** (`loading → success`), 실제 Supabase OAuth는 주석 가이드만.
5. Step 3에서 혜택 카드 표시 후 “다시 계산하기”, “홈으로” 버튼 제공.

---

## 2. UI/UX 상세 설계

### 2-1. 공통 레이아웃 & 카드 슬라이드

- 전체 컨테이너:
  - `min-h-screen flex items-center justify-center px-4 py-6`.
  - 내부 래퍼: `w-full max-w-[460px]`.
- 메인 카드:
  - Tailwind 기준:  
    `bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 md:p-8 animate-page-enter`.
- 상단 프로그레스 점:
  - `flex justify-center gap-2 mb-4`.
  - 각 점: `w-2.5 h-2.5 rounded-full bg-slate-300` + 현재 단계는 `bg-toss-blue scale-110`.
- 카드 슬라이드:
  - 슬라이드 래퍼: `relative overflow-hidden`.
  - 내부 트랙: `flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`.
  - `transform: translateX(-((currentStep-1) * 100%))` 로 슬라이드.
  - 각 Step 카드는 `w-full flex-shrink-0`.

### 2-2. Step 1 — 진단/입력

- 구성:
  - 상단 뱃지: “진단 결과”
    - `inline-flex items-center gap-1 px-3 py-1 rounded-full bg-toss-blueLight text-[0.75rem] text-toss-blue font-semibold`.
  - 타이틀:
    - “지금은 실업급여 대상이 아니에요” / “아직은 요건이 조금 부족해요” 등, props로 전달된 `reason`에 맞춰 메인 문구.
  - 탈락 사유 상세:
    - `reason` 문자열 그대로 또는 유형별로 분기.
  - 첫 출근일 입력 영역:
    - 텍스트 인풋 (YYYY-MM-DD):
      - Tailwind: `w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-toss-blue`.
      - 입력 변화 시 `dateInput` 업데이트, 유효하면 `firstWorkDate`와 `selectedDate`, `calendarYear/Month`를 맞춰 줌.
    - 달력 버튼:
      - 인풋 오른쪽에 아이콘 버튼: `button` with calendar icon (예: `📅`).
      - 클릭 시 `isCalendarOpen = true`.
  - 하단 버튼:
    - “다음으로” — `disabled={!firstWorkDateValid}`.
    - 필요시 “건너뛰기”는 Step 2에서만 제공.

### 2-3. Step 2 — D-Day & 로그인

- 상단 텍스트:
  - “첫 출근일 기준 1년이 되는 날은”
  - `dDayDate`를 굵게 강조.
- D-Day 강조:
  - 중앙 영역에 큰 날짜:
    - `text-3xl font-extrabold text-toss-blue font-sans tracking-tight`.
  - 보조 문구: “이 날짜 전까지 다시 한 번 자격을 확인해 보세요.”
- 로그인 버튼 2개 (세로 스택):
  - 공통: `w-full h-12 rounded-[999px] flex items-center justify-center gap-2 text-[0.9rem] font-semibold`.
  - 카카오:
    - 배경: `bg-[#FEE500] text-[#191600]`.
    - 로고: 간단한 SVG 또는 `K` 이모지, 좌측 20px 크기.
  - 구글:
    - 배경: `bg-white text-slate-900 border border-slate-200`.
    - 로고: 구글 G 아이콘 SVG.
- 상태 표현:
  - `authStatus[provider] === 'loading'`:
    - 버튼 안에 작은 스피너(`border-t-transparent border-2 rounded-full animate-spin`) 추가.
    - 텍스트를 “로그인 처리 중...”으로 변경.
  - `'success'`:
    - 상단에 작은 성공 배지: “알림 신청이 완료되었어요 🎉”.
    - 1~2초 후 Step 3로 자동 이동 (`setTimeout`).
- 건너뛰기:
  - 텍스트 버튼: “로그인은 나중에 할게요”.
  - 클릭 시 `skipLogin = true`, 바로 Step 3로 이동.

### 2-4. Step 3 — 혜택 안내

- 상단 타이틀:
  - “지금은 실업급여 대상이 아니어도, 이런 혜택은 확인해 보세요.”
- 혜택 카드 예시 2~3개:
  - 근로장려금(EITC)
  - 긴급복지지원
  - 청년·저소득 근로자 지원 프로그램 등
  - 각 카드 스타일:
    - `rounded-2xl bg-toss-blueLight/40 border border-toss-border p-4 flex flex-col gap-1`.
  - 필요 시 외부 링크 버튼:
    - 작은 `a` 태그: “자세히 보기”.
- 하단 CTA:
  - `PrimaryButton` “다시 계산하기” → `onRestart()` 콜백(SeveranceFlow에서 `reset` 전달).
  - `SecondaryButton` “메인 화면으로” → `navigate('/')`.

---

## 3. 커스텀 달력 바텀시트 설계

### 3-1. 동작 요약

- 인풋 우측 달력 버튼 클릭 → `isCalendarOpen = true`.
- 바텀시트:
  - 배경 오버레이: `fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end`.
  - 시트 본체: `w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-t-[24px] shadow-2xl p-4 pb-6`.
  - 등장 애니메이션: translateY(100%) → 0, opacity 0 → 1.
- 내부 구조:
  - 헤더: 이전/다음 달 버튼 + 현재 연/월.
  - 요일 행: `flex justify-between text-xs text-slate-400`.
  - 날짜 그리드: `grid grid-cols-7 gap-1 mt-2`.
  - 항상 6행(42칸) 유지:
    - 전월 마지막 며칠, 이번 달, 다음달 며칠을 합쳐 42칸.
  - 날짜 셀:
    - 기본: `w-9 h-9 flex items-center justify-center rounded-full text-sm`.
    - 오늘: 테두리 강조.
    - 선택 날짜: `bg-toss-blue text-white`.
    - 다른 달 날짜: `text-slate-300`.
- 선택 로직:
  - 날짜 클릭 시:
    - `selectedDate` 업데이트.
    - `firstWorkDate` 및 `dateInput` 를 `YYYY-MM-DD`로 동기화.
    - 시트 자동 닫기 (`isCalendarOpen=false`).

### 3-2. 텍스트 입력과의 연동

- `dateInput` 변경 시:
  - `parseDate(dateInput)` 로 유효성 검사.
  - 유효하면:
    - `firstWorkDate`, `selectedDate`, `calendarYear`, `calendarMonth` 동기화.
    - `errorMessage = null`.
  - 유효하지 않으면:
    - `firstWorkDate`는 그대로 두되 `errorMessage = 'YYYY-MM-DD 형식으로 입력해 주세요'`.

---

## 4. Supabase Auth 연동 가이드 (주석 코드용)

> 이 구현 단계에서는 실제 OAuth 호출을 하지 않고, **주석으로만 가이드를 남기고 UI 상태만 관리**한다.

- 추후 생성 예정 파일: `frontend/src/lib/supabaseClient.ts`
  - 예시:
    ```ts
    // import { createClient } from '@supabase/supabase-js'
    //
    // export const supabase = createClient(
    //   import.meta.env.VITE_SUPABASE_URL!,
    //   import.meta.env.VITE_SUPABASE_ANON_KEY!,
    // )
    ```

- `NonEligibleResult` 내 로그인 버튼 onClick 예시(주석):
  ```ts
  // TODO: 실제 OAuth 연동 시 주석 해제
  // const { data, error } = await supabase.auth.signInWithOAuth({
  //   provider: 'kakao',
  //   options: {
  //     redirectTo: `${window.location.origin}/auth/callback`,
  //   },
  // })
  ```

UI에서는:

- 클릭 → `authStatus.kakao = 'loading'`.
- 1.5초 후 `authStatus.kakao = 'success'`, Step 3 이동 (임시 모의 흐름).

---

## 5. 카카오/구글 Redirect URI (설정용 정보)

- Supabase 프로젝트 URL:  
  `https://hmjxrqhcwjyfkvlcejfc.supabase.co`

### 5-1. 카카오/구글 개발자 콘솔에 등록할 Redirect URI

- 공통:
  - `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback`

### 5-2. 애플리케이션 도메인별 redirectTo (추후 사용)

- 로컬 개발:
  - `http://localhost:5173/auth/callback`
- 프로덕션(예시):
  - `https://coupang-severance-app.vercel.app/auth/callback`

Supabase 설정(인증 → Redirect URLs)에는 위 도메인들을 추가해 두고, 실제 OAuth 연동 시 `redirectTo` 옵션에 사용한다.

---

## 6. 구현 단계 체크리스트

1. `NonEligibleResult` 컴포넌트 파일 생성 (`src/components/non-eligible/NonEligibleResult.tsx`).
2. 3단계 카드 레이아웃 + 프로그레스 점 + Step 전환 로직 구현.
3. 바텀시트 달력 컴포넌트 구현(6주 고정, 월 이동, 날짜 선택, 텍스트 입력 연동).
4. Step 2 D-Day 계산 및 카카오/구글 로그인 버튼 UI/상태 구현 (Supabase 호출은 주석 예시만).
5. Step 3 혜택 안내 카드 및 CTA 버튼 구현.
6. `SeveranceFlow.tsx`에서 `s.failed` 분기를 `NonEligibleResult`로 교체하고, 탈락 사유(reason) 전달.
7. 각 단계 UI를 모바일 기준으로 실제 렌더링/동작 확인.
8. 필요한 경우, `UnemploymentFlow.tsx`에서도 공용으로 재사용하도록 reason만 바꿔 연결(추가 작업).

---

> 이 문서는 **2026-03-13 04:45** 에 작성된 NonEligibleResult 케어 퍼널 작업 계획이며, 이후 변경 시 새 타임스탬프 플랜 파일을 추가로 남긴다.

