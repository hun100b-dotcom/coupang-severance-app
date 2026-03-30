---
name: reviewer-checklist
description: "reviewer 에이전트가 참조하는 TIER별 검증 항목 체크리스트"
---

# Reviewer 검증 체크리스트

## TIER 1 (경량 변경: 파일 3개 이하)

### T1-1. 빌드 검증
- `cd frontend && npm run build` → 에러 0개 확인
- 빌드 경고 중 unused import, missing key 있으면 ❌

### T1-2. TypeScript 검사
- `cd frontend && npx tsc --noEmit` → 에러 0개
- `any` 타입 신규 추가 여부 → git diff로 확인 → 있으면 ❌

### T1-3. 변경 파일 리뷰
- git diff --cached 또는 git diff HEAD~1 로 변경 내용 확인
- 한국어 주석 누락 → ❌
- console.log 디버깅 코드 잔존 → ❌
- 하드코딩된 URL/시크릿 → ❌

### T1-4. 핵심 로직 보호
- 28일 역산 블록 알고리즘 변경 여부 확인
- qualifying_days ≥ 365 조건 변경 여부
- 3개월(90일) 세그먼트 분리 로직 변경 여부
- 위 항목 중 하나라도 변경 → ❌ FAIL (CLAUDE.md 금지 규칙)

---

## TIER 2 (중대 변경: TIER 1 전체 + 아래 추가)

### T2-1. Playwright E2E 테스트
- `cd frontend && npx playwright test` 실행
- 실패 테스트 0개 확인
- 스크린샷 비교 (있으면)

### T2-2. 백엔드 API 검증
- 백엔드 서버 실행 → `curl http://localhost:8000/health`
- 변경된 엔드포인트 curl 테스트
- 응답 스키마 검증

### T2-3. Supabase RLS 검증
- 변경된 테이블의 RLS 정책 확인 (Supabase MCP)
- anon 키로 접근 시 적절한 제한 확인

### T2-4. OAuth 플로우 검증
- AuthCallback 변경 시: 카카오/구글 로그인 → 콜백 → 프로필 확인
- 로그인/로그아웃 사이클 정상 동작

### T2-5. 모바일 반응형
- Playwright viewport: { width: 375, height: 812 } (iPhone X)
- 주요 페이지 레이아웃 깨짐 없는지 확인
- BottomNav 정상 표시

### T2-6. 회귀 테스트
- 변경하지 않은 핵심 페이지 3개 접근 테스트
- Home, Severance, MyPage 정상 렌더링 확인

### T2-7. 성능 체크
- 빌드 사이즈 확인: `du -sh frontend/dist/`
- 이전 대비 20% 이상 증가 → ⚠️ 경고

---

## 절대 금지 규칙 (모든 TIER)

1. 도구 실패를 PASS로 처리 금지
2. "아마 괜찮겠지" 추측 판정 금지
3. 검증 없이 "코드 리뷰만으로 PASS" 금지
4. 에러 메시지 생략 금지 — 전문 포함
5. TIER 2 조건 해당 시 TIER 1로 다운그레이드 금지
