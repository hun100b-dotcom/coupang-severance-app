# 더블리뷰 A (총괄) — 회원 PII 서버측 마스킹 재설계

> 브랜치: `security/member-pii-masking` · 리뷰어: 총괄(A) · 작성일: 2026-06-30
> 대상: backend/app/api/admin.py, supabase/migrations/20260630_member_pii_secure.sql,
> frontend/src/lib/api.ts, MembersMenu.tsx, SettingsMenu.tsx (4파일 수정 + 1 마이그레이션)
> TIER 판정: **TIER 2** (migrations 변경 + api.ts 변경 + services 인접 + 파일 5개)

---

## 1. 검증 실행 결과 (실측 로그 요약)

| 검증 | 커맨드 | 결과 |
|------|--------|------|
| 프론트 빌드 | `npm run build` | ✅ `✓ built in 9.39s`, 에러 0 |
| 타입체크 | `npx tsc --noEmit` | ✅ exit 0, 에러 0 |
| 백엔드 구문 | `ast.parse(admin.py)` | ✅ `AST_PARSE_OK` |
| 백엔드 import + 라우트 | uvicorn import | ✅ 4개 라우트 등록(`/admin/members`, `/reveal`, `/unmask-key`, `/unmask-key/status`) — `/api` prefix |
| 마스킹 헬퍼 실측 | python | ✅ email `ho******@gmail.com`, name 2글자 `홍*`, birth `1990-**-**`, phone `010-****-5678` |
| PBKDF2 해시 | python | ✅ 정답 True / 오답 False / 손상해시 False(예외안전), 상수시간 `hmac.compare_digest` |
| 인증 가드(서버 기동) | curl 4종 | ✅ 토큰 없음·오답 모두 401(members/reveal/status 전부) |
| 응답 스키마 | curl(유효토큰) | ✅ `GET /members` → `{members:[],total:0}` (평문 PII 필드 부재) |
| 키 미설정 분기 | curl reveal | ✅ HTTP 400 + 안내문 (평문 노출 0) |
| status | curl | ✅ `{configured:false,updated_at:null}` (해시 미반환) |

- 청크 사이즈 경고(>500kB)는 기존부터 존재, 이번 변경과 무관 — 신규 회귀 아님.
- 백엔드 1차 기동 실패는 `app/services/notify.py`의 모듈-로드 print(✓) cp949 인코딩 충돌(Windows 콘솔 한정)로 **이번 변경과 무관**. `PYTHONUTF8=1` 재기동으로 정상 검증 완료.

---

## 2. 항목별 표

### 기능
| 항목 | 결과 | 근거 |
|------|------|------|
| 목록 조회 서버화 | PASS | `getAdminMembers()`→`/admin/members`, supabase 직조회→백엔드 전환 |
| 검색(email ilike) | PASS | 서버측 `email=ilike.*term*`, Enter→setPage(1)/검색버튼→fetch 패턴 기존과 100% 동일 |
| 마케팅 필터 | PASS | `or(sms/email/phone)` true / 3컬럼 false 분기, 기존 의미 유지 |
| 페이지네이션 | PASS | limit/offset 서버측, totalPages·이전/다음 버튼 유지 |
| 온보딩/소셜/가입일 | PASS | 마스킹 비대상 컬럼 그대로 전달·렌더 |
| 토글 UX | PASS | "해제"=키입력→해제모드, 행별 "👁 보기"=단건 reveal, 재잠금=키/평문 폐기. 비슈퍼어드민 토글 미노출+안내 |
| Settings 보안키 | PASS | 평문 read/write 제거→status 표시+setUnmaskKey 저장, 변경/설정 라벨 분기 유지 |

### 보안 경계
| 항목 | 결과 | 근거 |
|------|------|------|
| 목록 평문 PII 부재 | PASS | 서버 `_mask_*` 적용 후 반환, reveal 외 평문 경로 없음(스키마 실측) |
| 마스킹 규칙 기존 일치 | PASS | email/name/birth/phone 규칙이 기존 클라 함수와 1:1 동일(소스 대조) |
| reveal 단건 한정 | PASS | `id=eq.{member_id}` 단건, 대량 평문 일괄 미제공 |
| 보안키 해시 저장 | PASS | PBKDF2-HMAC-SHA256 200k, 원문 미저장. status도 해시 미반환 |
| admin_secrets RLS deny-all | PASS | ENABLE RLS + 정책 0개 = 클라 전 작업 거부, service-role만 접근(올바른 패턴) |
| 평문키 행 삭제 | PASS | `DELETE … key='member_unmask_key'` 해당 행만 정밀 삭제, 타 설정 무영향 |
| 검색 인젝션 차단 | PASS | `_sanitize_ilike`가 `* , ( ) %` 제거→와일드카드 우회/필터깨짐 방지(실측) |
| 인증 가드 | PASS | 4 엔드포인트 `_check_admin`→무/오토큰 401 실측 |

