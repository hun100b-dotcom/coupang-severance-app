# 기획서 — 회원 PII 마스킹 서버측 재설계 (보안 🔴#4)

> 작성일: 2026-06-30 · 브랜치: `security/member-pii-masking`
> 근거: `docs/security/member_pii_masking_redesign_2026-06-29.md`(설계서), `docs/audit/admin_function_audit_2026-06-29.md`(#3-4)

## 목표
회원 PII(이름·이메일·전화·생년월일)가 평문으로 클라이언트에 내려오는 "가짜 마스킹"을 제거.
서버가 기본 마스킹된 데이터만 반환하고, 평문은 권한·감사로그를 통과한 단건 reveal로만 제공.

## 현황(위험)
1. `MembersMenu.fetchMembers` → `supabase.from('profiles').select('*')` → 평문 PII가 네트워크 응답에 그대로 존재.
2. 마스킹은 렌더 시 글자 가림(maskEmail 등)일 뿐 → DevTools/Network로 무력화.
3. 보안키 `system_settings.member_unmask_key`가 **평문 저장 + 공개 읽기 RLS(`USING(true)`)** → 누구나(anon 포함) 키를 읽을 수 있음. 클라 `===` 비교.

## 설계 (설계서 §2 기준)
### 백엔드 (admin.py, service-role)
- `GET /admin/members` — profiles를 service-role로 읽되 **서버에서 마스킹** 후 반환. 검색(email ilike)/마케팅 필터/페이지네이션 서버측. 평문 PII 미포함. (행 식별용 UUID `id`만 동반 — 기존에도 노출되던 내부키, reveal 타깃팅에 필요)
- `POST /admin/members/reveal` — body `{member_id, key, admin_email}`. 보안키 **해시 비교(PBKDF2-HMAC-SHA256, 상수시간)** 통과 시에만 **단건** 평문 반환 + `_write_audit('member.unmask', who/when/which)`. 실패도 감사 기록. 대량 평문 금지.
- `POST /admin/members/unmask-key` — body `{key, admin_email}`. 키를 해시해 보안 테이블에 저장(평문 미저장). 감사 기록.
- `GET /admin/members/unmask-key/status` — `{configured, updated_at}` (해시는 미반환).

### DB (마이그레이션 — 적용은 종훈님이 Supabase MCP로)
- 신규 테이블 `admin_secrets`(key PK, value_hash, algo, updated_at, updated_by) + RLS deny-all(클라 접근 0, service-role만). 키 해시 격리.
- `system_settings`의 평문 `member_unmask_key` 행 삭제(기존 공개노출 차단).

### 프론트
- `MembersMenu`: fetch를 `getAdminMembers()`(백엔드) 경로로 전환 → 서버 마스킹 데이터 표시. 클라 mask 함수 제거(maskId만 표시용 유지).
- 토글 UX 유지하되 의미 전환: "해제"=슈퍼어드민이 보안키 입력→해제 모드 진입(키는 메모리만). 각 행 "👁 보기" 클릭 시 `revealMember()` 단건 호출 → 그 행만 평문 표시. 재잠금=키/평문 폐기.
- 비(非)슈퍼어드민: 해제 UI 차단 + 안내.
- `SettingsMenu` 보안키 섹션: 평문 read/write 제거 → `getUnmaskKeyStatus()` 표시 + `setUnmaskKey()` 저장(해시는 표시 불가).
- `api.ts`: getAdminMembers/revealMember/setUnmaskKey/getUnmaskKeyStatus 추가.

## 불변/비범위
- 계산 로직·사용자 화면·다른 어드민 메뉴 불변. 회원 목록/검색/필터/페이지네이션/기존 토글 UX 회귀 0.

## 검증
- `npm run build`(tsc) 통과. 백엔드 import 확인.
- 네트워크 응답에 평문 PII(이름/이메일/전화/생년월일) 없음 실측.
- 엄격 더블리뷰 A(총괄)/B(적대) → `docs/dual_review/member_pii_{A,B}.md`.

## DB 적용 필요(보고 시 안내)
- `supabase/migrations/20260630_member_pii_secure.sql` 적용 전까지 reveal은 "키 미설정"으로 동작(평문 노출 0은 유지). 적용 후 슈퍼어드민이 보안키 재설정 필요(평문→해시 전환이라 기존 키 복구 불가).
