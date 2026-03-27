# CLAUDE.md

CATCH (퇴직금 한번에) — 일용직 근로자 퇴직금·실업급여·주휴수당·연차수당 계산기

---

## 프로젝트 개요

- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind → Vercel
- **백엔드**: FastAPI (Python 3.12) → Render
- **데이터베이스**: Supabase Postgres
- **인증**: Supabase OAuth (카카오 + 구글)

---

## 빠른 시작

```bash
/dev         # 개발 서버 시작
/test-mcp    # MCP 전체 테스트
/deploy      # 배포 체크리스트
```

**상세 문서**: [개발 환경](docs/development.md) | [아키텍처](docs/architecture.md) | [MCP 가이드](docs/mcp-guide.md)

---

## 핵심 구현 패턴

### Supabase 클라이언트
```typescript
import { supabase } from '../lib/supabase'  // ✓ 중앙 클라이언트
```

### API 호출
```typescript
import { api } from '../lib/api'
const response = await api.post('/severance/precise', { ... })
```

### 클릭 카운터
```typescript
import { registerClick } from '../lib/api'
registerClick('severance')  // fire-and-forget
```

---

## MCP 서버 (우선 사용)

모든 작업 시 MCP를 최우선으로 사용합니다:

- **Supabase MCP**: DB 쿼리, 마이그레이션, 테이블 조회
- **Notion MCP**: 개발 태스크 동기화 ("📋 CATCH 개발 태스크")
- **GitHub MCP**: 커밋 조회, PR 생성
- **Vercel MCP**: 배포 상태, 환경변수
- **Playwright MCP**: E2E 테스트 자동 실행

**예시**: "Supabase profiles 테이블 구조 보여줘" → Supabase MCP 자동 사용

[MCP 상세 가이드](docs/mcp-guide.md)

---

## 배포

```bash
git push origin main  # Vercel + Render 자동 배포
```

**Vercel**: https://coupang-severance-app.vercel.app
**Render**: FastAPI 백엔드 (싱가포르)

---

## 필수 사항

1. **Notion 동기화**: 작업 완료 시 "📋 CATCH 개발 태스크" 자동 업데이트 (Notion MCP 사용)
2. **28일 블록 알고리즘**: 퇴직금 적격성 핵심 (`backend/app/services/severance.py`)
3. **회사 필터링**: PDF 추출 → 회사 선택 → precise (2단계 구조 유지)
4. **레이아웃 분리**: `Intro`, `Login`, `Admin`은 Layout 밖, 나머지는 `<Layout>` 안

---

**상세 문서**: [docs/](docs/) 디렉토리 참조
