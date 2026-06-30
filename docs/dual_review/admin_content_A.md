# 어드민 리디자인 묶음2(타겟+콘텐츠/문의) 총괄 리뷰 A

> 대상: TargetMenu + NoticesMenu + InquiriesMenu + inquiries/{InquiryTable, InquiryDetailPanel, BulkActionBar, TemplateManager}
> 브랜치: redesign/admin-upbit2 (base main) · 검토일 2026-06-30 · 실제 Bash/Read/Grep 호출 기반

## 한줄 결론
색(UP 토큰)만 정돈한 순수 UI 변경으로, 기능·권한·CRUD·optimistic·차트 로직 전부 불변 + 다크 잔재 제거 완료. **판정: PASS / BLOCKER 0건.**

- diff 기준: `git diff main` — 7파일, +230 / -217 (HEAD==main 동일 SHA, 변경은 워킹트리)

---

## 1. 빌드 결과
```
npm run build → ✓ built in 9.21s
```
TS 컴파일·번들 통과, 에러 0. (chunk>500kB 경고는 사전 존재, 본 변경 무관.)

---

## 2. 로직 불변 검증표 (라인 대조)
| 파일 | 보존 대상 로직 | diff에 로직 라인? | 판정 |
|---|---|---|---|
| TargetMenu.tsx | `getTargetInsights`, `load`, raw null-safety, funnel/revenue/segments/heatmap 집계, `C.*`키·`PIE`·`STATUS_CLR` 참조 | 색/스타일만 | ✅ 불변 |
| NoticesMenu.tsx | handleSave/Toggle/Delete + `.select()` RLS 가드, `data.length===0` 분기, `.insert/.update/.delete`, confirm(), trim() | supabase 호출/핸들러 라인 **0건** | ✅ 불변 |
| InquiriesMenu.tsx | optimistic `setInquiries`+롤백, patchInquiryStatus/Answer, bulkInquiryStatus, getAdminInquiries/getTemplates | 핸들러/API 라인 0건 | ✅ 불변 |
| InquiryTable.tsx | onToggle/onSelect/onToggleAll, `STATUS_COLOR` 룩업, `inq.title ?? content.slice` | 색만 | ✅ 불변 |
| InquiryDetailPanel.tsx | handleSaveAnswer, onStatusChange, busyStatus 가드, 템플릿 선택 | 색 + `maxWidth:'100vw'` 추가만 | ✅ 불변 |
| BulkActionBar.tsx | onBulkStatus/onDone, `ACTIONS[].status` 값 | status 문자열 보존, color만 토큰화 | ✅ 불변 |
| TemplateManager.tsx | createTemplate/deleteTemplate, handleDelete, trim() | 색만 | ✅ 불변 |

**데이터/권한/되돌리기 영향 로직 변경 0건.** ACTIONS·STATUS 문자열 값 보존 → 상태 전이·필터 정상.

---

## 3. 토큰·다크 잔재 (grep 실측)
- **옛 slate/무지개 hex 잔재**: 변경 7파일 스타일에서 0건. TargetMenu `#12122a`는 "제거 완료" 주석 텍스트뿐.
- **다크 박스 rgba(0,0,0,0.x)**: inquiries 4파일 0건 (TemplateManager·DetailPanel의 `rgba(0,0,0,0.25/0.2/0.15)` 콘텐츠 배경 → `UP.sunken` 교체됨). NoticesMenu line317 `rgba(0,0,0,0.65)` 1건은 **모달 오버레이 스크림**(표준 패턴, 제거 대상 다크 콘텐츠 박스 아님). 정상.
- **무지개 C팔레트**: `#00c48c/#f08c00/#cc2233/#8b5cf6/#06b6d4/#ec4899/#eab308` → `UP.greenChart/amberChart/dangerChart/strong/navy/sub/amber`. `C.*` 키 보존으로 차트 참조 불변.
- **TargetMenu 다크 잔재 3종**: 툴팁 `#12122a`→surface+navy텍스트, 히트맵 `#fafafa`→sunken, 흰 트랙 `#fff`→sunken 전부 수정 확인.

---

## 4. Tailwind 텍스트 클래스 함정 (index.css `.text-*` !important)
- 변경 7파일에서 `text-xs/sm/base/lg/xl/[Npx]` **0건** (grep 실측). 모든 폰트 크기 인라인 rem/px 유지 → 전역 폰트 override로 테이블 깨질 위험 없음. (`grid-cols-*`·`gap-*`은 레이아웃 클래스, 폰트 무관.)

---

## 5. AA 대비
| 토큰 | 값 | 흰 배경 | 용도 | 판정 |
|---|---|---|---|---|
| UP.sub | #565D6A | 6.7:1 | 보조·축눈금·라벨 | ✅ |
| UP.body | #333D4B | ~9:1 | 본문 | ✅ |
| UP.navy | #1A2434 | ~13:1 | 헤딩·금액 | ✅ |
| UP.green | #047857 | AA | 적격/답변완료 | ✅ |
| UP.strong | #1B64DA | 5.4:1 | 활성·강조 | ✅ |
| UP.amber | #B45309 | AA | 대기 | ✅ |
| UP.danger | #D32F3A | AA | 오류·삭제 | ✅ |
| UP.caption | #8E929B | ~3:1 | 캡션·날짜·순번·도움말·빈상태 | 비필수만 ✅ |

- caption 사용처(grep 30곳 전수) 모두 비필수 보조정보 — 본문·중요라벨 오용 0건.
- 상태배지 `${STATUS_COLOR}18` 흰 틴트: waiting(amber)·reviewing(strong)·answered(green) AA. `closed`만 caption≈3:1 경계 — 종결=의도적 비활성 저대비이며 묶음1 대시보드와 일관. **비치명.**

---

## 6. 반응형 320~1280
- TargetMenu: 테이블/히트맵 `overflowX:'auto'`, 카드 `clamp()` 패딩·폰트, `grid-cols-1 md:grid-cols-2`. OK.
- Notices·Inquiries 테이블: `overflowX:'auto'`+minWidth로 가로 스크롤. OK.
- InquiryDetailPanel: `width:420`+**`maxWidth:'100vw'` 추가** → 320px 패널 뷰포트 초과 차단. 명세 충족 ✅.
- 모달(Notices) `width:'100%'`+스크림. OK.

---

## 7. 비치명 관찰 (BLOCKER 아님)
1. TargetMenu PIE 7·8번째 시리즈가 `cyan→navy(#1A2434)`·`pink→sub(#565D6A)`로 회색·진남색 인접 시 변별 약화 가능. 무지개 금지 정책상 의도된 절제, 1~6위는 충분 구분. 기능 무영향.
2. TemplateManager 컨테이너·폼·항목 row 모두 `UP.sunken` 동일 면. 폼엔 border 추가됐으나 항목 row는 보더 없어 시각 구분 옅음. 후속 다듬기 후보.
3. `closed` 상태배지 caption 저대비(5항).

---

## 최종 판정
**PASS — BLOCKER 0건.** 빌드 통과, 7파일 로직 전부 불변(데이터/권한/CRUD/optimistic/RLS 가드 무손상), 다크 잔재·무지개 hex 제거, Tailwind 텍스트 클래스 미사용, AA 충족, 320~1280 대응. 커밋·배포 가능.
