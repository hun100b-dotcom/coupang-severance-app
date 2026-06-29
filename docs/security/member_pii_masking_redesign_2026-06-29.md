# 보안 설계서 — 회원 PII 마스킹 재설계 (전수조사 🔴#4)

> **작성일**: 2026-06-29
> **성격**: **설계·발견 전용 — 코드 변경 없음.** (범위가 커 별도 단계로 분리, 종훈님 지시)
> **대상**: `frontend/src/components/admin/menus/MembersMenu.tsx`, `system_settings`, `profiles` RLS

---

## 1. 현황 — 정확한 코드 체인

### 1-1. PII가 통째로 브라우저로 내려온다
`MembersMenu.fetchMembers`(MembersMenu.tsx:90-93):
```ts
supabase.from('profiles').select('*', { count: 'exact' })
```
→ `email`, `full_name`, `birthdate`, `phone_number`, `id`(UUID) 등 **원본 개인정보가 그대로 클라이언트로 전송**된다. 네트워크 응답(JSON)에 평문으로 존재.

### 1-2. 마스킹은 "렌더링 시 글자 가림"일 뿐
`maskEmail`/`maskName`/`maskBirthdate`/`maskPhone`(MembersMenu.tsx:30-68)은 화면에 그릴 때만 별표로 바꾼다. 원본은 이미 `members` state(메모리)에 있다. → **브라우저 DevTools → Network 탭 또는 React state 검사로 마스킹과 무관하게 전체 PII 열람 가능.**

### 1-3. "보안키"는 클라이언트 평문 비교
`handleUnmask`(MembersMenu.tsx:118-153):
```ts
const { data } = await supabase.from('system_settings')
  .select('value').eq('key', 'member_unmask_key').single()
if (unlockKey === data.value) { setUnmasked(true) }   // 클라이언트 === 비교
```
→ 보안키가 `system_settings`에 **평문 저장**되고, 그 값을 **클라이언트로 내려받아 `===` 비교**한다. 해싱 없음. → ① 네트워크 탭에서 `member_unmask_key` 값 자체가 보이고, ② `unmasked=true`를 콘솔에서 직접 세팅하면 키 없이도 해제된다.

### 1-4. 결론
**현재 마스킹은 보안 통제가 아니라 UI 연출이다.** 권한 없는 내부자(또는 어드민 게이트만 통과한 계정)가 전체 회원 PII를 손쉽게 획득할 수 있다. 개인정보보호법·안전성 확보조치 기준상 **접근통제/암호화 미흡**에 해당할 소지가 크다.

---

## 2. 목표 아키텍처 — 서버측 마스킹 (Server-side masking)

원칙: **민감정보는 기본적으로 마스킹된 형태로만 서버에서 내려보낸다. 원본은 별도 인증을 통과한 요청에만, 서버가 직접 마스킹 해제 후 내려준다.**

```
[기본 조회]  프론트 → 백엔드 GET /admin/members         → 서버가 마스킹된 필드만 반환
[해제 조회]  프론트 → 백엔드 POST /admin/members/reveal  → 서버가 보안키 해시 검증 후
                                                          원본 반환 + 서버측 감사로그 기록
```

### 2-1. 핵심 변경점
1. **백엔드 신규 엔드포인트**(service-role):
   - `GET /admin/members` — `profiles`를 service-role로 읽되, **서버에서 email/name/birth/phone를 마스킹**해 반환. 검색/필터/페이지네이션 파라미터 지원.
   - `POST /admin/members/reveal` — 본문에 보안키. 서버가 **해시 비교**(아래 2-2) 후 통과 시에만 원본 반환. 동시에 `_write_audit('unmask_members', ...)`로 **서버측 감사 기록**(현재는 클라가 기록 → 위조 가능).
