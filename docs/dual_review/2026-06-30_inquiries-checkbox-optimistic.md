# 더블리뷰 — 어드민 문의 UI 버그 2건 (체크박스 / 낙관적 업데이트)

- **일자**: 2026-06-30
- **대상 파일**: `InquiriesMenu.tsx`, `InquiryDetailPanel.tsx`, `BulkActionBar.tsx`, `InquiryTable.tsx`
- **리뷰 방식**: 독립 에이전트 2명 병렬(A=정확성/회귀/상태관리, B=UX 체감/엣지케이스/접근성) + 로컬 실제 클릭 검증

---

## 1. 수정한 버그

### 버그1 — 체크박스 "이중 토글" (클릭 위치 어긋남)
- **근본 원인**: `InquiryTable.tsx`에서 `<td onClick={stopPropagation + onToggle}>` 와 내부 `<input onChange={onToggle}>` 가 **둘 다** 토글을 호출. 체크박스 정중앙을 누르면 input의 onChange(토글①) + 클릭이 td로 버블링되어 onClick(토글②) = **2회 토글 = 제자리**. 그래서 체크박스 우측 빈칸(td 패딩)을 눌러야만 1회 토글되는 것처럼 보였다.
- **처치**: `<label>` 하나가 유일한 토글 경로가 되도록 구조 변경. `label onClick`은 `stopPropagation`으로 **행(row) 선택만 차단**(토글 안 함), 내부 `input onChange`만 토글. `minWidth/minHeight 44px`로 터치타깃 확보. 헤더 전체선택도 동일 패턴으로 통일.

### 버그2 — 상태변경/일괄변경/답변저장 반응 지연
- **근본 원인**: 직전 FIX에서 "백엔드 await → 전체목록 refetch await" 로 바꾸며 낙관적 업데이트를 제거. Render(싱가포르) 콜드스타트 + 왕복 + 전체 재조회를 **블로킹**으로 기다려 체감 지연.
- **처치**: 낙관적 업데이트를 **부모(InquiriesMenu)로 끌어올려 단일 진실원천화**. 클릭 즉시 UI 반영 → 백그라운드 persist → **실패 시에만 롤백 + 에러 표시**. "가짜 성공" 방지(실제 persist를 await하므로 실패하면 반드시 롤백). 전체 refetch 제거, 성공 시 낙관값 유지(깜빡임 없음). 처리 중 버튼 비활성으로 중복클릭만 차단하되 화면 전환은 즉각.

---

## 2. 리뷰어 A (정확성/회귀/상태관리) — 판정: PASS (조건부)

- 버그1: `<label>` 단일 토글 구조 정확. input 직접/label 여백 클릭 모두 onChange 1회. stopPropagation은 click 핸들러라 토글을 막지 않고 행 onSelect만 차단. **회귀 없음.**
- 버그2: 단건/답변/일괄 모두 스냅샷 → 즉시 반영 → 실패 롤백 → throw 일관. `key={id}` 로 status 변경 시 remount 아닌 re-render(textarea 보존). 백엔드 계약(`failed_ids`, `status:'answered'`) 일치.
- 후속 보강 지적 (이번 커밋에 **반영 완료**):
  - **[HIGH] id 정규화 비대칭** — `selected` Set이 원본 타입인데 bulk만 `String()`. → `selected`를 `Set<string>`로 좁히고 모든 add/has를 `String(id)`로 통일.
  - **[MEDIUM] 낙관적 답변저장 `answered_at` 누락** — 저장 직후 CSV에서 답변일시 빈값. → 낙관적으로 `answered_at: new Date().toISOString()` 동반.
  - **[MEDIUM] 단건 롤백이 리스트 전체 덮어쓰기** — rapid 교차클릭 시 다른 낙관적 변경 삼킴. → bulk처럼 **id 한정 함수형 롤백**으로 변경.

## 3. 리뷰어 B (UX 체감/엣지케이스/접근성) — 판정: PASS

- 버그1: 이중 토글 경로 제거 확인, 행 선택과 분리, 44x44 히트영역 충족.
- 버그2: 클릭 즉시 반영, 패널 하이라이트 즉시 이동, textarea 입력 보존, 부분실패 시 선택 유지 확인.
- 후속 보강 지적 (이번 커밋에 **반영 완료**):
  - **[LOW] 저장 버튼 대비 미달** — 파란 배경(#3182f6)에 검정 글씨(#0f172a)는 WCAG AA 미달 + 앱 내 다른 버튼은 흰색. → `color: '#fff'`로 통일.
- 보류(설계 의도와 일치): 전체 refetch 제거로 인한 reconcile 부재는 프롬프트가 명시한 "블로킹 refetch 금지" 의도이며, 실제 persist를 await하므로 정직함 유지.

---

## 4. 로컬 실제 클릭 검증 (수정된 InquiryTable 컴포넌트 직접 구동)

어드민 CRM 본 화면은 인증+백엔드 시드데이터가 필요해, **수정된 실제 `InquiryTable`을 import**하고 부모의 낙관적 핸들러를 동일 재현한 임시 하네스로 실제 클릭 검증(검증 후 하네스 완전 제거).

| 검증 항목 | 결과 |
|-----------|------|
| 체크박스 정중앙 클릭 1회 → 선택 1회 | ✅ `selected=[1]` (이중 토글 없음) |
| 다시 클릭 → 해제 | ✅ `selected=[]` |
| label 여백 클릭 → 1회 토글 | ✅ |
| 내용 셀 클릭 → 행 선택만(토글 X) | ✅ `active=1`, `selected` 불변 |
| 상태변경 즉시 반영 + persist OK | ✅ `[즉시] answered` → `[persist OK]`, 롤백 없음 |
| persist 실패 시 롤백 | ✅ `[즉시] answered` → `[롤백] reviewing (persist 실패)` |

---

## 5. 결론

두 리뷰어 **모두 PASS**. A/B가 지적한 후속 보강(HIGH 1 + MEDIUM 2 + LOW 1)을 **이번 커밋에 전부 반영**. 로컬 실제 클릭으로 두 버그의 수정과 롤백 동작을 입증. `npm run build`(tsc -b) 통과.
