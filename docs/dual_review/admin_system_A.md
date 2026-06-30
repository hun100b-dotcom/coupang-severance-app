# 어드민 묶음4(시스템군) — 총괄 리뷰 A

> 대상: menus/{Members,Accounts,Settings,ServerLogs,Audit} + logs/AuditLogTable + settings/{Cms,Discord,IpBlock,Legal} + dead 4종 삭제
> 브랜치 redesign/admin-upbit4 (base main) · 2026-06-30 · 엄격 자체검증(총괄, 실측)

## 한 줄 결론 + 판정
**색/스타일/import 외 변경 없음 — 권한·RLS·토큰검증·감사로그·회원 마스킹·Discord invoke·IP차단 로직 전부 불변, dead 4종 안전 삭제, 빌드 통과.** → **판정: PASS (BLOCKER 0)**

## 빌드
- `npm run build` → ✓ ~9.3s, TS 0. dead 4종 삭제 후 `Cannot find module` 0.

## 로직 불변 검증표
| 파일 | 핵심 로직 | 변화 |
|---|---|---|
| MembersMenu | profiles select, **handleUnmask 마스킹 토글(system_settings 키 비교)** | 색만 — PII/마스킹 로직 무수정 |
| AccountsMenu | admin_accounts insert/update/delete, isSuperAdmin 가드 | 색만 |
| SettingsMenu | patchSetting(PATCH /admin/settings, X-Admin) | 색만 |
| ServerLogsMenu | getAuditLogs(GET /admin/logs), system_logs Realtime 구독 | 색만 |
| AuditMenu / AuditLogTable | audit_logs select, exportCsv, ACTION/STATUS 색맵 | 색만(맵 값 토큰화) |
| settings/CmsSettings | system_settings upsert | 색만 |
| settings/DiscordSettings | functions.invoke('notify-inquiry') | 색만 (#5865F2 Discord 브랜드 보존) |
| settings/IpBlockManager | blockIp/unblockIp(POST/DELETE) | 색만 |
| settings/LegalVariables | patchSetting 법정변수 | 색만 |

- `git diff main` +/- 라인에서 supabase/api/핸들러/가드/마스킹 식별자 변경: **0건**.

## dead 컴포넌트 삭제 안전성
- `grep -rn "AdminCard|AdminTable|KpiStrip|SignalCard"` → 잔존 참조 0. 4종 모두 미사용 확정 후 `git rm`. 빌드 영향 0.
- shared/ 잔여: PageHeader.tsx, adminTheme.ts (둘 다 사용 중).

## 토큰·브랜드보존·AA·반응형
- 잔존 옛 hex: **브랜드 식별색만** — MembersMenu PROVIDER_COLORS(#ea4335 google/#fee500 kakao/#6e40c9 github/#3d1d1d kakao텍스트), DiscordSettings #5865F2(Discord). 의도적 보존(브랜드 정체성).
- 무지개 퍼플/핑크/시안(#a78bfa/#8b5cf6/#ec4899/#6c5ce7/#fd79a8/#06b6d4) → UP.strong/brand de-rainbow. template.delete 색은 danger(삭제=위험 의미 부합).
- 다크 잔재: 모달 스크림 rgba(0,0,0,0.75) 2곳은 정상 딤. 다크 박스 0.
- Tailwind 텍스트 클래스 0건. 빈상태/로딩 안내문 caption→sub 격상(AA).
- 반응형: 테이블 overflowX/minWidth, 모달 overlay 유지.

## BLOCKER (치명) — 0건
권한/RLS/토큰/감사로그/마스킹 변경 없음. 색/삭제만, 되돌리기 쉬움.

## 비치명
- 감사 ACTION 색맵 일부 블루계열 인접(무지개 제거 트레이드오프).

**판정: PASS, BLOCKER 0건**
