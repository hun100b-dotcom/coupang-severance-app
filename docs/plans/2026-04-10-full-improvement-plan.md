# CATCH 전면 개선 플랜 — 2026-04-10

## Context (배경 및 목적)
CATCH 앱의 SEO·UX·어드민 기능 10가지를 한 번에 개선.
- Google 검색 결과에 `/home` URL + 공고 내용(일급 150,000원)이 스니펫으로 노출 → 거짓정보 리스크
- 랜딩 1섹션 버튼 UX가 약함 (플레인 텍스트 CTA, 섹션 이동 유도 가독성 부족)
- 어드민 공고 CRUD에 버그 + UI가 구식 테이블 형태
- 지원자 탭 에러 미표시, 후속조치(확정/거절) 버튼 없음
- 마이페이지 Realtime은 구현됐으나 notifications 테이블 없음

---

## 영향 파일 전체 목록

| 파일 | 요구사항 | 변경 내용 |
|------|---------|----------|
| `frontend/src/App.tsx` | REQ1 | /home 비로그인 → `/` Navigate |
| `frontend/src/pages/Home.tsx` | REQ1 | noindex meta 조건부 추가 |
| `frontend/public/sitemap.xml` | REQ1 | /home 제거, / 우선순위 1.0 확인 |
| `vercel.json` | REQ1 | redirects 블록 추가 (301 /home→/) |
| `frontend/src/pages/LandingV1.tsx` | REQ2,3 | 버튼 재배치 + SectionBridge 강화 + Jobs noindex |
| `frontend/src/pages/JobsPage.tsx` | REQ3 | noindex meta 추가 |
| `frontend/src/components/admin/menus/JobsMenu.tsx` | REQ4,5,6,7,9,10 | CRUD버그+UI현대화+지원자버그+후속조치+대시보드+단계폼 |
| `frontend/src/components/mypage/MyApplicationsTab.tsx` | REQ8 | notifications 구독 추가 |
| `supabase/migrations/20260410_notifications.sql` | REQ7,8 | notifications 테이블 신규 생성 |
| `supabase/migrations/20260410_job_applications_rejected.sql` | REQ7 | status enum에 'rejected' 추가 |

---

## 요구사항별 구현 전략

### REQ 1 — `/home` SEO 리다이렉트 (P0)

**문제 분석**:
- `App.tsx`에서 `/home`은 `OnboardingGuard > Layout` 안에 있어 인증 체크를 거침
- 현재 비로그인 사용자는 `/login`으로 보내짐 (랜딩을 못 봄)
- `sitemap.xml`에 `/home`이 포함돼 크롤러가 인덱싱

**구현**:
1. `vercel.json` - `redirects` 배열 추가:
   ```json
   "redirects": [{ "source": "/home", "destination": "/", "permanent": true }]
   ```
   ※ 단, 이러면 로그인 사용자도 `/home` 접근 불가. 요구사항 원문은 "비로그인 사용자만 `/`로" → 서버 레벨 리다이렉트로 처리 불가. 따라서 **vercel.json redirect 대신 App.tsx에서 처리**.
   
   실제 적용: `vercel.json`에는 추가 안 함. App.tsx에서 `/home` 라우트를 커스텀 가드 컴포넌트로 감싸서 비로그인 → `<Navigate to="/" replace />`

2. `App.tsx`:
   ```tsx
   // /home 진입 시 비로그인이면 / 로 보냄
   <Route path="/home" element={<HomeOrLanding />} />
   // HomeOrLanding: user 없으면 <Navigate to="/" />, 있으면 <Home />
   ```
   단, 현재 `/home`은 `OnboardingGuard > Layout` 내부에 있어 이미 보호됨. ProtectedRoute가 `/login`으로 보내는 부분을 `/`로 교체하거나, 위 Route를 Layout 밖으로 빼서 별도 처리.

3. `sitemap.xml` - `/home` 줄 제거, `/` 최상단 priority 1.0 유지

4. `Home.tsx` - react-helmet 이미 사용 중이면 `<meta name="robots" content="noindex, follow">` 추가

### REQ 2 — LandingV1 UI/UX 재디자인 (P0)

**Hero 섹션 버튼 변경** (`LandingV1.tsx` ~line 399):
- "어떤 문제가 있나요? ↓" `<a href="#pain">` → **삭제**
- "빠르게 시작하기 →" plain button → **"내 권리 확인하기"와 동일한 스타일**로 승격
  - 색상은 파랑→초록 그래디언트(구분용) 또는 outline 카드 스타일
  - onClick: `scrollTo('cta')` (마지막 로그인 섹션으로 스무스 스크롤)

