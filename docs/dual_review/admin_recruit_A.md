# 어드민 리디자인 묶음3(채용 클러스터) 총괄 리뷰 A

> 대상: `frontend/src/components/admin/menus/{JobPostingsMenu, ApplicantsMenu, ConfirmedMenu, RecruitSummaryMenu}.tsx` (4파일)
> 브랜치: redesign/admin-upbit3 → main 머지 완료 · 검토일 2026-06-30 · 실제 Bash/Read/Grep 호출 기반
> 단일 토큰 출처: `frontend/src/components/admin/shared/adminTheme.ts` (UP.*)

## 한줄 결론
하드코딩 hex → UP.* 토큰 교체만 한 순수 UI 변경. 552개 변경 라인 중 **스타일/토큰 외 로직 라인 0건**(핸들러·supabase·useState·필터·차트 dataKey 무손상), 6자리 hex 잔재 0건, 다크박스 0건, Tailwind text-size 클래스 0건, 빌드 통과. **판정: PASS / BLOCKER 0건.**

- diff 기준: `git diff 281b801 16924dd` — 281b801=묶음3 머지 직전 main(HEAD@{1}), 16924dd=채용 클러스터 토큰화 커밋
- 현재 git 상태: 해당 커밋이 이미 main(117f4fc)에 머지·워킹트리 clean. 따라서 단순 `git diff main`은 빈 결과 → 커밋 16924dd vs 그 부모(281b801)로 대조
- 변경 규모: 4파일 +278 / -274 (커밋 16924dd엔 본 4파일 + 리뷰문서 2개만 포함, 비채용 소스 변경 0)

---

## 1. 빌드 결과 (실측)
```
cd frontend && npm run build → ✓ built in 9.56s
```
TS 컴파일·Vite 번들 통과, 에러 0. (index.js 533kB / TargetTab 543kB / BarChart 379kB chunk>500kB 경고는 사전 존재, 본 변경 무관.)

---

## 2. 로직 불변 검증표 (라인 전수 대조)

**핵심 측정 1**: diff의 552개 +/- 라인에서 색/스타일 패턴(color/background/border/fill/stroke/boxShadow/UP.*/CHART_SERIES/hex/rgba/adminCard/thLabel/numeric/adminTheme)을 제외하면 **남는 라인 0건** (grep 실측). 스타일·토큰 외 변경이 한 줄도 없음.

**핵심 측정 2**: logic 키워드(supabase/handleSave/handleChangeSection/handleDelete/fetch*/handleExportCsv/useState/useCallback/useEffect/.insert/.update/.delete/.select/onClick/dataKey/filter/map/reduce/import) grep → 매칭 라인은 전부 둘 중 하나뿐:
- `+import { UP } from '../shared/adminTheme'` (토큰 import 추가)
- recharts `fill=`/`stroke=`/`color:` 값 교체 (예 `fill="#3182f6"` → `fill={UP.brand}`) — **dataKey 문자열·option value 100% 보존**

| 파일 | 보존 대상 로직 | diff에 로직 라인? | 판정 |
|---|---|---|---|
| JobPostingsMenu.tsx | 공고 CRUD(handleSave/insert/update/delete), 폼 스텝(formStep), 긴급토글, 상태필터, use_task_wages 분기, 미리보기 | 색/스타일만 (245줄 전부) | ✅ 불변 |
| ApplicantsMenu.tsx | 지원자 fetch·상태변경, 회사필터 `<option>`(value 보존), BarChart(applied) | option value·dataKey 보존, color/fill만 | ✅ 불변 |
| ConfirmedMenu.tsx | 확정자 집계, 카드 grid(repeat 2,1fr), ellipsis 표시 | 색만 (91줄) | ✅ 불변 |
| RecruitSummaryMenu.tsx | LineChart(지원/확정/거절)·BarChart(지원/확정/목표) 시리즈, 집계 테이블 | dataKey "지원/확정/거절/목표/date/name" 전부 보존, stroke/fill만 토큰화 | ✅ 불변 |

**데이터/권한/CRUD/필터/상태전이·차트 집계 로직 변경 0건.**

---

## 3. 토큰·다크 잔재 (grep 실측)
- **6자리 hex 잔재**: 4파일 전부 **0건** (`grep -oE '#[0-9a-fA-F]{6}'`).
- **3자리 hex**: 총 46건 전부 `#fff`(불투명 흰 배경·흰 버튼텍스트) — 묶음2 패턴과 동일, 허용.
- **다크박스 `rgba(0,0,0,...)`**: 4파일 **0건** (모달 스크림 포함 검정 배경 잔재 없음).
- **rgba 브랜드 틴트**(허용): blue(49,130,246)·green(49,200,100 / 34,197,94)·red(240,68,82)·amber(255,180,0)·navy(16,24,40) 계열만. 검정 틴트 없음.
- recharts 색 전부 UP 토큰: `UP.brand`(지원/applied), `UP.green`(확정), `UP.danger`(거절), `UP.caption`(목표·보조), `UP.sub`(축눈금), `UP.hairSoft`(그리드).

