# 더블리뷰 — UTM 파이프라인 + 전환 퍼널 + RLS 교정 (2026-07-06)

대상: UTM 캠페인 유입 수집(마이그레이션+프론트 캡처+백엔드 집계+어드민 섹션), 전환 퍼널(방문→가입→계산),
visitor_logs SELECT RLS 교정. 커밋 `348e7aa`, `d03f3c6`. 계산 로직 무관.

## 리뷰어 A (총괄, 5축) — PASS
응답타입↔소비필드 완전 정합, funnel count 소스(profiles/reports.created_at) 유효, 무지개색 미위반(승인 팔레트),
단위 상이 3중 정직 표기(카드/툴팁/헤더), 한국어 주석·인라인 컨벤션·React key 유일성 충족. 차단 이슈 0.
관찰: 전환율 100%초과 가능(단위 상이) — 정직 고지로 완화 / landing_path 적재만(로우데이터 원칙).

## 리뷰어 B (적대) — CONDITIONAL PASS (BLOCKER 0) → 권장 반영
공격 14포인트 검토. BLOCKER 없음(타입 정합·크래시 경로 없음·가짜0 방지·기존 지표 회귀 없음).
권장 5건 처리:
1. ✅ 전환율 `Math.min(pct,100)` 캡 — 120% 혼란 방지.
2. ✅ `utm_source.strip().lower()` 정규화 — Kakao/kakao 분산 방지.
3. ✅ 미사용 `utm_medium` select 제거.
4. ✅(문서) 캠페인 링크는 리다이렉트 없는 루트/공개경로에 UTM 부착 — 로드맵 §3-b.
5. ✅(문서/별도트랙) anon UTM insert 스팸 = 기존 위험, rate-limit/프록시 검토 — 로드맵 §3-b.
- StrictMode dev 이중 insert=dev전용(프로덕션 무영향), first-touch 고착=의도적, JSON파싱=try/catch 폴백.

## 추가 보안 조치 (RLS 실측 발견 — B의 "MANUAL RLS 확인" 요청 이행)
`visitor_logs` SELECT 정책이 라이브에서 **public 전체읽기(qual=true)** = anon 키로 방문로그 전량 조회 가능(파일
의도 'authenticated only'와 드리프트, **이번 변경 이전부터 존재**). 방문자 분석이 백엔드 service-role로 이전돼
클라 SELECT 불필요 → **`is_admin()` 전용으로 축소**(Supabase MCP 프로덕션 적용 + 파일 기록).
- 라이브 실측: anon SELECT `[]`(차단 확인) / 백엔드 service-role 엔드포인트 총4,046·순1,723 정상(무영향) / INSERT(추적) 유지.

## 엔드투엔드 실측(라이브)
- 마이그레이션: visitor_logs에 utm 4컬럼 프로덕션 적용+확인.
- UTM 집계: 테스트 UTM 2행 삽입→endpoint utm_total=2·campaigns 집계 확인→삭제(잔존 0).
- 프론트 캡처: dev `/guide?utm_source=__browsercap__..` 진입→DB에 utm 저장 확인→삭제.
- 퍼널: 7일 방문1040→가입4→계산1 집계 확인.

## 최종: A PASS + B CONDITIONAL PASS(권장 전량 반영) + RLS 보안 교정 → 배포 완료.
후속 백로그: 어드민 JWT 인증 전환(P1, 보류) / anon insert rate-limit / keyset 페이지네이션.
