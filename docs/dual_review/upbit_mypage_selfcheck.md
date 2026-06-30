# 업비트풍 Phase4 — 마이페이지(/mypage) 묶음 자체검증

- 브랜치: `redesign/upbit-mypage`, 기준: main
- 방식: 정적 분석 + 클래스 계산 (★dev 서버 미기동 — 지침 준수), 토큰 변환은 병렬 서브에이전트 3 + 코디네이터 직접
- 일자: 2026-06-30
- 사유: 리뷰어 무한대기 금지 지시 → 자체검증으로 갈음

## 판정: PASS — BLOCKER 0

## 1. 변경 범위 (렌더 경로 12파일 + 레이아웃)
```
MyPage.tsx                +225/-? (2단 사이드바 구조 + 헤더/메뉴 토큰)
MyApplicationsTab.tsx     208 changed (sed 일괄 + 글래스 버튼 2 솔리드화)
MySettingsTab.tsx          86 / SupportSection 54 / MyScheduleTab 70
SavedResultDetail 46 / SavedResultsList 46 / MyFavoritesTab 48
SavedPdfList 32 / InquiryModal 18 / ProfileCard 12 / QuickActions 8
합계 12파일, 429 insert / 424 delete
```

### 비경로(미변환) 파일 — 의도적 제외
- `MyRewardsTab.tsx`·`ProfileSection.tsx`·`RetirementWidget.tsx`·`ServiceCards.tsx`: **어디서도 import 안 됨(데드코드)** → 렌더 안 됨, 변환 불필요.
- `InquiryHistory.tsx`: MyPage가 **타입(`InquiryItem`)만 import**, 컴포넌트 미렌더 → 제외.
- → 실제 화면에 보이는 마이페이지 경로는 전부 변환 완료.

## 2. 레이아웃 (요구사항 ①②)
- **데스크톱 2단**: `lg:grid lg:grid-cols-[248px_minmax(0,1fr)]` — 좌측 세로 메뉴(sticky top-[72px]) + 우측 콘텐츠.
- **모바일 적층**: lg 미만에서 메뉴가 가로 스크롤 pill(sticky top-14)로 적층, 콘텐츠 아래로.
- 5개 서브탭(홈/즐겨찾기/지원현황/스케줄/설정) 전부 우측 콘텐츠로 렌더. C-4 미읽음 배지 보존.
- 컨테이너 max-w-[1120px], 페이지 bg `bg-up-page`(#EEF1F5) 플랫 톤.

## 3. 토큰/AA (요구사항 계승)
- 보조 텍스트 전부 `text-up-sub`(#565D6A 6.7:1). `#8b95a1`(3.0:1) 기능 텍스트 잔존 **0**(렌더 파일 grep).
- 흰텍스트 채움 CTA 전부 `bg-brand-strong`(5.4:1)·hover `brand-700`. 활성 선택 버튼 `bg-brand-strong border-brand-strong`.
- 금액 숫자(일급/시급/수입/가입일수/미읽음수) `font-mono tabular-nums`, 색 `up-strong`(블루)·`up-green`(누적).
- glassmorphism 카드(`bg-white/70 backdrop-blur-xl border-white/40`) 전부 제거 → `bg-white border-up-hair shadow-card`.
- 잔존 `bg-white/20`(SupportSection 컬러버튼 아이콘칩)·`bg-white/60`(MyApplicationsTab 상태컬러카드 임금칩)은 **컬러 면 위 반투명 오버레이**(Home rgba 패턴 동일, backdrop-blur 없음) — 의도 유지.
- 의미색 보존: STATUS_CONFIG/getDdayStyle(지원 상태·D-day 인라인 hex 18줄, **데이터 객체 무변경**), 취소 빨강/완료 그린/접수 amber 배지, 그라데이션 요약 카드.

## 4. 빌드/로직
- `npm run build` exit 0, ✓ 9.31s. tsc 에러 0. MyPage 청크 77.1kB. 기존 chunk-size 경고만.
- **로직 무변경**: `git diff main` 에서 useState/useEffect/useMemo/useCallback/.from/.select/.insert/.update/.delete/.eq/.channel/.subscribe/removeChannel/listApplications/cancelApplication/listFavorites/removeFavorite/listSavedPdfs/deletePdf/applyToJob/notifyNewInquiry/logAccess/Notification./navigate 패턴 변경 라인 **0**(유일 매치는 MyPage 홈탭 `onGoCalculate` 1줄 — 내용 동일·2단 중첩으로 들여쓰기만 변경).
- sed 일괄 치환(MyApplicationsTab)은 className 토큰만 대상, STATUS_CONFIG/getDdayStyle 의미색 hex·gradient 문자열 불일치로 무손상(grep 18줄 보존 확인). `.bak` 잔재 삭제.

## 5. 반응형(정적)
- 320/375: 메뉴 가로 스크롤(hide-scrollbar), 콘텐츠 1열. 카드 내부 truncate/min-w-0 보존.
- 768: 2열 그리드 일부(설정/요약), 메뉴 가로. 1024+: 좌 248px 세로메뉴 + 우 콘텐츠.
- 1280: max-w-1120 중앙 정렬.

## 결론
마이페이지 렌더 경로 전체 업비트풍 토큰화 + 데스크톱 2단/모바일 적층 완료. 로직·의미색 데이터 무변경, 빌드 PASS, AA 충족 → **PASS. main 병합·배포 가능.**
