# 전수 검사 핫픽스 — 5개 이슈 일괄 수정

## 요구사항
- [x] **P1** AdminSidebar MENU_TREE에 'target' 항목 추가 (TargetMenu 진입 불가 버그)
- [x] **P1** AdminPage FLAT_MENUS에 'target' 항목 추가 (모바일 드롭다운)
- [x] **P2** 가이드 4개 페이지 GuideCard `<a href>` → `<Link to>` (SPA full reload 방지)
- [x] **P2** ProfileSection img alt="" → alt={name} (접근성)
- [x] **P3** SeveranceFlow 불필요 빈 useEffect 제거

## 영향 범위
| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/components/admin/AdminSidebar.tsx` | MENU_TREE 시스템 그룹에 target 메뉴 추가 |
| `frontend/src/pages/AdminPage.tsx` | FLAT_MENUS에 target 항목 추가 |
| `frontend/src/pages/guide/SeveranceGuide.tsx` | GuideCard `<a href>` → `<Link to>`, import Link 추가 |
| `frontend/src/pages/guide/UnemploymentGuide.tsx` | GuideCard `<a href>` → `<Link to>`, import Link 추가 |
| `frontend/src/pages/guide/WeeklyAllowanceGuide.tsx` | GuideCard `<a href>` → `<Link to>`, import Link 추가 |
| `frontend/src/pages/guide/AnnualLeaveGuide.tsx` | GuideCard `<a href>` → `<Link to>`, import Link 추가 |
| `frontend/src/components/mypage/ProfileSection.tsx` | img alt="" → alt={name} |
| `frontend/src/pages/SeveranceFlow.tsx` | 빈 useEffect 제거 (import useEffect도 사용처 없으면 제거) |

## 구현 계획
1. AdminSidebar.tsx — MENU_TREE 시스템 그룹 children 배열에 `{ key: 'target', icon: '🎯', label: 'Target' }` 추가
2. AdminPage.tsx — FLAT_MENUS 배열에 `{ key: 'target', label: '🎯 타겟 분석' }` 추가 (대시보드 다음)
3. SeveranceGuide.tsx — GuideCard에 `import { Link } from 'react-router-dom'` 추가, `<a href={href}>` → `<Link to={href}>`
4. UnemploymentGuide.tsx — 동일 패턴
5. WeeklyAllowanceGuide.tsx — 동일 패턴
6. AnnualLeaveGuide.tsx — 동일 패턴
7. ProfileSection.tsx — img alt="" → alt={name}
8. SeveranceFlow.tsx — useEffect 블록 전체 제거, useEffect import 사용처 확인 후 필요 없으면 import에서도 제거
9. `npm run build` 로 TypeScript 빌드 확인
10. 커밋 + 푸시

## 리스크
- AdminSidebar target 메뉴 위치: 시스템 그룹 vs 별도 그룹 → 기존 DEFAULT_PERMS에서 target이 super_admin/admin 권한 그룹이므로 시스템 그룹에 추가
- SeveranceFlow useEffect 제거 시 useEffect import가 다른 곳에서도 사용되는지 확인 필요 (사용처 있으면 import는 유지)
- 가이드 페이지 GuideCard의 SeveranceGuide.tsx에는 inline `<a href>` 도 별도로 존재 (538번째 줄) → 이것도 `<Link to>` 로 교체

## 검증 기준
- TypeScript 빌드 에러 0건
- AdminSidebar에서 Target 메뉴 클릭 시 TargetMenu 렌더링 확인 (코드 레벨)
- 가이드 4개 페이지 GuideCard 내 Link to 사용 확인
- ProfileSection img alt 속성 확인
- SeveranceFlow 빈 useEffect 없음 확인
