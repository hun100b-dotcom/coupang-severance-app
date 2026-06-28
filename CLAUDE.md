# CLAUDE.md

## A — WHO: 프로젝트 정체성

CATCH (퇴직금 한번에) — 일용직 근로자 퇴직금·실업급여·주휴수당·연차수당 계산기

- 프론트엔드: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion → Vercel
- 백엔드: FastAPI (Python 3.12) + pdfplumber + pandas → Render (싱가포르)
- DB: Supabase PostgreSQL (RLS), OAuth: 카카오 + 구글
- 프로덕션: https://catch-daily-worker.vercel.app
- API: https://coupang-severance-app.onrender.com (/docs, /redoc)
- 디자인: Toss Blue #3182f6, Pretendard, JetBrains Mono, card-radius 20px, GlassCard backdrop-blur 25px
- 라우팅 Layout 밖 (네비 없음): Intro, Login, Admin, Terms, AuthCallback
- 라우팅 Layout 안 (TopNav+BottomNav 5탭): Home, Jobs, Calculator, Severance, Unemployment, WeeklyAllowance, AnnualLeave, MyPage, Report, Payment, MyBenefits, Notices
- 배포: git push origin main → Vercel(프론트) + Render(백엔드) 자동배포
- 상세 아키텍처: memory/architecture.md 참조

---

## 🔴 세션 시작 시 자동 처리 규칙 (종훈님 명시 요청 — 절대 변경 금지)

> 새 세션마다 동일한 문제가 반복돼서 명문화. 아래 규칙은 어떤 상황에서도 우선 적용.

### 0. 레포 정보 (확정)

- 레포 이름: **CATCH**
- 로컬 경로: **`C:\Users\hun10\Github\coupang-severance-app`** ← 검색·탐색 금지, 이 경로 그대로 사용
- 원격: **`https://github.com/hun100b-dotcom/coupang-severance-app.git`**
- 종훈님 GitHub 계정: (비공개 — 코드/문서에 평문 이메일 노출 금지)

### 1. 부트스트랩 자동 실행 (질문 금지)

세션 시작 직후 다음 파일들을 즉시 Read 하고 컨텍스트로 사용:

- `CLAUDE.md` (이 파일)
- `memory/progress.md`
- `docs/ROADMAP.md` (필수, 작업 후 무조건 업데이트)

"어떤 작업부터 할까요?" 같은 질문 금지. 진행 상태 파악 후 종훈님 메시지로 바로 들어가.

### 2. cowork 폴더 접근 허용 — 자동 수락

- `request_cowork_directory` 등 공동작업 권한 프롬프트는 **재질문 없이 즉시 자동 수락**
- 폴더 경로는 위 0번에 명시되어 있음. 다시 묻지 않음
- "어느 폴더 작업할까요?" 같은 질문 금지

### 3. 모든 작업 직접 수행 — 종훈님께 떠넘기지 않음

다음 작업 일체를 종훈님께 요청하지 않고 Claude가 직접 실행:

- 터미널 명령 (Bash 도구)
- git 명령 (status/add/commit/push)
- 파일 읽기·쓰기·수정
- 배포 (push origin main + Vercel/Render 자동)
- 환경변수 조회 (코드 내부)
- DB 마이그레이션 적용 (Supabase MCP)

종훈님께 요청 가능한 것은 "외부 시스템 직접 클릭이 필요한 진짜 막다른 경우"만:
- Render Dashboard OAuth 로그인 (보안 정책)
- App Store / Vercel 결제

### 4. 커밋 후 푸시·배포 기본값

로컬 커밋 만들면 자동으로 다음 단계 이어감:
1. `git push origin main`
2. Vercel/Render 자동 재배포 시작 확인
3. 배포 상태 로그 확인 후 결과 보고

"푸시할까요?", "배포까지 돌릴까요?" 질문 금지.

### 5. 사전 허락 질문 금지

판단 후 바로 실행하고 사후 보고만. 명백한 스코프 변경(예: 외부 시스템 새 도입, 결제 발생)일 때만 확인.

### 6. 변명 언어 금지

지연·실패가 발생해도 "막 하려던 참" / "타이밍이었다" 같은 사후 포장 표현 사용 금지. 보고 늦었으면 "죄송합니다" 한 줄로 인정 후 본론.

### 7. 보고 의무

- 태스크 완료 → 즉시 결과 보고
- 진행 중 단계 변경 → 자발적 상태 업데이트
- 사용자 메시지 받기 전에 먼저 보고 트리거 발동

### 8. 종훈님 프로필 자동 적용

- 코딩 비전공자 → 한국어 주석 필수, 초보자 기준 설명
- 단계별 번호 매겨서 안내
- 터미널 명령은 코드블록으로
- 전문 용어는 괄호로 풀이
- 깊이는 전문가 수준, 표현은 입문자 친화

### 9. 자동화·매매 데이터 적재 원칙

모든 매매·자동화 이벤트는 분석용 로우데이터로 빠짐없이 기록 (별도 docs 또는 Supabase 스키마 참조)

