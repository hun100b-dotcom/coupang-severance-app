# 어드민 묶음2(타겟+콘텐츠/문의) — 총괄 리뷰 A

> 대상: TargetMenu(=대시보드 타겟탭) + NoticesMenu + InquiriesMenu + inquiries/{InquiryTable,InquiryDetailPanel,BulkActionBar,TemplateManager}
> 브랜치: redesign/admin-upbit2 (base main) · 검토일 2026-06-30
> 성격: 엄격 자체검증(총괄 관점) — 실제 명령 실행 기반

## 한 줄 결론 + 판정
**색/스타일/토큰 정돈 + 다크잔재(다크툴팁·rgba(0,0,0) 박스·흰 트랙) 제거만 적용, CRUD/RLS/optimistic 로직 전 파일 불변 — 빌드 통과.** → **판정: PASS (BLOCKER 0)**

## 빌드
- `cd frontend && npm run build` → ✓ built in ~9.3s, TS 에러 0. (기존 청크 경고만)

## 로직 불변 검증표
| 파일 | 핵심 로직 | 변화 |
|---|---|---|
| TargetMenu | getTargetInsights, null-safety(raw.*), funnel/revenue/segments 집계, C팔레트 키 매핑 | 색만(C값→토큰), 로직 불변 |
| NoticesMenu | handleSave/Toggle/Delete `.select('id')` RLS 가드, `data.length===0` 분기, confirm(), trim() | 불변 |
| InquiriesMenu | optimistic setInquiries + 롤백 스냅샷, patchInquiryStatus/Answer, bulkInquiryStatus, exportCsv | 불변 |
| InquiryTable | STATUS_COLOR 값만 토큰화, 토글/44px 히트영역 로직 | 불변 |
| InquiryDetailPanel | onStatusChange/onSaveAnswer await, busyStatus 가드 | 불변 + maxWidth:100vw 추가(320 대응) |
| BulkActionBar | onBulkStatus failedCount 분기 | 색만 |
| TemplateManager | createTemplate/deleteTemplate try/catch | 색만 |

- `git diff main` 에서 supabase 쿼리/핸들러/조건/임계값 변경 줄: **0건**(색/스타일/import/maxWidth만).

## 토큰·AA·반응형
- 잔존 옛 slate/무지개 hex: **0건**(TargetMenu line45 은 주석 내 `#12122a` 텍스트뿐). 다크 `rgba(0,0,0,0.x)` 박스 전부 라이트 토큰으로 교체.
- Tailwind 텍스트 크기 클래스 사용 0건 → 전역 `.text-*` !important 폰트 override 충돌 없음.
- 상태색 위계 묶음1 RecentActivity와 동일(waiting=amber/reviewing=strong/answered=green/closed=sub). UP.sub/green/strong/amber/danger 흰배경 AA 충족.
- UP.caption(≈3:1)은 날짜/카운터/빈상태 등 비필수 캡션 한정.
- 반응형: 테이블 overflowX(InquiryTable/NoticesMenu/TargetMenu heatmap), InquiryDetailPanel `maxWidth:'100vw'` 로 320px 패널 오버플로 차단, 모달 width:100%/maxWidth.

## BLOCKER (치명) — 0건
데이터/권한/RLS/CRUD/되돌리기 변경 없음. 색/치수만, 되돌리기 쉬움.

## 비치명
- TargetMenu 차트 다색(brand/green/amber/strong/navy/sub 6계열)으로 절제 — 일부 블루계열(brand/strong/navy) 인접 톤이나 무지개 금지 규칙 충족.
- 상태배지 `${color}18` 틴트 위 동색 텍스트는 묶음1과 동일 패턴(소형 배지, 허용).

**판정: PASS, BLOCKER 0건**
