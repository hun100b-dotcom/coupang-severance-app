# 어드민 묶음4(시스템군) — 적대적 리뷰 B

> 브랜치 redesign/admin-upbit4 (base main) · 2026-06-30 · 엄격 자체검증(적대, 실측)

## 한 줄 결론 + 판정
대량 sed + dead 삭제 + 보안민감(마스킹) 영역을 집중 공격 — 빌드 깨짐/import 깨짐/깨진 보간/로직·마스킹 변조/브랜드색 오훼손 **발견 못 함.** → **판정: PASS (BLOCKER 0, 비치명 1)**

## 실행한 공격과 결과
| 공격 | 명령 | 결과 |
|---|---|---|
| dead 삭제 import 깨짐 | `npm run build` + `grep -rn "AdminCard\|AdminTable\|KpiStrip\|SignalCard"` | ✓ 빌드 9.3s, 잔존 참조 0, `Cannot find` 0 |
| 깨진 보간 | `grep -F "'1px solid \${"`, `"'2px solid \${"` | **0건** — 합성 보더 전부 백틱 |
| ★마스킹 변조(보안) | `git diff main -- MembersMenu.tsx` 에서 handleUnmask/masked/unmasked/system_settings 키 비교 | **불변** — PII 토글 로직 한 글자도 안 바뀜, 색만 |
| 로직 변조 | diff 식별자(.from/.select/.update/.delete/.insert/.eq/patchSetting/blockIp/unblockIp/getAuditLogs/logAdminAction/invoke/isSuperAdmin) | **0건** |
| 브랜드색 오훼손 | `grep "#ea4335\|#fee500\|#6e40c9\|#3d1d1d\|#5865F2"` | **보존됨** — PROVIDER_COLORS·Discord blurple 토큰화 안 됨(정상) |
| 잔존 옛 hex/다크박스 | grep | 브랜드 보존색 외 0, rgba(0,0,0)는 모달 스크림 2곳(정상) |
| Tailwind 텍스트 클래스 | grep | 0건 |

## BLOCKER (치명) — 0건
보안민감 마스킹 로직·super_admin 가드·토큰검증·감사로그 기록 전부 원본. 색/삭제만.

## 비치명
1. de-rainbow로 감사/액션 색맵의 퍼플·핑크·시안이 브랜드 블루/스트롱으로 수렴 → 인접 액션 카테고리 변별 약간 저하(라벨 텍스트로 보조). 무지개 금지 규칙 충족 트레이드오프.

**판정: PASS, BLOCKER 0건**