---

> 이 섹션은 종훈님 명시 요청으로 추가됨. 세션 재시작 시 같은 문제 반복 차단 목적. 임의로 축약·삭제 금지.

---

## B — HOW: 작업 규칙

### 워크플로우
- 모든 응답: 한글 필수
- 승인 요청 없이 즉시 실행 (단, 파일 삭제·구조 변경은 승인 필요)
- MCP 최우선: Supabase MCP(DB), Notion MCP(태스크), GitHub MCP(커밋), Vercel MCP(배포), Playwright MCP(E2E)
- 작업 완료 시: Notion "📋 CATCH 개발 태스크" 자동 업데이트
- 자기 평가 시: 긍정 편향 제거, 부족한 점·한계·리스크 동등하게 다룸. 자화자찬 금지

### ⚠️ 하네스 워크플로우 (절대 규칙 — 위반 시 즉시 중단)
- **적용 대상**: 2파일 이상 수정하는 모든 작업 (기능 구현, 재구성, 고도화, UI/UX 개선 포함)
- **예외 (plan 생략 가능)**: 버그 수정(1~2파일), 텍스트/레이블 변경, 설정 파일 수정
- **필수 순서**:
  1. `/plan` (플래너) → 기획서를 `tasks/plans/`에 저장 → 승인 대기
  2. 승인 후 `/sprint` (오퍼레이터) → 기획서 기반 구현 → 기획서 없으면 **즉시 중단하고 /plan부터**
  3. `/review` (리뷰어) → TIER 자동 판정 → 검증 결과 보고
  4. PASS → 커밋+배포 / FAIL → 수정 후 재검증 (최대 2회)
- **/plan 없이 /sprint 실행 금지** — 프롬프트에 기획 내용이 있어도 tasks/plans/에 먼저 저장
- **Cowork/Dispatch 환경에서도 동일 적용** — 서브태스크에 "/plan 먼저" 지시 포함 필수
- **위반 발생 시**: memory/lessons.md에 기록하고 다음부터 방지

