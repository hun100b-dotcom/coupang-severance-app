# P1b H1 단일화 — 더블리뷰 아카이브

- 스텝: **SEO P1 후속 — 전 라우트 H1 정확히 1개 보장(중복 제거)**
- 대상 커밋: `fb7ee4a`
- 리뷰 일자: 2026-07-03

## 1. 배경·조치
종훈님 지시: 프리렌더 작동 확인됨(라이브 h1 반영). 단 `/severance`가 h1 2개 → 페이지당 h1 1개로 정리(중복 감점 방지, 태그만·표시 유지).

전 공개 17라우트 라이브 curl 감사 → `/severance`만 h1=2, 나머지 16개 h1=1.
- 원인: `/severance`는 CalcLayout **앱바 h1**("퇴직금 계산기") + SeveranceFlow **콘텐츠 h1**("쿠팡·CFS 일용직 퇴직금 계산기") 병존.
- 조치: SeveranceFlow 콘텐츠 `h1→h2`(태그만). CalcLayout 앱바 h1은 형제 계산기(/unemployment·/weekly-allowance·/annual-leave·/calculator)의 **유일 h1**이라 유지 → 형제 무영향.

## 2. 라우트별 H1 개수표

| 라우트 | 수정 전 | 수정 후 | h1 텍스트(수정 후) |
|---|---|---|---|
| / | 1 | 1 | (공개 랜딩 히어로) |
| /coupang-severance-calculator | 1 | 1 | 쿠팡 퇴직금 계산기 |
| /coupang-unemployment-calculator | 1 | 1 | 쿠팡 일용직 실업급여 |
| /day-worker-severance-guide | 1 | 1 | 일용직 퇴직금 완전 가이드 |
| /coupang-part-time-severance-method | 1 | 1 | 쿠팡 알바 퇴직금 받는 법 |
| /daily-worker-severance-28days | 1 | 1 | 일용직 퇴직금 28일 계산법 |
| /coupang-cfs-severance-calculation | 1 | 1 | 쿠팡 CFS 퇴직금 계산 방법 |
| /guide | 1 | 1 | CATCH 노동법 가이드 |
| /guide/severance | 1 | 1 | 쿠팡 일용직 퇴직금 계산기 |
| /guide/unemployment | 1 | 1 | 쿠팡 일용직 실업급여 계산기 |
| /guide/weekly-allowance | 1 | 1 | 주휴수당, 매주 빠짐없이 받아야 해요 |
| /guide/annual-leave | 1 | 1 | 연차수당, 미사용 연차를 돈으로 받아요 |
| **/severance** | **2** | **1** | 퇴직금 계산기 (콘텐츠 "쿠팡·CFS…"는 h2로 강등) |
| /unemployment | 1 | 1 | 실업급여 계산기 |
| /weekly-allowance | 1 | 1 | 주휴수당 계산기 |
| /annual-leave | 1 | 1 | 연차수당 계산기 |
| /calculator | 1 | 1 | 계산기 |

→ **17/17 라우트 h1 정확히 1개.**

## 3. 회귀 (규칙3) — 측정 수치표
헤드리스 computed font-size 히스토그램(px→요소수) 전/후:

| 라우트 | BEFORE | AFTER | 판정 |
|---|---|---|---|
| /severance | 16:29·17.5:5·16.5:6·15.5:5·13.5:3·12.5:5·18:1·26:1·14.5:1·22:1·56:1·11.5:1 | **동일** | ✅ 0px |
| /unemployment | 16:25·17.5:5·16.5:6·15.5:3·12.5:5·18:1·26:1·14.5:1·22:1·56:1·11.5:1 | **동일** | ✅ 0px |
| /calculator | 16:55·15.5:10·12.5:14·16.5:6·14.5:6·19:4·17.5:4·18.5:2·30:1·22:1·56:1·11.5:1 | **동일** | ✅ 0px |
| /coupang-cfs-severance-calculation | 16:48·15.5:23·13.5:21·24:2·56:1·11.5:1 | **동일** | ✅ 0px |

근거: index.css의 태그 선택자는 h1~h6 **color만** 동일 지정(#111827), **font-size는 전적으로 클래스 기반**. h1→h2(둘 다 `text-base font-black text-brand-strong`) → 크기·색 불변. 프리렌더 h1=1 확인.

## 4. 리뷰어 A (5축)
| 축 | 판정 | 근거 |
|---|---|---|
| 디자인 | PASS | h2가 h1과 동일 클래스 → 시각 무변경 |
| UI | PASS | 렌더 동일(태그만) |
| UX | PASS | 문서 개요 위계 정상화(페이지당 단일 주제목) |
| 코드 | PASS | 한국어 주석·1태그 변경·형제 영향 분석 명시 |
| 회귀 | PASS | **측정 히스토그램 4라우트 0px** |

**A 종합: PASS.**

## 5. 리뷰어 B (Adversarial)
- **A의 0px 주장 검증**: 4라우트 히스토그램 문자열 완전 동일 재확인.
- **형제 계산기 파손 여부**: CalcLayout 미변경 확인 → /unemployment·/weekly-allowance·/annual-leave·/calculator h1=1 유지(변경 전후 동일).
- **h1 선택 타당성**: 앱바 "퇴직금 계산기"를 h1로 남김 = 형제와 일관. 키워드 "쿠팡·CFS…"는 h2·title·JSON-LD에 잔존 → 키워드 손실 없음.
- **감사 완전성**: 17라우트 전수 curl로 중복이 /severance뿐임을 확증(다른 페이지 잠재 중복 없음).
- **놓친 점**: 앱바 h1이 다소 일반적(키워드 약함)이나, 이는 계산기 진입 라우트(SEO 주력은 랜딩/가이드)라 영향 경미 → 문서화(향후 P4 심화 시 계산기 h1 키워드화 검토 가능).

**B 종합: PASS** + 문서화 1건(계산기 앱바 h1 키워드 약함, 경미).

## 6. 합의·이견·최종결정
| 항목 | 내용 |
|---|---|
| 합의 | 둘 다 PASS. 17/17 라우트 h1=1, 회귀 0px, 형제 무영향. |
| 이견 | 없음. B가 계산기 앱바 h1 키워드 약함(경미) 문서화 추가. |
| 최종결정 | **P1(H1 단일화) PASS·배포유지.** |