**SectionBridge 가독성 강화** (`LandingV1.tsx` ~line 82):
- 텍스트에 `bg-white/80 backdrop-blur-sm rounded-full px-4 py-1` pill 추가
- subText에도 동일 처리
- 화살표 색상 강화: 다크 배경에서도 보이게

### REQ 3 — Jobs 페이지 noindex (P0)

`JobsPage.tsx`에 react-helmet 또는 `<meta>` 태그로:
```tsx
<Helmet>
  <meta name="robots" content="noindex, follow" />
</Helmet>
```

### REQ 4 — 어드민 공고 CRUD 에러 수정 (P0)

**JobsMenu.tsx 버그 목록** (코드 확인 후 예상):
- 공고 등록/수정 시 `setSaving(false)` 호출 전에 에러 throw 시 무한 로딩
- 삭제 시 confirm dialog 없이 즉시 실행 → 이건 UX 문제
- `jobError` state는 있지만 toast로 연결 안 됨
- applicants 에러는 `console.error`만 있고 UI 표시 없음

**수정**:
- `try/finally`로 `setSaving` 보장
- 에러 시 `toast.error()` 호출 (react-hot-toast 이미 import 돼 있는지 확인)
- 삭제 전 `window.confirm()` 추가
- applicants 에러 UI 표시

### REQ 5 — 어드민 공고 UI/UX 현대화 (P1)

현재: 기본 테이블 형태
목표: 카드 그리드 + 필터 + 사이드 패널

**변경 내용**:
- 공고 목록을 카드 그리드(2열 또는 3열)로
- 상태 탭: 전체 / 진행중(active) / 마감(expired) / 임시저장
- 검색 input (회사명/센터명)
- 긴급 토글 배지를 카드 상단 뱃지로
- 편집은 기존 모달 유지 (크게 변경 않음)

### REQ 6 — 지원자 탭 조회 버그 수정 (P0)

**문제 분석**:
- `profiles` JOIN이 실패할 수 있음 (RLS on profiles 또는 관계 없음)
- 에러가 `console.error`만 → UI에 표시 안 됨

**수정**:
- `fetchApplicants`에 에러 state 추가, UI에 에러 메시지 표시
- profiles JOIN이 실패하면 `left join` 방식으로 변경 (supabase `profiles!left`)
- 빈 결과면 "지원자가 없습니다" 메시지

### REQ 7 — 지원자 후속조치 버튼 (P0)

**현재**: status = 'applied' | 'confirmed' | 'completed' | 'cancelled'
**추가**: 'rejected' status

**구현**:
1. `supabase/migrations/20260410_job_applications_rejected.sql`: status CHECK 제약 조건에 'rejected' 추가
2. `supabase/migrations/20260410_notifications.sql`: notifications 테이블 신규 생성
   ```sql
   CREATE TABLE notifications (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users NOT NULL,
     type text NOT NULL, -- 'application_confirmed', 'application_rejected', etc.
     title text NOT NULL,
     body text,
     is_read boolean DEFAULT false,
     metadata jsonb,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
   -- 본인만 조회 가능
   CREATE POLICY "본인 알림만 조회" ON notifications FOR SELECT USING (auth.uid() = user_id);
   ```
3. JobsMenu.tsx에 버튼 추가:
   - ✅ 출근확정 → status='confirmed' + notifications insert
   - ✒ 지원거절 → status='rejected' + notifications insert
   - 기다리는 중 → status='applied' (원복)

### REQ 8 — 마이페이지 Realtime 연동 (P0)

**현재 상태**: `MyApplicationsTab.tsx`에 이미 `job_applications` Realtime 구독 있음!
- `supabase.channel('job_applications_changes')` 형태로 구현됨

**추가 필요**:
- `notifications` 테이블 Realtime 구독 추가
- 새 알림 도착 시 toast 표시
- 알림 뱃지 카운터 (선택, 복잡도 낮음)

### REQ 9 — 지원자 관리 대시보드 (P1)

JobsMenu.tsx에 새 탭 '📊 확정 현황' 추가:
- 센터별 지원자 수 / 확정 수 / 거절 수
- 기간 필터 (오늘/이번주/이번달)
- Recharts BarChart (이미 프로젝트에 있으면 사용)

### REQ 10 — 공고 등록 단계별 폼 (P1)

현재 모달: 단일 폼
변경: 5단계 폼
1. 기본정보 (회사명, 센터명, 지역)
2. 근무조건 (시급, 일급, 근무시간, 인원)
3. 상세/자격 (description, contact_phone, external_link)
4. 미리보기
5. 발행 (is_urgent, expires_at)

