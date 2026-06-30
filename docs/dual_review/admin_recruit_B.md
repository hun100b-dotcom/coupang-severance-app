# 어드민 묶음3(채용 클러스터) 적대적 리뷰 — 리뷰어 B (재실측)

> 2026-06-30 · 적대(adversarial)·전량 실측 · base=main 281b801 → 묶음3 변경(commit 16924dd / merge 117f4fc)

**한줄 결론:** 빌드 그린 · 로직/CRUD/상태값/차트키 4파일 바이트 단위 불변 · UP 토큰 14종 전부 정의 존재 · 잔존 슬레이트/무지개 hex 0건 · 상태배지 색의미 정상(긴급=빨강/대기=앰버/확정=초록/거절=빨강) · 320px 반응형 가드 유지. **치명 결함 없음.**

**판정: PASS — BLOCKER 0건**

---

## 0. 레포 상태 실측(중요)

프롬프트는 "base=main 281b801, 변경 파일이 작업트리 미커밋"이라 명시했으나 실제 레포는 이미 커밋·머지 완료 상태였다.

```
$ git rev-parse HEAD ; git rev-parse main
117f4fc... (동일)
$ git log --oneline --graph
*   117f4fc merge: 어드민 개편3(채용 클러스터) → main
| * 16924dd feat(admin): 묶음3 업비트풍 정돈 — 채용 클러스터 4메뉴 up.* 토큰화
|/
* 281b801 (base = 묶음2 마감)
```

따라서 본 리뷰는 **281b801 → 117f4fc(=16924dd)** 의 묶음3 변경분을 대상으로 했다. 결론은 동일(미커밋이든 커밋이든 diff 내용은 같음).

### 스코프 확인 — 묶음3 커밋은 깨끗
```
$ git diff 281b801 117f4fc --name-only
docs/dual_review/admin_recruit_A.md
docs/dual_review/admin_recruit_B.md   (본 보고서)
frontend/src/components/admin/menus/ApplicantsMenu.tsx
frontend/src/components/admin/menus/ConfirmedMenu.tsx
frontend/src/components/admin/menus/JobPostingsMenu.tsx
frontend/src/components/admin/menus/RecruitSummaryMenu.tsx
```
묶음3 커밋은 **4개 타겟 + 리뷰 문서 2개**만 건드렸다. 사용자 화면·타 어드민 메뉴 무변경. **스코프 회귀 0건.**

diff stat: 4 source files, +341 / -274 (라인 +/- 대부분 hex→토큰 1:1 치환).

> ⚠️ 단, 작업트리(uncommitted)에 묶음3와 **무관한** 어드민/세팅 파일(AuditLogTable, AccountsMenu, AuditMenu, MembersMenu, ServerLogsMenu, SettingsMenu, CmsSettings, DiscordSettings, IpBlockManager, LegalVariables) 10개가 수정 대기 중. 채용 4파일은 이 목록에 없으므로 묶음3 판정에 영향 없음. 이는 **다음 묶음(어드민/세팅)** 작업으로 보이며 본 리뷰 범위 밖. 별도 리뷰 권고.

---

## 1. 숨은 로직 변경 — 없음 (정규화 대조)

색/스타일 값을 placeholder로 정규화한 뒤 `-`/`+` 라인을 다중집합 비교했을 때, 잔존(비-색) 차이는 **파일당 `import { UP } ... ` 1줄뿐**. 그 외 모든 잔차는 정규화기의 `'#hex'`(따옴표) vs `` `${UP.x}` ``(백틱) 표기 차이로 인한 위양성으로, 따옴표·백틱을 통일하면 전부 소거됨.

상태값/쿼리/핸들러가 diff의 +/- 라인에 등장하는지 직접 grep:
```
$ grep -E "'(active|draft|confirmed|rejected|cancelled|pending|today-urgent|...)'|\.eq\(|\.update\(|\.insert\(|\.delete\(|onClick=" <diff +/- 라인>
```
→ 매칭된 라인은 **전부 끝의 `color:` 값만 다르고 상태 문자열·조건·키는 좌우 동일**. 대표 페어:

```
- { value: 'today-urgent' ..., color: '#ef4444' }    + ..., color: UP.danger
- { value: 'tomorrow-urgent' ..., color: '#f97316' }  + ..., color: UP.amber
- { value: 'always' ..., color: '#22c55e' }           + ..., color: UP.green
- { value: 'active' ..., color: '#22c55e' }           + ..., color: UP.green
- { value: 'draft'  ..., color: '#ffb400' }           + ..., color: UP.amber
- if (status==='confirmed') return {bg:'rgba(49,200,100,0.18)', color:'#3fc878'}  + ..., color:UP.green
- if (status==='cancelled') return {bg:'rgba(240,68,82,0.18)', color:'#f04452'}   + ..., color:UP.danger
- if (status==='rejected')  return {bg:'rgba(240,68,82,0.25)', color:'#ff4d4d'}   + ..., color:UP.danger
```
값 `today-urgent / tomorrow-urgent / always / active / draft / confirmed / cancelled / rejected / reviewing / completed / applied` 전부 **바이트 동일**. 차트 dataKey(`지원/확정/거절/목표/applied`)·`form.work_type === opt.value`·`formStep === step.num`·`checked ?` 조건·`r:4`·`radius`·`maxBarSize`·`strokeWidth` 전부 불변.

**→ 색 교체로 위장한 로직/조건/핸들러/상태문자열/데이터키 변경 0건. BLOCKER 0.**

---

## 2. 빌드/타입 — PASS