---

## 4. Tailwind 텍스트 클래스 함정 (index.css `.text-*` !important)
- 4파일 `text-(xs|sm|base|lg|xl|2xl|3xl)` **0건**, `text-[Npx]` **0건** (grep 실측 → NONE FOUND).
- 모든 폰트 크기 인라인 `fontSize: '0.xxrem'/px` 유지 → 전역 폰트 override로 테이블·배지 깨질 위험 없음. ✅

---

## 5. 차트 색 (recharts)
- RecruitSummaryMenu LineChart: 지원=UP.brand / 확정=UP.green / 거절=UP.danger, 그리드 stroke=UP.hairSoft, 축 fill=UP.sub.
- RecruitSummaryMenu BarChart: 지원=UP.brand / 확정=UP.green / 목표=UP.caption(회색 보조 시리즈).
- ApplicantsMenu BarChart: applied=UP.brand.
- **dataKey/집계 불변**: "지원·확정·거절·목표·applied·date·name" 문자열 교체 전후 동일. 데이터 파이프라인 무영향. ✅

---

## 6. AA 대비
| 토큰 | 값 | 흰 배경 | 용도 | 판정 |
|---|---|---|---|---|
| UP.sub | #565D6A | 6.7:1 | 축 눈금·보조 라벨 | ✅ |
| UP.navy | #1A2434 | ~13:1 | `<option>` 텍스트·헤딩 | ✅ |
| UP.green | #047857 | AA | 확정/활성/완료 스텝 | ✅ |
| UP.strong | #1B64DA | 5.4:1 | 강조 | ✅ |
| UP.amber | #B45309 | AA | 대기 | ✅ |
| UP.danger | #D32F3A | AA | 거절·삭제 | ✅ |
| UP.caption | #8E929B | ~3:1 | 보조만 | 비필수만 ✅ |

- UP.caption 사용처(grep 전수): 폼 스텝 설명(step.desc), placeholder(회사명/센터명/지역), "불러오는 중/데이터 없음/미입력/처리완료" 헬퍼, "+N" 오버플로 배지, 차트 "목표" 보조 시리즈 — **전부 비필수 보조정보**. 본문·중요 라벨 오용 0건. ✅

---

## 7. 반응형 320~1280 (코드 레벨)
| 파일 | overflowX:auto | clamp() | minmax() | 비고 |
|---|---|---|---|---|
| JobPostingsMenu | 1 | 3 | 2 | 테이블 가로스크롤 + 폼 grid minmax |
| ApplicantsMenu | 1 | 1 | 0 | 지원자 테이블 가로스크롤 |
| ConfirmedMenu | 0 | 1 | 0 | 테이블 없음(카드 grid repeat(2,1fr)), overflowX 불필요 |
| RecruitSummaryMenu | 1 | 1 | 1 | 집계 테이블 가로스크롤 |
- 테이블 보유 3파일 모두 overflowX:auto, ConfirmedMenu는 카드 그리드라 해당 없음. clamp 패딩·minmax 그리드 존재. 320px 대응 OK.

---

## 8. 비치명 관찰 (BLOCKER 아님)
1. RecruitSummaryMenu BarChart "목표" 시리즈가 UP.caption(#8E929B 회색)으로 인접 막대 대비 채도 낮음 — 의도된 "참고선" 절제 표현. 지원/확정 막대는 brand/green로 충분 구분, 기능 무영향.
2. ConfirmedMenu는 테이블 대신 카드 grid 구조라 묶음2 테이블 패턴과 상이 — 데이터 성격 차이로 정상, overflowX 미적용 타당.
3. ApplicantsMenu·ConfirmedMenu 빈상태/처리완료 텍스트가 UP.caption(~3:1) — 비필수라 허용 범위. 가독 강화 원하면 후속 UP.sub 승격 후보.

---

## 최종 판정
**PASS — BLOCKER 0건.** 빌드 통과(9.56s), 4파일 552개 변경 라인 전수 검사 결과 스타일/토큰 외 로직 라인 0건(CRUD·핸들러·supabase·필터·useState·차트 dataKey 전부 무손상), 6자리 hex·다크박스·Tailwind text-size 클래스 0건, AA 충족, 320~1280 대응. 색만 바꾼 순수 UI 변경 확정. 커밋·배포 가능.
