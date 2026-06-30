# 업비트풍 리디자인 Phase 3 — 전역 토큰 적용 / 듀얼 리뷰 A

- **관점**: 회귀 / 하위호환 / 토큰 정확성
- **리뷰어**: A (시니어 QA)
- **브랜치**: redesign/upbit-home
- **TIER 판정**: TIER 2 (frontend/src/components/ 다수 변경 + 6파일)
- **일시**: 2026-06-30

---

## 최종 판정: ✅ PASS (경미 이슈 2건, BLOCKER 0건)

---

## 변경 범위 (git diff --stat HEAD 실측)

```
frontend/src/components/TopNav.tsx           |  2 +-
frontend/src/components/ui/Button.tsx        |  3 ++-
frontend/src/components/ui/Container.tsx     |  8 ++++----
frontend/src/components/ui/SectionHeader.tsx |  3 ++-
frontend/src/styles/index.css               | 18 +++++++++++++++++-
frontend/tailwind.config.js                  | 27 +++++++++++++++++++++++++++
6 files changed, 53 insertions(+), 8 deletions(-)
```

순수 UI/토큰 변경. 로직 파일 무변경.

---

## 점검 항목별 결과

| # | 점검 항목 | 결과 | 근거 |
|---|-----------|------|------|
| 1 | 실제 diff 확인 | ✅ | 6파일, +53/-8. 위 stat 실측 |
| 2 | 기존 toss.* 토큰 보존 | ✅ | tailwind.config.js diff = `27 insertions(+)`, **삭제 0줄**. toss 블록 무변경 |
| 3 | 기존 brand/ink/line/page 토큰 보존 | ✅ | 삭제 0줄. up.* 는 별도 신규 네임스페이스로 **추가만** 됨 |
| 4 | maxWidth.content 토큰 생성·참조 | ✅ | 빌드 CSS에 `.max-w-content{max-width:1280px}` 정확히 생성. Container/TopNav가 `max-w-content` 참조 |
| 5 | narrow 640px 보존 (보수적 유지) | ✅ | CSS `max-width:640px` 1건 존재. Container narrow 분기 유지 |
| 6 | npm run build 통과 | ✅ | `✓ built in 9.83s`, 에러 0. (기존 chunk>500kB 경고는 본 변경 무관·기존부터 존재) |
| 7 | px-5/md:px-8 적용 | ✅ | CSS `.px-5{padding-left:1.25rem...}` + `padding-left:2rem`(px-8) 생성 |
| 8 | .tnum 유틸 생성 | ✅ | CSS `.tnum{font-variant-numeric:tabular-nums}` 생성 |
| 9 | :root up CSS 변수 주입 | ✅ | `--up-page:#EEF1F5` ~ `--up-strong:#1B64DA` 번들 포함 확인 |
| 10 | 백엔드 계산 로직 무관(diff 0) | ✅ | `git diff HEAD -- backend` 출력 0. 28일 블록 로직 무변경 |
| 11 | Button lg 56px/17px 업스케일 | ✅ | diff `min-h-[54px]→[56px]`, `text-[16px]→[17px]`. 문서 173행(54→56) 일치 |
| 12 | SectionHeader 타이틀 md:20px | ✅ | diff `text-[17px]→text-[17px] md:text-[20px]`. 모바일 17 보존(보수적) |
| 13 | up.* 색값 문서 §2 실측 일치 | ⚠️ | 대부분 일치, 2건 불일치(아래 경미 이슈) |

---

## up.* 색값 ↔ docs/design/upbit_home_analysis.md §2 대조표

| 토큰 | 코드값 | 문서 근거 | 판정 |
|------|--------|-----------|------|
| up.sunken | #F2F5FA | 문서 49행 `#F2F5FA` 띠·표헤더 | ✅ 일치 |
| up.navy | #1A2434 | 문서 58행 헤딩 14.8:1 | ✅ 일치 |
| up.sub | #565D6A | 문서 59행 보조텍스트 AA 6.7:1 | ✅ 일치 |
| up.caption | #8E929B | 문서 60행 캡션 3.0:1 | ✅ 일치 |
| up.hair | #E1E4EA | 문서 69행 헤어라인 | ✅ 일치 |
| up.brand | #3182F6 | 문서 153행 포인트 블루 | ✅ 일치 |
| up.strong | #1B64DA | 문서 153행 금액강조 AA 5.4:1 | ✅ 일치 |
| up.surface | #FFFFFF | 카드/면 | ✅ 자명 |
| up.danger | #F04452 | 기존 danger 토큰과 동일 | ✅ 일치 |
| up.green | #047857 | 문서 직접명시 없음·기존 accent.700과 동일 | ⚠️ 경미(②) |
| **up.body** | **#333D4B** | 문서 57행 본문 실측은 **#333333** | ⚠️ 경미(①) |
| **up.page** | **#EEF1F5** | 문서에 직접 명시값 없음(§7은 #F2F5FA/#EDEEF1) | ⚠️ 경미(①) |

---

## 발견 이슈

### BLOCKER
- **없음.** 하위호환 깨짐 0, 빌드 통과, 토큰 참조 정상.

### 경미 ①: up.body / up.page 가 문서 §2 실측값과 미세 불일치
- 문서 57행 본문 주력색 실측 = `#333333`(순회색) 이나 코드 `up.body = #333D4B`(청기 섞인 잉크).
- 문서에 `up.page #EEF1F5` 직접 실측 근거 없음(§7 인접값은 #F2F5FA, #EDEEF1).
- **평가**: 둘 다 기존 CATCH 잉크/페이지 계열(`ink.800 #333D4B`, `page` 청회색 톤)과의 **일관성을 위한 의도적 선택**으로 해석됨. 업비트 순회색을 그대로 박으면 기존 토스 잉크 계열과 색온도가 충돌하므로, 청기 통일은 합리적 절충. AA 대비(#333D4B on white ≈ 11:1)도 충분. **차단 사유 아님.**
- **권고**: 코드 주석의 "값 출처: upbit.com/home 라이브 실측" 표현이 body/page에는 엄밀히 부정확. 주석에 "본문/페이지는 기존 ink/page 계열과 톤 통일 위해 조정값 사용"을 1줄 보강하면 추후 혼선 예방.

### 경미 ②: up.green #047857 출처 표기
- 문서 색표에 채용 그린 직접 행이 없음. 기존 `accent.700 #047857`(AA용 진한 그린)과 동일값 재사용 — 사실상 문제없으나 주석의 "값 출처: 업비트 실측"이 green에는 비해당.
- **권고**: 주석에 "green/body/page는 CATCH 기존 토큰 계승" 명시.

---

## 권고 종합
1. (선택) tailwind.config.js up 블록 주석에 body/page/green 출처를 "기존 토큰 계승·톤 통일"로 보강 — 문서·코드 정합성 향상. 코드 동작에는 영향 없음.
2. up.* 는 신규 추가 네임스페이스이며 **아직 실제 컴포넌트에서 미사용**(전역 주입 단계). 후속 적용 Phase에서 사용처별 AA 재검증 권장(특히 up.caption #8E929B는 비필수 텍스트에만 제한 사용할 것 — 문서 65행 교훈).
3. 하위호환·회귀 관점에서 즉시 배포 가능.

---

## 결론

PASS
