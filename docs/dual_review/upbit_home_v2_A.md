# 업비트 홈 시안 v2 — 총괄 리뷰어 A 검수

> 대상: `frontend/src/pages/Home.tsx` (v2 재작성본)
> 기준: `docs/design/upbit_home_analysis.md` §8, 종훈님 첨삭 6개
> 일시: 2026-06-30 · 리뷰어: 총괄 리뷰어 A

---

## 판정: **PASS**

한 줄 사유: 기능·effect·handler 100% 보존(tsc 0·any 0·dead import 0), 첨삭 6개 전부 정확히 반영, 풋터 13개 링크 전부 라이브 라우트 매칭. CRITICAL/MAJOR 없음, MINOR 4건은 모두 후속 폴리시 가능 수준.

---

## 1. 기능/로직 보존 검증 (100% 통과)

v1(HEAD) ↔ v2 라인 대조 결과, 모든 상태·effect·handler가 동작 동일하게 보존됨:

| 항목 | v1 | v2 | 상태 |
|------|----|----|------|
| autoSaved (consumePendingSaveDone, 4s 타이머) | L114-120 | L104-110 | ✅ 동일 |
| fetchRecentJobs (status=active·expires 필터·is_urgent/created_at 정렬·limit 4) | L127-149 | L117-139 | ✅ 쿼리 완전 동일 |
| 채용 fetch useEffect | L151 | L141 | ✅ |
| count 조회 (백엔드 → Supabase 폴백 → 0, countLoaded) | L154-174 | L144-163 | ✅ 동일 |
| 7초 로테이션 setInterval | L177-182 | L166-171 | ✅ 동일 |
| trackAndNavigate + 5개 handler(severance/unemp/weekly/annual/benefits) | L184-197 | L173-186 | ✅ 동일 |
| useNotices / notices | L106 | L95 | ✅ |
| SEO PageMeta (FAQ 3문항·noIndex·canonical·jsonLd) | L228-263 | L253-288 | ✅ 문자열까지 동일 |
| 게스트 진입(로그인 없이 계산기 navigate) | ✓ | ✓ | ✅ 보존 |
| D-day 계산 / wage 폴백(daily>0?일급:시급) | ✓ | L572-583 | ✅ 보존 |

**신규 추가(의도된 것):** `useCountUp(250)` → heroAmount, `useReducedMotion()` → reduceMotion. 둘 다 실제 사용됨.

**누락된 effect/handler: 없음.** v1의 `Container`/`Sparkles`/`fadeUp`/`PanelHeader`는 v2 레이아웃 변경으로 의도적으로 제거되었고, 잔재(dead import/unused) 없이 깨끗하게 정리됨.

---

## 2. 첨삭 6개 반영 검증 (6/6 통과)

