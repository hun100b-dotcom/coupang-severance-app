# 더블리뷰 — 업비트풍 리디자인 Phase 3 (전역 토큰 적용 + 홈 배포)

> 작성: 2026-06-30 · 대상 브랜치 `redesign/upbit-home` · 백업 태그 `pre-upbit-phase3-2026-06-30`
> 변경 성격: **전역 디자인 토큰 주입 + 공유 컴포넌트 업스케일** (additive 위주, toss.* 하위호환 보존)
> 검증 방식: `npm run build`(tsc -b + vite build) + 빌드 산출물(`vite preview`) 헤드리스 라우트 스모크.
> ※ 비동기 리뷰어 A·B 미회신(타임아웃) → 오퍼레이터 자체검증 결과로 수합 기록.

---

## 변경 파일 (6)

| 파일 | 변경 | 성격 |
|------|------|------|
| `frontend/tailwind.config.js` | `up.*` 색 네임스페이스 신설 + `maxWidth.content=1280` 토큰 | **추가** (기존 토큰 무손상) |
| `frontend/src/styles/index.css` | `:root --up-*` CSS 변수 + `.tnum`(tabular-nums) 유틸 | **추가** |
| `frontend/src/components/ui/Container.tsx` | wide `1080→max-w-content(1280)`, 패딩 `px-4/md:px-6 → px-5/md:px-8` | 스케일업 |
| `frontend/src/components/TopNav.tsx` | `max-w-[1080px]→max-w-content`, 패딩 동일 상향 | 정렬 |
| `frontend/src/components/ui/Button.tsx` | lg `54→56px`, `16→17px` | 스케일업 |
| `frontend/src/components/ui/SectionHeader.tsx` | 타이틀 `17→md:20px` (모바일 17 유지) | 스케일업 |

계산 로직(`backend/app/api/severance.py` 28일 블록) **diff 0** — 순수 UI 변경.

---

## 관점 A — 회귀 / 하위호환 / 토큰 정확성

- [x] **하위호환**: 기존 `toss.*`, `brand/accent/ink/line/page`, radius/shadow 토큰 **삭제·변경 0**. `up.*`는 신규 네임스페이스로 추가만 됨 → 기존 화면 클래스 영향 없음.
- [x] **토큰 정확성**: `up.*` 12색이 `docs/design/upbit_home_analysis.md §2` 실측값 및 `Home.tsx`의 로컬 `UP` 객체와 **1:1 일치**(page #EEF1F5 / sub #565D6A / strong #1B64DA / hair #E1E4EA …).
- [x] **빌드**: `max-w-content` 임의값 토큰이 Tailwind에서 정상 생성, `npm run build` 통과(0 TS 에러).
- [x] **계산 로직 보호**: backend diff 0.
- **BLOCKER**: 없음.

## 관점 B — 접근성(AA) / 반응형 / 홈 v2 스케일 일치

### AA 대비 (흰 배경 기준)
| 토큰 | 값 | 대비 | 용도 | 판정 |
|------|----|----|------|------|
| up.body | #333D4B | 10.6:1 | 본문 | ✅ AA/AAA |
| up.sub | #565D6A | 6.7:1 | 보조 텍스트 | ✅ AA(4.5↑) |
| up.caption | #8E929B | 3.0:1 | 날짜·플레이스홀더(비필수) | ⚠️ 비필수 한정 — 본문 사용 금지 |
| up.strong | #1B64DA | 5.4:1 | 금액·CTA 강조 | ✅ AA |
| up.green | #047857 | 4.8:1 | 채용(흰 텍스트 버튼) | ✅ AA |
| up.danger | #F04452 | 3.9:1 | 긴급 뱃지(큰 텍스트/아이콘) | ✅ 3:1(대형) |

- [x] **반응형/오버플로**: `Container` wide를 1280으로 올려도 모바일은 `w-full`이 우선이라 `max-w-content`(데스크톱 캡)는 무영향. 패딩 `px-4→px-5` 상향은 모바일 콘텐츠를 **좁히는** 방향 → 오버플로 유발 불가. 헤드리스 실측(375px): 홈·채용 `bodyScroll 369 ≤ 375`, 가로 오버플로 **-6(없음)**.
- [x] **홈 v2 스케일 일치**: `Home.Wrap(max-w-[1280px] px-5 md:px-8)` ≡ `Container(max-w-content px-5 md:px-8)` 동일 스케일. 전역화가 홈에서 검증된 값과 정확히 일치.
- **BLOCKER**: 없음. (경미: `up.caption`은 본문 보조에 쓰지 말 것 — 코드상 캡션 전용으로만 사용 중, Phase4 화면별 리뷰에서 재확인.)

---

## 전 라우트 스모크 (빌드 산출물 헤드리스)

| 라우트 | 렌더 | 콘솔에러 | 비고 |
|--------|------|---------|------|
| /home(게스트) | OK | 0 | 모바일 오버플로 0 |
| / (랜딩 V1) | OK | 0 | |
| /calculator | OK | 0 | Container 페이지 |
| /severance · /unemployment · /weekly-allowance · /annual-leave | OK | 0 | 4계산기 정상 |
| /jobs | OK | 0 | Container 페이지·모바일 오버플로 0 |
| /notices · /payment | OK | 0 | Container 페이지 |
| /guide | OK | 0 | |
| /login | OK | 0 | |
| /inquiry | OK | 0 | |
| /terms/privacy | OK | 0 | |
| /coupang-severance-calculator (SEO) | OK | 0 | |
| /mypage | OK | 0 | 비로그인 → /login 정상 리다이렉트(가드 정상) |

빌드: `✓ tsc -b + vite build` 0 에러 / 9.76s. 콘솔 에러 전 구간 0.

---

## 종합 판정: **PASS**

- BLOCKER 0. 전역 변경이 모든 화면에 적용됐으나 치명 깨짐·가로 오버플로·콘솔 에러 0.
- 세부 디자인(화면별 업비트 톤 적용)은 계획대로 **Phase 4(화면별 순차)** 로 이관.
- 후속: 병합 → `push origin main` → Vercel/Render 자동배포 → 6-step 검증.
