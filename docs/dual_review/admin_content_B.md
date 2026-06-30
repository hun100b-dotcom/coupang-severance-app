# 어드민 묶음2 — 적대적 리뷰 B

> 브랜치 redesign/admin-upbit2 (base main) · 2026-06-30 · 엄격 자체검증(적대 관점, 실제 명령 실행)

## 한 줄 결론 + 판정
부수려 시도한 결과 — 빌드 깨짐/깨진 보간/로직 변조/잔존 다크박스 **발견 못 함**. → **판정: PASS (BLOCKER 0, 비치명 2)**

## 실행한 공격과 결과
| 공격 | 명령 | 결과 |
|---|---|---|
| sed 깨진 보간(작은따옴표+`${}`) | `grep -F "'1px solid \${"`, `"\${UP.hair}'"` 등 | **0건** — 모든 `${}`가 백틱 템플릿 내. 빌드론 안 잡히는 버그라 별도 검증 → 깨끗 |
| 빌드/타입 | `npm run build` | ✓ 9.3s, 에러 0 |
| 로직 변조 | `git diff main -- <7파일>` 라인대조 | 색/스타일/import/maxWidth 외 0. NoticesMenu `.select('id')`·`data.length===0`·confirm()·trim() 불변, InquiriesMenu optimistic 롤백 스냅샷 불변, TargetMenu C팔레트는 색값만 |
| 잔존 옛 hex | `grep -oE "#[0-9a-f]{6}"` | 0건(주석 #12122a 텍스트 제외) |
| 다크 잔재 | `grep "rgba(0,0,0"` | 모달 overlay scrim rgba(0,0,0,0.65)만 잔존(정상). 본문박스 rgba(0,0,0,0.25)·툴팁 #12122a·#fafafa 전부 교체 |
| Tailwind 텍스트 클래스 | grep text-xs/sm/[Npx] | 0건 |

## BLOCKER (치명) — 0건
RLS 가드(`.select('id')` + 0행 throw)·optimistic 롤백·권한 분기 전부 원본 유지. 색만 변경.

## 비치명
1. TargetMenu 히트맵 셀: `color: intensity>0.35 ? '#fff' : UP.sub` — 진한 셀(브랜드 blue, intensity>0.35)엔 흰 텍스트, 옅은 셀엔 UP.sub. 분기 유지로 가독 OK. 단 intensity 0.35 경계 근처 셀은 대비 경계선(원본 동일 동작, 회귀 아님).
2. 차트 인접 블루(brand/strong/navy) 톤 유사 — 무지개 제거 트레이드오프. 데이터 구분은 라벨/도트 위치로 보조됨.

**판정: PASS, BLOCKER 0건**
