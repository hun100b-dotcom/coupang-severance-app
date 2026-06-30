# 업비트풍 Phase4 마이페이지 리디자인 — 리뷰어 A (로직 회귀 정적 검증)

- 작성일: 2026-06-30
- 검증 대상 커밋: `614ea2e` (feat(design): 업비트풍 Phase4 — 마이페이지 2단 사이드바 + 서브탭 전체 업스케일)
- 비교 기준(부모): `d301400` / `614ea2e^`
- 검증 방법: `git diff` 정적 분석 + `npm run build` 1회 (소스 수정·dev 서버 기동 없음)

> 비고: 작업 브랜치 `redesign/upbit-mypage`의 변경은 이미 `614ea2e`로 커밋되고 `078b797`로 main에 머지된 상태(워크트리 clean). 따라서 정적 검증은 해당 코드 커밋의 diff(`614ea2e^..614ea2e`)를 기준으로 수행함.

---

## 최종 판정: **PASS**

- BLOCKER: **0건**
- 빌드 결과: **exit 0 / TypeScript 에러 0** (`✓ built in 9.77s`). 경고는 기존 chunk-size(500kB) 경고뿐으로 본 변경과 무관.
- 변경 범위: 명세대로 정확히 12개 UI 파일(MyPage.tsx + mypage/ 11개 컴포넌트). 그 외 소스·마이그레이션·api/supabase·service 변경 0.

---

## 로직 보존 표 (영역별 변경 라인 수)

검증 방법: diff의 추가/삭제 라인에서 **들여쓰기를 제거한 내용 기준 차집합**을 계산. 차집합이 비어 있으면 = 위치 이동(레이아웃 재배치로 인한 들여쓰기 이동)만 발생, 로직 내용 변경 0.

| 로직 영역 | 내용 변경 라인 수 | 판정 |
|---|---|---|
| Supabase 쿼리 (.from/.eq/.select/.update/.delete/.insert) | 0 | ✅ 보존 |
| Realtime (.channel/.subscribe/removeChannel) | 0 | ✅ 보존 |
| API 호출 (listApplications/cancelApplication/listFavorites/removeFavorite/listSavedPdfs/deletePdf 등) | 0 | ✅ 보존 |
| 데이터 변환 (.reduce/.sort/.filter/.map) | 0 (TABS.map 4건은 위치 이동만, 내용 동일) | ✅ 보존 |
| 상수/설정 (calcDday/getDdayStyle/STATUS_CONFIG/FILTER_TABS) | 0 | ✅ 보존 |
| React 훅 (useEffect/useMemo/useState) | 0 | ✅ 보존 |
| 핸들러 (handleDeleteAccount/saveNickname/handleEditSave/handleCreateInquiry/toggleJobNotification) | 0 | ✅ 보존 |
| localStorage / Notification API / requestPermission | 0 | ✅ 보존 |
| 포맷·파싱 (toLocaleString/padStart/parseInt/.replace) | 0 | ✅ 보존 |
| 컴포넌트 prop 전달 (userId={user.raw.id}, onSelectReport, onGoCalculate, onOpenInquiry) | 0 (위치 이동만) | ✅ 보존 |
| JSX 데이터 바인딩 표현식({daysWithCatch} 등 52라인) | 0 (위치 이동만) | ✅ 보존 |

**근거:** 전체 변경 853라인 중 로직 키워드 포함 변경은 MyPage.tsx의 `TABS.map`/`markNotificationsRead()` 4라인뿐이며, 11개 컴포넌트는 로직 키워드 변경 0건. 들여쓰기 무시 차집합(순삭제·순추가) 결과가 로직 라인·데이터 표현식 모두에서 **공집합** → 회귀 0 확정.

---

## 변경 통계 (파일별 +/-)

| 파일 | + | - | 성격 |
|---|---|---|---|
| pages/MyPage.tsx | 115 | 110 | 2단 grid 재배치 + 색토큰/className. 헤더·좌측 nav·우측 main 구조화로 콘텐츠 블록 들여쓰기 이동 |
| MyApplicationsTab.tsx | 104 | 104 | className/색토큰 1:1 치환 (라인 수 동일 = 순수 치환) |
| MySettingsTab.tsx | 43 | 43 | 동일 |
| MyScheduleTab.tsx | 35 | 35 | 동일 |
| SupportSection.tsx | 27 | 27 | 동일 |
| MyFavoritesTab.tsx | 24 | 24 | 동일 |
| SavedResultDetail.tsx | 23 | 23 | 동일 |
| SavedResultsList.tsx | 23 | 23 | 동일 |
| SavedPdfList.tsx | 16 | 16 | 동일 |
| InquiryModal.tsx | 9 | 9 | 동일 |
| ProfileCard.tsx | 6 | 6 | 동일 |
| QuickActions.tsx | 4 | 4 | 동일 |
| **합계** | **429** | **424** | — |

MyPage를 제외한 11개 파일이 모두 +N/-N 동일 라인 수 = className/색토큰 라인별 치환 패턴과 일치. MyPage만 +5 우세인데, 2단 grid wrapper(`lg:grid lg:grid-cols-[248px_minmax(0,1fr)]`)와 `<nav>`/`<main>` 래퍼 추가에 따른 구조 라인 증가로 설명됨(로직 무관).

---

## Tailwind up-* 토큰 1:1 대조

diff에서 신규 사용된 토큰 전부가 `frontend/tailwind.config.js` 정의에 존재함을 확인.

| 사용 토큰(키) | config 정의 | 비고 |
|---|---|---|
| up.page / sunken / navy / body / sub / caption / hair / strong / green / danger | ✅ 전부 존재 (L54~67) | up-surface는 미사용 |
| brand.strong / brand.bg | ✅ 존재 (L19~20) | |

미정의 토큰 사용 0건. 시맨틱 status hex(danger `#F04452` 등)는 config에 보존됨.

---

## 검증 항목 결과 요약

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 변경 범위 = 명세 12파일 | ✅ | numstat 정확히 12개 UI 파일 |
| 2 | Supabase 쿼리·Realtime 불변 | ✅ | 로직 키워드 변경 0 |
| 3 | API 함수 호출 불변 | ✅ | listApplications 등 변경 0 |
| 4 | 상수/핸들러/훅/포맷 불변 | ✅ | calcDday·handleDeleteAccount·toLocaleString 등 변경 0 |
| 5 | prop 전달·데이터 바인딩 불변 | ✅ | 차집합 공집합 (위치 이동만) |
| 6 | 변경이 className/색토큰/레이아웃/주석 한정 | ✅ | 11파일 +N/-N 치환, MyPage grid 재배치 |
| 7 | `npm run build` exit 0 / tsc 0 | ✅ | built in 9.77s, MyPage 청크 정상 생성 |
| 8 | up-* 토큰 config 1:1 일치 | ✅ | 미정의 토큰 0 |

---

## 결론

업비트풍 마이페이지 리디자인 커밋(`614ea2e`)은 **순수 프레젠테이션 변경**으로 확인됨. 계산·데이터·인증·Realtime·포맷·핸들러 로직이 단 한 줄도 변경되지 않았으며(차집합 공집합으로 객관 입증), 모든 데이터 바인딩과 컴포넌트 prop 전달은 2단 grid 재배치에 따른 들여쓰기 위치 이동만 발생함. 신규 Tailwind 토큰은 config와 1:1 일치하고 프로덕션 빌드가 에러 0으로 통과함.

**로직 회귀 0건 — 리뷰어 A 판정 PASS.**
