# 적대적 리뷰 B — 업비트풍 홈 시안 (Home.tsx)

- 대상: `frontend/src/pages/Home.tsx` (HEAD 대비 전면 재작성)
- 방향문서: `docs/design/upbit_direction.md`
- 리뷰어: 적대적 리뷰어 B
- 일시: 2026-06-30
- 전제: tsc 0 에러 / 320·375·1280 오버플로 0(라이브 실측) / 콘솔 0 — 재확인됨. 아래는 **그 사실로 가려지지 않는** 논리·접근성·데이터 결함만.

---

## 판정: FAIL

치명 1건: **접근성 대비 위반이 시안 전반에 구조적으로 박혀 있음**. 방향문서 §5가 명시적으로 "작은 폰트(11~12px)는 회색이라도 대비 확보, WCAG AA"를 자기 규칙으로 선언했는데, `UP.sub(#8B95A1)`를 흰 배경 본문 텍스트에 14곳, 그중 다수가 11~13px 본문에 사용 → **자기 규칙을 자기 코드가 위반**. 측정값 3.04:1 (AA 4.5:1 미달). 핵심 타깃이 고령·저시력 일용직이라 더 치명적.

---

## BLOCKER

없음. (런타임 폭발·빌드 깨짐·기능 완전 소실은 발견 못 함. wage/charAt/날짜 파싱 모두 폴백·가드 존재.)

---

## HIGH