### 코딩 규칙
- 모든 코드: 한국어 주석 필수 (비전공자 유지보수 기준)
- Supabase: import { supabase } from '../lib/supabase'
- API 호출: import { api } from '../lib/api'
- 스타일: Tailwind toss.* 컬러 + Framer Motion 애니메이션
- Layout 내 페이지 루트 div: className="relative z-[1]" 필수 (AnimatedBackground z-0 위)
- OAuth 콜백 URL: Supabase URL(*.supabase.co/auth/v1/callback)이며 앱 도메인 아님
- VITE_API_URL: 개발=빈문자열(Vite프록시 /api/*→:8000), 프로덕션=Render URL
- CORS: allow_origins=["*"], IP 차단은 blocked_ips 테이블 (60초 캐시)

### 핵심 비즈니스 로직 (절대 삭제/변경/축약 금지)
- 28일 역산 블록: 마지막 근무일부터 역순 28일 블록 분할
- 블록 적격: 블록당 근무일 ≥ 8이면 적격
- 퇴직금 적격: qualifying_days ≥ 365
- 세그먼트 분리: 3개월(90일) 공백 시 별도 세그먼트
- 임금 하한: 연도별 MIN_ORDINARY_WAGE_DAILY 적용
- 퇴직금 공식: 평균일급 × 30 × (근무일수 ÷ 365)
- 4개 서비스 2단계 패턴: PDF 업로드 정밀계산 + 수동 입력 간편계산

### 관리자
- 슈퍼어드민: catchmasterdmin@gmail.com (Audit Logs, Settings 고급)
- 인증: X-Admin-Token 헤더 → _VALID_ADMIN_TOKENS 집합 검증
- 프론트 토큰: VITE_ADMIN_SECRET 또는 VITE_SUPABASE_ANON_KEY 뒤 32자 파생

### 절대 금지
- TypeScript any 타입 남발 금지
- /plan 없이 새 기능 바로 코딩 금지
- 한 번에 5개 이상 파일 대규모 수정 금지
- 28일 블록 알고리즘 로직 임의 변경 금지

---

## C — MEMORY: 세션 관리

### 세션 시작 루틴
- ⚠️ **최우선: memory/progress.md 반드시 가장 먼저 읽기** (작업 일지 + 다음 작업 + 인프라 상태 전부 기록됨)
- memory/ 폴더 내 나머지 .md 파일 읽기 (lessons.md, decisions.md)
- tasks/todo.md 읽어서 현재 진행 상황 파악
- 인사/요약 없이 바로 작업 가능 상태 보고
- CLI, IDE, Dispatch, Cowork, 일반 채팅 — 어디서 시작하든 이 루틴 동일 적용

### 세션 종료 루틴 (/compact 또는 "끝" 입력 시)
- memory/progress.md: 완료 작업 + 다음 할 일 업데이트
- memory/lessons.md: 이번 세션 실수 있었으면 추가
- memory/decisions.md: 아키텍처/기술 결정 있었으면 추가
- tasks/todo.md: 체크리스트 상태 업데이트
- 변경사항 1줄 요약 출력

### memory 파일 역할
- memory/progress.md: 현재 진행 작업, 마지막 완료, 다음 할 일
- memory/decisions.md: 아키텍처·기술 결정 기록 (왜 이렇게 했는지)
- memory/lessons.md: 실수 기록 (날짜 | 내용 | 해결법)
- memory/architecture.md: DB 테이블, 미들웨어, 요청 흐름, 환경변수, 개발 명령어 등 상세 레퍼런스

### 실수 및 동기화
- 실수 발생 시: 즉시 memory/lessons.md에 기록 (세션 종료까지 미루지 마)
- Notion 동기화: 작업 완료 시 "📋 CATCH 개발 태스크" Notion MCP로 업데이트

---

## D — 개발 진행상황 (2026.04.02 기준)

### Phase 0 — 앱 UI 완성 + 버그 수정 ✅ 완료
- 4개 계산기(퇴직금/실업급여/주휴수당/연차수당) 전체 완성
- PDF 저장/재사용 (Supabase Storage + saved_pdfs 테이블)
- 마이페이지 (프로필, 계산이력, 문의, 탈퇴)
- Toss 디자인 통일 + 반응형 + 28일 블록 알고리즘 보호

### Phase 1 — 채용정보 섹션 구축 🔄 진행 중
- [x] job_postings DB 테이블 + RLS + 인덱스 + 트리거
- [x] job_favorites DB 테이블 (즐겨찾기, 회사/센터 단위)
- [x] 관리자 JobsMenu — 공고 CRUD + 긴급토글 + 상태필터
- [x] BottomNav 7탭 → 5탭 개편 (홈|채용|계산기|공지|MY)
- [x] 계산기 허브 — 4서비스 독립 그래디언트 카드 스택
- [x] 채용피드 UI — 섹션분류(오늘긴급/내일긴급/상시), 검색, 즐겨찾기
- [x] 공식 회사 로고 (쿠팡SVG/컬리PNG/CJ SVG)
- [x] 시급/일급 2열 + 동 단위 주소 + 혜택뱃지
- [x] 히어로 카드 — 로테이션 문구(4개, 3초) + 파랑→보라 그래디언트
- [x] 프레임카드 상세 팝업 (6영역 + 카카오맵 + 배열기반 CTA)
- [x] 홈에 "내 주변 단기알바 캐치하기" CTA 추가
- [ ] 실제 채용팀 연락 → 공고 수집 시작
- [ ] 홈페이지 채용 프리뷰 고도화
- [ ] 관리자 페이지에서 채용공고 데이터 관리 검증

### Phase 2 — B2C 랜딩 + SEO (다음)
### Phase 3 — B2B 랜딩 + 유료화
### Phase 4 — Next.js 전환 + 스케일업

### 최신 커밋
- `7f91677` feat: Phase 1 채용정보 섹션 구축 (15파일, +1,613줄)
- `8eb9c1d` fix: PDF Storage 업로드 경로 한글 제거
- `6665f61` feat: PDF 저장 및 재사용 기능

---

## E — 사용자 프로필 (Claude 행동 지침)

### 종훈님 프로필
- **이름**: 종훈님 (개발자 본인)
- **직업**: 물류업계 HR·채용팀 근무 중 (특정 사명 비표기, 퇴사 후 독립이 목표)
- **코딩 경험**: **비전공자** — 기술 배경 없이 Claude와 함께 직접 개발 중
- **목표**: CATCH 앱으로 일용직 근로자 권리 찾기 지원 + 퇴사 후 독립

### Claude 행동 규칙 (종훈님 맞춤)
- 모든 설명은 **초보자 기준**, 한국어 주석 필수, 단계별 안내
- 전문 용어 사용 시 반드시 **괄호 안에 쉬운 설명** 병기 (예: RLS(행 수준 보안))
- 코드만 던지지 말고 **"왜 이렇게 하는지" 이유** 설명
- 작업 단계를 **번호 붙여 순서대로** 안내
- 긍정 편향 없이 **리스크와 한계**도 솔직하게 설명

---

## F — 컨텍스트 복구 가이드

### 새 세션에서 한 줄로 복구하는 법
```
CLAUDE.md와 docs/progress.md 읽고 작업 이어가자
```

### 파일별 역할
| 파일 | 역할 | 읽는 시점 |
|------|------|----------|
| `CLAUDE.md` | 프로젝트 정체성, 코딩 규칙, 금기사항 | 세션 시작 시 자동 로드 |
| `docs/progress.md` | 현재 진행 상황, 기술 스택, 파일 맵, 다음 작업 | 세션 시작 즉시 |
| `memory/progress.md` | 세션별 상세 작업 일지 (Claude 전용) | 세션 시작 즉시 |
| `memory/architecture.md` | DB 구조, 환경변수, API 상세 | 필요 시 |
| `memory/lessons.md` | 과거 실수 기록 | 필요 시 |
| `memory/decisions.md` | 기술 결정 기록 | 필요 시 |
