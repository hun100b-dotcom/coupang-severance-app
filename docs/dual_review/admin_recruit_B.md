# 어드민 묶음3(채용 클러스터) — 적대적 리뷰 B

> 브랜치 redesign/admin-upbit3 (base main) · 2026-06-30 · 엄격 자체검증(적대, 실측)

## 한 줄 결론 + 판정
대량 sed 치환을 의심해 빌드 깨짐/깨진 보간/로직 변조/잔존 다크박스를 공격 — **발견 못 함.** → **판정: PASS (BLOCKER 0, 비치명 2)**

## 실행한 공격과 결과
| 공격 | 명령 | 결과 |
|---|---|---|
| sed 깨진 보간 | `grep -F "'1px solid \${"`, `"'2px solid \${"`, `"}'"+${UP` | **0건** — 합성 보더 전부 백틱 `\`1px solid ${UP.hair}\``. 빌드론 안 잡히는 버그라 별도 검증, 깨끗 |
| 빌드/타입 | `npm run build` | ✓ ~9.3s, 에러 0 |
| recharts JSX hex 잔존 | `grep -E '(fill\|stroke)="#'` | **0건** — 11곳 전부 `{UP.token}` 표현식 교체, 빌드 통과 |
| 로직 변조 | `git diff main -- <4파일>` 식별자(.from/.select/.update/.delete/.insert/.eq/.in/status/notifications/work_date/confirm/.filter/.map) | **0건** — JobPostingsMenu 긴급토글·soft-delete·섹션변경, ApplicantsMenu 단건/대량 상태변경·알림 insert 전부 원본 |
| 잔존 옛 hex | `grep -oE "#[0-9a-f]{6}"` | 0건(#fff 제외) |
| 다크 잔재 | `grep "rgba(0,0,0"` | 0건 — 모달 그림자 2곳 rgba(16,24,40,0.18)로 완화 |
| Tailwind 텍스트 클래스 | grep text-xs/sm/[Npx] | 0건 |

## BLOCKER (치명) — 0건
RLS/권한/상태변경/알림 insert 전부 원본 유지. 색만 변경, 되돌리기 쉬움.

## 비치명
1. 긴급/대기 색이 vivid #ffb400 → UP.amber(#B45309)로 차분해짐. 가독·일관 ↑이나 "긴급" 인상은 약간 약해짐(의도된 절제, 회귀 아님).
2. de-rainbow로 퍼플(#a78bfa/#7c3aed)→UP.strong, 일부 차트 블루계열 인접. 라벨/위치로 변별 보조.

**판정: PASS, BLOCKER 0건**
