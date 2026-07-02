# 어드민 월드클래스 재설계 (방향 전환 · 2026-07-02)

> 종훈님 지시: 이전 "0px 유지·토큰 튜닝" 폐기 → **어드민 UI를 원점에서 새 비주얼로 재구축**.
> 성공 기준 = "확 달라 보이는 것". 기능 100% 보존(데이터 훅·핸들러·supabase/백엔드·권한/RLS·계산 로직 불변), UI 껍데기만.
> 사용자앱(pages/*·ui/*·index.css 전역) 불변 · 어드민 전용 유틸(text-a*·adminUI). 무지개색 금지.

## 새 비주얼 언어
- **딥 네이비 프리미엄 레일**(사이드바) + **라이트 업비트 콘텐츠** 하이브리드(Linear/Vercel/Stripe 톤).
- 큰 히어로 요약바(핵심 KPI 대형 mono) · 글래스풍 상단바(큰 섹션 타이틀) · 프로 카드/큰 라운드/소프트섀도우 3단 · Framer Motion staggered 진입.
- 토큰 단일 출처: `frontend/src/components/admin/shared/adminUI.ts` (INK·RAIL_BG·HERO_BG·ELEV·R·fadeUp).

## ✅ 1차 완료·배포 (커밋 `f7265d1`, main FF push → Vercel 자동배포)
| 파일 | 변경 | 로직 보존 |
|---|---|---|
| `shared/adminUI.ts` | 신설(새 비주얼 토큰) | — |
| `AdminSidebar.tsx` | 딥 네이비 레일로 전면 재구축 | MENU_TREE·문의 대기 실시간 구독·collapsed·onChange 불변 |
| `pages/AdminPage.tsx` | 셸 레이아웃(글래스 상단바·깊이 배경) 재구축 | 게이트/권한/renderMenu/핸들러 전부 보존 |
| `tabs/OverviewTab.tsx` | 히어로+프로카드+모션으로 재구축 | getAdminStats/Analytics/Inquiries·notices·차트 컴포넌트 재사용 |
- 회귀: 사용자앱 3라우트 computed font-size **0px**(main↔브랜치 실측). build OK. 계산 로직 불변.
- 미리보기 스샷: `scratchpad/admin_new_dashboard.png`(실제 토큰/레이아웃 재현 — /admin은 로그인 게이트라 헤드리스 렌더 불가).

## ⏭️ 다음 (같은 새 언어로 순차 재구축·배포)
1. **채용군**: JobPostingsMenu(스텝퍼 폼)·ApplicantsMenu(표)·ConfirmedMenu·RecruitSummaryMenu → 프로 표/카드·히어로 요약·필터 툴바 새 비주얼. ※ApplicantsMenu 대량선택 로직 불변.
2. **콘텐츠**: NoticesMenu·InquiriesMenu(+InquiryTable·DetailPanel·TemplateManager).
3. **시스템**: Members·Accounts·Security·ServerLogs·Audit·Settings(+하위).
4. **대시보드 나머지 탭**: Visitor·CalcStats·Recruit·Target (히어로/차트 카드 통일).
- 각 묶음: [빌더]→[리뷰어 5축]→build→회귀 0px(사용자앱)→커밋·push. 완료마다 스샷 보고.

## 규칙 메모
- `/admin` DB 게이트라 헤드리스 실렌더 불가 → 어드민 시각은 build+로직보존+정적 미리보기 스샷, 사용자앱만 실측 0px.
- 측정 하네스: `scratchpad/measure.mjs`(Playwright headless·reduced-motion·reload 정착). frontend 내부에 `_measure_tmp.mjs`로 복사 후 실행(커밋X).
- 브랜치 `redesign/admin-worldclass-ui`(1차 FF 병합됨). 이후 작업도 동일 브랜치 or 신규 브랜치.
