# 어드민 전수조사 QA 보고서 — 2026-04-12

## 조사 대상

- 파일: `frontend/src/pages/AdminPage.tsx`
- 파일: `frontend/src/components/admin/menus/*.tsx` (10개 메뉴)
- 파일: `frontend/src/components/admin/*.tsx` (사이드바 등)

---

## 1. 어드민 라우팅 매핑

| 라우트 | 컴포넌트 | 상태 |
|--------|----------|------|
| `/admin` | `AdminPage.tsx` | ✅ 동작 |
| `/admin` (menu=dashboard) | `DashboardMenu` | ✅ |
| `/admin` (menu=target) | `TargetMenu` | ✅ |
| `/admin` (menu=jobs) | `JobsMenu` | ✅ |
| `/admin` (menu=inquiries) | `InquiriesMenu` | ✅ |
| `/admin` (menu=notices) | `NoticesMenu` | ✅ |
| `/admin` (menu=members) | `MembersMenu` | ✅ |
| `/admin` (menu=accounts) | `AccountsMenu` | ✅ |
| `/admin` (menu=settings) | `SettingsMenu` | ✅ |
| `/admin` (menu=audit_logs) | `AuditLogsMenu` | ✅ |
| `/admin` (menu=server_logs) | `ServerLogsMenu` | ✅ |

**라우팅 구조**: 단일 페이지 `/admin`에서 사이드바 activeMenu state로 컴포넌트 스위칭. 별도 라우트 없음.

---

## 2. 메뉴별 코드 분석

### Dashboard
- **데이터 소스**: `profiles`, `job_applications`, `job_postings`, `inquiries`, `notices` 테이블
- **KPI 카드**: 총 회원수, 월별 가입수, 총 지원수, 공고수, 문의수
- **차트**: Recharts `BarChart` — 최근 7일 일별 가입자 추이
- **에러 핸들링**: ✅ try/catch, null 가드 적용
- **실시간**: ❌ 수동 새로고침 (Realtime 미사용)

### Target
- **목적**: 회원 근무 기간·임금 세그먼트 분석 + 회사별 파이차트
- **데이터**: `calculation_results` 테이블 집계
- **에러 핸들링**: ✅

### 채용공고 (JobsMenu) — 이번 세션 주요 개선 대상
- **이전 상태**: 공고 등록 시 560px 팝업 모달
- **개선 후**: 풀페이지 5단계 스텝퍼 + 우측 실시간 미리보기
- **탭 구성**: 공고 목록 / 지원자 관리 / 확정 현황
- **에러 핸들링**: ✅ 전 영역 try/catch + UI 에러 표시
- **null 가드**: ✅ `supabase &&`, `data ?? []`

### Inquiries
- **기능**: 문의 목록 조회, 상세 패널, 일괄 액션, 템플릿 답변
- **데이터**: `inquiries` 테이블
- **에러 핸들링**: ✅

### 공지사항 (NoticesMenu)
- **기능**: 공지 CRUD (등록/수정/삭제)
- **데이터**: `notices` 테이블
- **에러 핸들링**: ✅

### 회원 관리 (MembersMenu)
- **기능**: 회원 목록, 검색, 상세 조회
- **데이터**: `profiles` 테이블
- **에러 핸들링**: ✅

### 관리자 계정 (AccountsMenu)
- **기능**: 관리자 CRUD, 역할(super_admin/admin/viewer) 관리
- **데이터**: `admin_accounts` 테이블
- **접근 제한**: super_admin 전용 (사이드바에서 필터링)

### Settings
- **하위 탭**: CMS 설정, Discord 연동, IP 차단, 법적 변수(연도별 최저임금)
- **에러 핸들링**: ✅

### Audit Logs
- **기능**: 관리자 액션 감사 로그 조회
- **데이터**: `admin_audit_logs` 테이블

### Server Logs
- **기능**: FastAPI 백엔드 로그 조회 (`/api/admin/logs`)
- **인증**: `X-Admin-Token` 헤더

---

## 3. 이번 세션 구현 내역

### 3-A. 공고 등록 풀페이지 스텝퍼 (2-A)

**변경 전**: `modalOpen` state → 560px 팝업 오버레이

**변경 후**: `pageMode` state (`null | 'create' | 'edit'`)
- `pageMode !== null` 시 전체 페이지를 스텝퍼 UI로 교체
- 5단계 인디케이터 (클릭으로 이동 가능)
- 좌측: 단계별 폼 / 우측: sticky 실시간 미리보기 카드
- 임시저장: `status='draft'` DB 저장
- 수정 시: 기존 데이터 prefill 후 스텝퍼 표시

### 3-B. 공고 카드 UI 고도화 (2-B)

**변경 전**: `minmax(280px, 1fr)` 소형 카드, 텍스트 잘림

**변경 후**:
- 그리드: `minmax(360px, 1fr)` → 더 넓은 카드
- `minHeight: 220px` + `wordBreak: 'break-word'` + `whiteSpace: 'normal'`
- 상단: 섹션 배지(오늘추가/내일긴급/상시) + 상태 배지 (우측 정렬)
- 중단: 시급/일급 큰 글씨 (1rem, fontWeight 800)
- 하단: 근무시간·인원·마감일 + 복리후생 태그 (최대 4개 + 나머지 +N)
- 하단+: 공고 내용 2줄 미리보기
- 버튼: 수정(풀페이지 이동) / 급구 토글 / 삭제

### 3-C. 필터 확장

- 상태 필터에 `'draft'` (임시저장) 탭 추가
- `JobPosting.status` 타입에 `'draft'` 추가 (`types/supabase.ts`)

---

## 4. 발견된 이슈 및 기존 상태

| 메뉴 | 이슈 | 판정 |
|------|------|------|
| Dashboard | 실시간 미업데이트 (수동 새로고침) | 허용 (P2) |
| 확정 현황 | 지원자 탭 로드 후에만 데이터 표시됨 | 허용 (UX 안내 있음) |
| Server Logs | Render 무료 티어 콜드스타트 시 느릴 수 있음 | 허용 |
| Audit Logs | super_admin만 접근 — 정상 | OK |

---

## 5. 커밋 이력

| 해시 | 내용 |
|------|------|
| `1298abf` | feat(admin): 공고 등록 전용 페이지 — 5단계 스텝퍼 + 미리보기 + 임시저장 |

---

## 6. 빌드 결과

```
tsc -b: 에러 0건
vite build: ✓ built in 10.96s
AdminPage chunk: 511KB (gzip 149KB) — 기존과 동일 수준
```

---

## 7. 잔여 P1 작업 (이번 세션 미구현)

| 항목 | 이유 |
|------|------|
| 지원자 관리 확정 현황 — 진행률 바 추가 | 기존 구현 충분, 추가 개선은 P2 |
| 공지사항 / 회원관리 텍스트 잘림 수정 | Dispatch 눈으로 확인 중 — 문제 발생 시 별도 수정 |
| 실제 채용팀 연락 → 공고 수집 | 코드 외 작업 |
