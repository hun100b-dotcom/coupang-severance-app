# 어드민 리디자인 묶음2 — 적대적 리뷰 B

> 브랜치 redesign/admin-upbit2 (base main) · 2026-06-30 · 엄격 자체검증(적대 관점, 실제 명령 실행)

## 한줄 결론
**판정: PASS, BLOCKER 0건.** 빌드 통과, 깨진 토큰/보간 0건, 7개 파일 전부 로직 라인 diff 0건(기능·권한·CRUD·optimistic 불변), 다크 잔재 라이트 교체 확인. 비치명 관찰 3건만 존재.

- 브랜치: `redesign/admin-upbit2` (HEAD `7069a6b` == main → 워킹트리 = 리뷰 대상)
- 변경 7파일, +230 / -217

---

## 1. 빌드 (실행)
```
cd frontend && npm run build
✓ built in 9.30s
```
- 타입에러/컴파일에러 **없음**. 유일 경고는 청크 500kB 초과(`index`/`TargetTab`/`BarChart`) — 이번 변경과 무관한 기존 코드분할 이슈.

## 2. 깨진 토큰·보간 탐색 (실행)
```
grep "'1px solid ${"  → No matches      # 작은따옴표 내 보간 버그 없음
grep "'…${UP"          → No matches      # 작은따옴표+UP 보간 버그 없음
grep "#rrggbb 생hex"   → 주석 1건 외 0건  # 토큰/생hex 혼용 없음
```
- adminTheme.ts 토큰 정의 확인: `hair/amber/amberLine/caption/sub/sunken/hairSoft/brand/strong/green*/danger*` 전부 존재. `UP.hair` 등 객체 밖 참조·미정의 키 **없음**.
- 백틱 보간은 전부 `` `1px solid ${UP.hair}` ``, `` `rgba(49,130,246,${...})` `` 형태로 정상.

## 3. 로직 불변 라인대조 (핵심 — git diff main)
전 7파일에서 로직 식별자(`.select( .insert( .update( .delete( .eq( .from( confirm( .trim( .length onClick onConfirm setInquiries rollback snapshot catch throw await return`)를 diff의 `+/-` 라인에서 grep → **전부 0건**. 즉 추가/삭제된 줄은 100% 스타일(color/background/border/fontSize/radius)뿐.

| 파일 | 검증 포인트 | 결과 |
|------|-------------|------|
| NoticesMenu.tsx | `.select('id')` RLS 가드 · `data.length===0` 분기 · `confirm()` · `trim()` | diff 0건 = 불변 |
| InquiriesMenu.tsx | optimistic 스냅샷·롤백·setInquiries(prev) | diff 0건 = 불변 |
| TargetMenu.tsx | C팔레트 **키 불변, 값만 토큰화** (아래) · 히트맵 임계값 | 색만 변경 |
| InquiryTable.tsx | STATUS_COLOR 매핑·onClick | 색만 변경 |
| InquiryDetailPanel.tsx | 핸들러·fetch | 색/레이아웃만 |
| BulkActionBar.tsx | onConfirm·selected | 색만 변경 |
| TemplateManager.tsx | map·confirm | 색만 변경 |

TargetMenu C팔레트 대조 (데이터 무관, 색값만):
```
- blue:#3182f6 green:#00c48c orange:#f08c00 red:#cc2233 purple:#8b5cf6 cyan:#06b6d4 pink:#ec4899 gold:#eab308
+ blue:UP.brand green:UP.greenChart orange:UP.amberChart red:UP.dangerChart purple:UP.strong cyan:UP.navy pink:UP.sub gold:UP.amber
```
키 8개 그대로 → `PIE`, `STATUS_COLOR`, `TAG_CLR` 참조 로직 무수정.

## 4. 다크 잔재 교체 검증 (실행)
- `rgba(0,0,0,...)`: NoticesMenu:317 `rgba(0,0,0,0.65)` 1건 — **모달 딤(backdrop) 오버레이**로 정상. 본문 박스 아님.
- TT 차트 툴팁: `#12122a` 다크 → `UP.surface` 라이트 + `color:UP.navy` 교체 확인.
- 히트맵: `'#fafafa'`→`UP.sunken`, `'1px solid #f1f5f9'`→`UP.hairSoft`, `'#64748b'`→`UP.sub` 교체 확인.
- `#fafafa / #12122a` 활성 코드 잔존 **없음**(주석 1줄만).

## 5. 반응형 (실행)
- InquiryDetailPanel: `position:fixed` + `width:420` + `maxWidth:'100vw'` 적용 확인 → 320px에서 뷰포트 초과 없음.

---

## BLOCKER (치명) — 0건
없음.

## 비치명 관찰 (Non-blocker)
1. **빈 상태 안내문에 UP.caption(#8E929B ≈ 흰 위 3.0:1) 사용** — NoticesMenu:230 "공지사항이 없습니다", InquiryTable:140 "문의가 없습니다", TargetMenu:52 "데이터 없음". WCAG AA 본문 4.5:1 미달. 다만 보조성 안내라 영향 제한적. 권고: 빈 상태 1차 안내문은 `UP.sub`(#565D6A, 6.7:1)로 격상.
2. **히트맵 흰 글씨 대비 (기존 잔존, 회귀 아님)** — TargetMenu:357 `intensity > 0.35 ? '#fff' : UP.sub`. 임계값 0.35 직상 셀 배경 알파 ≈ rgba(49,130,246,0.29) → 옅은 블루 위 흰 글씨 대비 약 1.8:1로 AA 미달. **단 임계값·`#fff` 분기는 base(`#64748b`였던 버전)와 동일, 이번 묶음이 신규로 악화시킨 것 아님.** 권고: 임계값을 0.5 부근으로 상향하거나 흰 글씨 분기 셀 알파 하한 보강.
3. **PIE 인접 슬라이스 구분 저하** — cyan→`UP.navy`(#1A2434), pink→`UP.sub`(#565D6A) 둘 다 어두운 회색 계열. PIE 배열에서 두 색이 인접하면 파이 슬라이스 경계 식별성 저하 가능. 절제(무지개 제거) 의도의 트레이드오프이며 데이터 정확성과 무관.

---

## 결론
묶음2는 **UI/색 토큰화만** 정확히 수행했고, 기능·권한·CRUD·RLS 가드·optimistic 롤백 로직을 한 줄도 건드리지 않았다(diff grep 0건으로 입증). 깨진 보간·미정의 토큰·생hex 혼용 없음. 다크 잔재 라이트 교체 완료. AA 미달은 모두 비치명(빈상태 캡션·기존부터 있던 히트맵 흰글씨)이며 배포 차단 사유 아님. **PASS.**
