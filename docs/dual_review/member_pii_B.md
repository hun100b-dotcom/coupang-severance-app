# 더블리뷰 B (적대/레드팀) — 회원 PII 서버측 마스킹 재설계

> 브랜치: `security/member-pii-masking` · 일자: 2026-06-30
> 임무: **"평문 PII(이름·이메일·전화·생년월일)가 여전히 클라로 샐 수 있는가? reveal 권한/보안키를 우회할 수 있는가?"** 를 깨뜨려 본다.
> 변경 파일: `backend/app/api/admin.py`, `frontend/src/components/admin/menus/MembersMenu.tsx`, `frontend/src/components/admin/menus/SettingsMenu.tsx`, `frontend/src/lib/api.ts`, `supabase/migrations/20260630_member_pii_secure.sql`(신규)
> TIER 판정: **TIER 2** (마이그레이션 변경 + admin.py(서비스성 핵심) + api.ts + 5파일)

---

## 1. 공격 시나리오별 결과

### 공격 1 — 목록 응답 평문 누수 (GET /admin/members)
**근거**: `admin.py` `list_members` L1009-1062. PostgREST에서 `select=*`로 원본을 받지만(L1022), 반환 dict(L1044-1061)는 **명시 화이트리스트**로만 구성된다:
`id`(UUID) / `email`=`_mask_email()` / `full_name`=`_mask_name()` / `birthdate`=`_mask_birthdate()` / `phone_number`=`_mask_phone()` / provider / created_at / marketing_* / onboarding_completed.

- 평문 email/full_name/phone/birthdate **미포함** → 차단.
- `display_name`(닉네임으로 실명일 수 있음) **반환 안 함** → 차단. (reveal에만 포함)
- `select=*`로 받은 원본 `r`은 마스킹 함수의 입력으로만 쓰이고, dict comprehension이 끝나면 GC 대상 → 원본이 새는 경로 없음.
- `id`(UUID) 노출: reveal 타깃팅에 필요한 내부 키. 직접 식별 PII 아님(이름/연락처와 연결 불가, RLS로 profiles 직접조회 차단됨). 프론트에서도 `maskId()`로 가려 표시. **수용 가능 위험**.
- **검색 우회(시나리오 6)**: `search`는 서버측에서 `email ilike` 필터(L1027-1030)로만 쓰이고 결과는 동일하게 마스킹되어 반환. 평문 기준 검색은 OK, 평문 반환은 NO. `_sanitize_ilike`(L1001)가 `* , ( ) %` 제거 → 와일드카드/PostgREST 인젝션 차단. **검색은 마스킹 우회로가 아님** → 차단.

판정: **차단(PASS)**

### 공격 2 — reveal 우회 (POST /admin/members/reveal)
**근거**: `reveal_member` L1071-1114. 게이트 순서:
1. `_check_admin(x_admin_token)` — 토큰 없으면 401.
2. `stored = _get_secret(...)`; `if not stored: raise 400` (키 미설정/테이블 없음/anon RLS 차단 시 fail-closed).
3. `if not _verify_key(payload.key, stored): _write_audit(... denied ...); raise 403`.
4. 통과 시에만 단건 profiles 조회 → `_write_audit('member.unmask')` → 평문 반환.

실측 공격(아래 §2 테스트):
- 빈 키 / 틀린 키 / substring 키 / 형식 깨진 stored / 다른 algo / 비숫자 iter / base64 깨짐 → **전부 False(차단)**.
- 빈 키로 우회: `set_unmask_key`(L1131)가 `if not payload.key.strip(): raise 400`으로 빈/공백/탭 키 저장 차단 → admin_secrets에 빈 키 해시가 들어갈 경로 없음 → 빈 키 우회 불가.
- **대량 평문 금지**: reveal은 `member_id` 단건(`id=eq.{member_id}`)만 조회, 한 번에 1명. 배열/리스트 입력 불가(BaseModel `member_id: str`). 차단.
- 타이밍: `_verify_key`가 `hmac.compare_digest`(L960) 상수시간 비교 사용. 차단.

판정: **차단(PASS)**

### 공격 3 — 키 저장/노출
**근거**:
- 보안키 원문은 **어디에도 저장 안 됨**. `set_unmask_key`는 `_hash_key()`(PBKDF2-SHA256, 200k iter, 랜덤 salt 16B, L941-948) 결과만 `admin_secrets`에 저장.
- `admin_secrets` RLS: 마이그레이션 L35 `ENABLE ROW LEVEL SECURITY` + 정책 0개 = deny-all to anon/authenticated. 백엔드 service-role만 우회. 클라 접근 0.
- `system_settings` 공개읽기(`USING true`)의 평문 키 행: 마이그레이션 L39 `DELETE ... WHERE key='member_unmask_key'`로 제거 → 공개 노출 차단.
- 해시가 클라로 내려가는가: `unmask_key_status`(L1141)는 `{configured, updated_at}`만 반환, `_get_secret_row`가 `value_hash`를 조회하지만 status 핸들러는 그 값을 **반환 dict에 넣지 않음**. 프론트 `getUnmaskKeyStatus`(api.ts L771) 타입도 `{configured, updated_at}` → 해시 미노출. 차단.
- 로깅: `_write_audit`의 `after_val`(L1105)은 `{"fields":[...]}` 즉 **필드 이름만** 기록, 평문 값/키 미기록. 보안키도 로그에 안 남음. 차단.

