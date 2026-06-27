# 더블 리뷰 기록 — 퇴직금 결과(ResultSeverance) + 저장 리포트(/report/:id)

- 브랜치: `redesign/web-layout` · 백업 태그 `pre-redesign-2026-06-27`
- 색: 블루(금액=브랜드-strong) + 회색 + 의미색(수급가능=그린/미충족=빨강). 무지개·글래스 제거
- 검증: Playwright(chromium) — 간편계산 API 모킹(결과) + 가짜세션·reports 모킹(리포트), 320/375/1280px
- 작성일: 2026-06-28
- **최종 판정: PASS (월드클래스 통과)** · tsc/build 0에러 · **계산 로직 불변**

---

## 1. 변경 개요
| 파일 | 변경 |
|------|------|
| `styles/index.css` | `.glass-card`·`.report-accordion-header/body` 글래스(backdrop-blur)→솔리드 흰카드(border-line/shadow-card). `.formula-box`·`.ai-analysis-box` 폰트 키움. `.num-hero .num-digits/unit` 색 → 브랜드-strong(#1B64DA, 대비 5.41). **GlassCard·리포트 쓰는 모든 결과 화면에 전파** |
| `ResultSeverance.tsx` | 참고안내 글래스→솔리드. (계산/판정 로직 무관) |
| `ReportDetail.tsx` | 460px 고정→Container(narrow 640), 헤더 sticky top-14 토큰화, 카드/2x2 셀 토큰(bg-brand-bg), 금액 brand-strong, 캡션 ink-700, 버튼 토큰 |

## 2. 합의 사항 (두 리뷰어 일치 — PASS)
무지개 0(블루+그린/빨강 의미색만), 글래스 제거(카드 backdrop-filter 0), 반응형(결과 520중앙/리포트 Container narrow, 헤더 top-14 TopNav 비충돌), 320px 오버플로 0(긴 회사명 truncate), 금액 강조, GuestGate 저장 모달 portal(BottomNav 위), hover reflow 0, tsc/build 0, 계산 로직 불변.

## 3. 이견 / 처리
| 쟁점 | A(총괄) | B(적대) | 처리 |
|------|---------|---------|------|
| 색 배경 위 캡션 대비 | **WARN** — ReportDetail 셀 라벨 ink-600 on brand-bg = 4.09~4.38(<4.5) | — | **A 채택** — ReportDetail 캡션 ink-600→**ink-700** |
| 결과 금액색 대비/일관 | (간편결과 미지정) | **minor** — ResultSeverance `.num-digits` toss-blue #3182F6=3.71, ReportDetail은 brand-strong로 불일치 | **B 채택** — `.num-digits`→**#1B64DA**(5.41), 실측 rgb(27,100,218) 확인 |
| 리포트 회사명 줄 truncate | — | minor | **B 채택** — company/date 줄 truncate 추가 |

## 4. 2차 수정 → 측정 (PASS)
- 결과 금액색: rgb(27,100,218)=브랜드-strong (대비 5.41)
- ReportDetail 캡션: ink-700(색 배경 위 ≥4.5)
- 회사명 줄 truncate
- tsc 0

## 5. 참고
- 정밀계산 결과의 리포트 아코디언(섹션1~5/차트)은 전체 EmploymentReport 모킹이 복잡해 풀 시각검증은 미수행하나, **솔리드로 바뀐 공유 CSS 클래스(.report-accordion/.formula-box/.ai-analysis-box)를 사용**하므로 동일 개선 적용됨(코드 확인).
- 카카오 공유 버튼 노란색=카카오 브랜드 식별색(예외 유지).
