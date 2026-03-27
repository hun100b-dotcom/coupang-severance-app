# MCP 서버 사용 가이드

> CATCH 프로젝트 MCP 설정 및 사용법

---

## 🎯 설치된 MCP 서버

| MCP | 상태 | 용도 |
|-----|------|------|
| **Supabase** | ✅ 활성화 | DB 직접 쿼리, 테이블 조회, 마이그레이션 실행 |
| **Notion** | ✅ 활성화 | "📋 CATCH 개발 태스크" DB 읽기/쓰기 |
| **GitHub** | ✅ 활성화 | 커밋 조회, PR 생성, Issue 관리 |
| **Vercel** | ✅ 활성화 | 배포 상태, 환경변수, 로그 조회 |
| **Playwright** | ✅ 활성화 | E2E 테스트 자동 실행 |
| **Sequential-thinking** | ✅ 활성화 | 복잡한 사고 프로세스 |

설정 파일: `~/.claude/mcp.json`

---

## 🚀 사용 방법

### Supabase MCP

```
"Supabase profiles 테이블 구조 보여줘"
"user_access_logs 테이블에서 오늘 생성된 로그 10개 조회해"
"marketing_sms = true인 사용자 수 확인해줘"
```

**자동 사용 시나리오:**
- DB 마이그레이션 실행
- 테이블 스키마 확인
- 데이터 검증 쿼리

### Notion MCP

```
"Notion CATCH 개발 태스크 데이터베이스에서 진행 중인 작업 보여줘"
"Notion에서 완료된 작업 목록 가져와줘"
"이 작업 완료로 Notion 업데이트해줘"
```

**자동 사용 시나리오:**
- 작업 완료 시 Notion DB 자동 업데이트
- 다음 작업 확인
- 진행 상황 동기화

### GitHub MCP

```
"GitHub에서 최근 커밋 5개 보여줘"
"main 브랜치의 최신 커밋 정보 가져와줘"
"이번 변경사항으로 PR 만들어줘"
```

**자동 사용 시나리오:**
- PR 자동 생성
- 커밋 히스토리 조회
- Issue 트래킹

### Vercel MCP

```
"Vercel 배포 상태 확인해줘"
"최근 배포 로그 보여줘"
"프로덕션 환경변수 확인해줘"
```

**자동 사용 시나리오:**
- 배포 완료 확인
- 환경변수 검증
- 배포 로그 분석

### Playwright MCP

```
"frontend/e2e/ 테스트 전체 실행해줘"
"admin 페이지 E2E 테스트 돌려줘"
"테스트 실패한 항목 스크린샷 보여줘"
```

**자동 사용 시나리오:**
- 코드 변경 후 자동 테스트
- E2E 테스트 결과 분석
- 회귀 테스트

---

## 🔧 설정 (완료됨)

모든 MCP는 이미 설정 완료되었습니다:

- ✅ Notion Integration Token: 설정됨
- ✅ GitHub Personal Access Token: 설정됨
- ✅ Vercel CLI 인증: 완료
- ✅ Supabase Service Role Key: 설정됨

**Notion 추가 설정 필요:**
1. Notion에서 "📋 CATCH 개발 태스크" 페이지 열기
2. 우측 상단 `...` → "Add connections"
3. "CATCH Development" Integration 연결

---

## 💡 MCP 우선 사용 원칙

**모든 작업 시 MCP를 최우선으로 사용합니다:**

❌ **잘못된 방식:**
```
나: "Supabase SQL Editor 열어서 profiles 테이블 확인해줘"
AI: "SQL Editor 링크입니다..."
```

✅ **올바른 방식:**
```
나: "profiles 테이블 확인해줘"
AI: (Supabase MCP 사용) "profiles 테이블 구조는 다음과 같습니다..."
```

---

## 📋 테스트 명령어

전체 MCP를 테스트하려면 슬래시 커맨드 사용:

```
/test-mcp
```

개별 테스트:

```
/test-supabase
/test-notion
/test-github
```

---

**참조**: [CLAUDE.md](../CLAUDE.md) | [개발 환경](./development.md)
