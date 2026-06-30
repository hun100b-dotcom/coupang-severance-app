# 어드민 묶음3(채용 클러스터) — 총괄 리뷰 A

> 대상: menus/{JobPostingsMenu, ApplicantsMenu, ConfirmedMenu, RecruitSummaryMenu}.tsx
> 브랜치 redesign/admin-upbit3 (base main) · 2026-06-30 · 엄격 자체검증(총괄, 실측)

## 한 줄 결론 + 판정
**색/스타일/import 외 변경 없음 — 공고 CRUD·긴급토글·섹션변경·soft-delete·지원자 단건/대량 상태변경·알림 insert·확정/요약 집계 전부 불변, 빌드 통과.** → **판정: PASS (BLOCKER 0)**

## 빌드
- `npm run build` → ✓ ~9.3s, TS 에러 0.

## 로직 불변 검증표
| 파일 | 핵심 로직 | 변화 |
|---|---|---|
| JobPostingsMenu (1411줄) | job_postings insert/.select('id'), update().eq, 긴급토글 is_urgent, 섹션변경, soft-delete status='deleted', 스텝퍼 모달 검증 | 색만 |
| ApplicantsMenu | handleUpdateStatus(단건) .update().eq, handleBulkUpdate .update().in, notifications insert, work_date 분기, CSV | 색만 |
| ConfirmedMenu | job_* select 집계, 기간필터, KPI, recharts | 색만(차트 fill/stroke 토큰) |
| RecruitSummaryMenu | summary 집계, work_confirmed_at KPI, recharts | 색만 |

- `git diff main` 의 +/- 라인에서 supabase 쿼리/핸들러/조건/집계 식별자 변경: **0건**. 추가/삭제 줄 100% color/background/border/fill/stroke/import.

## 토큰·AA·반응형
- 잔존 옛 slate/무지개 hex(#a78bfa/#7c3aed/#ffb400/#3fc878/#f04452 등): **0건**(#fff 흰색 제외). 무지개 퍼플 #a78bfa/#7c3aed → UP.strong(블루)로 de-rainbow.
- 다크 잔재: 모달 그림자 rgba(0,0,0,0.3) → rgba(16,24,40,0.18) 완화. 다크 박스 0.
- recharts JSX hex(`fill="#..."`/`stroke="#..."`) 11곳 전부 `{UP.token}` 로 교체.
- Tailwind 텍스트 크기 클래스 0건 → 전역 !important 폰트 override 회피.
- 상태색 위계 묶음1/2와 통일: 확정/활성=green, 거절/긴급=danger, 대기/긴급보류=amber, 블루=brand/strong.
- 반응형: 4파일 테이블 overflowX/minWidth 유지, 모달 maxWidth 유지(JobPostingsMenu 스텝퍼·ApplicantsMenu 상세).

## BLOCKER (치명) — 0건
데이터/권한/RLS/CRUD/상태변경/알림 변경 없음. 색/치수만.

## 비치명
- 차트 시리즈 일부 블루계열(brand/strong) 인접 톤 — 무지개 제거 트레이드오프.
- 긴급/대기 amber가 UP.amber(#B45309 진한 앰버)로 통일되어 기존 #ffb400 대비 톤 차분해짐(의도된 절제).

**판정: PASS, BLOCKER 0건**