2. **보안키 저장을 해시로**: `system_settings.member_unmask_key`에 평문 대신 **해시(예: bcrypt/argon2 또는 최소 SHA-256+salt)**를 저장. 키 원문은 절대 클라이언트로 내려가지 않는다.
3. **프론트**: `MembersMenu`는 마스킹된 데이터만 받는다. 마스킹 함수(maskEmail 등)는 제거하거나 표시용 폴백으로만. `unmasked` 상태는 "reveal 응답으로 받은 원본 표시" 의미로 바뀐다.
4. **RLS 보강(선택)**: `profiles`에 대한 경로 A(supabase 직접) 어드민 SELECT를 차단하고, 어드민은 오직 백엔드(service-role) 경로로만 회원을 조회하도록 통일하면 클라 직노출 표면이 사라진다.

### 2-2. 보안키 검증 흐름(권장)
- 설정 시: 슈퍼어드민이 입력한 원문 키 → 백엔드가 해시해 `member_unmask_key_hash`로 저장.
- 해제 시: 프론트가 원문 키를 백엔드로 1회 전송(HTTPS) → 백엔드가 해시 비교 → 일치 시 원본 + 짧은 만료의 reveal 토큰/세션 발급(선택). 키 원문/해시 모두 클라이언트에 저장하지 않음.

---

## 3. 단계별 작업 분해 (끊어서 진행 권장)

| 단계 | 내용 | 규모 | 선후 |
|---|---|---|---|
| **S1** | 백엔드 `GET /admin/members`(서버측 마스킹 반환) 신설 + 프론트 fetchMembers를 이 경로로 전환. **PII 클라 직전송 제거**(가장 큰 위험 차단) | 중 | 1순위 |
| **S2** | 보안키 해시화: 설정 저장 시 해시, `POST /admin/members/reveal`에서 해시 비교 + 서버 감사기록 | 중 | S1 후 |
| **S3** | 프론트 마스킹 함수 정리 + reveal 응답 기반 표시로 전환 | 소 | S2 후 |
| **S4** | `profiles` 경로 A 어드민 SELECT 차단(RLS) — 백엔드 경로로 단일화 | 소(DDL) | S1 후 |
| **S5** | reveal 작업에 만료/재인증(예: 5분) + reveal 행위 자체를 별도 audit action으로 세분화 | 소 | 선택 |

> **각 단계는 독립 배포 가능**하도록 설계. S1만 끝내도 "PII가 평문으로 클라에 내려가는" 최악의 노출은 제거된다.

---

## 4. 리스크 / 주의

- **회귀 위험**: 현재 검색이 `profiles.email ilike`(클라이언트가 받은 전체에 대해서가 아니라 서버 쿼리)로 동작 중. 서버측 마스킹으로 옮길 때 **검색은 마스킹 전 원본 기준으로 서버에서** 수행해야 한다(마스킹된 값으로 검색하면 안 됨). → 백엔드 GET /admin/members가 검색 파라미터를 받아 원본 컬럼으로 필터 후 마스킹해 반환.
- **CSV/내보내기**: 회원 PII 내보내기가 필요하면 reveal 인증을 통과한 서버 경로로만. 현재 MembersMenu엔 CSV가 없음(추가 시 동일 원칙).
- **보안키 분실**: 해시 저장이므로 원문 복구 불가 → 재설정 플로우(슈퍼어드민) 필요.
- **마이그레이션 적용 제약**: S4(RLS)·해시 컬럼 추가는 DDL → Supabase 적용 필요(현 세션 MCP 미연결과 동일 제약).

---

## 5. 권고

- **우선순위**: S1(서버측 마스킹 GET) → S2(보안키 해시 + reveal 서버검증) 순으로 2개 스프린트면 핵심 위험(PII 직전송 + 평문 키)이 해소된다.
- 본 항목은 코드 한 줄이 아니라 **신규 엔드포인트 2개 + 프론트 재배선 + 키 해시 마이그레이션**이 묶인 재설계라, 다른 무음-실패 FIX와 분리해 별도 `/plan → /sprint`로 진행할 것을 권한다.
- 즉시 완화(임시): S1 전까지라도, MembersMenu의 `select('*')`를 **표시에 실제 쓰는 최소 컬럼**으로 줄이고(예: phone/birth가 화면 필수가 아니면 제외) 노출 표면을 축소할 수 있음. 단 이는 임시방편이며 근본 해결은 아님.

---

*본 문서는 발견과 설계만 담는다. 코드 수정·커밋·배포는 수행하지 않았다.*
