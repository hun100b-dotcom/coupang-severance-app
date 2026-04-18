# CATCH 스케줄 탭 상세 관리 시스템 업그레이드 기획안

> 대상 경로: `frontend/src/components/mypage/MyScheduleTab.tsx` → `frontend/src/components/mypage/schedule/*` 분해
> 작성 기준일: 2026-04-19

---

## 0. 요약 (TL;DR)

현재 `MyScheduleTab.tsx`는 313줄짜리 "단일 파일 월간 캘린더"로, `job_applications` 테이블만을 조회해 파란/초록 점을 찍어주는 수준이다. 일용직 근로자가 실제로 "내 근무를 관리"하려면 다음 3축의 변화가 필요하다.

1. **데이터 모델 확장** — `job_applications`에 근무 시간·차감 비용·메모 칼럼 추가 + `personal_schedules` 테이블 신설(개인 일정)
2. **뷰 다양화** — 월간/주간/리스트 3뷰 전환 + 일자별 상세 시트(BottomSheet)
3. **인사이트/운영 기능** — 실수령 계산, 연속 근무일, 필터/검색, iCal/CSV 내보내기, 출근 전날 알림

다만 이는 간단한 작업이 아니다. **Phase 1만 해도 약 10~14개 새 파일·2개 마이그레이션·RLS 재검토가 필요**하며, Phase 3(알림·내보내기)는 현재 앱 스택에서 네이티브 푸시 불가·iCal 구독 URL 이슈 등 **명백한 기술 한계**가 있다. 솔직한 리스크는 §10에 정리했다.

---

## 1. 핵심 기능 정의 (MVP 우선순위)

### Must — Phase 1 (2주 내 출시 목표)
| 우선순위 | 기능 | 근거 |
|---|---|---|
| P0 | 월간/주간/리스트 뷰 전환 토글 | 사용자 한계점 #4 직접 해소. 코드 분량은 많지만 리스크 낮음 |
| P0 | 근무 시간(출근·퇴근) 표시 + DB 저장 | 한계점 #2, 실수령 계산의 전제 |
| P0 | 상세 시트(BottomSheet)에서 상태 변경 (applied↔confirmed↔completed) | 한계점 #5. 단, "completed"는 어드민만 변경하는 현재 정책 유지. 본인은 "완료 요청"만 가능 |
| P0 | 메모/특이사항 편집 | 한계점 #3, `note` 칼럼 이미 존재 — 최소 DB 변경으로 해결 |
| P1 | 개인 일정 추가 (병원/학원 등 비근무 일정) | 한계점 #1. 신규 테이블 `personal_schedules` 필요 |
| P1 | 필터/검색 (회사별·상태별·기간) | 한계점 #10 |

### Should — Phase 2 (Phase 1 안정화 후 2주)
| 우선순위 | 기능 |
|---|---|
| P2 | 교통비·식비 차감 → 실수령액 계산 |
| P2 | 월간·주간 통계 확장 (연속 근무일, 주당 근무시간, 야간/주간 비중) |
| P2 | 지급 예상일 자동 계산 (주급/월급 옵션) + 실제 지급 체크 |
| P2 | 주간뷰 타임라인 (시간축 세로 배치, 다른 일정 겹침 시각화) |

### Could — Phase 3 (분기 이후, ROI 평가 후)
| 우선순위 | 기능 | 주의 |
|---|---|---|
| P3 | 내일 출근 알림 | **웹 Notification API는 모바일 Safari에서 제한적**. Service Worker + VAPID 필요 — 별도 스프린트 |
| P3 | CSV 내보내기 | 쉬움. `exportXlsx.ts` 패턴 재사용 |
| P3 | iCal(`.ics`) 파일 다운로드 | 쉬움 (텍스트 포맷) |
| P3 | iCal 구독 URL (읽기 전용) | **RLS와 충돌**. 공개 URL 발급 시 토큰 기반 인증 필요 — 실질적으로 고난도 |

### Won't (이번 업그레이드 범위 밖)
- 반복 일정 (매주 수요일 근무) — 일용직 특성상 요구 낮음
- 캘린더 양방향 동기화(Google Calendar 등) — OAuth 범위 재승인 필요, 리스크 큼
- 팀/공유 캘린더 — 1인 사용자 기준 앱이므로 오버엔지니어링

---

## 2. 뷰 구조 설계

### 2-1. 상단 고정 영역 (모든 뷰 공통)
```
┌─────────────────────────────────────┐
│  이번 달 요약: 출근 7 / 확정 3 / 예상 105만원   │  ← MonthSummaryStrip (가로 스크롤 X)
├─────────────────────────────────────┤
│ [월간] [주간] [리스트]  🔍 필터 🎛       │  ← ViewSwitcher + FilterBar
└─────────────────────────────────────┘
```
- 요약 스트립은 Framer Motion `layoutId`로 뷰 전환 시 부드럽게 유지.
- 필터 아이콘 클릭 시 상단에서 드롭다운으로 펼쳐짐(모달 X — 공간 손실 최소화).

