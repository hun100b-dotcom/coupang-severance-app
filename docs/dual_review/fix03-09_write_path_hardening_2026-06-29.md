# 더블 리뷰 기록 — FIX #3/#5/#6/#9 쓰기 경로 견고화 묶음

> **작성일**: 2026-06-29
> **대상**: 어드민 전수조사 🔴#3(설정 이원화) + 🟡#5(공지 CRUD 무음) + 🟡#6(템플릿 삭제 무음) + 🟡#9(에러처리 누락)
> **리뷰 구성**: 리뷰어 A(총괄) + 리뷰어 B(적대) 병렬 → 발견 즉시 반영

---

## 1. 처치 요약

| FIX | 문제 | 처치 |
|---|---|---|
| #3 설정 이원화 | CmsSettings만 system_settings를 supabase 직접 upsert(경로 A, RLS) | 백엔드 `patchSetting`(경로 B, service-role)로 통일 + 부분반영 정확 보고(allSettled) |
| #5 공지 CRUD 무음 | NoticesMenu 추가/수정/토글/삭제에 `.select()`·에러처리 전무 | `.select('id')` + 변경행 0 검증 + error state + 화면표시 + 실패 시 refetch |
| #6 템플릿 삭제 무음 | api.ts createTemplate/deleteTemplate가 supabase 직접(`.select()`無) | 조회·생성·삭제 모두 백엔드(경로 B)로 통일 |
| #9 에러처리 누락 | TemplateManager/IpBlockManager가 catch 없이 finally만 | try/catch + error state + 표시 + 폼 토글 시 초기화 |

## 2. 변경 파일

- `frontend/src/lib/api.ts` — getTemplates/createTemplate/deleteTemplate → 백엔드 경로 B
- `frontend/src/components/admin/settings/CmsSettings.tsx` — patchSetting + Promise.allSettled
- `frontend/src/components/admin/menus/NoticesMenu.tsx` — .select()/error/refetch/모달 에러 초기화
- `frontend/src/components/admin/inquiries/TemplateManager.tsx` — 에러처리
- `frontend/src/components/admin/settings/IpBlockManager.tsx` — 에러처리

---

## 3. 리뷰어 A(총괄) — CONDITIONAL PASS

- **[blocking→해소]** inquiry_templates 조회가 경로 A로 남으면 "생성됐는데 목록 안 보임"
  → **getTemplates도 백엔드 경로 B로 통일하여 해소(반영 완료).**
- [권장] CmsSettings Promise.all → allSettled (부분반영 정확 보고) → **반영**.
- [권장] notices is_admin 세션 의존 명시 → **아래 5절 한계로 명시**.
- [경미] backend settings raw httpx.post 헬퍼화 / NoticesMenu 주석 정정 → 주석 정정 반영(백엔드 헬퍼화는 본 FIX 범위 밖, 기존 코드).

## 4. 리뷰어 B(적대) — 핵심 1건 상 + 권고 5건

| # | 결함 | 심각도 | 상태 |
|---|---|---|---|
| 1 | CmsSettings Promise.all 부분반영 무음(빈 공지 배너 노출 위험) | 상 | **반영(allSettled + 키별 보고)** |
| 2 | 템플릿 생성(B)/조회(A) 이원화 → 저장됐는데 목록 빈 가능 | 중 | **반영(getTemplates 경로 B 통일)** |
| 3 | 공지 토글/삭제 실패 시 refetch 안 함 → 화면-DB 불일치 | 중 | **반영(실패 분기 refetch)** |
| 4 | 공지 모달 취소 후 유령 에러 배너 잔류 | 하 | **반영(closeModal에서 setError(null))** |
| 5 | IpBlock/Template 폼 토글 시 낡은 에러 잔류 | 하 | **반영(토글/취소 시 setError(null))** |
| 6 | NoticesMenu insert 0행 가드는 도달불가(throw로 잡힘) — 주석 오해 | 하 | **반영(주석 정정)** |
| 기각 | 토큰 401(폴백 일치)/reason:null(Optional 수용)/z-index | — | 근거와 함께 기각 |

---

## 5. 반영 결과 + 남은 한계(솔직)

- A·B의 **상**(CmsSettings allSettled) + 모든 권고 반영. 빌드 `npm run build` ✅(타입 에러 0).
- **남은 한계 — notices는 경로 A(is_admin 세션) 유지**: notices는 백엔드 라우트가 없어 supabase 직접(RLS `is_admin()`)을 유지한다. 따라서 이 화면은 **로그인 세션 이메일이 admin_accounts에 is_active=true로 등록**돼 있어야 동작한다(템플릿/CMS/IP는 X-Admin-Token으로 세션 무관). dfc5238은 admin_accounts에 등록돼 있어 정상이나, 미등록 세션이면 공지만 0행으로 막히며 이제는 **거짓 성공 대신 에러를 표시**한다. notices 백엔드 라우트 신설은 별도 태스크.
- **경로 B 공통 전제**: 프로덕션 Vercel `VITE_ADMIN_SECRET`=백엔드 기본 토큰. 동일 토큰 경로(법정변수 등)가 프로덕션 동작 중이라 경험적으로 충족(배포 후 1회 확인 권장).
