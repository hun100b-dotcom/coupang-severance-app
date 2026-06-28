# 더블 리뷰 — 랜딩 "지금 시작하기" 튕김 + 홈 공지 마키 버그 수정

> 일자: 2026-06-28 · 브랜치: `fix/landing-cta-notices` (main 분기, 백업 태그 `pre-redesign-2026-06-27`)
> 방식: 총괄 리뷰어 A + 적대 리뷰어 B 병렬 검증. 계산 로직(28일 블록·계산식) 무변경, UI/버그만.

---

## 대상 수정 2건

### 수정 1 — 랜딩 우상단 "지금 시작하기" 버튼 튕김
- **파일**: `frontend/src/pages/LandingV1.tsx`
- **증상(재현됨)**: 비로그인 사용자가 "지금 시작하기" 클릭 → 경로가 `/`로 되돌아옴(홈 진입 실패). 최하단 카카오/구글 로그인 후에만 작동.
- **원인**: `goHome`이 `navigate('/home')`만 호출. HomeGuard(`App.tsx:90`)는 `!isLoggedIn && !isGuest`면 `/`로 리다이렉트 → 게스트 미설정 비로그인 사용자가 튕김. (로그인 화면의 "비로그인으로 진행하기"는 `loginAsGuest()`를 켜서 작동.)
- **수정**: `useAuth` import 추가, `goHome`에서 `if (!isLoggedIn) loginAsGuest()` 후 `navigate('/home')`. (로그인 사용자에겐 불필요한 게스트 플래그를 안 쓰도록 가드 — 리뷰어 B 권고 반영)

### 수정 2 — 홈 공지 배너(NoticesBanner) 마키 거동 이상
- **파일**: `frontend/src/components/NoticesBanner.tsx`
- **증상(직접 진단)**: 마키 텍스트가 살짝 왼쪽으로 까딱하다 멈추고, 공지 뒷부분이 영원히 안 보임.
- **원인(실측 확정)**: 마키 컨테이너 `translateX(-50%)`의 `-50%`는 **컨테이너 자기 폭** 기준인데, `w-max`가 없어 부모(좁은 창)에 폭이 묶임(모바일 205px). 끝까지 가도 -102px만 이동(텍스트 한 벌 493px의 일부) → 뒷부분 미노출.
- **실측 근거**:
  - 수정 전: 컨테이너 폭 205px → 애니메이션 끝(p≈1)에서 span1 left = **-103px**(493px여야 정상)
  - 수정 후(`w-max`): 컨테이너 987px → 끝에서 span1 = **-493px**, span2 = **0px** = 완벽한 seamless 루프, 전체 텍스트 노출
  - 모바일(375)·데스크톱(1280) 양쪽 seamless 확인
- **수정**: 마키 컨테이너 className `flex whitespace-nowrap` → `flex w-max whitespace-nowrap`

---

## 총괄 리뷰어 A — 판정: PASS (블로커 없음)
- 수정1 인증 무결성 PASS: `loginAsGuest`는 localStorage 기록+상태갱신만(부작용 없음), 세션복원/onAuthStateChange가 자동 정리. LandingV1은 AuthProvider 하위 → useAuth 안전.
- 수정2 PASS: Tailwind 3.4.11에서 `w-max` 유효, keyframe `marquee-banner`(index.css) 정의 확인, 3중 overflow-hidden 클리핑 유지, 마키 분기에만 적용(짧은 텍스트/0·1개 공지 경로 무영향).
- 핵심 비즈니스 로직 무관 PASS.

## 적대 리뷰어 B — 판정: PASS (블로커 없음)
- `tsc --noEmit` 통과. isGuest+isLoggedIn 동시 성립 시나리오 분석 → 실제 깨지는 분기 없음(HomeGuard OR 조건).
- w-max 가로 오버플로 공격 실패(3중 overflow-hidden + min-w-0). y/x 애니 축 분리로 AnimatePresence 충돌 없음.
- 비차단 권고 MINOR-1: 로그인 유저에 게스트 플래그 불필요 → **`if (!isLoggedIn) loginAsGuest()` 가드로 반영 완료**.

---

## 검증 결과
- TypeScript 빌드(`npm run build`): 통과(에러 0, 기존 chunk 경고만)
- 수정1 재현→수정 후: 비로그인 "지금 시작하기" 클릭 → `/home` 진입 + guest=true (실측)
- 수정2: 모바일/데스크톱 seamless 루프 실측 확정
- **최종: PASS → 커밋·배포 진행**
