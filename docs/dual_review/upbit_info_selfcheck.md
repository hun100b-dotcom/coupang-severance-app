# 업비트풍 Phase 4 — 정보 묶음(공지·가이드·리포트·혜택) 자체검증

> 작성: 2026-06-30 · 브랜치 `redesign/upbit-info` → main 병합 직전
> 범위: 공지(/notices) · 가이드 허브(/guide)+4개 가이드 · 리포트(/report/:id) · 나의 혜택(/my-benefits)
> 계산기 묶음에서 확립한 패턴 계승: up-sub 보조텍스트 AA · 금액 mono+tabular+clamp 가드 · 솔리드 카드+헤어라인 · 업스케일.

## 1. 빌드/타입 (PASS)
- `npm run build` 성공(✓ built ~9.3s). tsc 타입에러 0. (기존 chunk-size 경고만)

## 2. 데이터/로직 무변경 (PASS)
- `git diff -- backend/` → 0건.
- `git diff -- frontend/src` 로직/데이터 키워드(useState·useEffect·supabase·.from(·fetch·logAccess·BENEFITS·GUIDES·TABLE_OF_CONTENTS·navigate·href·payload·SCHEMA) 변경 라인 0
  (유일 매칭은 ReportDetail 금액 `<p>`인데 `{fmt(Math.round(...severance))}` 표현식은 양쪽 동일 — className만 변경).
- useNotices/fetchReport/BENEFITS·GUIDES 데이터·JSON-LD 스키마 전부 불변. **UI(className)만.**

## 3. 화면별 적용
- **공지(NoticesPage)**: 헤더 18px·up-navy, 카드 제목 15px·up-navy, 보더 `up-hair`, 날짜 tabular-nums. (자동 토큰화 처리 반영)
- **가이드 허브(GuideHub)**: 틴트 페이지(up-page) + 솔리드 흰 카드+헤어라인, 큰 헤드라인(28→36px), 색 구분은 아이콘 칩(블루/그린), CTA 56px.
- **가이드 4종**: 페이지 bg→up-page, 회색 리터럴(text-gray-900/800/700/600/500) → up-navy/up-body/up-sub **전량 치환(잔존 0)**, 섹션 카드 헤어라인+shadow-card, 섹션·히어로 타이틀 clamp(22→28px) 업스케일. 히어로 그래디언트는 **주제 그룹색(퇴직·실업=블루 / 주휴·연차=그린)** 유지.
- **리포트(ReportDetail)**: 금액 `clamp(26px,7vw,38px) font-mono tabular-nums break-keep` (strong #1B64DA) — 320px 오버플로 가드, 헤더 18px·up-navy, 보더 up-hair.
- **나의 혜택(MyBenefitsPage)**: `#8b95a1`(3.0:1) → up-sub(6.7:1) **전량(AA 해소)**, `#191f28`→up-navy, `#4e5968`→up-body, 헤더 18px, 히어로 타이틀 clamp 업스케일, 보더 up-hair.

## 4. 반응형/AA (PASS — 정적 점검)
- 잔존 `text-[#8b95a1]` 0(공지·리포트·혜택), 가이드 `text-gray-*` 0 → 기능성 보조텍스트 전부 up-sub(6.7:1)/up-body 이상.
- 리포트·혜택 금액/타이틀 clamp 하한으로 320px 카드 내부 수용.
- 컨테이너 폭 변경 없음(narrow 640·guide 680~840 유지) → 오버플로 위험 신규 도입 없음.

## 판정: PASS — BLOCKER 0
데이터·계산 로직 무변경 증빙 완료. main 병합·배포 진행.