### H1. UP.sub(#8B95A1) 본문 텍스트 — WCAG AA 대비 위반 (방향문서 §5 자기위반)
- 측정(흰 배경 #FFFFFF): **3.04:1** (AA 본문 4.5:1 미달, AA 대형 3:1도 12~13px엔 부적용)
- 텍스트로 쓰인 위반 라인:
  - L296 지표 스트립 라벨 12px "쿠팡·CFS 평균 퇴직금" 등
  - L398 "일용직 4대 수당 자동계산" 11px
  - L473 계산기 부제 12px (퇴직금/실업급여 설명 등)
  - L520 채용 빈상태 안내 12px
  - L568 채용 지역·근무시간 12px
  - L579 wageLabel·D-day 10px
  - L603 "등록된 공지가 없어요" 13px
  - L619 공지 날짜 11px (mono)
  - L647 푸터 11px — 게다가 배경이 `UP.page(#EEF1F5)`라 **2.68:1** 로 더 악화
- 근거: 방향문서 §5 "작은 폰트(11~12px)는 회색이라도 대비 확보… 텍스트 대비 WCAG AA". 이 규칙을 코드가 정면 위반.
- 권고: 본문용 회색을 `UP.ink(#4E5968, 7.11:1)` 이상으로 올리거나, 캡션 전용 회색을 #6B7684(≈4.5:1)급으로 재정의. 아이콘 전용 사용(L478/L518/L584/L602)은 비텍스트라 무방.

### H2. UP.brand(#3182F6) 소형 본문 텍스트 대비 위반
- 측정(흰 배경): **3.71:1** (AA 본문 미달)
- 위반 라인:
  - L432 "지금까지 N명이 확인했어요"의 카운트 숫자 — 본문 12px 내 강조
  - L580 채용 임금 숫자 14px font-black — 핵심 수치인데 AA 미달
- 참고: L67 CATCH 하이라이트는 헤드라인 clamp(23~32px) → 대형 텍스트 3:1 통과(경계). L580은 14px라 명백히 미달.
- 권고: 소형 숫자 강조는 `UP.strong(#1B64DA, 5.41:1)`로. 실제로 대표수치(L406)는 strong을 쓰는데, 채용 임금만 brand라 일관성도 깨짐.

### H3. 긴급/내일 뱃지 대비 미달
- 긴급: #F04452 on #FDECEE = **3.26:1**, 10px bold → AA 미달
- 내일: #B7791F on #FFF4E5 = **3.35:1**, 10px bold → AA 미달
- 10px라 large text 예외도 못 받음. 위험·시간성 정보라 가독성 중요.

---

## MEDIUM

### M1. 공지 패널 빈상태 FOUC(깜빡임) — UX 회귀
- L600 `notices.length === 0` 만 분기. `useNotices`는 `loading`을 반환하지만 Home은 `notices`만 구조분해(L106)해서 **로딩 무시**.
- 원본은 `NoticesBanner`가 `notices.length===0`이면 배너 자체를 숨겨(빈 공간) FOUC가 안 보였음. 새 버전은 패널 골격이 항상 있어 마운트~fetch 사이 "등록된 공지가 없어요"가 0.x초 노출됐다 사라짐.
- 채용은 `jobsLoading` 스켈레톤이 있는데(L491) 공지는 동등한 로딩 처리가 없어 **비대칭**.
- 권고: `const { notices, loading } = useNotices()` 후 loading 시 스켈레톤 또는 빈상태 억제.

### M2. 지표 스트립 라벨 min-w-0 누락 — 잠재 줄밀림
- L296 `<span class="truncate">`가 부모 `flex items-center justify-between gap-2`(L293)의 직접 자식인데 **min-w-0 없음**. flex 자식 기본 min-width:auto 때문에 라벨이 길어지면 truncate가 안 먹고 우측 숫자(whitespace-nowrap)를 밀어 오버플로 가능.
- 현재 하드코딩 4개 라벨로는 320px에서 안 터짐(라이브 실측 통과)이나, 라벨 텍스트가 길어지는 순간 깨짐. 다른 truncate(L570/573/618)는 min-w-0이 있는데 L296만 누락 → **일관성·견고성 결함**.

### M3. 정보 회귀 — center_name·benefits 노출 사라짐
- 원본 채용 행: `center_name`(L501-502), `benefits` 뱃지 최대 2개(L455, L490)를 표시.
- 새 버전 채용 행(L544-585): center_name·benefits 둘 다 미표시. region/work_hours/wage만.
- 기능 폭발은 아니나 사용자에게 노출되던 정보가 사라진 **정보 회귀**. 의도된 밀도 절충일 수 있으니 MEDIUM. 방향문서엔 "center_name 제거"가 명시돼 있지 않음 → 의도 확인 필요.

---

## LOW

### L1. wage 0 표시 — "시급 0"
- L531 `wage = daily_wage>0 ? daily_wage : hourly_wage`. 둘 다 0/누락이면 `wage=0` → L581 "0" 출력. NaN 폭발은 없음(toLocaleString(0)="0").
- 원본과 동일 로직이라 **회귀는 아님**. 단 업비트풍 "수치 신뢰" 톤에서 "시급 0"은 어색. 가드(`wage>0`일 때만 숫자 표기) 권장.

### L2. logoUrl 비교가 매직스트링 의존
- L551 `logoUrl !== '/logos/default.svg'` 로 폴백 판정. jobUtils가 default.svg 경로를 바꾸면 조용히 깨짐. 상수화 권장. (현재 동작 정상)

### L3. 방향문서 vs 코드 radius 불일치(경미)
- 문서 §1-4/§6은 업비트 실측 radius 4px, 절충 8px(`rounded-lg`)을 명시. 코드는 `rounded-lg`(8px) 일관 사용 → **일치**. 단 일부 작은 칩은 `rounded`(4px)·`rounded-md`(6px) 혼용(L322 칩, L393/466 아이콘박스). 의도된 위계지만 문서엔 "8px로 절충" 단일값만 적혀 미세 불일치. 시각 문제 아님.

### L4. 업비트 차용 주장 검증 — 대체로 일치
- 페이지 배경 #EEF1F5(문서 §3 제안값과 동일), navy #1A2434(실측 일치), strong #1B64DA, brand #3182F6 모두 문서와 코드 일치. **차용 주장 허위 없음.**
- 단 `UP.sub(#8B95A1)`는 업비트 실측 캡션 #666666(문서 §1-1)이 아니라 **토스 계열 회색**. 업비트 실측값(#666=5.74:1)을 그대로 썼다면 H1이 안 터졌을 것 → 아이러니하게 "업비트 실측" 캡션색을 안 따른 게 위반 원인.

---

## 기능 회귀 점검 결과 (요청 항목 전수)

| 항목 | 상태 |
|------|------|
| 채용 fetch (job_postings, status/expires_at/is_urgent/created_at order) | ✅ 보존 (L127-149, 쿼리 동일) |
| 카운트 백엔드→Supabase→0 폴백 | ✅ 보존 (L154-174) |
| 카피 로테이션 | ⚠️ 간격 변경: 원본 7초 → 신규 7초(L177 동일). copyIdx 로직 보존 |
| registerClick 추적 | ✅ 보존 (L184-191, try/catch) |
| autoSaved 배너 | ✅ 보존 (L113-120, 4초) |
| notices | ⚠️ NoticesBanner(마키)→정적 리스트 slice(0,5)로 교체. loading 미처리(M1) |
| SEO jsonLd 3문항 FAQPage | ✅ 보존 (L233-262, 3개 그대로) |
| 게스트(consumePendingSaveDone) | ✅ 보존 (L115) |
| created_at 파싱 | ✅ NaN 가드 있음 (L609 Number.isNaN(d.getTime())) |
| expires_at D-day | ✅ null 가드 있음 (L536) |
| company_name.charAt(0) | ✅ 타입 non-null, 빈문자열도 "" 안전 (L554) |
| 빈배열/null 경로 | ✅ recentJobs `(data ?? [])`, notices `?? []` |

**런타임 폭발 경로: 발견 못 함.** 데이터 결함은 "시급 0" 표시(L1) 수준.

---

## 가장 치명적 1건 (재현)
1. 흰 배경에서 회색 본문(#8B95A1, 3.04:1)이 깔린 어느 화면이든(지표 스트립 라벨·계산기 부제·공지 날짜·푸터) 캡처 후 명도 대비 측정 → **4.5:1 미달**.
2. 방향문서 `docs/design/upbit_direction.md` §5 "작은 폰트는 회색이라도 대비 확보, WCAG AA" 와 직접 충돌.
3. 타깃이 고령·저시력 일용직이라 실사용 가독성 리스크 = 단순 표준위반 이상.

→ **FAIL.** H1·H2·H3(대비) 수정 후 재검증 필요. M1·M2는 동반 수정 권장.