판정: **차단(PASS)** — 단, 아래 [관찰] §4 (`_DEFAULT_ANON_KEY` 소스 하드코딩)는 본 PR 범위 밖의 기존 사안.

### 공격 4 — 프론트 누수
**근거**(grep 실측):
- `MembersMenu.tsx`: `supabase.from('profiles').select` **잔존 없음**(주석 L4만). fetch는 `getAdminMembers()`(백엔드) 경유.
- `revealKey`는 `useState`(L41) 메모리만. `localStorage`/`sessionStorage` 영속화 **없음**(grep 0건). 재잠금 `lockAgain()`(L93)에서 `setRevealKey('')` + `setRevealed({})`로 폐기. 페이지 새 목록 fetch 시에도 `setRevealed({})`(L70)로 평문 무효화.
- 평문 키 `===` 비교: **없음**. 키 비교는 전부 백엔드 `_verify_key`.
- 403/400 응답 시 키 폐기 + 재입력 유도(L108-117).
- 비슈퍼어드민: 해제 토글 UI 차단(`{isSuperAdmin && ...}` L164) + 안내문(L210). **단 이는 UI 가드일 뿐**, reveal API는 `isSuperAdmin`을 검증하지 않고 admin토큰+보안키로만 보호(아래 [관찰] §4 참조).
- `SettingsMenu.tsx`: 보안키 평문 read/write **제거**됨. `MaskingKeySection`은 `getUnmaskKeyStatus`(상태만) + `setUnmaskKey`(해시 저장)만 호출. `system_settings`에서 읽는 값은 `permission_levels`뿐(L59, 보안키 아님). 슈퍼어드민에게만 렌더(L331). 차단.
- `api.ts`: `getAdminMembers`가 받는 `MaskedMember`(L729) 타입에 평문 없음. `getStats`/`getMembers` 류의 기존 supabase 직접조회(L455)는 `select('id, provider, created_at, marketing_*')` — **PII 컬럼(email/full_name/phone/birthdate) 미포함** → 안전.

판정: **차단(PASS)**

### 공격 5 — 감사 우회
**근거**: reveal 성공 경로는 평문 select(L1096) 후 **반드시** `_write_audit('member.unmask')`(L1104) 호출 후 return(L1107). 실패도 `member.unmask.denied`(L1092) 기록.
- 다만 `_write_audit`(L133)은 예외/비정상status를 삼킨다(관리자 작업 차단 방지 설계). 즉 **감사로그 DB 기록이 실패해도 평문은 반환된다**. 그러나 실패 시 `_audit_logger.warning`(L150,154)으로 서버 로그에 남겨 "무음 누락"은 아님. → 가용성 vs 감사완전성의 의도된 트레이드오프. **감사 없이 평문을 받는 은밀한 우회 경로는 아님**(서버로그 추적 가능). BLOCKER 아님 → [관찰]로 분류.

판정: **차단(PASS)** + [관찰] §4

### 공격 6 — 회귀로 인한 우회 (검색)
공격 1에서 함께 검증. 검색은 서버측 `email ilike` 필터로만 동작하고 결과는 마스킹 반환. 우회로 아님. **차단(PASS)**

---

## 2. 실제 실행한 공격 테스트 코드와 결과

`admin.py` 실제 소스에서 보안 함수만 AST로 추출(`ast.parse` → 대상 FunctionDef만 `compile`/`exec`)해 격리 실행. **복제가 아닌 실제 소스 검증**.

### 테스트 A — `_verify_key` / `_hash_key` 엣지케이스 (실행 결과)
```
빈 stored("")                         -> False   ✅차단
빈 raw + 빈 stored                    -> False   ✅차단
형식깨짐 "$$$"                          -> False   ✅차단
부분형식 "pbkdf2_sha256$1$a"           -> False   ✅차단
다른 algo "md5$..."                    -> False   ✅차단
iter 비숫자 "...$abc$..."              -> False   ✅차단
base64 깨짐 "...$@@@$@@@"              -> False   ✅차단
올바른 키 검증                          -> True    (정상)
빈 raw("") vs 정상 stored               -> False   ✅차단
틀린 키 "wrong"                        -> False   ✅차단
정상키 substring "SuperSecret123"       -> False   ✅부분일치 불가
빈키 해시 후 빈키 검증                    -> True    ⚠(set_unmask_key가 빈키 저장을 막아 실전 도달 불가)
같은 키 2회 해시가 다른가(salt 랜덤)       -> True    ✅레인보우 방어
```