---

## DB 마이그레이션 필요 여부

| 마이그레이션 | 이유 | 위험도 |
|------------|------|------|
| `20260410_notifications.sql` | notifications 테이블 신규 | 낮음 (신규 테이블) |
| `20260410_job_applications_rejected.sql` | 'rejected' status 추가 | 낮음 (CHECK 제약 확장) |

---

## 리스크 평가 + 롤백 전략

| 리스크 | 가능성 | 영향 | 롤백 |
|--------|--------|------|------|
| vercel.json redirect가 로그인 사용자도 차단 | 높음 | 앱 사용 불가 | → vercel.json 안 씀, App.tsx만 수정 |
| notifications 테이블 Realtime 미활성화 | 중간 | 알림 안 옴 | → 수동 폴링 fallback |
| job_applications status 변경 시 기존 데이터 깨짐 | 낮음 | 데이터 오류 | → CHECK 제약 확장만 (기존값 유지) |
| JobsMenu.tsx 대규모 수정 시 기존 CRUD 회귀 | 중간 | 공고 관리 불가 | → 빌드 후 수동 테스트 |

---

## 테스트 계획 (리뷰어 에이전트가 직접 수행 후 보고)

### 리뷰어 자동 검증 항목
리뷰어 에이전트가 `.claude/agents/reviewer.md` 기준으로 모든 항목을 직접 테스트하고 종훈님께 보고서 제출:

1. **빌드 검증**: `npm run build` 타입에러 0건
2. **SEO 검증**: sitemap.xml `/home` 없음 grep 확인, Home.tsx/JobsPage.tsx noindex meta grep 확인
3. **라우팅 검증**: Playwright로 `/home` 접근 시 `/`로 리다이렉트 확인 (비로그인 시뮬레이션)
4. **랜딩 UI 검증**: Playwright로 "어떤 문제가 있나요?" 버튼 없음 확인, "빠르게 시작하기" 버튼 스타일·클릭 동작 확인
5. **어드민 검증**: Playwright로 공고 CRUD 에러 없이 동작, 지원자 탭 데이터 표시 확인
6. **DB 마이그레이션 검증**: notifications 테이블 존재 여부 Supabase MCP로 확인
7. **Realtime 검증**: job_applications 상태 변경 → MyApplicationsTab 즉시 반영 확인
8. **회귀 테스트**: 기존 계산기 4개, PDF 업로드, 마이페이지 기능 정상 동작 확인

### 빌드 검증
- 각 커밋마다 `npm run build` 실행, 에러 0건 확인

---

## 배포 순서 (커밋 분리)

1. `fix(seo): /home 비로그인 리다이렉트 + noindex + sitemap 정리`
   - App.tsx, Home.tsx, sitemap.xml
2. `feat(landing): 1섹션 버튼 재배치 + SectionBridge 가독성 강화`
   - LandingV1.tsx
3. `fix(seo): /jobs noindex 메타 추가`
   - JobsPage.tsx
4. `fix(admin): 공고 CRUD 에러 수정 + toast 연결`
   - JobsMenu.tsx (CRUD 부분만)
5. `feat(admin): 채용공고 카드 그리드 UI + 검색/필터`
   - JobsMenu.tsx (UI 부분)
6. `fix(admin): 지원자 탭 조회 버그 수정 + 에러 표시`
   - JobsMenu.tsx (applicants 부분)
7. `chore(db): notifications 테이블 + rejected status 마이그레이션`
   - supabase/migrations/ 2개 파일
8. `feat(admin): 지원자 후속조치 버튼(확정/거절) + notifications 트리거`
   - JobsMenu.tsx
9. `feat(realtime): MyApplicationsTab notifications 구독 + 알림 toast`
   - MyApplicationsTab.tsx
10. `feat(admin): 지원자 관리 대시보드 (센터별 확정 현황)`
    - JobsMenu.tsx (대시보드 탭)
11. `feat(admin): 공고 등록 5단계 폼 + 미리보기`
    - JobsMenu.tsx (등록 모달)

---

## 주의사항
- JobsMenu.tsx(851줄)이 메인 작업 파일 — 한 번에 수정 말고 커밋 단위로 분리
- notifications Realtime: Supabase Dashboard → Database → Replication에서 `notifications` 테이블 활성화 필요 (종훈님 수동 확인)
- 마이그레이션은 Supabase MCP 또는 Dashboard SQL Editor에서 실행
