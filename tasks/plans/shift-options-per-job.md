# 희망 출근 시간대 공고별 연동

## 요구사항
- [ ] 공고 등록 시 관리자가 모집할 근무조(오전/오후/야간) 복수 선택 가능
- [ ] 지원하기 폼에서 해당 공고에 설정된 근무조만 선택 버튼으로 표시
- [ ] 공고에 shift_options 미설정 시 기존처럼 전체(오전/오후/야간/무관) 표시 (fallback)
- [ ] 기존 공고 데이터 영향 없음 (DEFAULT '{}' — 빈 배열이면 전체 표시)

## 영향 범위
| 파일 | 변경 내용 |
|------|----------|
| Supabase migration SQL | `job_postings.shift_options text[] DEFAULT '{}'` 컬럼 추가 |
| `frontend/src/types/supabase.ts` | `JobPosting` 타입에 `shift_options: string[]` 추가 |
| `frontend/src/components/admin/menus/JobsMenu.tsx` | STEP 2(근무조건) 폼에 근무조 체크박스 UI 추가 + form 초기값/저장 처리 |
| `frontend/src/components/jobs/ApplyFormModal.tsx` | `shiftOptions?: string[]` prop 추가, 활성화된 조만 렌더링 |
| `frontend/src/pages/JobsPage.tsx` | ApplyFormModal에 `shiftOptions` prop 전달 |

## 구현 계획
1. **Supabase migration** — `shift_options text[] DEFAULT '{}'` 컬럼 추가
2. **타입 업데이트** — `supabase.ts`의 `JobPosting` 인터페이스에 `shift_options: string[]` 추가
3. **JobsMenu.tsx** — STEP 2 폼에서:
   - `form` 초기값에 `shift_options: []` 추가
   - 체크박스 3개(오전/오후/야간) 렌더링
   - 저장(INSERT/UPDATE) 시 `shift_options` 포함
4. **ApplyFormModal.tsx** — `shiftOptions?: string[]` prop 추가:
   - 비어있으면 `['morning','afternoon','night','any']` 전체 표시 (기존 동작)
   - 값 있으면 해당 값들만 버튼 렌더링 (`무관` 버튼은 shiftOptions에 무관하게 항상 추가)
5. **JobsPage.tsx** — `ApplyFormModal`에 `shiftOptions={현재공고.shift_options}` 전달

## 근무조 값 정의
| 화면 표시 | 저장 값 |
|----------|--------|
| 오전 | `morning` |
| 오후 | `afternoon` |
| 야간 | `night` |

> `무관(any)`은 지원자가 선택할 수 있는 옵션이지 사측이 설정하는 근무조가 아님.
> → 공고에 shift_options가 있어도 `무관` 버튼은 항상 표시.

## 리스크
- 기존 공고(`shift_options = []`)는 fallback으로 전체 표시 → 기존 지원자 경험 변화 없음
- `task_options` 구현 패턴이 동일해서 그대로 따라가면 됨 — 복잡도 낮음

## 검증 기준
- [ ] 관리자에서 "야간"만 체크하고 공고 저장 → 지원 폼에서 야간+무관만 표시
- [ ] 관리자에서 shift_options 미설정 공고 → 지원 폼에서 오전/오후/야간/무관 전체 표시
- [ ] TypeScript 빌드 에러 0건
- [ ] 기존 저장된 job_applications의 preferred_shift 값 변화 없음
