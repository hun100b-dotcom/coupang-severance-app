# 더블리뷰 — 어드민 방문자 애널리틱스 정확도 개편 (2026-07-06)

대상 변경(어드민 4파일, 계산 로직 무관):
- `backend/app/api/admin.py` — 토큰 허용셋(anon 파생) + `GET /admin/visitor-stats`(전수 페이지네이션·count=exact·KST·referrer 분류)
- `frontend/src/lib/api.ts` — `getVisitorStats`
- `frontend/src/lib/routeLabels.ts` — 경로 한글표기
- `frontend/src/components/admin/tabs/VisitorTab.tsx` — 재작성

## 리뷰어 A (총괄, 5축) — PASS
14개 항목 FAIL 0. 응답타입↔소비필드 정합, 라우트 커버리지 100%, 토큰 계약 일치, count=exact/KST
정확성, 가짜 0 금지(502), NOT NULL 스키마 기반 런타임 안전 실측 확인. 관찰사항 2건(today 폴백,
앰버=기존 adminTheme 확립 팔레트)은 배포 차단 아님.

## 리뷰어 B (적대) — 1차 FAIL → 수정 → 재검증
### 1차 FAIL: BLOCKER 2 + MINOR 3
- BLOCKER-1: `VisitorTab` 비회원 행 `l.session_id.slice()` null 미방어 → 렌더 크래시 가능.
- BLOCKER-2: 엑셀 다운로드가 최근 50건만(기존 최대 1000건 대비 회귀).
- MINOR: `_count_header`가 `*/*`(count 실패)를 0으로 뭉갬 / `_classify_referrer` 부분문자열 오탐 /
  routeLabels 쿼리스트링·trailing slash 미정규화.

### 적용 수정 (전부)
- BLOCKER-1 → `(l.session_id ?? '').slice(0,8) || '익명'` + key 폴백 + 백엔드 session_id 빈문자 보정.
- BLOCKER-2 → 백엔드 `recent_limit` 파라미터(표=50, 엑셀=최대 5000 전체 재조회) + 파일명에 실제 건수.
- MINOR → count `*` 시 None 반환+오늘은 행 기반 폴백 / `_classify_referrer` 를 host 라벨·suffix
  정확매칭으로 재작성(유닛검증: evil-google-phishing·notgoogle·*.evil.com 모두 '기타'로 정확) /
  routeLabels `normalizePath`.

### 라이브 검증 중 추가 발견·수정 (B 지적 밖, 자체 적출)
- **PostgREST max-rows 1000 상한**: `limit=50000` 을 줘도 실제 1000행만 반환 → 순방문자/집계가
  다시 1000 기준이 되던 '허수 재발'. **offset 페이지네이션**(1000씩, 상한 6만행, total 도달/마지막
  페이지 조기종료, 첫 페이지 실패 502)으로 전수 수집.
  라이브 실측: **unique_visitors 871(상한) → 1,654(전수)** 로 정정(약 2배 과소집계 해소),
  recent 3,971건 정상 반환.

### B 재판정: **PASS (조건부)** — 배포 승인
BLOCKER-1·2 + MINOR 3건 전부 실효 해소 확인. 페이지네이션 라이브 실측(871→1,654) 목표 달성.
신규 MINOR 2건(비차단): (A) offset 스큐 중복 카운트 — set 집계 무해, 경로/유입 카운트 미세 과대,
total은 count=exact라 정확. keyset 전환은 백로그. (B) count 실패+중간페이지 실패 복합 시 truncated
미표기 → **즉시 반영: 중간 페이지 실패 시 `truncated=True` 세팅**(커밋 후속). 표현 초미세(배너 "등"에
logged_in 포함)는 유지.

## 최종: A PASS + B PASS(조건부) → 배포 완료. 후속 백로그: keyset 페이지네이션(대용량 시 정확·성능).
