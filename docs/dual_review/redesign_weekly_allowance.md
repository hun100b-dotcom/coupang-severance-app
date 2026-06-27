# 더블 리뷰 기록 — 주휴수당(/weekly-allowance) 설문 플로우+결과

- 브랜치: `redesign/web-layout` · 색: 그린(재직 중 수당 그룹) + 회색 + 의미색(미발생=danger, 15h미만=warning). 무지개·글래스 제거
- 검증: Playwright — 게스트, 간편계산 클라이언트 사이드, 320/375/768/1280px
- 작성일: 2026-06-28 · **최종 판정: PASS** · tsc/build 0 · **주휴공식 (h/40)×8×시급·15h·개근 판정 불변**

## 1. 변경 (878줄 커스텀 설문, className만)
- emerald 테마(리터럴) → accent 그린: 흰텍스트 버튼 `bg-emerald-500`→`bg-[#047857]`(대비 AA), 칩/박스 accent-bg/#047857
- amber(15h 경고)→warning(#B45309), rose(결근)→danger 솔리드
- 글래스(white/40~70·backdrop-blur·rounded-[28px])→솔리드 흰 카드/토큰
- **PDF 정밀 경로 blue→accent 그린**(간편/정밀 금액색 통일)

## 2. 더블리뷰 — 이견/처리
| 쟁점 | 처리 |
|------|------|
| **A FAIL** — PDF 정밀 경로 blue 리터럴 14개 잔존(같은 페이지 금액이 간편=그린/정밀=블루로 갈림) | **수정** — PDF 콘텐츠 blue(아이콘·뱃지·금액·결과박스·탭·버튼·포커스링) → accent 그린. PDF 아이콘 bg 실측 accent-bg(rgb 230,248,241) 확인 |
| B minor(비차단) — 320px 7버튼 그리드 우측 6px 클리핑(360px+ 정상) | 문서화(비차단). gap 조정은 측정 불안정해 원복, 극단 320px 한정 |

## 3. 합의 (양 리뷰어 PASS 영역)
글래스 0, 솔리드 선택버튼 대비(녹색 #047857/danger 솔리드+흰텍스트), 진행바 그린, 미발생 분기 2종(결근·15h미만), 저장 GuestGate portal, 반응형·헤더 비충돌, 로직 불변, tsc/build 0.

## 4. 남은 개선점(비차단)
- 320px 7버튼 6px 클리핑(극단 폭). 미발생 결과 danger 톤 강화 여지. accentColor="emerald" prop 네이밍(실렌더 #047857, 무해).