```
$ npm run build
✓ built in 9.36s
```
에러 0, TS 컴파일 통과. 청크 사이즈 경고(index 533kB / TargetTab 543kB / BarChart 379kB)는 본 변경과 무관한 **기존 경고**.

UP 토큰 오타로 인한 미정의 참조 검사 — 4파일에서 쓰인 `UP.*` 14종을 adminTheme.ts 정의와 대조:
```
UP.amber UP.body UP.brand UP.caption UP.danger UP.green UP.greenBg
UP.greenLine UP.hair UP.hairSoft UP.navy UP.strong UP.sub UP.sunken  → 전부 OK
```
미정의(예: UP.오타) **0건**.

---

## 3. 색 의미 붕괴 — 없음

상태→색 매핑이 의미와 일치하는지 라벨↔색 대조:

| 상태/섹션 | 라벨 | 변경 후 색 | 의미 적합 |
|-----------|------|-----------|----------|
| today-urgent | 🔥 오늘 추가모집 | UP.danger(빨강) | ✅ 긴급=빨강 |
| tomorrow-urgent | ⚡ 내일 긴급모집 | UP.amber(앰버) | ✅ 경고=앰버 |
| always | ✅ 상시 | UP.green / UP.sub | ✅ 정상/중립 |
| active | ✅ 즉시 발행 | UP.green | ✅ |
| draft | 📝 임시저장 | UP.amber | ✅ 대기=앰버 |
| confirmed | 확정 | UP.green | ✅ 확정=초록 |
| reviewing | 검토중 | UP.amber | ✅ |
| completed | 처리완료 | UP.sub(회색) | ✅ 중립 |
| cancelled | 취소 | UP.danger | ✅ |
| rejected | 거절 | UP.danger | ✅ 거절=빨강 |
| applied | 지원 | UP.brand(파랑) | ✅ |

**초록↔빨강 역전·확정↔거절 뒤바뀜 등 의미 붕괴 0건.** (cancelled #f04452와 rejected #ff4d4d 두 빨강이 모두 UP.danger로 수렴하나 bg 알파(0.18 vs 0.25)가 달라 여전히 구분 가능 — 비치명도 아님.)

차트 색의미(RecruitSummaryMenu 라인차트): 지원=brand / 확정=green / 거절=danger → blue·green·red 변별 충분.

---

## 4. 대비(가독성) — 통과, 오히려 개선

신규 `UP.caption(#8E929B, ~3.5:1)` 적용 지점은 전부 **비필수 저강조**(빈상태 안내문, 스텝 설명, 폼 플레이스홀더 `회사명/센터명/지역`, "미입력"/"처리완료"/"+N", "불러오는 중") — caption 토큰 정의 주석("캡션/날짜 비필수만")에 부합.

추가로, caption으로 치환된 지점의 **기존 색**을 추출하니 대부분 `#94a3b8`(slate-400, ~2.8:1)·`#cbd5e1`(더 옅음)이었다. 즉 caption(#8E929B)은 원본보다 **대비가 더 높다 → 가독성 개선**. 본문/수치/필수 상태라벨에 caption이 쓰인 사례 0건.

---

## 5. 반응형 320px — 통과

신규 고정 width(px) 도입 grep → **0건** (구조 무변경, 색만 교체).
기존 반응형 가드 유지 확인:
- ApplicantsMenu L579-580 `overflowX:'auto'` + `minWidth:820`
- RecruitSummaryMenu L359-360 `overflowX:'auto'` + `minWidth:700`
- JobPostingsMenu L467 스텝퍼 `overflowX:'auto'`, L469 `minWidth:80`
- ApplicantsMenu L454/463/472 필터 `width:100%`+`minWidth:'unset'`

---

## 6. 다크 잔재 / 무지개 hex 잔존 — 없음

```
$ grep -nE "rgba\(0, ?0, ?0" <4파일>                       → 0건 (콘텐츠 다크박스 없음)
$ grep -nE "#[0-9a-fA-F]{6}" <4파일> | grep -v #fff/#fff... → 0건 (슬레이트/무지개 6자리 hex 없음)
```
잔존 hex는 의도적 `#fff`(흰 텍스트/배경) 뿐. recharts fill/stroke 전부 `{UP.*}` 토큰.

---

## 7. BLOCKER (치명) — 없음

해당 없음.

---

## 8. 비치명 관찰

- **관찰-1 (다음 묶음 누수 가능성)**: 작업트리에 묶음3 무관 어드민/세팅 파일 10개가 미커밋 상태로 존재. 묶음3 채용 4파일은 무관하나, 머지 전 의도치 않게 섞이지 않도록 다음 묶음에서 별도 커밋 권고.
- **관찰-2 (차트 토큰 일관성)**: RecruitSummary 라인차트 `거절`이 `UP.danger`(텍스트용). adminTheme에 차트 전용 `dangerChart(#F04452)`가 있어 일관성 차원에선 차트엔 `*Chart` 토큰 권고. 변별·가독 통과이므로 결함 아님.
- **관찰-3 (빨강 2종 수렴)**: cancelled/rejected가 동일 `UP.danger`로 수렴. bg 알파 차이로 구분 가능하나, 두 상태를 색으로 더 명확히 구분하려면 후속 검토 가능. 비차단.

---

## 최종

- 스코프 깨끗(4파일+문서) / 빌드 PASS / UP 토큰 14종 정의 존재 / 로직·상태값·차트키 바이트 불변 / 색의미 정상 / 대비 개선 / 320px 가드 유지 / hex·다크 잔재 0
- **판정: PASS — BLOCKER 0건**