### 2-2. 월간 뷰 (기존 개선)
```
┌────────┐
│  15    │  ← 날짜
│  쿠팡  │  ← company_name 2자(축약) 또는 아이콘
│ 18만원 │  ← 일급 (축약: 18만)
│  ●●    │  ← 상태 점 (기존 유지) + 개인일정은 보라색 점
└────────┘
```
- **모바일 셀 높이 제약**: 7열 × 현재 폭(~390px)이면 셀당 55px가 한계. 회사명은 2~3글자만, 일급은 "만" 단위 축약. 리스크: 셀 정보 과밀 — UX 테스트 필요.
- 셀 클릭 시 기존 동작(하단 상세) 대신 **BottomSheet(모달)**을 띄워 상세 편집 가능.

### 2-3. 주간 뷰 (신규)
세로 타임라인 구조:
```
월 14   화 15   수 16  ...
07시 ┌─────┐
08시 │쿠팡 │
09시 │용인 │
10시 │     │  ← h-block로 높이 = (퇴근-출근)
11시 └─────┘
12시        ┌─────┐
13시        │컬리 │
...
```
- 구현 방식: CSS Grid `grid-template-columns: repeat(7, 1fr)`, 각 일정은 `grid-row: N / span M`으로 배치.
- 겹침 처리: 같은 날 2개 이상 일정 겹치면 너비 분할. 3개 이상은 v1에서 "최대 2개 표시 + 더보기" 라벨.

### 2-4. 리스트 뷰 (신규)
날짜 순(미래→과거) 그룹핑:
```
📅 2026년 4월 22일 (내일)
  └ 쿠팡 용인 FC / 07:00-18:00 / 확정 / 18만원

📅 2026년 4월 20일 (오늘)
  └ 컬리 송파 / 22:00-06:00(야간) / 완료 / 15만원
  └ [개인] 치과 진료 / 14:00
```
- 무한스크롤로 과거 이력 로드. `applied_at DESC` 기준 20건씩 페이지네이션.

### 2-5. BottomSheet 상세 구조
```
┌─────────────────────────┐
│  ─   (드래그 핸들)         │
│  2026년 4월 22일 (수)      │
├─────────────────────────┤
│ [쿠팡 용인 FC]           │
│  근무시간 07:00 ~ 18:00   │
│  일급 180,000원          │
│  - 교통비 4,000원         │
│  - 식비 0원              │
│  ────────────────        │
│  실수령 예상 176,000원    │
│                         │
│  [상태] 출근확정 ▼        │
│  [메모] ____________     │
│                         │
│  ┌────────┐┌─────────┐   │
│  │  저장   ││ 지원취소 │   │
│  └────────┘└─────────┘   │
├─────────────────────────┤
│ + 이 날 개인 일정 추가     │
└─────────────────────────┘
```

구현: Framer Motion `drag="y"` + `dragConstraints` + 하단 스냅.

---

## 3. DB 스키마 변경

### 3-1. `job_applications` 칼럼 추가 (마이그레이션 1개)

```sql
-- supabase/migrations/20260419_applications_schedule_detail.sql
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS work_start_time  time,
  ADD COLUMN IF NOT EXISTS work_end_time    time,
  ADD COLUMN IF NOT EXISTS transport_cost   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_cost        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deduction  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_expected_date date,
  ADD COLUMN IF NOT EXISTS payment_received_at   timestamptz,
  ADD COLUMN IF NOT EXISTS user_memo        text;

COMMENT ON COLUMN public.job_applications.user_memo IS '사용자 본인 메모 — 어드민용 note와 분리';
```

**주의**: `note` 칼럼은 이미 어드민이 사용 중일 가능성 있음. 기존 데이터 마이그레이션 대신 `user_memo`로 **분리**.

### 3-2. `personal_schedules` 테이블 신설

