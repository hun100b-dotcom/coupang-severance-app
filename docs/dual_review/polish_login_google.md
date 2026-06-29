# 더블리뷰 — 폴리시 패스 #2: 로그인 Google 버튼 폭 반응형

날짜: 2026-06-29 · 브랜치: main · 범위: 디자인 디테일(UI만), 인증 로직 무변경

## 변경 요약 (P1-1)
- 문제: `@react-oauth/google`의 `<GoogleLogin width={360} />` 고정폭 → 320px 화면에서 버튼 배경이 좌우 ~20px 잘리고, 카카오 버튼(`w-full`)과 너비 불일치.
- 수정: 감싸는 래퍼에 `ref` 부착 → 폭을 측정해 `width={googleBtnWidth}`로 동적 지정(클램프 200~400). `useLayoutEffect`로 첫 페인트 전 폭 확정 → 320→측정값 깜빡임 방지.

파일: `frontend/src/pages/Login.tsx` (1파일)

## 실측 증거 (preview MCP, dev 5173)
- 320px: Google 버튼 w=232 == 카카오 w=232(정렬 일치), 오버플로/잘림 없음(l:41, rt:273 ≤ 320).
- 375px: 둘 다 w=293 일치.
- `npm run build`(tsc) 통과, 콘솔 에러 0.

## A 총괄 리뷰 — VERDICT: PASS
- 인증 로직(onSuccess/handleGoogleCredential/signInWithIdToken) 무변경 / resize 리스너 cleanup 정상 / width prop 타입(number, GSI는 string|number 허용) 적합 / 카카오와 시각 정렬 개선 / 로딩·약관미동의 분기 회귀 없음.
- 블로커·메이저 0, 마이너 2(비차단: 초기 측정 0 반환 케이스는 정상 플로우에서 미발생).

## B 적대 리뷰 — VERDICT: PASS
- 6개 공격 포인트(재렌더 깜빡임/측정 레이스/타입/하한클램프/트리거 누락/인증 회귀) 전부 블로커 재현 실패. tsc EXIT 0, GSI width 타입 `string|number` `.d.ts` 확인.
- **MEDIUM 지적(반영함)**: width 320→232 갱신 시 라이브러리가 버튼을 1회 재렌더 → 첫 페인트 깜빡임 가능. 권고대로 `useEffect`→`useLayoutEffect`로 변경해 페인트 전 폭 확정(플래시 제거). 재측정 결과 정렬·무오버플로 동일.
- 잔여 비차단: 200px 미만 극단 뷰포트(현실 디바이스 부재) 시 하한 200 고정 가능 — 명세 하한 320 밖.

## 결론
A·B 모두 PASS. B의 MEDIUM(깜빡임) 권고를 useLayoutEffect로 반영 후 커밋.
