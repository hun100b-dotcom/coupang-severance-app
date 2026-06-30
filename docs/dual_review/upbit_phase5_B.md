# 업비트풍 Phase5 마감 스윕 — 리뷰어 B (적대적 검증관)

- 검토일: 2026-06-30
- 브랜치: `redesign/upbit-phase5` (기준 main=`c1dbd02`)
- 검토 방식: `git diff HEAD` 전량 정독(44파일/+701-701) + tailwind.config.js·index.css 토큰 대조 + WCAG 대비비 직접 계산 + `npm run build`(`tsc -b && vite build`) 실행
- 자세: PASS 저지 목적 — 결함을 적극 입증 시도. 단 모든 지적은 파일:줄 + 재현 근거 필수.

---

## 0. 변경 범위 사실 확인 (설명 불신, diff 직접 검증)

- `git diff --stat HEAD`: 44개 파일, +701 / −701 (완전 1:1 균형 — 라인 추가·삭제 동수 = 순수 색/토큰 치환 사이클 특징과 일치).
- 변경 성격: 하드코딩 hex(`#191F28`, `#3182f6`, `text-gray-400`, `text-toss-blue`, `text-red-500`, `#00a876`)를 디자인 토큰(`text-ink-900`, `bg-brand`, `text-up-sub`, `text-danger`, `#047857`)으로 치환. **로직/조건식/값 변경 없음**(아래 3번에서 입증).
- 작업트리 상태: 전부 unstaged(미커밋). `docs/audit/phase5_sweep.md` 신규 추가.

---

## 1. AA 거짓 통과 공격 — 직접 계산 결과

WCAG 2.1 상대휘도 공식으로 직접 계산(스크립트 검증). alpha 토큰은 흰 배경 합성 후 계산.

| 전경 | 배경 | 대비 | 본문 4.5 | 판정 |
|---|---|---|---|---|
| `#B45309` | `bg-warning/10` (합성 ≈ rgb(254,245,231)) | **4.65:1** | ✅ | PASS (간당이지만 충족) |
| `#B45309` | `bg-warning/[0.08]` | 4.72:1 | ✅ | PASS |
| `#B45309` | 흰 카드 | 5.02:1 | ✅ | PASS |
| `accent-700 #047857` | `accent-bg #E6F8F1` | **4.98:1** | ✅ | PASS |
| `accent-700 #047857` | 흰 배경 (ResultSeverance 0.72rem 캡션) | 5.48:1 | ✅ | PASS |
| `#C81E2E` | `bg-danger/10` | 5.01:1 | ✅ | PASS (단 JobsPage는 이번 사이클 미변경) |
| `up-sub #565D6A` | 흰 배경 | 6.63:1 | ✅ | PASS |
| `up-body #333D4B` | 흰 배경 | 11.0:1 | ✅ | PASS |
| `brand-strong #1B64DA` | 흰 배경 | 5.41:1 | ✅ | PASS |

→ **이번 사이클에서 새로 도입한 본문 텍스트 색은 모두 AA(4.5:1) 통과.** amber-700(`#B45309`)이 `bg-warning/10` 위에서 4.65로 통과함을 직접 입증(거짓 통과 아님).

### 1-A. `text-warning`(#F59E0B)의 대비 — 검증 후 면제 확정
- `text-warning` on 흰 배경 = **2.15:1**, on `bg-warning/10` = **1.99:1** → 텍스트라면 명백 FAIL.
- 그러나 이번 diff의 라이브 `text-warning` 사용처는 **전부 아이콘**(장식, AA 면제):
  - `ErrorBoundary.tsx:40` `<AlertTriangle className="... text-warning"/>`
  - `MyApplicationsTab.tsx:725` `<AlertCircle className="... text-warning"/>`
  - 두 곳 모두 옆에 `#B45309`(4.65↑) 가독 텍스트 동반 → 정보 전달은 텍스트가 담당.
- `Badge.tsx:12` `warning: 'bg-warning/10 text-warning'`(텍스트 변형)은 **데드 코드**: 전 코드베이스에 `tone="warning"` 인스턴스 0건(grep 확인). 이번 diff에서 `warning` 라인은 손대지 않음(neutral 라인만 변경).
- **결론: AA 위반 없음.** 단 데드 변형은 향후 사용 시 위험 → 아래 권고.

---

## 2. 토큰 미정의 공격 — 전수 대조 결과

- Tailwind **3.4.11** 확인(`package.json`). v3는 단일 hex 색 토큰에도 opacity modifier 정상 동작(hex→rgb 변환 후 alpha 적용). 따라서 `bg-warning/10`, `border-warning/30`, `bg-danger/10`, `border-danger/30`은 **유효**(스타일 적용됨). BLOCKER 아님.
- diff에서 추가된 모든 토큰 유틸리티(83×`border-up-hair`, 77×`text-accent-700`/`bg-up-sunken`, 70×`text-up-sub`, 46×`text-danger` 등 전 패턴)를 `tailwind.config.js`와 대조:
  - `up.{page,surface,sunken,navy,body,sub,caption,hair,brand,strong,green,danger}` 전부 정의됨 → `text-up-*`, `bg-up-*`, `border-up-*`, `from-up-navy/body` 모두 해석됨.
  - `accent.{DEFAULT,strong,bg,600,700}` 정의됨 → `bg-accent-700`, `text-accent-700`, `border-accent/30~40` OK.
  - `brand.{DEFAULT,strong,bg,50~700}` 정의됨 → `from-brand`, `to-brand-strong`, `border-brand-100/200`, `ring-brand/30` OK.
- **무효 클래스(스타일 미적용) 0건.** + 빌드(`tsc+vite`) 정상 통과로 교차 확인.

---