```sql
-- supabase/migrations/20260419_personal_schedules.sql
CREATE TABLE IF NOT EXISTS public.personal_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  category    text NOT NULL DEFAULT 'other'
                CHECK (category IN ('hospital', 'study', 'family', 'appointment', 'other')),
  schedule_date date NOT NULL,
  start_time    time,
  end_time      time,
  memo          text,
  color         text DEFAULT '#8b5cf6',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_personal_schedules_user_date
  ON public.personal_schedules(user_id, schedule_date);

ALTER TABLE public.personal_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_schedules_own"
  ON public.personal_schedules FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3-3. 뷰(View) 대신 프론트 merge 권장
두 테이블 칼럼 구조가 달라 UNION ALL이 지저분해짐. 프론트엔드에서 `ScheduleItem` 타입으로 정규화 권장.

---

## 4. 컴포넌트 분해

```
frontend/src/components/mypage/
├── MyScheduleTab.tsx                   # 컨테이너만 유지 (313줄 → ~80줄)
└── schedule/
    ├── index.ts
    ├── ScheduleHeader.tsx              # 요약 스트립 + 뷰 스위처 + 필터바
    ├── ViewSwitcher.tsx                # 월/주/리스트 토글
    ├── FilterBar.tsx                   # 회사별·상태별·기간 필터
    ├── views/
    │   ├── MonthView.tsx               # 월간 그리드
    │   ├── WeekView.tsx                # 주간 타임라인
    │   └── ListView.tsx                # 리스트 그룹뷰
    ├── cells/
    │   ├── MonthCell.tsx
    │   └── WeekBlock.tsx
    ├── sheets/
    │   ├── ScheduleDetailSheet.tsx     # BottomSheet 상세/편집
    │   ├── PersonalScheduleModal.tsx   # 개인 일정 추가/편집
    │   └── QuickActions.tsx
    ├── stats/
    │   ├── MonthStats.tsx
    │   ├── StreakCard.tsx              # 연속 근무일
    │   └── NetIncomeCard.tsx           # 실수령 계산
    └── hooks/
        ├── useScheduleData.ts
        ├── useMonthNavigation.ts
        ├── useScheduleFilter.ts
        └── useIcsExport.ts             # Phase 3

frontend/src/lib/
├── personalSchedules.ts                # Supabase CRUD
└── scheduleUtils.ts                    # 실수령/연속일/포맷
```

---

## 5. UI/UX 상세 설계

### 5-1. 월간뷰 셀 (트레이드오프)
- iPhone SE(375px) 기준 셀당 ~45px. 회사명 2자 + 아이콘이 최대.
- **대안 A**: 셀에는 `색상 바 + 일급 숫자`만, 회사명은 탭 시 상세에서.
- **대안 B (추천)**: 기존 점 디자인 유지 + 셀 아래에 "선택한 주"의 미니 리스트 노출.

### 5-2. 주간뷰 타임라인
- 세로축: 05:00~26:00 = 21시간 × 40px = 840px
- 일정 블록: 둥근 사각형, 회사명 1줄 + 시간 1줄.
- **리스크**: 야간 근무(22:00~06:00)는 날짜를 걸침 → 2개 블록으로 분할 렌더링 필요.

### 5-3. 일정 추가 모달
`InquiryModal.tsx` 패턴 복제:
- 제목 input (최대 30자)
- 카테고리 칩 5개 (병원/공부/가족/약속/기타)
- 날짜 input, 시간 체크박스 ("종일" 토글)
- 색상 선택 5개
- 메모 textarea

낙관적 업데이트(UI 먼저 반영, 실패 시 롤백).

### 5-4. 필터/검색 바
```
🔍 회사명 검색...
상태: [전체][지원중][확정][완료]
회사: [쿠팡][컬리][CJ][기타]
기간: [이번주][이번달][3개월][전체]
```
- URL 쿼리 파라미터에 저장(`?view=week&status=confirmed`).

---

## 6. 통계/인사이트 설계

### 6-1. 이번 달 확장 스트립
현재 3개 → 6개 확장:
1. 출근 확정
2. 출근 완료
3. **총 근무시간** (신규)
4. 예상 수입
5. **실수령 예상** (신규)
6. **지급 완료액** (신규)

### 6-2. 연속 근무일 (StreakCard)
- "🔥 현재 연속 5일" + "최고 기록 12일"
- 초기 정의는 "공백 없이 붙은 날짜만 연속". 주말 제외 옵션은 Phase 2.

### 6-3. 시간대 분포 (Phase 2)
- 주간(06-18시) vs 야간(18-06시) 근무 비율을 도넛 차트로.
- 외부 라이브러리 추가 시 번들 크기 증가 검토.

---

## 7. 단계별 구현 스프린트

### Phase 1 — 뼈대 + 핵심 기능 (10~14일)
1. `chore: schedule 폴더 구조 생성 및 MyScheduleTab 분해`
2. `feat: 뷰 스위처 및 리스트뷰 추가`
3. `feat: 주간뷰 타임라인 구현`
4. `feat(db): job_applications 상세 칼럼 추가 마이그레이션` ← **사용자 승인 필수**
5. `feat: BottomSheet 상세/편집 UI`
6. `feat: 필터바 + URL 쿼리 연동`

### Phase 2 — 개인 일정 + 통계 (7~10일)
7. `feat(db): personal_schedules 테이블 신설`
8. `feat: 개인 일정 추가/편집/삭제 모달`
9. `feat: 실수령/연속일 인사이트 카드`
10. `feat: 지급 체크 UI`

### Phase 3 — 내보내기/알림 (7~14일, 조건부)
11. `feat: CSV 내보내기`
12. `feat: iCal(.ics) 다운로드`
13. `feat: 웹 푸시 알림` — **네이티브 급 품질 선검증 필요**

---

## 8. 핵심 타입 정의

```typescript
export interface PersonalSchedule {
  id: string
  user_id: string
  title: string
  category: 'hospital' | 'study' | 'family' | 'appointment' | 'other'
  schedule_date: string
  start_time: string | null
  end_time: string | null
  memo: string | null
  color: string
  created_at: string
  updated_at: string
}