| # | 첨삭 내용 | 반영 | 근거 |
|---|----------|------|------|
| 1 | 상단 통계 스트립 + 우측 '내 권리 요약' 카드 제거 | ✅ | v1 L285-304(indexItems 스트립)·L387-445(권리요약 패널) → v2에서 완전 삭제. `indexItems`·`calcRows.fig` 배열도 제거됨 |
| 2 | 히어로 주인공화(clamp 48px·CTA2·캐러셀 점 / 우 카운트업 250·4타일 stagger) | ✅ | L333 `clamp(28px,6vw,48px)`, L351-371 CTA 2개, L374-389 role=tablist 캐러셀 점, L412-421 heroAmount 카운트업, L424-441 heroTiles stagger(delay 0.3+i*0.12) |
| 3 | 전역 업스케일(컨테이너 1200·폰트·간격·버튼) | ✅ | L78 `max-w-[1200px]`, 섹션 패딩 `py-14 md:py-20`, CTA `min-h-[60px]`, 섹션타이틀 24/30px |
| 4 | 큰 스크롤 섹션(3스텝·4계산기·채용2열·피처3+공지/가이드) | ✅ | ② L448-467 3스텝, ③ L469-514 4계산기, ④ L516-628 채용 2열, ⑤ L630-691 피처3+공지+가이드 |
| 5 | 리치 풋터(고객센터 CTA·4단 컬럼·회사정보·면책) | ✅ | L693-755: Headphones 고객센터+1:1문의 CTA(L707-713), footerCols 4단(L719-735), 회사정보+누적+면책(L741-753) |
| 6 | v1 교훈(보조 #565D6A AA·금액 #1B64DA·min-w-0·center_name/benefits 복원) | ✅ | UP.sub=#565D6A(L32), UP.strong=#1B64DA(L36), 채용카드 min-w-0(L589/597), center_name(L609)·benefits(L614-619) 복원 |

---

## 3. 접근성 검증

| 항목 | 결과 | 근거 |
|------|------|------|
| 보조텍스트 대비 AA | ✅ PASS | UP.sub #565D6A 흰 위 6.7:1. 본문·부가설명·desc 전부 sub 사용 |
| 금액 강조 대비 | ✅ PASS | UP.strong #1B64DA 5.4:1. heroAmount·wage·누적수 모두 strong |
| 캡션 #8E929B(3.0:1) 용도 제한 | ✅ PASS | STEP n(L459)·날짜(L666)·D-day라벨(L605)·빈상태 아이콘 등 **비필수만**. 읽어야 하는 본문엔 미사용 |
| 캐러셀 점 role/aria | ✅ PASS | role=tablist + aria-label(L374), 각 점 role=tab·aria-selected·aria-label(L379-381) |
| 터치 타깃 | ✅ 대체로 PASS | CTA 60px, 채용 카드/계산기 카드 큼직, '전체 보기'·'다시 시도' min-h-[44px]. (MINOR 참조) |
| 풋터 링크 데드 | ✅ PASS | 13개 전부 App.tsx 라우트 존재(아래) |

**풋터 링크 ↔ 라우트 매칭(전수 확인):**
`/severance`·`/unemployment`·`/weekly-allowance`·`/annual-leave`·`/guide`·`/guide/severance`·`/guide/unemployment`·`/inquiry`·`/notices`·`/my-benefits`·`/landing`(→`/` redirect)·`/terms-of-service`·`/privacy-policy` — **전부 존재, 데드링크 0**.

---

## 4. 코드 품질

- tsc --noEmit: **0 에러** (직접 실행 재확인).
- `any` 타입: **0건** (`: any`/`as any`/`<any>` grep 무매치).
- dead import: **0건** (lucide 20개 전부 사용, useReducedMotion/Container제거 등 정리 완료).
- 한국어 주석: ✅ 충실(섹션 헤더 ①~⑥, 색토큰 출처·AA 근거, hook 설명).
- 컴포넌트 분리(Wrap/SectionTitle/HighlightCatch/useCountUp): 재사용성 양호.

---

## 5. 지적사항 (CRITICAL 0 / MAJOR 0 / MINOR 4)

### MINOR-1 — 풋터 컬럼 링크 터치 타깃 높이 부족
- 위치: L724-731 footerCols `<button>` (text-[13px], 패딩 없음, gap-2.5)
- 내용: 풋터 링크 버튼이 라인박스(약 18px)만큼만 차지 → 모바일 44px 권장 미달. 데스크톱 풋터라 영향 작지만 모바일에서도 노출됨.
- 제안: `py-1` 또는 `min-h-[36px]` 부여(폴리시 수준, 차단 아님).

### MINOR-2 — 캐러셀 점 자체 터치 타깃 작음
- 위치: L376-387, 점 `h-2`(8px)·width 8~28px.
- 내용: 시각 점은 작아도 되나 클릭 히트영역이 8px라 정밀 탭 어려움. role/aria는 올바름.
- 제안: 시각 점 유지하되 버튼에 `p-2`로 히트영역 확대(선택).

### MINOR-3 — 풋터 '서비스 소개' → /landing 간접 리다이렉트
- 위치: L240 `{ label: '서비스 소개', to: '/landing' }`
- 내용: `/landing`은 App.tsx에서 `/`로 redirect → 한 번 더 튕김. 동작은 정상이나 `/`로 직접 두면 깔끔.
- 제안: `to: '/'`로 단순화(기능 영향 없음).

### MINOR-4 — 캐러셀 점 클릭 시 7초 타이머 미리셋
- 위치: L378 onClick={() => setCopyIdx(i)}
- 내용: 사용자가 점을 눌러 수동 전환해도 background interval은 리셋되지 않아, 직후 최대 7초 내 자동 전환이 끼어들 수 있음. v1에도 동일하던 사양이라 회귀는 아님(UX 폴리시).
- 제안: 필요 시 클릭에서 interval 재시작(차단 아님).

---

## 6. 결론

- **판정: PASS** — 즉시 커밋/배포 가능.
- 로직 회귀 0, 첨삭 6개 정확 반영, 접근성 핵심(AA·aria·데드링크) 통과.
- MINOR 4건은 전부 후속 폴리시 항목으로, 이번 PASS를 막지 않음. 다음 폴리시 패스에서 MINOR-1(풋터 터치타깃)·MINOR-3(/landing→/)부터 처리 권장.