## 3. 로직 훼손 공격 — 분기·값·키 무결성

`ResultSeverance.tsx` 정밀 점검(가장 로직 밀집 + 색 치환 다수):
- `BlockCard`: `const color = block.qualifies ? '#047857' : '#cc2233'` — 분기식 그대로, 적격 측 색만 `#00a876`→`#047857`. ✅
- Section1Period: `s.eligible ? '#047857' : '#cc2233'` (2곳) — 조건·키 보존. ✅
- Section4Eligibility: `eligible ? '#047857' : 'var(--toss-blue)'`, 그래디언트 `#00c48c,#047857` — 값만 교체. ✅
- `#cc2233`(미달 빨강) 분기는 전부 보존 → 적격/미달 시각 구분 유지.
- **레이아웃 영향 없음**: opacity 제거는 `ResultSeverance.tsx:372` 1곳(`#00a876 opacity:0.7` → `#047857` 솔리드). 이는 **색·투명도** 변경일 뿐 width/height/display 무관 → 레이아웃 불변, 대비는 오히려 개선(5.48:1). ✅
- 그 외 41파일은 className/인라인색 문자열 치환만 — 조건식·prop·map key 변경 흔적 없음(diff `^[+-]` 라인 전수 확인).

→ **로직 훼손 0건.**

## 4. 흡수된 DesignSync 공격 — 매핑 표본 검사

- `Onboarding.tsx`: `text-[#191F28]`→`text-ink-900`(동일 hex), `bg-[#3182F6]`→`bg-brand`(동일), `text-red-500`→`text-danger`, `border-gray-200`→`border-up-hair`, `placeholder-gray-400`→`placeholder-up-caption`. 의미 보존, 대비 동등/개선.
- `ApplyFormModal.tsx`: `text-gray-500`→`text-up-sub`(2.8→6.6:1 **개선**), `text-gray-400`→`text-up-sub`(**개선**), `bg-blue-500`→`bg-brand`, `text-blue-700`→`text-brand-strong`(5.41:1), `border-red-400 bg-red-50`→ danger 계열. 잘못된 의미 뭉갬 없음.
- 강조 블루 표본: `text-toss-blue`/`text-[#3182f6]`→`text-brand` — **셋 다 #3182F6 동일값**. 즉 렌더 대비(3.71:1) **변화 없음**(NonEligibleResult:169/231, CoupangPartTimeSeverance:229 확인). 사이클이 새 저대비를 만든 게 아니라 기존 패턴을 토큰화한 것.

→ 표본 내 **오매핑·대비 저하 0건.**

## 5. 반응형/오버플로
- 변경은 색/토큰 한정, width·gap·flex·grid·px 레이아웃 속성 미변경(diff 전수). 320/360px 신규 깨짐 유발 경로 없음.

## 6. 빌드 게이트
- `npm run build`(`tsc -b && vite build`) → **✓ built in 9.31s**, 타입 에러 0, 번들 에러 0.
- 경고는 사전 존재하던 chunk>500kB(index/TargetTab) 1건뿐 — 이번 변경과 무관, BLOCKER 아님.

---

## 발견 결함 목록 (위험도순)

| # | 위험도 | 파일:줄 | 내용 | 근거 | 처리 |
|---|---|---|---|---|---|
| B1 | 낮음(비차단) | `Badge.tsx:12` | `warning` 변형 `text-warning`(2.15:1)은 텍스트용으로 쓰면 AA FAIL | 데드 변형(`tone="warning"` 사용 0건). 이번 diff 미변경 | 향후 사용 금지 또는 `text-[#B45309]`로 교체 권고 |
| B2 | 낮음(선존재) | `Badge.tsx:11` `danger`, `:9` `accent` | `text-danger` on bg-danger/10 = 3.26:1, `text-accent-strong` on accent-bg = 2.89:1 → 본문 AA 미달 | 계산 확인. **이번 사이클 미변경(선존재)**, 사용 여부 별도 | 차기 별건 정리 권고 |
| B3 | 정보성 | 다수(`text-brand` 강조 스팬) | `text-brand`(#3182F6)=3.71:1, 소형 본문이면 AA 미달 | **이번 사이클이 만든 회귀 아님** — `text-toss-blue`/`text-[#3182f6]`(동일 #3182F6)에서 토큰화만. 대비 변화 0 | 강조는 `text-brand-strong`(5.41:1) 권장이나 본 PASS 범위 외 |
| B4 | 정보성 | `text-up-caption` 3+곳 | #8E929B=3.12:1, 비필수 캡션 한정 | 빈상태 힌트·날짜·구분점 등 비필수 용도(설계 문서 "비필수만" 명시). 다수는 `gray-400`(2.8:1)→개선 | 면제 |

### BLOCKER 목록
- **없음.** (데이터손실/보안/빌드깨짐/토큰무효/AA명백위반/로직변경 중 해당 0건)
  - 빌드: PASS · 토큰: 전부 유효 · 신규 본문색 AA: 전부 ≥4.5 · 로직: 불변.

---

## 종합 판단
이번 사이클은 순수 색→토큰 치환(+701/−701 동수)로, 적대적으로 파고든 4개 공격면(AA 거짓통과·토큰 미정의·로직 훼손·DesignSync 오매핑) 모두에서 차단 사유를 입증하지 못했다. amber-700/녹색700/danger 신규색은 실제 합성배경 위 직접계산으로 4.5↑ 확인. `text-warning` 2.15:1은 라이브에서 아이콘 전용(면제) + Badge 텍스트변형은 데드코드. 잔여 결함(B1~B4)은 모두 비차단(데드코드/선존재/동일값 토큰화/비필수 캡션)이다.

최종: PASS(BLOCKER 0)
