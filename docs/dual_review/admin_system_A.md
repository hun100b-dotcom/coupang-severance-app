# 어드민 리디자인 묶음4(시스템군) — 더블리뷰 A 보고서

> 대상: menus/{Members,Accounts,Settings,ServerLogs,Audit} + logs/AuditLogTable + settings/{Cms,Discord,IpBlock,Legal} + dead 4종 삭제
> 브랜치 redesign/admin-upbit4 (base main) · 2026-06-30 · 엄격 자체검증(총괄, 실측)

**한줄결론:** 시스템 5메뉴 + AuditLogTable + settings 4종을 UP 토큰으로 색만 정돈하고 dead 4개를 안전 삭제 — 권한/RLS/토큰/감사로그/마스킹/Discord invoke/IP차단 로직 전부 불변, UI 한정 변경 확인.

## 판정: PASS, BLOCKER 0건

- 변경: 메뉴 5 + logs/AuditLogTable + settings 4 (+298 / −599, dead 4개 삭제 포함)

---

## 1. 빌드 (실측)
- `npm run build` → **✓ built in 9.46s**, 에러 0.
- dead 4개(`shared/{AdminCard,AdminTable,KpiStrip,SignalCard}.tsx`) 삭제 후에도 `Cannot find module` 없음. (>500kB 청크 경고는 기존 번들 사이즈 경고로 이번 변경과 무관)

## 2. 로직 불변표 (git diff main 라인대조)
| 검증 항목 | 결과 | 비고 |
|---|---|---|
| supabase `.from/.select/.update/.delete/.insert/.eq/.order` | **불변** | 변경 라인 0 |
| `patchSetting` | **불변** | 0 |
| `blockIp / unblockIp` (IpBlockManager) | **불변** | 0 |
| `getAuditLogs / logAdminAction` (AuditMenu·AuditLogTable) | **불변** | 0 |
| `supabase.functions.invoke` / Discord webhook | **불변** | 0 (DiscordSettings 변경은 안내문 `<code>` 색상 1건뿐) |
| `isSuperAdmin` 가드 (MembersMenu) | **불변** | 라인 변경은 안내문 색상 `#64748b`→`UP.sub` 1건, 가드 조건 그대로 |
| 회원 마스킹 PII (`handleUnmask` 등) | **불변** | 변경 라인 0, 보안 별도트랙 미접촉 |
| X-Admin 토큰 검증 | **불변** | 0 |

→ 모든 변경 라인은 **색상값을 UP.* 토큰으로 치환**하는 시각 변경에 한정. 비즈니스/보안 로직 BLOCKER 0건.

## 3. dead 삭제 안전성
- `grep "AdminCard\|AdminTable\|KpiStrip\|SignalCard"` (frontend/src 전수) → **잔존 참조 0건**.
- 빌드 통과로 컴파일 단계 미참조 재확인. 안전.

## 4. AA / 토큰 / 반응형
- **UP import 정합:** 묶음4 대상 18개 파일 전부 `import { UP } from '../shared/adminTheme'` 정상.
- **잔존 옛 hex:** 브랜드 보존색 제외 시 `#fff`(라이트 카드 흰 배경/텍스트)만 잔존 — 업비트풍 정상. 깨진 보간(`${}` 빈/undefined) 0건. Tailwind `text-*` 클래스 0건(인라인 스타일 화면).
- **브랜드 보존색 (의도적 비토큰화, 정상):**
  - MembersMenu PROVIDER_COLORS: google `#ea4335` / kakao `#fee500` / github `#6e40c9` + kakao 텍스트 `#3d1d1d` — 4종 모두 유지 확인.
  - DiscordSettings `#5865F2` (Discord blurple) — 유지 확인.
- **다크 rgba:** `rgba(0,0,0,…)`는 모달 스크림(AccountsMenu·MembersMenu 0.75)만 사용 — 정상.
- **AA 빈상태/로딩 격상:** 핵심 빈상태 안내문 전부 `UP.sub` 격상 확인 — `로그 없음`(ServerLogs), `조회된 로그가 없습니다`(Audit), `등록된 관리자 계정이 없습니다`(Accounts), `차단된 IP가 없습니다`(IpBlock), `로그가 없습니다`(AuditLogTable).

## 5. BLOCKER (치명, 0이어야 PASS)
- **없음 (0건).**

## 6. 비치명 (참고, 차기 스윕 권장)
- `ServerLogsMenu.tsx:268` 로딩 텍스트 "로딩 중..."이 `UP.caption` 잔존(같은 파일 453줄·다른 메뉴는 `UP.sub`). 스피너가 시각 주체이고 텍스트는 보조라 비치명. 일관성 차원에서 sub 격상 권장.
- caption 잔존 다수는 날짜/태그/비활성 상태 등 메타데이터 보조정보로 정상 용도.

---
**판정: PASS · BLOCKER 0건.** 커밋+배포 진행 가능.
