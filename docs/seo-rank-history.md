# CATCH 앱 SEO 검색 순위 추적

> catch-daily-worker.vercel.app 의 Google 검색 순위를 주기적으로 측정한 기록입니다.

---

## 2026-04-12 10:00 (첫 측정)

| 키워드 | CATCH 순위 | 상위 1~3위 사이트 | 리치 스니펫 |
|--------|-----------|------------------|------------|
| 쿠팡 퇴직금 계산기 | 미노출 | ① wjlb.co.kr ② worklaw.co.kr ③ ai.bznav.com | 없음 |
| 쿠팡 CFS 퇴직금 | 미노출 | ① khan.co.kr(경향신문) ② ngonews.kr ③ news.tf.co.kr(더팩트) | 없음 |
| 쿠팡 일용직 퇴직금 | 미노출 | ① ohmynews.com ② imnews.imbc.com ③ worklaw.co.kr | 없음 |
| 쿠팡 일용직 실업급여 | 미노출 | ① wjlb.co.kr ② wjlb.co.kr(38) ③ moel.go.kr(고용노동부) | 없음 |
| 일용직 퇴직금 계산기 | 미노출 | ① easylaw.go.kr(생활법령) ② shoplworks.com(샤플) ③ saramin.co.kr(사람인) | 없음 |
| CATCH 퇴직금 | 미노출 | ① catch.co.kr(캐치 채용) ② catchapply.co.kr ③ dev-korea.com | 브랜드 충돌: "캐치" 채용플랫폼이 상위 독점 |

**요약:** 6개 키워드 전체 미노출. 첫 측정이므로 이전 비교 데이터 없음.

**비고:**
- "쿠팡 CFS 퇴직금" 키워드는 2026년 초 특검 기소·재판 뉴스가 상위 독점 중
- "CATCH 퇴직금"은 캐치(catch.co.kr) 채용 플랫폼과 브랜드 충돌 심각
- 모든 키워드에서 리치 스니펫(FAQ, HowTo 등) 미출현

---

## 2026-05-24 10:05 (2차 측정)

측정 도구: Claude WebSearch (Google 결과 기반)

| # | 키워드 | CATCH 순위 | 상위 1~3위 | 리치 스니펫 |
|---|--------|-----------|-----------|------------|
| 1 | 쿠팡 퇴직금 계산기 | ❌ 미노출 | ① blogstock.co.kr ② echeveau.net (일용직 퇴직금 완벽 가이드 2026) ③ wjlb.co.kr | 없음 (블로그 도배) |
| 2 | 쿠팡 CFS 퇴직금 | ❌ 미노출 | ① khan.co.kr (경향신문 — 첫 재판 보도) ② news1.kr ③ labortoday.co.kr (매일노동뉴스) | **뉴스 박스 점령** — 계산기 의도가 뉴스 의도로 밀려남 |
| 3 | 쿠팡 일용직 퇴직금 | ❌ 미노출 | ① ohmynews.com (단독 — 일용직 퇴직금 삭제) ② rocketpunch.com ③ worklaw.co.kr | 없음 (뉴스 + 블로그) |
| 4 | 쿠팡 일용직 실업급여 | ❌ 미노출 | ① jab-guyver.co.kr ② wjlb.co.kr ③ moel.go.kr (고용노동부) | 정부 공식 사이트가 3위에 노출 |
| 5 | 일용직 퇴직금 계산기 | ❌ 미노출 | ① happyjju.com ② shoplworks.com (샤플) ③ worklaw.co.kr | **사람인 계산기 위젯** 노출 (saramin.co.kr) |
| 6 | CATCH 퇴직금 (참고용) | ❌ 미노출 | ① catch.co.kr (채용 플랫폼 "캐치") ② catchapply.co.kr ③ jobkorea.co.kr | **브랜드 충돌 확정** — 진학사 채용 플랫폼이 SERP 도배 |

**1차(2026-04-12) 대비 변화:**
- 순위 변동 없음 — 6개 키워드 전부 여전히 미노출 (42일 경과에도 변화 없음)
- "쿠팡 CFS 퇴직금": 4월 재판 보도로 **뉴스 박스 완전 점령** — 계산기 의도 자체 소멸
- "일용직 퇴직금 계산기": 사람인 위젯이 SERP feature 장악 — 후발 계산기 구조적 불리
- "쿠팡 퇴직금 계산기": 신규 블로그(echeveau.net "2026 완벽 가이드")가 상위 진입 → 콘텐츠 경쟁 심화

**핵심 관찰:**
- 사이트 자체 색인 여부 의심: 42일 경과 전 키워드 미노출이면 `site:catch-daily-worker.vercel.app` 점검 시급
- "CATCH" 브랜드는 진학사 채용 플랫폼과 100% 충돌 — 검색 유입 마케팅 시 "쿠팡 일용직" 등 수식어 필수
- 사람인 계산기 위젯이 SERP feature 장악 → FAQ JSON-LD 스키마 추가로 대항 필요

**다음 액션 3가지:**

1. **색인 점검** — Google Search Console에서 `site:catch-daily-worker.vercel.app` 색인 상태 확인. 0건이면 sitemap.xml 재제출 + IndexNow 재전송
2. **FAQ JSON-LD 추가** — 계산기 페이지에 FAQ 구조화 데이터 삽입 → 사람인 위젯과 경쟁할 리치 스니펫 확보
3. **롱테일 키워드 전환** — "쿠팡 CFS 퇴직금"처럼 뉴스 SERP가 점령한 키워드 포기, "쿠팡 알바 퇴직금 받는 법", "일용직 퇴직금 28일 계산" 등 롱테일로 이동

---