### 감사(Audit)
| 항목 | 결과 | 근거 |
|------|------|------|
| 누가/언제/어느 회원 | PASS | reveal 성공 `_write_audit(who=admin_email, 'member.unmask', target_id=member_id, ip)`, 시각=audit_logs default now() |
| 실패 시도 기록 | PASS | 키 불일치(403) `member.unmask.denied` + reason |
| 키 설정 기록 | PASS | `member.unmask_key.set` |
| 스키마 정합 | PASS | audit_logs(admin_email/action/target_type/target_id/before_val/after_val/ip_address)와 `_write_audit` 컬럼 일치(20260629_audit_logs_schema.sql 대조) |

### 회귀
| 항목 | 결과 | 근거 |
|------|------|------|
| 계산 로직/사용자 화면 | PASS | diff 범위 어드민 한정, 28일/365 로직 무변경 |
| 빌드/타입 | PASS | 에러 0 |
| maskId 표시 | PASS | length<12 가드 추가(기존보다 안전), 규칙 동일 |
| 마이그레이션 적용 전/후 | PASS | 키 미설정 시 reveal=400(평문 0), 적용 후 슈퍼어드민 재설정 필요 — 기획서 안내됨. 비전공 운영자 깨짐 시나리오 없음 |
| 잔존 참조 | PASS | 프론트 `member_unmask_key` 참조 0(삭제 행 의존 코드 없음) |

---

## 3. BLOCKER 수: **0**

평문 PII가 클라로 새는 신규 경로 없음 / 기능 회귀 없음 / 빌드 성공 / 감사로그 누락 없음.

---

## 4. MINOR 목록

1. **(스코프 외·부류 위험 잔존)** `ApplicantsMenu.tsx:157`, `VisitorTab.tsx:74`가 여전히 `supabase.from('profiles').select('id, full_name, email')`로 회원 평문 이름·이메일을 클라로 직접 조회. 이번 PR 범위(MembersMenu)는 아니고 기획서 "비범위(다른 어드민 메뉴 불변)" 명시 → 회귀/BLOCKER 아님. 단 "회원 PII 평문이 클라로 안 내려온다"는 보안 목표가 **앱 전체로는 미완** → 후속 마스킹 재설계 권고.
2. **(M2) reveal admin_email 위조 가능** — 게이트는 보안키 해시이고 식별값은 감사 표기용이나, 클라 전달값이라 신뢰 불가. 기존 X-Admin-Token 공유 구조의 한계로 본 변경이 새로 만든 위험은 아님.
3. **(감사 공백)** reveal 키 미설정(400) 분기는 감사로그 미기록(403 bad_key는 기록). 미설정 상태 반복 시도는 흔적 없음 → 가벼운 시도 로그 추가 고려.
4. **(견고성)** `reveal`의 `member_id`는 sanitize 없이 `id=eq.{member_id}` 삽입. 해시 검증 선행 + UUID 미스매치→404라 유출 경로 아니나, 메타문자 입력 시 필터 깨질 여지 → UUID 형식 검증 권고.
5. **(잔존 정책)** 마이그레이션은 평문키 행만 삭제하고 `system_settings_select_public USING(true)`(anon 공개 읽기) 정책 자체는 유지. 보안키는 admin_secrets로 격리돼 안전하나, system_settings 전반 공개 읽기는 별건 재검토 권고.

---

## 5. 최종 판정: **PASS**

이번 변경의 핵심 목표(MembersMenu "가짜 마스킹" 제거 — 서버측 마스킹 + 해시 검증 단건 reveal + 감사로그 + admin_secrets RLS 격리 + 평문키 삭제)는 실측으로 달성 확인. 빌드·타입·구문·라우트·인증·마스킹 규칙·감사 스키마 모두 통과, 회귀 0. MINOR #1(타 어드민 메뉴 동일 부류 평문 노출)은 이번 스코프 밖이라 통과시키되, 앱 전체 PII 보호 관점에서는 후속 작업 필요함을 명확히 기록(자화자찬 배제).

VERDICT: PASS
BLOCKER: 0
