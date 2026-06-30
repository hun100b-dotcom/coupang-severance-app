# 어드민 Track B-1/B-2 (사용자앱과 디자인 톤 통일) 더블리뷰 A (톤 일치)

- 검증일: 2026-07-01
- 검증자: 독립 리뷰어 A (별도 에이전트, 실측)
- 대상(작업트리 미커밋, admin 전용 3파일): adminTheme.ts·PageHeader.tsx·AdminPage.tsx
- 기준(진실의 출처): ui/Card·Button·Badge·SectionHeader, styles/index.css(.glass-card·slideUpFade·up.*), tailwind.config.js

## 변경 요지
- **B1 단일출처**: adminTheme 에 형태 토큰 `RADIUS{sm8,btn12,content16,card20,pill}`·`SHADOW{card,float}` + 버튼/배지 헬퍼(`btnPrimary/Secondary/Ghost`,`badge(tone)`)·`adminCardFloat`·`ENTER_CLASS` 추가. **`adminCard` 를 radius 12→20 + shadow-card** 로 사용자앱 `.glass-card`/`ui<Card solid>`와 일치.
- **B2 적용**: PageHeader 에 사용자앱 `ui<SectionHeader>` 의 accent bar 추가(공용→보안현황 등 자동반영). AdminPage 메인콘텐츠를 `animate-staggered-fade`(slideUpFade) 래퍼로 감싸 메뉴전환 진입모션.

## 항목별 PASS/FAIL
| # | 검증 | 결과 | 근거 |
|---|---|---|---|
| 1 | 카드 폼 일치 | PASS | `SHADOW.card`·`SHADOW.float`가 tailwind boxShadow / `.glass-card`와 **문자열까지 동일**, radius 20 = rounded-xl/.glass-card |
| 2 | 색 일치 | PASS | UP.* = tailwind up.*(brand#3182F6·strong#1B64DA·hair#E1E4EA…) hex 동일. 신규 헬퍼 UP 토큰만 사용(임의 hex 없음) |
| 3 | 버튼/배지 톤 | PASS | btnPrimary 그림자 `0 4px 14px rgba(49,130,246,0.30)` = ui Button primary와 동일. secondary/ghost/badge 모두 ui 대응과 일치 |
| 4 | accent bar | PASS | 4×18 pill brand = ui SectionHeader(w-1 h-4 rounded-pill bg-brand) 동등. flexShrink·aria-hidden, 레이아웃 무파손 |
| 5 | 모션 | PASS | `.animate-staggered-fade`(slideUpFade 세로) 존재, key=activeMenu 전환마다 재생. translateX 없음→가로 오버플로 위험 없음 |
| 6 | 자동 전파 | PASS | SecurityMenu/DashboardMenu 탭이 adminCard·PageHeader import → 단일출처 수정 자동 반영 |
| 7 | 빌드 | PASS | tsc -b + vite ✓ (에러 0) |

## 결론: **PASS · BLOCKER 0**
마이너(비차단): ①카드 보더 hex가 UP.hair(#E1E4EA) vs 사용자앱 `line`(#E5E8EB) 1px 차(둘 다 헤어라인 회색, 시각차 거의 없음) ②accent bar 18px vs SectionHeader 16px 2px 차. 무해.
