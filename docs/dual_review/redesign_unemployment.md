# 더블 리뷰 기록 — 실업급여 플로우(/unemployment) + 결과(ResultUnemployment)

- 브랜치: `redesign/web-layout` · 색: 블루(브랜드/strong) + 회색 + 의미색(수급가능=그린/미충족=빨강). 무지개(sky)·글래스 제거
- 검증: Playwright — 게스트+간편계산 API 모킹, 320/375/768/1280px
- 작성일: 2026-06-28
- **최종 판정: PASS (양 리뷰어 이슈 0)** · tsc/build 0에러 · **수급요건/계산 로직 불변**

## 1. 변경
- `UnemploymentFlow.tsx`: flow-specific `sky-*`(밝은 하늘색=무지개 변형) → brand(블루 그룹), 글래스(white/40·50·70)→솔리드/토큰. 공유 CalcLayout은 severance에서 토큰화 검증됨. 분기/입력 흐름 불변
- `ResultUnemployment.tsx`: 금액 inline `var(--toss-blue)`(3.71)→`#1B64DA`(brand-strong, 5.41), 안내 박스 글래스→솔리드(#F7F9FC+line). GlassCard는 index.css 솔리드화로 전파

## 2. 합의 (두 리뷰어 일치 — 전부 PASS)
sky 잔존 0(grep+3뷰포트 DOM), 글래스 0(결과 카드/안내 backdrop-filter 0), 반응형(중앙 520·CalcHeader top-14 비충돌), 스텝 전환·진행바·선택상태(브랜드 블루)·50세 체크박스, 결과 금액 brand-strong 대비 5.41·미충족 빨강, GuestGate 저장 portal, 320px 오버플로 0(63자 긴 회사명), tsc/build 0, 로직 불변.

## 3. 이견 / 발견
- 실제 이슈 0건. (B: 1차 스크립트의 "금액 미표시"는 320px 계산버튼이 BottomNav에 가린 테스트 클릭 아티팩트로 자체 기각, scrollIntoView 후 정상)
- **A 메모(비차단)**: ResultUnemployment 금액색 `#1B64DA`가 inline 하드코딩 — 향후 `text-brand-strong` 토큰화 시 일관성 유리. (동작/대비 문제없어 이번엔 유지)

## 4. 참고
공유 CalcLayout/GlassCard/index.css 덕분에 위저드·결과 골격은 severance에서 이미 개선됨 → 본 작업은 flow-specific sky/글래스만 정리.
