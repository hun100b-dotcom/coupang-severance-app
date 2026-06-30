# 더블리뷰 B (적대/레드팀) — 회원 PII 서버측 마스킹 재설계

> 브랜치: `security/member-pii-masking` · 일자: 2026-06-30
> 임무: **"평문 PII가 여전히 클라로 샐 수 있는가? reveal 권한/보안키를 우회할 수 있는가?"** 를 깨뜨려 본다.

## 1. 공격 시나리오별 결과

### A1. 목록 응답 평문 누수 시도
- 근거: `list_members`는 service-role로 `select=*` 원본을 받지만, 반환 dict는 **`_mask_email/_mask_name/_mask_birthdate/_mask_phone`로 가공한 값 + 비식별 필드(provider/날짜/플래그) + id(UUID)** 만 담는다. display_name·원본 email/name/phone/birth는 응답 dict에 **키 자체가 없음**.
- 실측: 평문 회원 1행을 list 변환 후 JSON 직렬화 → `hong.gildong`,`gildong@`,`홍길동`,`1990-01-02`,`1234-5678`,`길동이` 탐색 = **0건**.
- id(UUID) 노출: 기존에도 노출되던 내부 키이며 직접 식별 PII(이름·연락처) 아님 → reveal 타깃팅에 필요. **회귀 아님(노출 표면 동일·PII 제거).**
- **차단됨.**

### A2. reveal 우회 시도 (보안키 검증 허점)
실제 공격 테스트(`_verify_key`) 실행 결과:

| 공격 | 입력 | 결과 |
|---|---|---|
| 빈 키로 우회 | `_verify_key('', 해시)` | False ✅ |
| 키 미설정 상태 | stored=`''` → 그 전에 `_get_secret`=None → 400 | 차단 ✅ |
| 깨진 stored 형식 | `pbkdf2_sha256$abc` | False ✅ |
| 알고리즘 위조 | `md5$1$aa$bb` | False ✅ |
| 정답 키 | 정확 일치 | True ✅ |
| 근접 오답 | 한 글자 다름 | False ✅ |

- 비교는 `hmac.compare_digest`(상수시간) → 타이밍 사이드채널 완화.
- 단건 한정: reveal은 `id=eq.{member_id}` 단일 행만 조회·반환. **대량 평문 일괄 반환 경로 없음.**
- **우회 실패(차단됨).**

### A3. 키 저장/노출 시도
- 보안키 원문은 어디에도 저장되지 않음 — `set_unmask_key`가 `_hash_key`(PBKDF2)만 `admin_secrets`에 기록.
- `admin_secrets`: 마이그레이션이 RLS ENABLE + **정책 0개 = anon/authenticated 전면 deny**. service-role(백엔드)만 접근. 해시조차 클라로 안 내려감.
- `status` 엔드포인트는 `configured`(bool)+`updated_at`만 반환, **해시 미반환**.
- 마이그레이션이 공개읽기(system_settings USING true) 테이블에서 평문 `member_unmask_key` 행을 **DELETE** → 기존 anon 노출 차단.
- **차단됨.**

### A4. 프론트 잔존 누수 시도
- `grep "from('profiles')"` in `components/admin/menus/MembersMenu.tsx` → 주석만, 실제 호출 **0건**.
- `grep "member_unmask_key"` in frontend → **0건**(평문 키 read/=== 비교 제거됨).
- `revealKey`는 컴포넌트 state(메모리)에만 존재 → localStorage/sessionStorage 영속화 **없음**. 재잠금/재조회 시 `setRevealed({})`, `setRevealKey('')`로 폐기.
- **차단됨.**

### A5. 감사 우회 시도
- reveal 성공 → `_write_audit('member.unmask', who, when, member_id)`. 실패(키 불일치) → `member.unmask.denied`도 기록. 감사 없이 평문을 받는 경로 **없음**(검증 통과=감사 다음 줄에서 평문 조회·반환).
- `_write_audit`는 service-role 직접 INSERT(RLS 무관) → 미등록 관리자도 누락 없음.
- **차단됨.**

### A6. 검색 우회 시도
- 검색은 서버에서 **원본 email 컬럼** ilike로 수행하나, 반환은 마스킹 값. 평문이 검색 결과로 새지 않음. 메타문자 sanitize로 PostgREST injection/와일드카드 오매칭 차단.
- **차단됨.**

## 2. 범위 밖 발견(후속 권고, 본 PR 미수정)
- `frontend/src/components/admin/tabs/VisitorTab.tsx:74` — `profiles.select('id, full_name, email')` 평문 직접 수신.
- `frontend/src/components/admin/menus/ApplicantsMenu.tsx:157` — `profiles` 직접 조회.
- → 회원관리(MembersMenu) 범위 밖. 동일 서버측 마스킹 원칙을 적용하는 후속 과제로 분리 권고.

## 3. 뚫린 곳
- **없음(BLOCKER 0).** 클라로 가는 평문 PII 경로를 찾지 못함. reveal/키 우회 전부 차단.

## 4. 최종 판정
적대적 시도(빈키/미설정/형식위조/알고위조/대량반환/프론트잔존/감사우회/검색우회) 전 항목 차단. 잔여는 범위 밖 타 메뉴의 동종 위험(후속).

VERDICT: PASS
BLOCKER: 0
