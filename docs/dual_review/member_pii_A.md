# 더블리뷰 A (총괄) — 회원 PII 서버측 마스킹 재설계

> 브랜치: `security/member-pii-masking` · 일자: 2026-06-30 · 성격: 회귀 0 + 보안목표 달성 검증

## 1. 검증 실행 결과 (실측)

| 검증 | 명령/방법 | 결과 |
|---|---|---|
| 프론트 빌드(tsc+vite) | `cd frontend && npm run build` | ✅ 에러 0, `✓ built in 9.28s` |
| 백엔드 구문 | `python -c "ast.parse(admin.py)"` | ✅ OK |
| 라우트 등록 | router.routes 조회 | ✅ `/admin/members`, `/admin/members/reveal`, `/admin/members/unmask-key`, `/admin/members/unmask-key/status` 4개 등록 |
| 마스킹 규칙 동일성 | 기존 프론트 mask* vs 서버 _mask_* 비교 테스트 | ✅ 이메일 `ho**********@gmail.com`, 이름 `홍*동`, 생년 `1990-**-**`, 전화 `010-****-5678` 일치 |
| 해시 라운드트립 | `_hash_key`/`_verify_key` PBKDF2 200k | ✅ 정답 True / 오답·빈값·깨진형식 False |
| **목록 응답 평문 누수** | 평문 1행 → list 변환 → JSON에서 평문 substring 탐색 | ✅ `hong.gildong`,`홍길동`,`1990-01-02`,`1234-5678`,`길동이` **0건** |

## 2. 항목별 표

| 영역 | 점검 | 판정 |
|---|---|---|
| 기능(목록) | GET /admin/members 페이지네이션 offset/limit + count=exact total | PASS |
| 기능(검색) | email ilike 서버측 + 메타문자 sanitize(`*,(),%` 제거) | PASS |
| 기능(필터) | marketing true=`or(...eq.true)`, false=3컬럼 eq.false | PASS |
| 기능(토글 UX) | 🔒해제→키입력→해제모드, 재잠금=키·평문 폐기 유지 | PASS |
| 보안경계(목록) | 서버가 마스킹 값만 반환, 평문 미포함 | PASS |
| 보안경계(해제) | reveal는 보안키 해시 검증 통과 시에만 **단건** 평문 | PASS |
| 보안경계(키) | 원문 미저장(PBKDF2 해시) + admin_secrets RLS deny-all | PASS |
| 보안경계(공개노출) | 마이그레이션이 평문 member_unmask_key 행 삭제 | PASS(적용 필요) |
| 감사 | reveal 성공=`member.unmask`, 실패=`member.unmask.denied`, 키설정=`member.unmask_key.set` 서버 service-role 기록(who/when/which) | PASS |
| 회귀 | 계산/사용자화면/타 어드민 메뉴 불변 | PASS |

## 3. BLOCKER
- **0건.** 평문 PII 클라 누수·기능 회귀·빌드 실패·감사 누락 없음.

## 4. MINOR / 주의
- (M1) reveal의 관리자 식별(admin_email)은 클라가 전달 → 위조 가능. 단 실제 게이트는 보안키 해시이며, 식별값은 감사 표기용. 기존 X-Admin-Token 공유 구조의 한계로 본 변경이 새로 만든 위험은 아님.
- (M2) 마이그레이션 적용 전에는 reveal이 "키 미설정(400)"으로 동작 → 평문 노출 0은 유지되나 평문 보기 기능은 키 재설정 후 사용 가능.
- (M3) 범위 밖: `VisitorTab.tsx`, `ApplicantsMenu.tsx`가 여전히 `profiles`를 직접 select(full_name/email 포함) → 별도 후속 과제. 본 PR 범위(회원관리) 아님.

## 5. 최종 판정
서버측 마스킹·단건 해제·해시 키·감사기록이 설계서(§2) 기준을 충족하고 빌드/회귀 이상 없음.

VERDICT: PASS
BLOCKER: 0
