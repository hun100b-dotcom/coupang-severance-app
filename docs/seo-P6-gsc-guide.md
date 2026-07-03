# P6 — Google Search Console 운영 가이드 (종훈님 직접 수행)

> P1~P5 코드 작업은 완료·배포됨. P6는 **외부 시스템(GSC) 클릭**이 필요해 종훈님이 직접 하셔야 하는 단계입니다.
> 아래 순서대로 5~10분이면 끝납니다. (전문용어는 괄호로 풀이)

---

## 사전 상태 (이미 완료됨)
- ✅ 사이트 소유권 인증 메타 태그 삽입됨(`google-site-verification`, `naver-site-verification`).
- ✅ `sitemap.xml`(색인 지도) 배포됨: https://catch-daily-worker.vercel.app/sitemap.xml
- ✅ `robots.txt` 배포됨: https://catch-daily-worker.vercel.app/robots.txt
- ✅ 프리렌더로 크롤러가 완성 HTML(제목·H1·본문·구조화데이터)을 받음.

---

## 1단계 — Google Search Console 접속·속성 확인
1. https://search.google.com/search-console 접속 (catchmasterdmin@gmail.com 또는 사이트 인증한 구글 계정으로 로그인).
2. 왼쪽 상단 속성 목록에서 **catch-daily-worker.vercel.app** 선택.
   - 없으면 **속성 추가 → URL 접두어 →** `https://catch-daily-worker.vercel.app` 입력 → 이미 메타태그가 있으니 **자동 확인(HTML 태그 방식)** 됩니다.

## 2단계 — 사이트맵 제출 (가장 중요)
1. 왼쪽 메뉴 **색인 생성 → Sitemaps(사이트맵)** 클릭.
2. "새 사이트맵 추가" 칸에 `sitemap.xml` 입력 → **제출**.
3. 상태가 **성공(Success)** 으로 뜨면 완료. (몇 분~하루 소요)

## 3단계 — 우선 페이지 색인 요청 (공백시장 키워드 6종)
아래 6개 URL을 하나씩 **상단 검색창(URL 검사)** 에 붙여넣고 → **색인 생성 요청** 클릭:
1. `https://catch-daily-worker.vercel.app/coupang-cfs-severance-calculation` ← 최우선(경쟁 공백)
2. `https://catch-daily-worker.vercel.app/coupang-severance-calculator`
3. `https://catch-daily-worker.vercel.app/coupang-unemployment-calculator`
4. `https://catch-daily-worker.vercel.app/day-worker-severance-guide`
5. `https://catch-daily-worker.vercel.app/coupang-part-time-severance-method`
6. `https://catch-daily-worker.vercel.app/daily-worker-severance-28days`

> 각 요청 시 "URL이 Google에 등록될 수 있음" 이 나오면 정상. 하루 요청 수 제한이 있으니 6개면 충분합니다.

## 4단계 — 리치 결과(구조화 데이터) 확인
1. https://search.google.com/test/rich-results 접속.
2. 위 CFS URL 입력 → **테스트**. **FAQPage·Article** 이 감지되면 성공(리치 스니펫 후보).
3. 가이드 URL(`/guide/severance`)은 **FAQPage·HowTo** 감지되어야 정상.

## 5단계 — 모니터링 (1~2주 후)
- **실적(Performance)**: 노출수·클릭수·평균순위. "쿠팡 CFS 퇴직금" 등 키워드 유입 확인.
- **색인 생성(Pages)**: 색인됨 vs 제외됨. 제외 사유가 있으면 알려주세요.
- **네이버**: https://searchadvisor.naver.com → 웹마스터도구에서 동일하게 사이트맵 제출(네이버 인증도 이미 됨).

---

## 완료 후 종훈님이 저(Claude)에게 알려주실 것
- 사이트맵 제출 상태(성공/오류)
- 리치결과 테스트 감지 여부(FAQ/Article/HowTo)
- 1~2주 뒤 실적 스크린샷 또는 수치 → 그때 키워드/콘텐츠 2차 튜닝(P4 심화) 진행합니다.
