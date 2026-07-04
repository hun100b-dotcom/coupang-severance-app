# 듀얼리뷰 — 어드민 연동 전수조사 STEP2 (법정변수 실연동 + 감사로그 토큰 유출 차단)

> 2026-07-04. 빌더: Claude(Fable 5) / 리뷰어 A(5축) + B(적대) 독립 에이전트.

## 변경 요약

| 파일 | 변경 |
|---|---|
| `backend/app/api/admin.py` | ① `_write_audit(x_admin_token or "admin", …)` **11곳 → `"admin"`** — 감사로그 admin_email에 관리자 시크릿 원문이 기록되던 유출 차단 (라이브 audit_logs에 기존 유출 5행 실측) ② 신설 `GET /admin/legal-variables`(실패 시 502) + `PATCH /admin/legal-variables`(key+연도 단위, 사전검증 404, return=representation으로 0행 무음 차단, 감사기록) |
| `frontend/src/lib/api.ts` | LegalVariable 타입 + getLegalVariables/patchLegalVariable |
| `frontend/.../settings/LegalVariables.tsx` | 전면 재작성 — system_settings(minimum_wage_*) 저장 = **계산기에 반영 안 되던 죽은 위젯** → legal_variables 실소비 테이블 편집(백엔드 service-role 경유). 4상태 완비, 행별 저장, 저장 후 재조회 |
| `frontend/.../menus/SettingsMenu.tsx` | `<LegalVariables />` props 제거 1줄 |

## 실측 검증 (로컬 TestClient + 라이브 Supabase)

- GET 200 실데이터 4행 / PATCH 동일값(10320) 200 + 변경행 반환 / 없는 키 404 / 무토큰 401
- 최초 구현의 `updated_by`(이메일) 기록이 라이브 uuid 컬럼과 충돌(400) → 제거 후 재검증 200 ("누가"는 audit_logs 담당)

## 판정표

| 항목 | 리뷰어 A (5축) | 리뷰어 B (적대) |
|---|---|---|
| 판정 | **PASS** (5축 전부) | **PASS** (공격 6종 전부 안전, 경미 지적 3건 = 후속) |
| 디자인/UI | UP 토큰·기존 카드 패턴 유지, 무지개 0 | — |
| UX | 로딩/에러(+재시도)/빈/성공 4상태, 거짓 성공 방지 | — |
| 회귀 | 4파일 한정, legalVariables.ts(사용자 소비측)·계산로직·CSS 0건 | — |
| B공격 | — | "admin" 고정이 감사 UI 무파손 · value 타입체인 무손실 · supabase null 가드 · 타 위젯 prop 무파손 · 라우트 충돌 없음 · 옛 키 소비처 0건 |

**[합의]** 쌍방 PASS, 이견 없음. **[최종결정: 커밋 진행]**

## 후속 항목 (이 diff 블로커 아님)

1. (보안) 라이브 audit_logs 토큰 유출 행 스크럽(기존 5 + 이번 세션 설정 저장 2 = 7행) — 감사로그 무결성 트레이드오프라 종훈님 결정 필요
2. (재현성) 20260603_legal_variables.sql이 라이브 스키마(notes 컬럼, key+연도 복합유니크, updated_by uuid)와 드리프트 — IaC 정합 마이그레이션 후속
3. (선택) system_settings 고아 키 minimum_wage_hourly/daily 행 삭제
