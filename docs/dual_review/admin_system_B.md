# 어드민 묶음4(시스템군) 적대적 리뷰 B — 시스템/보안 검증

> 브랜치 redesign/admin-upbit4 (base main HEAD 117f4fc) · 2026-06-30 · 엄격 적대 실측

**판정: PASS · BLOCKER 0건**

한줄결론: 시스템 메뉴 5종 + settings 4종 + AuditLogTable 변경은 **전부 색 토큰화(up.*)뿐**, 보안·권한·마스킹·감사로그·IP차단·Discord 로직은 한 글자도 변조 안 됨. dead 4컴포넌트 잔존참조 0. 브랜드색 보존. 빌드 PASS.

---

## 검증 환경
- 브랜치: `redesign/admin-upbit4` (base `main` HEAD `117f4fc`)
- 변경 파일: 12개 수정 + 4개 삭제 (`git diff main --stat`: 542+/648-)

---

## 공격 1 — 빌드 (dead 삭제로 인한 import 깨짐)
```
$ npm run build
✓ built in 9.37s
```
- 에러/`Cannot find` **0건**. 청크 500kB 경고는 기존 index/TargetTab으로 이번 변경과 무관.
- **PASS** — dead 4개 삭제 후 깨진 import 없음.

## 공격 2 — 작은따옴표 안 깨진 보간
```
$ grep -rnF "'1px solid ${"   → 0건
$ grep -rnF "'2px solid ${"   → 0건
```
- 광역 정규식(`'...${...}'`) 매칭분은 전수 확인 결과 **모두 정상 백틱 템플릿**(`` `1px solid ${UP.hair}` ``)이며, 앞 문자열 프로퍼티의 닫는 `'` + 직후 백틱 보간이 한 줄에 있어 정규식이 걸린 artifact. 실제 작은따옴표 내부 보간 0건.
- **PASS** — CSS 깨짐 없음.

## 공격 3 — 색 외 로직 변조 (라인 대조) ★보안 핵심
9개 보안 파일 전수 `git diff main`에서 색/스타일/import 라인 필터 후 **비스타일 로직 변경 = 0줄** (전 파일 빈 출력).

### ★ MembersMenu 마스킹 (BLOCKER 후보) — 무변조 확인
- `handleUnmask()` (L119~153) diff 범위 **밖** = 미변경. 실측 본문:
  - `system_settings` `.eq('key', 'member_unmask_key')` 키 조회 그대로
  - `storedKey = data?.value ?? ''`, `if (unlockKey === storedKey)` 비교 그대로
  - `logAdminAction('unmask_members', 'profiles', ...)` 감사로그 그대로
  - `setUnmasked(true)` / `unlockError` 분기 그대로
- `maskEmail/maskId/maskName/maskBirthdate/maskPhone`, `emailDisplay = unmasked ? ... : maskEmail(...)` (L301~305) 미변경.
- diff 내 마스킹 인접 라인은 전부 `color: '#0f172a'→UP.navy`, `'#64748b'→UP.sub`, `'#f04052'→UP.danger` 색 스왑뿐.

### 기타 보안 식별자 잔존 (grep 실측)
| 항목 | 확인 |
|------|------|
| AccountsMenu `isSuperAdmin` 가드 | 12개 참조 유지 |
| SettingsMenu `patchSetting('permission_levels'/'member_unmask_key')` | 유지 (L69,218) |
| IpBlockManager `blockIp`/`unblockIp` | 유지 (L27,42) |
| DiscordSettings `functions.invoke('notify-inquiry')` | 유지 (L42) |
| `logAdminAction` import/호출 | 유지 (MembersMenu 등) |
- **PASS** — 권한/RLS/토큰/감사/IP/Discord 로직 불변.

## 공격 4 — 브랜드색 오훼손
```
MembersMenu PROVIDER_COLORS: #ea4335 / #fee500 / #6e40c9 / #3d1d1d  → 전부 리터럴 보존 (L166,172)
DiscordSettings #5865F2 → 보존 (L97 "디스코드 보라색")
```
- 보존 대상 브랜드색 토큰화 안 됨. fallback만 `'#3182f6' → UP.brand`(동일 #3182F6 값)로 변경 — 동치, 회귀 아님.
- **PASS**.

## 공격 5 — dead 컴포넌트 잔존 참조
```
$ grep -rn "AdminCard|AdminTable|KpiStrip|SignalCard" frontend/src
No matches found
```
- **PASS** — 4개 삭제 후 참조 0.

## 공격 6 — AA/반응형/토큰
- `adminTheme.ts` UP 토큰 전수 정의 확인: `sub #565D6A`(흰 위 AA 6.7:1 명시), `green #047857`/`amber #B45309`/`danger #D32F3A` 모두 AA 텍스트색. `caption #8E929B`는 "비필수만"(날짜/ID) 한정 — 본문 미사용, 적정.
- `UP.` 사용하면서 import 누락한 파일: **0건** (전 파일 검사).
- 빈상태/로딩 안내문 색이 `#94a3b8`(AA 미달) → `UP.sub`(AA) 로 **개선**됨.
- 모달 `maxWidth: 400` 유지, 테이블 `overflow:'hidden'` + 모바일 카드(`md:hidden`) 반응형 유지.
- **PASS**.

---

## 비치명 메모 (참고, FAIL 아님)
- `tsconfig.tsbuildinfo` 빌드 산출물이 diff 포함 — 무해하나 커밋 전 제외 권장(선택).
- LF→CRLF 경고 다수 — Windows 체크아웃 정상, 기능 영향 없음.

## 종합
| 공격 | 결과 |
|------|------|
| 1 빌드 | PASS (9.37s, 에러 0) |
| 2 깨진 보간 | PASS (0건) |
| 3 로직 변조 | PASS (비스타일 변경 0줄, 마스킹 무변조) |
| 4 브랜드색 | PASS (전부 보존) |
| 5 dead 참조 | PASS (0건) |
| 6 AA/반응형 | PASS (오히려 개선) |

**최종: PASS · BLOCKER 0 · 비치명 2(권고)**
