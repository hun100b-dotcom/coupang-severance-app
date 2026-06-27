# 더블 리뷰 기록 — 공지사항(/notices) + 상세 모달 리디자인

- 브랜치: `redesign/web-layout` · 백업 태그 `pre-redesign-2026-06-27`
- 색: 블루 메인 + 회색 중립 (무지개 없음, 토큰화)
- 검증: Playwright(chromium) 실측 — 공지 route 모킹, 320/375/768/1280px, 극단 텍스트, 모달 정렬/오버플로
- 작성일: 2026-06-28
- **최종 판정: PASS (월드클래스 통과)** · tsc/build 0에러

---

## 1. 변경 개요 (Before → After)
| 항목 | Before | After |
|------|--------|-------|
| 폭 | `max-w-[500px]` 고정 | Container 반응형(모바일1/데스크톱2열 그리드) |
| 색 | `text-blue-*`·`gray-*` 하드코딩 | brand/ink/line 토큰 |
| 모달 | `relative z-[1]` 안 → BottomNav가 덮음 + 데스크톱 translate 중앙정렬 | **createPortal(body)** + **flex 중앙정렬** |
| 카드 | 세로 리스트 | 2열 그리드, 높이 통일(items-stretch h-full), hover lift |

## 2. 합의 사항 (두 리뷰어 일치 — PASS)
무지개 0, 모바일1/데스크톱2열 그리드, sticky 헤더(top-14) TopNav 비충돌, 카드 높이 통일(154px), 빈/로딩/목록 상태, 모달 portal로 BottomNav 덮음·z-60, 닫기 3경로(오버레이/X/버튼), 모달 긴 본문 세로 스크롤, hover reflow 0, tsc/build 0.

## 3. 이견 / 라운드별 처리

| 쟁점 | A(총괄) | B(적대) | 처리 |
|------|---------|---------|------|
| **데스크톱 모달 중앙정렬** | **FAIL** — Framer 인라인 transform이 Tailwind `md:-translate-x-1/2` 덮어써 우측 256px 치우침(cx=896) | (극단본문 폭발로 정렬붕괴 별도 지적) | **A 채택** — absolute+translate → **flex 중앙정렬 컨테이너**(jobs 패턴)로 교체 |
| **극단 무공백 텍스트 카드/모달 폭발** | (언급 안 함) | **BLOCKER×2** — 카드 그리드아이템 `min-w-0` 누락(트랙 3405px 폭발), 모달 본문 `break-keep`이 무공백 미줄바꿈 | **B 채택** — 카드 `min-w-0`+제목/본문 `break-words`, 모달 본문 `min-w-0`+`break-words` |
| 날짜 대비 3.04 | **WARN** | — | **A 채택** — ink-500→ink-600 |

> 핵심 교훈(반복): **grid/flex 아이템 `min-w-0` + 텍스트 `break-words`** — jobs에서 나온 패턴인데 notices에 적용을 빠뜨려 동일 BLOCKER 재발. 두 리뷰어가 각각 정렬결함(A)·텍스트폭발(B)을 잡아 상호 보완. **Framer Motion + Tailwind translate 중앙정렬 충돌**도 신규 학습(인라인 transform이 유틸리티를 덮음 → flex 정렬로 회피).

## 4. 2차 수정 → 최종 측정 (전부 PASS)
| 항목 | 결과 |
|------|------|
| 320px 극단본문 카드 그리드 트랙 | 3405px → **288px** 정상, docOverflow **0** |
| 데스크톱 모달 중앙 | cx **640**=winCx 640 (정중앙), w=512(max-w-lg), inside=true |
| 모달 본문 가로 오버플로 | **0** |
| 날짜 대비 | ink-600 (≈4.6 ≥AA) |
| tsc | 0 |

## 5. 보존
useNotices 조회, selected 모달 상태, formatDate — 보존(스타일/구조만).

## 6. 남은 개선점 (비차단)
- prefers-reduced-motion 후속(전 화면 공통).
