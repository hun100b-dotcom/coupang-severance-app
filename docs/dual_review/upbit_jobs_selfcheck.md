# 업비트풍 Phase4 — 채용(JobsPage) 묶음 자체검증 (더블리뷰 갈음)

- 브랜치: `redesign/upbit-jobs` (HEAD=c633d8e), 기준: main(5911e2d)
- 대상: `frontend/src/pages/JobsPage.tsx` (단일 파일, +154/−149 UI only)
- 방식: 정적 분석 + 클래스 계산 (★dev 서버 미기동 — 지침 준수)
- 일자: 2026-06-30
- 사유: 코디네이터 지시로 더블리뷰 A/B 결과 미생성 시 자체검증으로 갈음

## 판정: PASS — BLOCKER 0

| 항목 | 결과 | 근거 |
|------|------|------|
| 1. 계산/데이터 로직 회귀 | ✅ 0건 | `git diff main...HEAD`에서 fetchJobs/listFavorites/addFavorite/removeFavorite/isFavorited/applyToJob/getAppliedJobIds/checkConfirmedOnDate/.channel/.subscribe/.from/toCardData/useState/useEffect/useMemo 패턴 변경 라인 0 |
| 2. 변경 범위 | ✅ 단일 | name-only=JobsPage.tsx 1개. 계산기/admin/backend 무변경 확인 |
| 3. 빌드/타입 | ✅ PASS | `npm run build` exit 0, ✓ 9.43s. tsc 에러 0. JobsPage 청크 48.29kB. 기존 chunk-size 경고(index/TargetTab/BarChart)만 — 무관 |
| 4. 옛 색 리터럴/AA 함정 | ✅ 0건 | `#8b95a1`·text-ink-500·bg-[#F7F9FC]·bg-[#F2F4F6]·border-line·text-ink-900/600 grep 0. up.* 전면 토큰화 |
| 5. 대비 AA | ✅ | 보조 텍스트 전부 `text-up-sub`(#565D6A 6.7:1). 흰텍스트 주 CTA `brand-strong`(#1B64DA 5.4:1)·`up-green`(#047857 4.7:1)로 상향. 금액 `up-strong` on brand-bg(4.97:1) |
| 6. 금액 오버플로 가드(320px) | ✅ | clamp 하한 3곳(카드 시급 clamp(22,6vw,26)·모달 급여 clamp(19,5.5vw,24)×2) + break-keep 15곳 + min-w-0/truncate. 320px 셀 가용폭 내 수용 |
| 7. glassmorphism 제거 | ✅ | GlassCard·bg-white/N 0건. 모달 오버레이 backdrop-blur-sm은 의도된 dim(허용) |
| 8. 검색 돋보기 겹침 | ✅ | Search 아이콘 left-4 + input `!pl-12 !pr-4`(index.css 전역 input padding 덮어쓰기 가드) — 겹침 0 |
| 9. 모달 portal/z/안전영역 | ✅ | createPortal(document.body), z-[60], 바텀시트 max-h-[94vh], 하단 CTA env(safe-area-inset-bottom) |

## 320px 정량 검증 (JetBrains Mono 숫자 ≈0.6em)
- 카드 시급 블록: Container px-5(40) → card p-5(40) → brand-bg px-4(32) = 가용 ~208px. 시급 clamp 하한 22px, 좌측 그룹 min-w-0+truncate / 우측 일급 shrink-0 → 가로 오버플로 없음(과대 금액 시 시급만 truncate).
- 모달 급여 grid-cols-2: w-full 320 → p-6(48) → gap 10 → 셀 131 → p-4(32) = 가용 ~99px. 금액 clamp 하한 19px(@320), 8자리 "234,560원"≈91px<99 ✓, break-keep로 "원" 분리 방지. 일급은 실서비스상 최대 6자리(일당 특성) → 수용.
- 히어로 통계 타일 grid-cols-4: 가용 280 → gap 30 → 타일 62.5 → 숫자 clamp 하한 18px, 라벨 truncate → 안전.

## 엣지케이스
- 긴 회사명/센터: 카드 `truncate`, 모달 `break-words` ✓
- 빈 benefits / 빈 description / expires_at 없음 / apply_methods 빈배열(→"회사 정보 링크 없음" 폴백) ✓
- 빈 데이터 sections.length===0 → 빈 상태 카드 ✓ / fetchError → 에러+재시도 ✓ / loading → 스켈레톤 그리드 ✓

## 결론
계산/데이터 로직 무변경(UI only), 빌드 PASS, AA·반응형·토큰 일관성 충족 → **PASS. main 병합·배포 가능.**
