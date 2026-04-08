# 📋 CATCH 작업 일지 & 다음 작업

> **이 파일은 모든 세션의 시작점입니다.**
> CLI, IDE, Dispatch, Cowork, 일반 채팅 — 어디서든 작업을 시작하면 이 파일을 가장 먼저 읽으세요.
> 작업이 끝나면 반드시 이 파일을 업데이트하세요.

---

## 🔴 다음 작업 (TODO)

| 우선순위 | 작업 | 상세 |
|---------|------|------|
| **P0** | GSC 나머지 URL 색인 요청 | 하루 2~3개씩. `/landing`, `/guide`, `/guide/severance`, `/guide/unemployment`, `/guide/weekly-allowance`, `/guide/annual-leave`, `/severance`, `/unemployment`, `/calculator` (GSC 상단 검색바에 URL 입력 → "색인 생성 요청" 클릭) |
| **P1** | Phase 1 잔여 작업 | 실제 채용팀 연락→공고 수집, 홈 채용 프리뷰 고도화, 관리자 채용공고 데이터 관리 검증 |
| **P2** | Phase 2 B2C 랜딩 + SEO 고도화 | 랜딩 페이지 추가 개선, 검색 노출 모니터링(1~4주 소요) |
| **P3** | 앱스토어/플레이스토어 출시 | PWA → 네이티브 앱 래핑(Capacitor/TWA) 검토 필요 |
| **P4** | Phase 3 B2B 랜딩 + 유료화 | - |

---

## ✅ 완료 작업 이력

### 세션 4 — 2026-04-09 (Cowork)

**Google Search Console 설정**
- `catch-daily-worker.vercel.app` 속성 추가 (소유권 HTML 태그 자동 인증)
- sitemap.xml 제출 완료
- `/home` URL 색인 생성 요청 완료 (1/10)
- 나머지 9개 URL은 일일 할당량 초과로 내일부터 진행

**네이버 서치어드바이저 설정**
- 사이트 소유권 인증 완료 (naver-site-verification 메타태그 추가)
- sitemap.xml 제출 완료
- 주요 URL 10개 웹페이지 수집 요청 완료
- 커밋: `3288194` feat(seo): 네이버 서치어드바이저 소유권 인증 메타태그 추가

**랜딩 페이지 개선 (LandingV1.tsx)**
- PAIN 섹션 사용자 후기 인용문 시각적 강조 (그래디언트 배경, "200만 원" 파란색 강조)
- 소멸시효 카드 데이터 오류 수정: "1년 이상" → "3년"
- SCHEDULE 섹션에 긴급·추가모집 알림 카드 추가 (🔥 빨간-주황 그래디언트)
- 미사용 변수(hoverTextColor) 제거 → Vercel 빌드 에러 수정

**SEO 가이드 페이지 앱 내 이동**
- 5개 가이드 라우트를 Layout 안으로 이동 (TopNav + BottomNav 표시)
- 가이드 페이지 자체 네비 제거, 패딩 조정
- Home에 "노동법 가이드" 진입 배너 추가

**SEO 컨설팅 리포트**
- `CATCH_런칭준비_컨설팅리포트.docx` 생성 (Google/Naver 검색 현황, 앱스토어 타이밍, 리스크 분석)

### 세션 3 — 2026-04-08

- 하네스 워크플로우 + Opus 리뷰어 서브에이전트 설정
- `.claude/agents/` 폴더 생성 (reviewer.md, reviewer-checklist.md)
- `.claude/commands/` 추가 (plan.md, sprint.md, review.md)
- memory/, tasks/ 인프라 구축

### 이전 세션

- Phase 0 완료: 4개 계산기, PDF 저장/재사용, 마이페이지, Toss 디자인
- Phase 1 진행: 채용정보 섹션 구축 (job_postings DB, 관리자 CRUD, 피드 UI 등)

---

## 🔧 현재 인프라 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로덕션 URL | https://catch-daily-worker.vercel.app | Vercel 자동배포 |
| API | https://coupang-severance-api.onrender.com | Render 자동배포 |
| Google Search Console | ✅ 등록 완료 | 속성: catch-daily-worker.vercel.app |
| Naver Search Advisor | ✅ 등록 완료 | 소유권 인증 + 수집 요청 완료 |
| Google 색인 | 🔄 진행 중 | /home 요청 완료, 나머지 9개 대기 |
| Naver 색인 | 🔄 진행 중 | 수집 요청 후 2~4주 소요 |
| sitemap.xml | ✅ | Google + Naver 모두 제출 |
| robots.txt | ✅ | 크롤링 허용 설정 |
| OG 메타태그 | ✅ | 카카오/페이스북/슬랙 공유 대응 |
| JSON-LD 구조화 데이터 | ✅ | WebApplication 스키마 |

---

## 📌 주의사항 (실수 방지)

- 로컬 빌드 테스트는 반드시 `npm run build` 사용 (`vite build` 단독 금지 → tsc 에러 누락됨)
- 구현 완료 후 반드시 `.claude/agents/reviewer.md` 기반 리뷰어 에이전트 호출
- 28일 블록 알고리즘 로직 절대 임의 변경 금지
- index.html의 google-site-verification, naver-site-verification 메타태그 삭제 금지
