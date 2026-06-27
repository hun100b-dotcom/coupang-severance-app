# 더블 리뷰 기록 — 마이페이지(/mypage) + 5개 서브탭 리디자인

- 브랜치: `redesign/web-layout` · 백업 태그 `pre-redesign-2026-06-27`
- 색: 블루 메인 + 그린(성공/완료 의미) + 회색 중립 + 의미색(상태). 서비스별 무지개(violet/emerald/amber) 제거
- 검증: Playwright(chromium) — **가짜 Supabase 세션 주입**으로 로그인 우회(로컬 verification 장벽 해소), 320/375/768/1280px
- 작성일: 2026-06-28
- **최종 판정: PASS (월드클래스 통과)** · tsc 0에러

---

## 1. 로컬 검증 장벽 & 해법 (중요 기록)
MyPage는 `!isLoggedIn`이면 `/login`으로 리다이렉트 → 게스트 모드로 못 봄. OAuth는 운영 도메인이라 로컬 로그인 불가.
**해법(운영코드 무수정)**: Playwright에서 localStorage `sb-hmjxrqhcwjyfkvlcejfc-auth-token`에 가짜 세션 + `profiles` 쿼리를 `onboarding_completed:true`로 모킹 → 렌더. (레시피는 리뷰어 프롬프트/progress.md 참조)

## 2. 변경 개요 (Before → After)
| 항목 | Before | After |
|------|--------|-------|
| 셸 헤더 | 자체 뒤로가기+로그아웃 헤더(TopNav와 중복) | 중복 제거, 페이지 제목+인사+로그아웃만 |
| 탭바 | 언더라인 탭, `#3182f6` 하드코딩 | 세그먼트 pill(토큰), 활성 brand, 라벨 상시표시+aria-label |
| 폭 | `max-w-[460px]` 고정 | `max-w-[760px]` 반응형 중앙 |
| 서비스 색코딩 | 퇴직금 blue/실업 violet/주휴 emerald/연차 amber | **전부 브랜드 블루 통일** (SavedResultsList·QuickActions·SavedResultDetail) |
| 카드 외곽 | `rounded-[32px]`+커스텀 그림자+slate | `rounded-xl`+`shadow-card`+`border-line` 토큰 |
| 스케줄 | 보라 그라데이션(#6d28d9), 수입통계 violet | 블루 그라데이션, 통계 블루/그린 |
| 즐겨찾기 | 노랑별(yellow-400) | 브랜드 블루 별 |
| 지원현황 | STATUS_CONFIG 상태색 | **유지**(파랑/초록/주황/빨강 = 의미색, 규칙 부합). 알림 토스트 보라→블루만 수정 |

## 3. 합의 사항 (두 리뷰어 일치 — PASS)
무지개 0(활성 컴포넌트 grep+DOM), 중복 헤더 제거·기능 보존(로그아웃 존재), 탭바 sticky top-14가 TopNav와 비충돌, 데스크톱 안 텅 빔 없음, 5탭 전환 정상, 320px docOverflow 0·truncate 작동, 모달(SavedResultDetail/Inquiry) 열림·닫힘·BottomNav 위 표시, hover reflow 0, 명도대비(로그아웃 4.62/본문 7.11), tsc 0.

## 4. 이견 / 처리 (두 리뷰어가 동일 MAJOR로 수렴)
| 쟁점 | 처리 |
|------|------|
| **[major] `xs:inline` 죽은 클래스** — 320~639px 탭 라벨 숨김+aria-label 부재 (A·B 동시 적출) | tailwind `screens.xs` 추가 후, 최종적으로 **라벨 상시표시**로 전환(375·320px 모두 표시, docOverflow 0) + `aria-label={tab.label}` 부여 |
| [WARN] MyApplicationsTab:363 알림 토스트 보라(#7c3aed) | `#1b64da`(블루)로 통일 |
| [minor] 즐겨찾기 빈 상태 ⭐ 이모지(노랑) | "별 버튼"으로 리워딩 |

## 5. 2차 수정 → 최종 측정 (PASS)
- 탭 라벨 가시성: 375 **true** / 320 **true**, docOverflow 0/0
- aria-label: 존재
- 알림 토스트 보라: 제거(블루)
- tsc: 0에러

## 6. 보존 확인
미읽음 알림 Realtime 구독·read 처리, 문의 생성, reports/inquiries 조회, 온보딩 가드, 모든 핸들러 — **보존**(스타일/구조만).

## 7. 남은 개선점 (비차단)
- SavedResultDetail ESC 닫기 미지원(기존 동작, 범위 밖).
- `ServiceCards.tsx`/`MyRewardsTab.tsx`의 violet은 **dead code**(mypage 미import) — 정리 시 함께 제거 권장.
- 계산기록 필터 탭 320px 내부 가로 스크롤(부모 overflow-x-auto로 흡수, 페이지 영향 없음).