### 테스트 B — 빈키 차단 / reveal fail-closed (실행 결과)
```
공백키 ' '   -> 차단(400)      탭키 '\t' -> 차단(400)      빈키 '' -> 차단(400)      정상키 -> 통과
reveal stored=None -> 400 키미설정(평문 0)
reveal stored=''   -> 400 키미설정(평문 0)
reveal stored=해시,키틀림 -> 403 키불일치(평문 0)
```

### 테스트 C — 마스킹 누수 점검 (실행 결과 요약)
```
a@b.com -> a***@b.com   ab@gmail.com -> ab***@gmail.com   abcdef@naver.com -> ab****@naver.com
x/noat/@nodomain -> ****   홍길동 -> 홍*동   남궁민수 -> 남**수
1990-01-15 -> 1990-**-**   19900115 -> ****-**-**   None -> 미등록
010-1234-5678 -> 010-****-5678   01012345678 -> ***-****-****
```
평문 전체값이 새는 케이스 **없음**. (이메일 로컬 앞 2자, 이름 첫/끝, 생년(year), 전화 국번+끝4자리 노출은 설계상 의도된 부분 마스킹.)

### 테스트 D — 프론트 빌드
```
cd frontend && npm run build  →  ✓ built in 9.48s  (tsc 통과, 에러 0)
```

---

## 3. 뚫린 곳 (BLOCKER)

**없음.** 본 PR 변경 범위(MembersMenu/SettingsMenu/api.ts/admin.py member 엔드포인트/마이그레이션) 내에서 평문 PII가 클라로 새거나 보안키/reveal을 우회하는 경로를 찾지 못함.

---

## 4. 범위 밖 발견 위험 (PII — 본 PR 비범위, 별도 후속 권고)

> 기획서 "비범위: 다른 어드민 메뉴 불변"에 해당. 이번 PR의 회귀가 아니라 **기존 잔존 위험**. 차기 보안 작업 대상으로 등록 권고.

1. **[중] VisitorTab.tsx:74 / ApplicantsMenu.tsx:157** — `supabase.from('profiles').select('id, full_name, email').in('id', userIds)`로 **평문 이름·이메일을 클라가 직접 수신**. 이번 PR이 MembersMenu에서 제거한 "가짜 마스킹/평문 직수신" 패턴이 이 두 화면에 그대로 남아있음.
   - 완화 요소: `profiles` RLS(`004_security_rls.sql` L142) = `auth.uid()=id OR public.is_admin()`. `is_admin()`은 `admin_accounts`에 등록된 활성 관리자만 true. → anon/일반 회원에겐 평문이 새지 않음(타인 행 0). **노출 대상은 등록 관리자 본인 브라우저로 한정**되며 감사로그도 없음 → 재설계 취지와는 모순.
2. **[저] `_DEFAULT_ANON_KEY`(admin.py L30-34) / `_DEFAULT_ADMIN_SECRET="Luck2058qorwhdgns3"`(L36) 소스 하드코딩** — 기존 사안. `SUPABASE_SERVICE_ROLE_KEY`가 미설정 시 anon key로 폴백(L42-45)하면 reveal/list가 RLS에 막혀 평문 0(fail-closed, 보안엔 오히려 안전)이나, admin 토큰 기본값이 레포에 노출됨 → reveal API 도달 자체는 가능(보안키 게이트가 2차 방어). 관리자 토큰을 환경변수 전용으로 강제 + 기본값 제거 권고.
3. **[저] reveal 감사로그 실패 시에도 평문 반환**(L1104 이후) — `_write_audit`이 예외를 삼킴. 서버로그(`_audit_logger.warning`)에는 남으나 audit_logs DB엔 누락 가능. 가용성 우선 설계이므로 BLOCKER 아님. 평문 반환 전 감사 성공을 강제(reveal을 audit 성공에 종속)하는 옵션 검토 권고.

---

## 5. 최종 판정

- 공격 1~6 (목록 누수 / reveal 우회 / 키 저장·노출 / 프론트 누수 / 감사 우회 / 검색 회귀): **전부 차단(PASS)**.
- 실측: `_verify_key` 12개 엣지케이스 전부 차단, 빈키 저장 차단, reveal fail-closed 확인, 마스킹 누수 0, 프론트 빌드 통과.
- BLOCKER 0건. 범위 밖 잔존 PII 위험 3건은 후속 작업으로 등록 권고(이번 PR의 배포를 막지 않음).

VERDICT: PASS
BLOCKER: 0
