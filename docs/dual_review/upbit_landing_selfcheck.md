# 업비트풍 Phase 4 — 랜딩 묶음(랜딩·로그인/온보딩/인트로·약관·SEO 6종) 자체검증

> 작성: 2026-06-30 · 브랜치 `redesign/upbit-landing` → main 병합 직전
> 범위: LandingV1(/) · Login · Onboarding · Intro · TermsOfService · PrivacyPolicy · SEO 랜딩 6종(pages/landing/*)
> 계승 패턴: 홈 팔레트 정렬 · up-sub 보조텍스트 AA · 솔리드/헤어라인 톤 · 브랜드색 보존.

## 1. 빌드/타입 (PASS)
- `npm run build` 성공(✓ built ~9.3s), tsc 에러 0.

## 2. 로직(OAuth/SEO) 무변경 (PASS)
- `git diff -- backend/` → 0건.
- `git diff -- frontend/src` 로직 키워드(signInWith·supabase·oauth·provider·useState·useEffect·navigate·jsonLd·SCHEMA·@type·redirectTo·localStorage) 변경 라인 0 (className/style 제외).
- OAuth 로그인·게스트·온보딩 가드·SEO 메타/JSON-LD 데이터 전부 불변. **UI 색/클래스만.**
- 브랜드색 보존: 카카오 `#FEE500`, 구글 로고색 미변경.

## 3. 적용 내용 (홈 톤 정렬)
- **LandingV1 (/)**: 인라인 hex 팔레트 **108곳 홈 토큰 스냅** — 주색 `#2563eb→#1B64DA`(home strong), 네이비 `#0f172a/#1e293b/#1e3a5f→#1A2434`, 슬레이트/그레이 `#475569/#64748b/#6b7280→#565D6A`(up-sub AA), 그린 `#10b981/#059669→#047857`, 레드 `#ef4444/#dc2626→#F04452`. 히어로 헤드라인 기존 대형 스케일(clamp 최대 80px·navy) 유지 → 홈 첫인상과 일관.
- **Login/Onboarding/Intro**: 회색 클래스/캡션 hex → up 토큰, 카카오/구글 버튼색 보존.
- **약관/개인정보**: 본문 `text-gray-*` → up-body/up-sub, 헤딩 up-navy → 가독성·AA 정돈(Terms 19·Privacy 49 클래스 정규화).
- **SEO 랜딩 6종**: 캡션 `#8B95A1→#565D6A`(AA), 회색 클래스 정규화, 브랜드 블루 톤 통일.

## 4. AA/반응형 (PASS — 정적)
- 캡션 그레이 `#8b95a1`(대소문자) **전량 #565D6A(6.7:1)** 치환 → 잔존 0.
- `text-(gray|slate)-(900~500)` 잔존 0.
- 변경은 색상 토큰 한정 → 레이아웃/폭 불변 → 신규 오버플로 위험 없음(320~1280 기존 유지).

## 판정: PASS — BLOCKER 0
OAuth/SEO 로직 무변경 증빙 완료. main 병합·배포 진행.