export type ScheduleItem =
  | { kind: 'job'; data: JobApplication; date: string }
  | { kind: 'personal'; data: PersonalSchedule; date: string }
```

---

## 9. 성능 고려사항

- **fetch 전략**: 현재 `listApplications`는 전체를 가져옴. Phase 2에서 월 단위 범위 쿼리(`gte/lte work_date`)로 전환.
- **realtime 구독**: `MyApplicationsTab`에 이미 있음. 스케줄 탭에도 추가하면 중복 구독 발생 → `MyPage.tsx` 레벨에 1개로 통합 권장.
- **렌더링**: 주간뷰는 Framer Motion 애니메이션이 많아 저사양 기기에서 버벅일 수 있음.

---

## 10. 리스크 및 한계 (솔직하게)

### 10-1. 기술적 리스크
| 리스크 | 영향 | 대응 |
|---|---|---|
| 월간 셀 과밀 | 중 | 대안 B 채택. UX 테스트 필요 |
| 야간 근무 날짜 분할 렌더링 | 중 | 주간뷰에서만 적용 |
| 웹 푸시 iOS Safari 제한 | 높음 | Phase 3 전 스파이크. 안 되면 "앱 내 배너" 대체 |
| iCal 구독 URL + RLS 충돌 | 높음 | 서명된 토큰 URL 또는 **Phase 3 전면 제외** |
| 외부 차트 라이브러리 번들 | 낮음 | Phase 2까지 SVG 직접 구현 |
| `note` vs `user_memo` 2중 칼럼 | 낮음 | 문서화 + 추후 rename |

### 10-2. 디자인 리스크
- 월간뷰에 정보를 많이 넣을수록 "한눈에 파악" 가치가 훼손됨. **사용자가 원한 건 "상세 관리"이지 "빽빽한 화면"이 아님**.
- 주간뷰 타임라인은 데스크톱 캘린더 패러다임. 모바일에서 이점 검증 필요. **A/B 테스트 권장**.

### 10-3. 제품적 리스크
- 일용직 근로자는 **앱 체류 시간이 짧다**. 기능이 많아지면 진입 저항 발생. Phase 1 단계에서 만족도 조사 후 Phase 2 진행 여부 결정.
- 개인 일정 기능이 **Google Calendar와 경쟁**이 아니라 "근무 주변 맥락 메모장"에 가까워야 성공.

### 10-4. 운영 리스크
- 마이그레이션 2개 적용 시 기존 데이터 영향 없음(모두 ADD COLUMN / CREATE TABLE). RLS 재검토 필수.
- CLAUDE.md 규칙에 따라 **파일 삭제·구조 변경은 승인 필요**. 컴포넌트 분해는 구조 변경이므로 종훈님 사전 승인 필요.

---

## 11. 구현 전 결정 필요 사항 (사용자 확인 요청)

1. **월간뷰 셀 과밀 해결안**: 대안 A(정보 최소화) vs 대안 B(주 스트립 추가). 권장은 B.
2. **user_memo 칼럼 분리 vs 기존 note 사용**: 어드민과 혼용되면 사용자 메모가 노출될 수 있음.
3. **Phase 3 범위**: 웹 푸시 포함? iCal URL 제외?
4. **완료 처리 주체**: 현재 "어드민만" 정책 유지? 사용자 "완료 요청" 버튼? 또는 자기 완료 허용?

---

## 12. 주요 참조 파일

- `frontend/src/components/mypage/MyScheduleTab.tsx` — 현재 스케줄 탭
- `frontend/src/lib/jobApplications.ts` — 지원 CRUD
- `frontend/src/types/supabase.ts` — 타입 정의
- `supabase/migrations/20260402_job_applications_schedule_points.sql` — 기존 스키마
- `frontend/src/components/mypage/MyApplicationsTab.tsx` — 리스트뷰 참고 패턴
- `frontend/src/components/mypage/InquiryModal.tsx` — 모달 패턴 복제용
