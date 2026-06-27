# 더블 리뷰 기록 — 퇴직금 계산 플로우(/severance) 위저드 리디자인

- 브랜치: `redesign/web-layout` · 백업 태그 `pre-redesign-2026-06-27`
- 색: 블루 메인(퇴직금=브랜드 블루) + 회색 + 의미색. 무지개·글래스 제거
- **공유 컴포넌트 `CalcLayout.tsx` 토큰화 → 4개 계산기 플로우에 일괄 반영**
- 검증: Playwright(chromium) 실측 — 게스트 모드, 320/375/768/1280px, 스텝1~4
- 작성일: 2026-06-28
- **최종 판정: PASS (월드클래스 통과)** · tsc/build 0에러 · **계산 로직 불변**

---

## 1. 변경 개요
| 파일 | 변경 |
|------|------|
| `components/calc/CalcLayout.tsx`(4계산기 공유) | ACCENT 무지개(blue/sky/amber/emerald) → brand/accent 매핑(blue·sky→브랜드블루, amber·emerald→그린, 계산기 허브 그룹과 일치). 글래스모피즘→솔리드 흰카드(border-line/shadow-card). CalcHeader sticky top-14. 폰트 키움. 선택/다음 버튼 흰 텍스트 채움색=진한색(대비 AA) |
| `pages/SeveranceFlow.tsx` | divider `bg-white/40→bg-line`, SEO폭 460→520. **계산 로직(28일 블록/qualifying_days≥365) 무변경** |
| `components/calc/PdfSourceSelector.tsx` | ACCENT 무지개→brand/accent, 글래스→솔리드, 저장팝업 createPortal(body) |
| `components/GuestGate.tsx` | 게이트 모달 createPortal(body) + 모바일 하단여백 pb-[88px](BottomNav 가림 해소) |

## 2. 합의 사항 (두 리뷰어 일치 — PASS)
무지개 0(grep+3뷰포트 DOM, blue/sky/amber/emerald는 props 키일 뿐 색클래스 아님), 글래스 제거(솔리드 흰 카드), 320px 오버플로 0(긴 회사명·"기타" 40자 입력 포함), 스텝 전환·진행바·뒤로, 선택/모드선택/간편입력/에러메시지 정상, CalcHeader sticky top-14 TopNav 비충돌, 게스트 게이트 모달, hover reflow 0, tsc/build 0, 계산 로직 불변.

## 3. 이견 / 처리
| 쟁점 | A(총괄) | B(적대) | 처리 |
|------|---------|---------|------|
| **선택/다음 버튼 흰 텍스트 대비** | **WARN** — 흰 텍스트 on bg-brand #3182F6 = 3.71(일반 AA 미달), sub white/85=3.06 | (대비는 "충분"으로 판단) | **A 채택** — 흰 텍스트 버튼 채움색을 `btn`(브랜드-strong #1B64DA=5.41 / 진한그린 #047857=4.6)으로, sub white/95. **실측 selectedBg=rgb(29,101,218)** 확인 |
| **게이트 모달 BottomNav 가림** | (미언급) | **minor(스코프 외)** — "나중에 하기" 버튼이 BottomNav에 25px 가려 클릭 가로채임 | **B 채택**(계산 플로우 게이트라 함께 수정) — GuestGate portal+pb-[88px]. 실측 hitIsButton=true |

## 4. 2차 수정 → 측정 (PASS)
- 선택 버튼 배경: rgb(29,101,218)≈브랜드-strong (흰 텍스트 AA 5.41)
- 게이트 "나중에 하기": elementFromPoint=버튼(클릭 가능), 하단 732<844
- tsc 0

## 5. 다음 화면에 전파될 개선
CalcLayout/PdfSourceSelector/GuestGate는 **4개 계산기 공유** → 실업급여/주휴/연차 플로우도 이번 토큰화·대비·portal 개선이 자동 반영됨(각 플로우 리뷰 시 재확인).

## 6. 남은 개선점 (비차단)
- prefers-reduced-motion(전 화면 공통).
- 입력 필드는 index.css 전역 input 규칙 적용 — 추후 토큰 통일 검토.
