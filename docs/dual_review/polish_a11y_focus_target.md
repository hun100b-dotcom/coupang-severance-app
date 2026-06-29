# 더블리뷰 — 폴리시 패스 #3: 접근성(키보드 포커스 + 터치 타깃)

날짜: 2026-06-29 · 브랜치: main · 범위: 디자인 디테일(a11y), 계산 로직 무변경

## 변경 요약
1. **키보드 포커스 표시 복원 (WCAG 2.4.7)**: 전역 버튼 클래스 `.btn-primary/.btn-secondary/.choice-btn/.pdf-guide-trigger`는 `outline:none`만 있고 대체 표시가 없어 키보드 사용자가 포커스 위치를 알 수 없었다. → 이들에 `:focus-visible { outline:2px solid var(--toss-blue); outline-offset:2px; }` 추가. `:focus-visible`라 마우스 클릭엔 안 보이고 키보드 탭 이동에만 표시(마우스 시각 회귀 0).
2. **로고 탭 타깃 (WCAG 2.5.8)**: TopNav "CATCH" 로고 버튼이 글자높이 22px뿐 → `min-h-[44px]` 추가(글자는 items-center 가운데 유지, 시각 위치 불변).

파일: `frontend/src/styles/index.css`, `frontend/src/components/TopNav.tsx` (2파일)

## 실측/사실 증거
- 로고 버튼 높이 22 → **44px** 확인(preview MCP). 56px 바 안이라 레이아웃 시프트 없음.
- `.choice-btn:focus-visible` 룰 CSSOM 파싱 확인. `--toss-blue: #3182f6` (:root 30행) 정의 확인 → outline 색 유효.
- reach: `components/Button.tsx`의 PrimaryButton/SecondaryButton/ChoiceButton이 해당 클래스 사용(계산 플로우). `.pdf-guide-trigger`도 사용처 존재. `ui/Button`은 `outline:none`이 없어 네이티브 포커스 유지(무관).
- 모바일 핵심 화면 터치타깃 감사: 44px 미만 요소는 로고 1개뿐이었고 그것을 해결.
- `npm run build`(tsc) 통과, 콘솔 에러 0.

## A 총괄 리뷰 — VERDICT: PASS
- focus-visible 키보드 한정 매칭(마우스 회귀 0) / 토큰 존재 / outline 레이아웃 비점유 / min-h 시프트 없음 / dot span mb-3 무관 / hover·active 트랜지션 무충돌. 보너스: 로고 aria-label 확인.
- 블로커·메이저·마이너 0.

## B 적대 리뷰 — VERDICT: PASS
- 6개 공격(토큰 미정의/마우스 노출/offset 충돌/시프트/클릭영역/도달성) 전부 블로커 재현 실패.
- #6 지적: `.btn-primary` 계열이 리디자인 후 부분 데드코드일 가능성 — 단 `components/Button.tsx` 사용처 + `.pdf-guide-trigger` 확실 복원으로 reach 실재, **데드코드라도 회귀 유발 0, 순효과 +**.

## 결론
A·B 모두 PASS. 회귀 없이 WCAG 2.4.7·2.5.8 정확히 개선. 커밋.
