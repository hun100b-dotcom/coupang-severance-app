# 기획서 — 업비트풍 Phase4 마이페이지(/mypage) + 5개 서브탭 리디자인

> 작성: 2026-06-30 · 브랜치: `redesign/upbit-mypage` (기준 main d301400)
> 범위: 마이페이지 묶음 **UI only**. 데이터/프로필/이력/탈퇴/문의 로직 불변. admin·계산기·채용 파일 무수정.

## A. 목표
홈·계산기·채용에서 확립된 업비트풍 패턴(전역 `up.*`/`--up-*` 토큰, maxWidth.content=1280, AA 보조텍스트 `up-sub`, 주 CTA `brand-strong`, 금액 `font-mono tabular-nums` + 오버플로 가드)을 마이페이지 전체에 계승.

## B. 대상 파일 (렌더 경로 한정)
1. `pages/MyPage.tsx` — 레이아웃 셸 + 탭 네비
2. `components/mypage/ProfileCard.tsx` (홈탭)
3. `components/mypage/SavedResultsList.tsx` (홈탭·계산이력)
4. `components/mypage/SavedPdfList.tsx` (홈탭·글래스 제거)
5. `components/mypage/QuickActions.tsx` (홈탭)
6. `components/mypage/SupportSection.tsx` (홈탭·고객지원)
7. `components/mypage/MyFavoritesTab.tsx` (즐겨찾기)
8. `components/mypage/MyApplicationsTab.tsx` (지원현황)
9. `components/mypage/MyScheduleTab.tsx` (스케줄)
10. `components/mypage/MySettingsTab.tsx` (설정 — /settings 공유)
11. `components/mypage/SavedResultDetail.tsx` (모달)
12. `components/mypage/InquiryModal.tsx` (모달)

※ 제외(렌더 경로 밖): ProfileSection / ServiceCards / MyRewardsTab / RetirementWidget / InquiryHistory(컴포넌트, 타입만 import).

## C. 레이아웃 (요구 1)
- **데스크톱(lg+)**: 2단 — 좌측 sticky 사이드바(프로필 미니 + 5탭 세로 메뉴) + 우측 콘텐츠. `lg:grid lg:grid-cols-[clamp(240,...,280)px_1fr] lg:gap-8`, 컨테이너 `max-w-[1080px]`.
- **모바일/태블릿(<lg)**: 적층 — 가로 스크롤 pill 탭(sticky) 위, 콘텐츠 아래.
- 페이지 배경 `bg-up-page`, 헤더 타이포 업스케일(제목 26→32px, `up-navy`).

## D. 토큰 매핑 규칙 (요구 2·3)
| 기존 | 치환 |
|------|------|
| `#191f28` 헤딩 | `text-up-navy` |
| `#4e5968` 본문 | `text-up-body` (보조성이면 `text-up-sub`) |
| `#8b95a1` 기능성 보조 | `text-up-sub`(AA 6.7:1) / 날짜·비필수만 `text-up-caption` |
| `slate-*`/`gray-*` 배경·보더 | `up-sunken` / `up-hair` |
| `bg-[#F2F4F6]`·`bg-[#F7F9FC]` | `bg-up-sunken` |
| `blue-*` | `brand`/`brand-bg`/`brand-strong` |
| 카드 radius `[20~32px]` | `rounded-2xl` + `border-up-hair shadow-card` |
| 글래스(`backdrop-blur`/`bg-white/70`) | 솔리드 흰 + `border-up-hair` |
| 금액/숫자 | `font-mono tabular-nums`, 주 금액 `text-up-strong`, `break-keep` 가드 |
| 주 CTA | `bg-brand hover:bg-brand-strong text-white`(또는 `brand-strong`) |

- **로직 보존**: STATUS_CONFIG(지원상태)·getDdayStyle(D-day) 등 **데이터 구동 시맨틱 색**은 유지(채용 그린 #047857 = up-green과 동일). useEffect/fetch/Realtime/cancel/delete/save 로직 0줄 변경.
- 터치타깃 ≥44px, aria 유지. 320/375/768/1280 오버플로·잘림 0.

## E. 검증 (요구 4·5)
1. `npx tsc --noEmit` 0 + `npm run build` exit 0.
2. 320/375/768/1280 정적 점검(가용폭 계산), 콘솔 0.
3. 더블리뷰 A(로직회귀)·B(디자인 QA) → `docs/dual_review/upbit_mypage_*`. 결과 없으면 자체검증 갈음.
4. main 병합 + push + 배포(6-step).

## F. 리스크
- R1 2단 레이아웃이 모바일 적층과 충돌 → lg 분기로 분리, 320 1열 기본.
- R2 금액 오버플로 → mono+tabular+break-keep+min-w-0 가드.
- R3 시맨틱 상태색 토큰화 오버 → 데이터 구동 색은 보존(회귀 위험 차단).
