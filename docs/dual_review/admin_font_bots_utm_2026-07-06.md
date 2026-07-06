# 더블리뷰 — 어드민 폰트 통일 + 방문자 봇 제외 + UTM 견고화 (2026-07-06)

대상 커밋: `9c6d5ef`(봇/UTM), `a83f1bc`(폰트). 어드민 전용 변경, 계산 로직·유저 페이지 무관.
방식: 백그라운드 대기 없이 인라인 적대검토 + 라이브 실측(종훈님 실도메인 기준).

## #1 폰트 통일 — 인라인 rem 19종 → text-aN px 8단계
- 변경: AdminPage 루트 폰트패밀리(Pretendard)·기본 13px·smoothing 명시 + 어드민 26개 파일의
  인라인 `fontSize:'0.6~1.6rem'`(19종)을 `10/11/12/13/14/16/20/24`px 스케일로 정규화. clamp() 보존.
- 적대검토:
  - sed가 fontSize만 대상(borderRadius/gap/width rem 무손상) → tsc·npm build(27파일) 통과로 무결 확인.
  - clamp() 반응형(16개) 보존(패턴이 `fontSize: '` 프리픽스 요구, clamp엔 없음).
  - 변환 분포 검증: 10~24 스케일값만(+차트축 tick 9는 recharts 의도값, 유지). 이상값 0.
  - 크기 편차 미미(0.82rem=13.12→13px 등), 레이아웃 파손 없음. 유저 페이지 0건 변경(회귀 없음).
  - 잔여: fontWeight 혼용은 이번 미변경(리스크 회피) — 후속 관찰.
  - 판정: PASS.

## #2 방문자 봇 제외 — 실유저 재정의
- 근본원인(실측): 30일 4,131건 중 **2,482건(60%)이 봇** — 주범은 Vercel prerender 헤드리스 크롬
  (배포마다 SEO 17라우트 렌더 시 방문추적 훅 실행). 순방문자 1,796의 실체=실유저 270.
- 변경: 수집 차단(navigator.webdriver·봇 UA면 insert 스킵) + 집계 제외(백엔드 _is_bot_ua로 전 지표
  제외, bots_excluded/raw_pageviews 투명 표기). 과거 봇행은 삭제 안 함(로우데이터 보존)·집계서만 제외.
- 적대검토:
  - 실유저 오탐 위험: UA 봇패턴(python/java//node/bot 등)은 정상 브라우저 UA(Mozilla/Chrome…)에 없음 → 오탐 낮음.
  - UA null=봇 간주 → 극드문 프라이버시 유저 제외 가능(문서화된 트레이드오프, MINOR).
  - total=human_pv, today=human, funnel visitors=human 세션 — 일관. 가짜0 방지(known 플래그) 유지.
  - 라이브 before→after: 총 4,046→**1,649**, 순 1,796→**270**(6.6배 부풀림 제거), bots_excluded=2,482 실측.
  - 판정: PASS.

## #3 UTM 견고화 — 종훈님 테스트 미반영 규명
- 원인(실측): ①배포 시차 — 종훈님 테스트 시점 라이브 번들(Dp8LivVJ)엔 UTM 캡처 코드가 없었음(catch_utm 0회).
  ②first-touch 세션 고착 — 사이트를 먼저 본 뒤 같은 탭에서 캠페인 링크 열면 옛 빈 값이 고착.
- 변경: getOrCaptureUtm이 URL에 UTM 있으면 세션 도중에도 '갱신 캡처'(캠페인 클릭 항상 기록). 루트 `/`는 리다이렉트 없음.
- 적대검토 + 라이브:
  - 종훈님 정확 URL `/?utm_source=kakao&utm_campaign=여름` 실브라우저 재현 → **DB 저장 확인**
    (utm_source=kakao, utm_campaign=여름 한글 정상, landing=/, 실UA) → 엔드포인트 집계 `kakao / 여름:2` → 테스트행 삭제.
  - Korean 인코딩 정상 디코딩(%EC..→여름). `/home` 리다이렉트 UTM 유실은 잔존하나 캠페인 링크는 루트/공개경로 권장(문서화).
  - StrictMode dev 이중 insert=dev 전용(프로덕션 단일).
  - 판정: PASS.

## 최종: 인라인 A(총괄)+B(적대) 모두 PASS, BLOCKER 0. 라이브 실측 종훈님 도메인 기준 완료.
잔여(비차단): fontWeight 혼용 후속 / UA-null 프라이버시 유저 / /home 리다이렉트 UTM(운영가이드).
